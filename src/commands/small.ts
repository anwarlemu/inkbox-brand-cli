import { existsSync, readFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { isAbsolute, join, relative } from 'node:path';
import { type Approval, formatFinding, overrideKey, readApprovals, runCheck, writeApprovals } from '../check/engine.js';
import { brand, cli, elements, tokens } from '../lib/brand.js';
import { color, emit } from '../lib/output.js';
import { findProjectRoot } from '../lib/paths.js';
import { elementsIn, renderElement } from '../plan/elements.js';
import { readState, writeState } from '../plan/state.js';
import { type Surface, surfaceOf } from '../project/surface.js';

const relTo = (root: string, p: string) => relative(root, isAbsolute(p) ? p : join(process.cwd(), p)).split('\\').join('/');

/** What the component pass decided for the components of one file (.ds/components.json). */
function componentDecisions(root: string, rel: string): { name: string; item?: string; signals: string[]; action: string; reason: string }[] {
	try {
		return (JSON.parse(readFileSync(join(root, '.ds', 'components.json'), 'utf8')).components ?? []).filter((d: { file: string }) => d.file === rel);
	} catch {
		return [];
	}
}

/** `look <file|element>`: the brand styling for every element found in a file, or for one element kind. */
export function look(target: string | undefined, opts: { surface?: string; json?: boolean }) {
	const root = findProjectRoot();
	const state = readState(root);
	if (!target) {
		const surface = (opts.surface as Surface) ?? state?.surface ?? 'site';
		const list = Object.entries(elements()[surface]).map(([id, e]) => `  ${id.padEnd(22)} ${e.name}`);
		emit(opts, Object.keys(elements()[surface]), () => [`${surface === 'product' ? 'Product' : 'Site'} elements (\`${cli()} look <id>\` or \`${cli()} look <file>\`):`, ...list].join('\n'));
		return;
	}
	const rel = relTo(root, target);
	if (existsSync(join(root, rel))) {
		const surface: Surface = (opts.surface as Surface) ?? (state ? surfaceOf(rel, { surface: state.surface, mixed: state.mixed, product: 0, site: 0, reasons: [] }) : 'site');
		const hits = elementsIn(rel, readFileSync(join(root, rel), 'utf8'), surface);
		const kinds = [...new Set(hits.map((h) => h.kind))];
		const components = componentDecisions(root, rel);
		const componentLines = components.map((d) => `  ${d.name}: ${d.item ? `a ${d.item} (${d.signals.join(', ')}); ${d.reason}` : d.reason}.${d.item && d.action === 'refine' ? ` Restyle it as the library's ${d.item}${brand().registryUrl ? `: ${brand().registryUrl}/components/${d.item}` : ""}` : ''}`);
		emit(opts, { file: rel, surface, elements: hits, components }, () =>
			hits.length || components.length
				? [
						...(components.length ? [color.bold(`${rel}: components`), ...componentLines, ''] : []),
						color.bold(`${rel}: ${hits.length} elements, ${kinds.length} kinds (${surface}). Give each its styling; keep the element, its words and its place.`),
						...kinds.map((k) => [`\n${hits.filter((h) => h.kind === k).slice(0, 6).map((h) => `  line ${h.line}: ${h.label}`).join('\n')}`, renderElement(k, surface)].join('\n')),
					].join('\n')
				: `${rel}: no elements recognized. \`${cli()} look\` lists the kinds; style them by role.`,
		);
		return;
	}
	const surface: Surface = (opts.surface as Surface) ?? (elements().site[target] ? 'site' : 'product');
	const text = renderElement(target, surface);
	if (!text) throw new Error(`No file or element named ${target}. \`${cli()} look\` lists the elements.`);
	emit(opts, elements()[surface][target], () => text);
}

/** `check [files]`: the deterministic value check used by hooks, pre-commit and CI. */
export function check(paths: string[], opts: { fix?: boolean; changed?: boolean; json?: boolean }) {
	const root = findProjectRoot();
	const result = runCheck(root, { paths: paths.map((p) => relTo(root, p)), fix: opts.fix, changed: opts.changed });
	emit(opts, result, () =>
		[
			...result.findings.slice(0, 200).map(formatFinding),
			result.findings.length > 200 ? `...and ${result.findings.length - 200} more` : '',
			result.findings.length ? color.red(`${result.findings.length} values are not brand tokens (${result.files} files, ${result.ms}ms).`) : color.green(`Every style value is a brand token (${result.files} files, ${result.ms}ms).`),
			result.fixed ? `Fixed ${result.fixed} exact matches.` : '',
		]
			.filter(Boolean)
			.join('\n'),
	);
	process.exitCode = result.findings.length ? 1 : 0;
}

/** `tokens [term]`: find a brand token by name or value. */
export function tokensCommand(term: string | undefined, opts: { json?: boolean }) {
	const t = tokens();
	const rows = Object.entries(t.site).filter(([k, v]) => !term || k.includes(term) || v.toLowerCase().includes(term.toLowerCase()));
	const product = Object.entries(t.product).filter(([k, v]) => t.site[k] !== v && (!term || k.includes(term)));
	emit(opts, { site: Object.fromEntries(rows), product: Object.fromEntries(product) }, () =>
		[
			...rows.map(([k, v]) => `  ${k.padEnd(34)} ${v}`),
			...(product.length ? ['  In a product (15px root, compact):', ...product.map(([k, v]) => `  ${k.padEnd(34)} ${v}`)] : []),
			rows.length ? `Use them as var(--name). Tailwind 4 classes read the same names (bg-surface, text-fg-muted, rounded-card).` : `No token matches "${term}".`,
		].join('\n'),
	);
}

/** `approve`: a person signs off ds-override comments. Needs a terminal, so an agent cannot do it. */
export async function approve(opts: { all?: boolean }) {
	const root = findProjectRoot();
	if (!process.stdin.isTTY) throw new Error('approve needs a person at a terminal. Agents cannot approve overrides; ask the user to run it.');
	const result = runCheck(root);
	const pending = result.findings.filter((f) => f.rule === 'override-approval');
	if (!pending.length) return console.log('No overrides waiting for approval.');
	const approvals: Approval[] = readApprovals(root);
	const rl = createInterface({ input: process.stdin, output: process.stdout });
	for (const f of pending) {
		const original = result.overrides.find((o) => o.file === f.file && o.line === f.line);
		if (!original) continue;
		const answer = opts.all ? 'y' : await rl.question(`${f.file}:${f.line}  ${f.message}\n  ${f.snippet}\nApprove? [y/N] `);
		if (/^y/i.test(answer)) approvals.push({ key: overrideKey(original), file: original.file, rule: original.rule, reason: original.overridden ?? '', at: new Date().toISOString() });
	}
	rl.close();
	writeApprovals(root, approvals);
	console.log(`${approvals.length} overrides approved in total (.ds/approved-overrides.json; commit it).`);
}

/** `skip <screen> --reason`: leaves a screen as it is; the reason is shown to the person in the final summary. */
export function skip(id: string, reason: string) {
	const root = findProjectRoot();
	const state = readState(root);
	if (!state || !state.screens.some((s) => s.id === id)) throw new Error(`No screen ${id}. Run \`${cli()}\` to see the tasks.`);
	if (!reason?.trim()) throw new Error('Give the reason: --reason "<why>".');
	state.skipped = { ...state.skipped, [id]: reason.trim() };
	writeState(root, state);
	console.log(`Skipped ${id}. Run \`${cli()}\` for the next task.`);
}

/** `done <screen>`: marks a native screen restyled, where no browser review is possible. */
export function done(id: string) {
	const root = findProjectRoot();
	const state = readState(root);
	const screen = state?.screens.find((s) => s.id === id);
	if (!state || !screen) throw new Error(`No screen ${id}. Run \`${cli()}\` to see the tasks.`);
	if (screen.url) throw new Error(`${id} is a web screen: it is done when \`${cli()} review <url>\` passes.`);
	state.marked = [...new Set([...state.marked, id])];
	writeState(root, state);
	console.log(`Marked ${id} done. Run \`${cli()}\` for the next task.`);
	void brand;
}
