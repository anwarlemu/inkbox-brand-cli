import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { brand, cli, isOwnFile } from '../lib/brand.js';
import { MARKUP, SCRIPT, STYLES, styledFiles } from '../project/detect.js';
import { checkIcons, type RawFinding, runRules } from './rules.js';
import { lineOf, loadSource } from './source.js';

export type Finding = { file: string; line: number; column: number; rule: string; message: string; hint: string; snippet: string; fix?: { start: number; end: number; text: string }; overridden?: string };
export type CheckResult = { files: number; findings: Finding[]; overrides: Finding[]; fixed: number; ms: number };

/** Files the check reads: styles, templates and scripts. Native code is converted to brand literals and not checked. */
export const checkable = (rel: string) => STYLES.test(rel) || MARKUP.test(rel) || SCRIPT.test(rel);

export function checkText(relPath: string, text: string): { findings: Finding[]; overrides: Finding[] } {
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
	for (const r of raw) {
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

/** Files changed in git (staged, unstaged, untracked), for pre-commit and the stop hook. */
export function changedFiles(root: string) {
	try {
		const out = execFileSync('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: root, encoding: 'utf8' });
		return out.split('\n').filter(Boolean).map((l) => l.slice(3).replace(/^.* -> /, '').replace(/^"|"$/g, ''));
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

export function runCheck(root: string, opts: { paths?: string[]; fix?: boolean; changed?: boolean } = {}): CheckResult {
	const started = performance.now();
	const all = opts.paths?.length ? opts.paths.flatMap((p) => expandPath(root, p)) : opts.changed ? changedFiles(root) : styledFiles(root);
	const files = all.filter((rel) => checkable(rel) && !isOwnFile(rel) && existsSync(join(root, rel)));
	const findings: Finding[] = [];
	const overrides: Finding[] = [];
	let fixed = 0;
	for (const rel of files) {
		let text = readFileSync(join(root, rel), 'utf8');
		let result = checkText(rel, text);
		if (opts.fix) {
			const fixes = result.findings.map((f) => f.fix).filter((f): f is NonNullable<Finding['fix']> => !!f);
			if (fixes.length) {
				const applied = applyFixes(text, fixes);
				text = applied.text;
				fixed += applied.applied;
				writeFileSync(join(root, rel), text);
				result = checkText(rel, text);
			}
		}
		findings.push(...result.findings);
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
	return { files: files.length, findings, overrides, fixed, ms: Math.round(performance.now() - started) };
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
