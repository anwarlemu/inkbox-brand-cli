import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { brand, cli, isOwnFile } from '../lib/brand.js';
import { MARKUP, SCRIPT, STYLES, styledFiles } from '../project/detect.js';
import { checkIcons, type RawFinding, runRules } from './rules.js';
import { lineOf, loadSource } from './source.js';
import { componentColorEdits } from '../convert/components.js';
import { readState } from '../plan/state.js';
import { type StoredScope, coverage, kindsIn } from '../plan/scope.js';
import { type Surface, surfaceOf } from '../project/surface.js';

export type Finding = { file: string; line: number; column: number; rule: string; message: string; hint: string; snippet: string; fix?: { start: number; end: number; text: string }; overridden?: string };
export type CheckResult = { files: number; findings: Finding[]; overrides: Finding[]; fixed: number; ms: number };

/** Files the check reads: styles, templates and scripts. Native code is converted to brand literals and not checked. */
export const checkable = (rel: string) => STYLES.test(rel) || MARKUP.test(rel) || SCRIPT.test(rel);

export function checkText(relPath: string, text: string, colorSurface?: Surface, kinds?: string[]): { findings: Finding[]; overrides: Finding[] } {
	const file = loadSource(relPath, text);
	const findings: Finding[] = [];
	const overrides: Finding[] = [];
	let raw: RawFinding[] = [];
	try {
		raw = runRules(file);
		// Scripts and the script blocks of templates: imports are read from the full text (templates keep only styles).
		if (SCRIPT.test(relPath) || MARKUP.test(relPath)) checkIcons(text, (f) => raw.push(f));
	} catch (error) {
		raw = [{ rule: 'crash', message: `check crashed: ${(error as Error).message}`, hint: 'Report this to the design system owners.', offset: 0 }];
	}
	const colorEdits = colorSurface ? componentColorEdits(relPath, text, colorSurface, true, kinds) : undefined;
	// A selection of element kinds checks only those elements' colors; the rest of the file is the app's own.
	if (kinds) raw = raw.filter((r) => r.rule === 'raw-color' && colorEdits);
	for (const r of raw) {
		if (r.rule === 'raw-color' && colorEdits) {
			const edit = colorEdits.find((e) => r.offset >= e.start && r.offset < e.end);
			if (!edit) continue;
			r.fix = edit;
			r.hint = `Use the component color: ${edit.text}.`;
		}
		const { line, column } = lineOf(file, r.offset);
		const finding: Finding = { file: relPath, line, column, rule: r.rule, message: r.message, hint: r.hint, snippet: text.slice(r.offset, r.offset + Math.min(r.length ?? 40, 80)).split('\n')[0], fix: r.fix };
		const reason = file.overrides.fileReason ?? file.overrides.lines.get(line) ?? file.overrides.lines.get(line - 1);
		if (reason) overrides.push({ ...finding, overridden: reason });
		else findings.push(finding);
	}
	findings.sort((a, b) => a.line - b.line || a.column - b.column);
	return { findings, overrides };
}

export function applyFixes(text: string, fixes: NonNullable<Finding['fix']>[]) {
	let out = text;
	let lastStart = Number.POSITIVE_INFINITY;
	let applied = 0;
	for (const f of [...fixes].sort((a, b) => b.start - a.start)) {
		if (f.end > lastStart) continue;
		out = out.slice(0, f.start) + f.text + out.slice(f.end);
		lastStart = f.start;
		applied++;
	}
	return { text: out, applied };
}

/**
 * Files changed in git (staged, unstaged, untracked), for pre-commit and the stop hook, relative to the project. Git
 * names them from the repository's top, which is a folder above an app in a monorepo.
 */
export function changedFiles(root: string) {
	try {
		const top = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
		const out = execFileSync('git', ['status', '--porcelain', '--untracked-files=all', '--', '.'], { cwd: root, encoding: 'utf8' });
		const here = realpathSync(root);
		return out.split('\n').filter(Boolean).map((l) => relative(here, join(realpathSync(top), l.slice(3).replace(/^.* -> /, '').replace(/^"|"$/g, ''))).split('\\').join('/')).filter((p) => p && !p.startsWith('..'));
	} catch {
		return [];
	}
}

/** A folder stands for the styled files inside it; a file stands for itself. */
function expandPath(root: string, rel: string): string[] {
	const abs = join(root, rel);
	if (!existsSync(abs) || !statSync(abs).isDirectory()) return [rel];
	return styledFiles(abs).map((f) => relative(root, join(abs, f)));
}

/**
 * The check of one file as the applied selection sees it (plan/scope.ts): undefined when the file is outside it, the
 * whole file, or only the colors of the selected element kinds. With no selection every file is checked in full.
 */
export function scopedCheckText(scope: StoredScope | undefined, rel: string, text: string, colorSurface?: Surface) {
	const cover = coverage(scope, rel);
	if (cover === 'none') return undefined;
	return checkText(rel, text, colorSurface, cover === 'kinds' ? kindsIn(scope, rel) : undefined);
}

