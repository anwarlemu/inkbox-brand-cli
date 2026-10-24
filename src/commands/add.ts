import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createTwoFilesPatch } from 'diff';
import { cli, brand, hasProduct } from '../lib/brand.js';
import { findProjectRoot } from '../lib/paths.js';
import { Writer } from '../install/files.js';
import { installStyles } from '../install/styles.js';
import { installAgents } from '../install/agents.js';
import { componentConfig, componentFile, configureRegistry, prepareTransforms } from '../install/config.js';
import { installChakraProvider } from '../install/chakra.js';
import { closure, loadIndex, loadIndexSync } from '../library/registry.js';
import { MARKUP, STYLES, detectProject, styledFiles } from '../project/detect.js';
import { profile } from '../project/surface.js';
import { selfInstall, type RunOptions } from './run.js';

type AddOptions = RunOptions & { overwrite?: boolean; all?: boolean; path?: string; diff?: boolean | string; view?: boolean | string };

export function readPackage(root: string): { dependencies?: Record<string, string>; devDependencies?: Record<string, string> } {
	try { return JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')); } catch { return {}; }
}

export async function add(names: string[], opts: AddOptions) {
	const root = findProjectRoot(), project = detectProject(root), pkg = readPackage(root);
	const deps = { ...pkg.dependencies, ...pkg.devDependencies };
	let reactVersion = deps.react ?? '';
	try { reactVersion = JSON.parse(readFileSync(join(root, 'node_modules/react/package.json'), 'utf8')).version; } catch {}
	const minimum = loadIndexSync().map((item: any) => item.requirements?.react).find(Boolean) ?? '>=19.0';
	const required = minimum.match(/(\d+)\.(\d+)/), actual = reactVersion.match(/(\d+)\.(\d+)/);
	if (!actual || (required && (Number(actual[1]) < Number(required[1]) || (actual[1] === required[1] && Number(actual[2]) < Number(required[2])))) || (project.tailwindMajor ?? 0) < 4) {
		throw new Error(`Cannot add components: React ${reactVersion || 'not detected'} and Tailwind CSS ${project.tailwindMajor ? `${project.tailwindMajor}.x` : 'not detected'}. Run from the target React ${minimum.replace('>=', '')}+ and Tailwind 4 app. Use ${cli()} create --template vite --name my-app for a new project, or ${cli()} apply --dry-run for existing styles.`);
	}
	if (opts.surface && !['site', 'product'].includes(opts.surface)) throw new Error('--surface is site or product.');
	if (opts.all) names = (await loadIndex()).map(item => item.name);
	if (!names.length) throw new Error(`Choose components: ${cli()} search <term>, then ${cli()} add <names>. Use --all to install the whole library.`);
	const readonly = Boolean(opts.dryRun || opts.diff || opts.view);
	const items = await closure(names);
	const config = componentConfig(root, project);
	await prepareTransforms(config);
	const files = new Map<string, { path: string; content: string; before?: string; action: string }>();
	const npm = new Set<string>();
	let chakraNeeded = false;
	// Resolve and transform every file before the first write, so bad aliases and addresses cannot leave half an install.
	for (const item of items) {
		for (const dependency of item.packages ?? []) {
			if (dependency === '@chakra-ui/react') chakraNeeded = true;
			if (!deps[dependency]) npm.add(dependency === '@chakra-ui/react' ? '@chakra-ui/react@3.37.0' : dependency);
		}
		if (item.type === 'theme') continue;
		for (const original of item.files ?? []) {
			const file = componentFile(root, original, config, opts.path);
			const before = existsSync(join(root, file.path)) ? readFileSync(join(root, file.path), 'utf8') : undefined;
			const action = before === undefined ? 'create' : before === file.content ? 'unchanged' : opts.overwrite ? 'update' : 'conflict';
			const previous = files.get(file.path);
			if (previous && previous.content !== file.content) throw new Error(`Two registry files target ${file.path}. Choose a separate path before installing.`);
			files.set(file.path, { ...file, before, action });
		}
	}
	if (chakraNeeded) {
		if (!deps['@chakra-ui/react']) npm.add('@chakra-ui/react@3.37.0');
		if (!deps['@emotion/react']) npm.add('@emotion/react@^11.14.0');
	}
	if (!readonly) selfInstall(root, opts);
	let packagesInstalled = npm.size === 0;
	if (npm.size && !readonly) {
		const pm = project.packageManager, args = [pm === 'npm' ? 'install' : 'add', ...npm];
		console.error(`Installing ${[...npm].join(', ')} with ${pm}...`);
		const result = spawnSync(pm, args, { cwd: root, stdio: ['ignore', 'ignore', 'pipe'], encoding: 'utf8' });
		if (result.status !== 0) throw new Error(`Could not install the packages. Component files were not changed because dependency installation failed. Run ${pm} ${args.join(' ')} and retry. ${result.stderr ?? result.error?.message ?? ''}`);
		packagesInstalled = true;
	}
	const w = new Writer(root, readonly);
	const written: string[] = [], kept: string[] = [], warnings: string[] = [];
	for (const file of files.values()) {
		if (file.action === 'conflict' || file.action === 'unchanged') kept.push(file.path);
		else { w.write(file.path, file.content); written.push(file.path); }
	}
	const conflicts = [...files.values()].filter(f => f.action === 'conflict').map(f => f.path);
	if (conflicts.length) warnings.push(`${conflicts.length} existing files differ and were kept. Review add --diff before using --overwrite.`);
	const source = styledFiles(root);
	if (chakraNeeded) {
		const setup = installChakraProvider(w, project);
		if (setup.warning) warnings.push(setup.warning);
	}
	const saved = w.json('.ds/config.json');
	const surface = (opts.surface ?? saved?.surface ?? (hasProduct() ? profile(root, source).surface : 'site')) as 'site' | 'product';
	configureRegistry(w, project, surface);
	if (items.some(item => item.type === 'theme')) {
		const text = source.filter(f => STYLES.test(f) || MARKUP.test(f)).map(f => readFileSync(join(root, f), 'utf8')).join('\n');
		warnings.push(...installStyles(w, project, surface, text).notes);
	}
	w.write('.ds/config.json', `${JSON.stringify({ ...saved, schemaVersion: 1, brand: brand().bin, surface }, null, 2)}\n`);
	installAgents(w);

	if (!readonly) {
		const installed = w.json('.ds/installed.json') ?? {};
		for (const item of items) if (item.type !== 'theme') installed[item.name] ??= new Date().toISOString();
		w.write('.ds/installed.json', `${JSON.stringify(installed, null, 2)}\n`);
	}
	const filter = typeof opts.diff === 'string' ? opts.diff : typeof opts.view === 'string' ? opts.view : undefined;
	const preview = [...files.values()].filter(file => !filter || file.path === filter || file.path.endsWith(`/${filter}`)).map(file => ({ path: file.path, action: file.action, ...(opts.view ? { content: file.content } : {}), ...(opts.diff ? { diff: createTwoFilesPatch(file.path, file.path, file.before ?? '', file.content) } : {}) }));
	if (filter && !preview.length) throw new Error(`No planned file matches ${filter}. Run add --dry-run to list paths.`);
	if (opts.json) return console.log(JSON.stringify({ schemaVersion: 1, ok: true, dryRun: readonly, items: items.map(i => i.name), written, kept, conflicts, changes: w.changes, files: preview, packages: [...npm], packagesInstalled, warnings }, null, 2));
	console.log([`${readonly ? 'Planned' : 'Added'} ${items.map(i => i.name).join(', ')}.`, ...preview.map(file => `${file.action}: ${file.path}${'content' in file ? `\n${file.content}` : ''}${'diff' in file ? `\n${file.diff}` : ''}`), ...warnings].join('\n'));
}
