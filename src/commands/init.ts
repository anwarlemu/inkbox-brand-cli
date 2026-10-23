import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { installAgents } from '../install/agents.js';
import { Writer } from '../install/files.js';
import { installStyles } from '../install/styles.js';
import { brand, cli } from '../lib/brand.js';
import { emit } from '../lib/output.js';
import { findProjectRoot } from '../lib/paths.js';
import { detectProject, MARKUP, STYLES, styledFiles } from '../project/detect.js';
import { selfInstall, type RunOptions } from './run.js';

/** Prepare a project for new work without rewriting its screens or creating conversion tasks. */
export function init(opts: RunOptions) {
	const root = findProjectRoot();
	selfInstall(root, opts);
	const project = detectProject(root);
	const w = new Writer(root, opts.dryRun);
	const styleText = styledFiles(root).filter(f => STYLES.test(f) || MARKUP.test(f)).map(f => readFileSync(join(root, f), 'utf8')).join('\n');
	const styles = project.framework === 'native' ? undefined : installStyles(w, project, 'site', styleText);
	installAgents(w);
	const warnings = [...(styles?.notes ?? []), ...(!project.hasAlias ? ['Before adding React components, configure the @/* alias to point to the source root.'] : [])];
	emit(opts, { ok: true, dryRun: Boolean(opts.dryRun), framework: project.framework, changes: w.changes, styles, warnings }, () => [
		`${brand().name} ${opts.dryRun ? 'setup preview' : 'styles and agent instructions installed'}.`,
		...w.changes.map(change => `  ${change.action}: ${change.file}`),
		...warnings.map(note => `  Note: ${note}`),
		`Next: ${cli()} guide, then ${cli()} show <component> and ${cli()} add <components...>.`,
	].join('\n'));
}