/** The file as the last commit has it, or undefined for a file git does not have yet. */
function committedText(root: string, rel: string) {
	try {
		return execFileSync('git', ['show', `HEAD:./${rel}`], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 });
	} catch {
		return undefined;
	}
}

/**
 * Whether checks hold only what a change adds: true while the app has not been converted (set up with init or add
 * only). Its existing styles are the app's own until `apply` converts them, so a commit or an agent that touches one
 * line of an old file is held to that line, not to every value the file already had. New files are checked in full.
 */
export const onlyNewFindings = (root: string) => !readState(root);

export function runCheck(root: string, opts: { paths?: string[]; fix?: boolean; changed?: boolean; colorSurface?: Surface; all?: boolean; scope?: StoredScope; onlyNew?: boolean } = {}): CheckResult & { outside: number } {
	const started = performance.now();
	const state = readState(root);
	const colorsFor = (rel: string) => opts.colorSurface ?? (state?.colors === 'components' ? surfaceOf(rel, { surface: state.surface, mixed: state.mixed, product: 0, site: 0, reasons: [] }) : undefined);
	const all = opts.paths?.length ? opts.paths.flatMap((p) => expandPath(root, p)) : opts.changed ? changedFiles(root) : styledFiles(root);
	const candidates = all.filter((rel) => checkable(rel) && !isOwnFile(rel) && existsSync(join(root, rel)));
	// The brand is enforced only where it was applied: a selection leaves the rest of the app to its own styles.
	const scope = opts.all ? undefined : opts.scope ?? state?.scope;
	const files = candidates.filter((rel) => coverage(scope, rel) !== 'none');
	const findings: Finding[] = [];
	const overrides: Finding[] = [];
	let fixed = 0;
	for (const rel of files) {
		let text = readFileSync(join(root, rel), 'utf8');
		const check = (t: string) => scopedCheckText(scope, rel, t, colorsFor(rel))!;
		let result = check(text);
		if (opts.fix) {
			const fixes = result.findings.map((f) => f.fix).filter((f): f is NonNullable<Finding['fix']> => !!f);
			if (fixes.length) {
				const applied = applyFixes(text, fixes);
				text = applied.text;
				fixed += applied.applied;
				writeFileSync(join(root, rel), text);
				result = check(text);
			}
		}
		const before = opts.onlyNew ? committedText(root, rel) : undefined;
		findings.push(...(before === undefined ? result.findings : newFindings(check(before).findings, result.findings)));
		overrides.push(...result.overrides);
	}
	// A ds-override is an exception a person signs off. Until `approve` records it, it counts as an error.
	const approved = new Set(readApprovals(root).map((a) => a.key));
	const seen = new Set<string>();
	for (const o of overrides) {
		const key = overrideKey(o);
		if (approved.has(key) || seen.has(key)) continue;
		seen.add(key);
		findings.push({ ...o, rule: 'override-approval', message: `ds-override not approved: ${o.rule} (${o.overridden})`, hint: `A person approves it in a terminal with \`${cli()} approve\`. Agents cannot; remove the override and fix the value instead.`, fix: undefined });
	}
	return { files: files.length, findings, overrides, fixed, ms: Math.round(performance.now() - started), outside: candidates.length - files.length };
}

export const formatFinding = (f: Finding) => `${f.file}:${f.line}  ${f.rule}  ${f.message}. ${f.hint}`;
export const findingKey = (f: Finding) => `${f.file}::${f.rule}::${f.snippet.trim() || f.message}`;

/** Findings in `after` that `before` did not have (by key and count), so a hook blocks only what a write adds. */
export function newFindings(before: Finding[], after: Finding[]) {
	const budget = new Map<string, number>();
	for (const f of before) budget.set(findingKey(f), (budget.get(findingKey(f)) ?? 0) + 1);
	return after.filter((f) => {
		const left = budget.get(findingKey(f)) ?? 0;
		if (left > 0) {
			budget.set(findingKey(f), left - 1);
			return false;
		}
		return true;
	});
}

export type Approval = { key: string; file: string; rule: string; reason: string; at: string };
export const overrideKey = (o: { file: string; rule: string; overridden?: string }) => `${o.file}|${o.rule}|${o.overridden ?? ''}`;
const approvalsPath = (root: string) => join(root, '.ds', 'approved-overrides.json');
export function readApprovals(root: string): Approval[] {
	try {
		return JSON.parse(readFileSync(approvalsPath(root), 'utf8')).approvals ?? [];
	} catch {
		return [];
	}
}
export function writeApprovals(root: string, approvals: Approval[]) {
	mkdirSync(join(root, '.ds'), { recursive: true });
	writeFileSync(approvalsPath(root), `${JSON.stringify({ approvals }, null, 2)}\n`);
}
