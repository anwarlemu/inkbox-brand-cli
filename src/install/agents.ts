import { chmodSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { brand, cli } from '../lib/brand.js';
import { agentGuide } from '../lib/guide.js';
import { PKG_ROOT, pkgPath } from '../lib/paths.js';
import { type Writer, upsertBlock } from './files.js';

// What keeps agents on the brand: a short contract in the files every agent reads, and hooks that check each write
// (Claude Code, Codex, Cursor), plus a git pre-commit check for everyone.

export type Harness = 'claude-code' | 'codex' | 'cursor';
const START = '<!-- ds:contract:start -->';
const END = '<!-- ds:contract:end -->';

/** The agent running this command, from the variables each sets in its shell. Codex first: it inherits CLAUDECODE. */
export function runningHarness(env = process.env): Harness | undefined {
	if (env.CODEX_THREAD_ID || env.CODEX_SESSION_ID) return 'codex';
	if (env.CLAUDECODE) return 'claude-code';
	if (env.CURSOR_AGENT || env.CURSOR_TRACE_ID) return 'cursor';
	return undefined;
}

export const contract = () => readFileSync(pkgPath('brand', 'contract.md'), 'utf8').replaceAll('{{brand}}', brand().name).replaceAll('{{cli}}', cli()).trim();

/** How each harness finds the project's copy of the CLI from the directory it runs hooks in. */
export function binCommand(root: string, harness: Harness | 'other') {
	const bin = brand().bin;
	if (!existsSync(join(root, 'node_modules', bin, 'bin.js'))) return `node "${join(PKG_ROOT, 'bin.js')}"`;
	if (harness === 'claude-code') return `node "$CLAUDE_PROJECT_DIR/node_modules/${bin}/bin.js"`;
	if (harness === 'cursor') return `node "$CURSOR_PROJECT_DIR/node_modules/${bin}/bin.js"`;
	if (harness === 'codex') return `node "$(git rev-parse --show-toplevel 2>/dev/null || pwd)/node_modules/${bin}/bin.js"`;
	return `node node_modules/${bin}/bin.js`;
}

function mergeHooks(existing: any, cmd: string, harness: 'claude-code' | 'codex') {
	const settings = existing ?? {};
	settings.hooks ??= {};
	const ours = (c: string) => c.includes(' hook ') && (c.includes(brand().bin) || c.includes('bin.js'));
	const events: [string, string | undefined, string, number][] = [
		['SessionStart', undefined, 'session-start', 10],
		['UserPromptSubmit', undefined, 'user-prompt-submit', 10],
		['PreToolUse', harness === 'codex' ? 'apply_patch|Edit|Write' : 'Write|Edit|MultiEdit', 'pre-tool-use', 20],
		['Stop', undefined, 'stop', 120],
	];
	for (const key of Object.keys(settings.hooks)) {
		settings.hooks[key] = (settings.hooks[key] ?? []).map((g: any) => ({ ...g, hooks: (g.hooks ?? []).filter((h: any) => !ours(String(h.command ?? ''))) })).filter((g: any) => g.hooks.length);
		if (!settings.hooks[key].length) delete settings.hooks[key];
	}
	for (const [event, matcher, name, timeout] of events) {
		settings.hooks[event] = [...(settings.hooks[event] ?? []), { ...(matcher ? { matcher } : {}), hooks: [{ type: 'command', command: `${cmd} hook ${name}${harness === 'codex' ? ' --harness codex' : ''}`, timeout }] }];
	}
	return settings;
}

export function installAgents(w: Writer) {
	const text = contract();
	w.write('.ds/agent-guide.md', `${agentGuide()}\n`);
	for (const rel of ['GEMINI.md', '.github/copilot-instructions.md']) w.write(rel, upsertBlock(w.read(rel) ?? '', text, START, END));
	// A CLAUDE.md that only imports AGENTS.md gets the contract through it.
	const claude = w.read('CLAUDE.md');
	if (claude === undefined && w.read('AGENTS.md') !== undefined) w.write('CLAUDE.md', '@AGENTS.md\n');
	const importsAgents = /^@AGENTS\.md\s*$/m.test(w.read('CLAUDE.md') ?? '');
	for (const rel of importsAgents ? ['AGENTS.md'] : ['CLAUDE.md', 'AGENTS.md']) w.write(rel, upsertBlock(w.read(rel) ?? '', text, START, END));
	// Agents that read their own file first when it exists (Hermes: .hermes.md before AGENTS.md; Gemini: GEMINI.md).
	for (const rel of ['.hermes.md', 'HERMES.md']) if (w.read(rel) !== undefined) w.write(rel, upsertBlock(w.read(rel)!, text, START, END));
	w.write('.cursor/rules/ds.mdc', `---\ndescription: ${brand().name} design system\nalwaysApply: true\n---\n\n${START}\n${text}\n${END}\n`);
	w.write('.claude/settings.json', `${JSON.stringify(mergeHooks(w.json('.claude/settings.json'), binCommand(w.root, 'claude-code'), 'claude-code'), null, 2)}\n`);
	w.write('.codex/hooks.json', `${JSON.stringify(mergeHooks(w.json('.codex/hooks.json'), binCommand(w.root, 'codex'), 'codex'), null, 2)}\n`);
	const cursor = w.json('.cursor/hooks.json') ?? { version: 1, hooks: {} };
	cursor.hooks ??= {};
	const strip = (list: any[] = []) => list.filter((h) => !String(h.command ?? '').includes(' hook '));
	cursor.hooks.preToolUse = [...strip(cursor.hooks.preToolUse), { command: `${binCommand(w.root, 'cursor')} hook pre-tool-use --harness cursor`, matcher: 'Write|Edit|MultiEdit|StrReplace|apply_patch', timeout: 20 }];
	cursor.hooks.stop = [...strip(cursor.hooks.stop), { command: `${binCommand(w.root, 'cursor')} hook stop --harness cursor`, loop_limit: 5 }];
	w.write('.cursor/hooks.json', `${JSON.stringify(cursor, null, 2)}\n`);
	installPreCommit(w);
	const gitignore = w.read('.gitignore') ?? '';
	const ignore = ['.ds/session.json', '.ds/review/', '.ds/hooks.log'].filter((l) => !gitignore.split('\n').includes(l));
	if (ignore.length) w.write('.gitignore', `${gitignore.trimEnd()}\n${ignore.join('\n')}\n`.replace(/^\n/, ''));
}

/** The check in .git/hooks/pre-commit. Git does not share that folder, so session start puts it back on a fresh clone. */
export function installPreCommit(w: Writer) {
	if (!existsSync(join(w.root, '.git'))) return;
	const rel = '.git/hooks/pre-commit';
	const existing = w.read(rel) ?? '#!/bin/sh\n';
	const block = `${binCommand(w.root, 'other')} check --changed || { echo "${cli()} check failed. Fix the errors above before committing."; exit 1; }`;
	if (w.write(rel, upsertBlock(existing.startsWith('#!') ? existing : `#!/bin/sh\n${existing}`, block, '# ds:pre-commit:start', '# ds:pre-commit:end')) && !w.dryRun) chmodSync(join(w.root, rel), 0o755);
}
