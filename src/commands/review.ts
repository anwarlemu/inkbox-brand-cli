import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { brand, cli } from '../lib/brand.js';
import { color, emit } from '../lib/output.js';
import { findProjectRoot } from '../lib/paths.js';
import { type State, readState, writeState } from '../plan/state.js';
import { mainScreens } from '../plan/tasks.js';
import { runCheck } from '../check/engine.js';
import { findMainStylesheet } from '../project/detect.js';
import type { Screen } from '../project/screens.js';
import { capture } from '../review/capture.js';
import { type Scorecard, beforeShots, brief, critique, pickEngine, scorecardSchema } from '../review/critique.js';

// `review <url>`: screenshots at desktop and phone width, critiqued against the brand's own pages. The result is
// recorded for the screen it belongs to, which is how a task is checked off. Only task screens are reviewed, and a
// screen that failed is reviewed again only once its files changed, so agents fix the punch list instead of re-rolling.

const MAX_ROUNDS = 2;

type Opts = { json?: boolean; threshold?: string; any?: boolean; submit?: string; all?: boolean; brief?: boolean };

/** A fingerprint of what a screen is drawn from (its files and the main stylesheet). */
function filesHash(root: string, screen: Screen) {
	const h = createHash('sha1');
	const main = findMainStylesheet(root);
	for (const rel of [...screen.files, ...(main ? [main] : [])].sort()) {
		try {
			h.update(rel).update(readFileSync(join(root, rel)));
		} catch {}
	}
	return h.digest('hex').slice(0, 16);
}

/**
 * What can be measured is checked before the model looks: values that are not brand tokens, and anything crossing the
 * column lines. Either fails at once, so no review is spent on a screen that cannot pass yet.
 */
function blockers(root: string, screen: Screen | undefined, outside: string[]) {
	const errors = screen ? runCheck(root, { paths: screen.files }).findings.length : 0;
	const out: string[] = [];
	if (errors) out.push(`${errors} values in this screen's files are not brand tokens: \`${cli()} check ${screen!.files.slice(0, 3).join(' ')}${screen!.files.length > 3 ? ' ...' : ''}\` lists each with its token.`);
	if (outside.length) out.push(`Content crosses the column lines (measured):\n${outside.map((o) => `    ${o}`).join('\n')}\n  Keep everything between the lines: containers use max-width var(--ds-frame-column) with padding inside (\`${cli()} look column\`); an arrangement wider than the column (a product shot with floating windows) is scaled as a whole so every piece keeps its size and place relative to the others, never by enlarging one part or moving pieces over each other; a wide table scrolls inside its card.`);
	return out;
}

function screenFor(state: State | undefined, target: string) {
	const path = new URL(target).pathname.replace(/\/index\.html?$/, '/').replace(/(.)\/$/, '$1') || '/';
	// Its route, or a dynamic route with the same shape (/blog/[slug] for /blog/hello).
	return state?.screens.find((s) => s.url === path || s.url === `${path}.html`) ?? state?.screens.find((s) => s.url && new RegExp(`^${s.url.replace(/\[[^\]]+\]/g, '[^/]+')}$`).test(path));
}

export async function review(target: string | undefined, opts: Opts) {
	const root = findProjectRoot();
	const state = readState(root);
	if (opts.submit) return submit(root, state, opts);
	if (opts.all) return reviewAll(root, state, target, opts);
	if (!target || !/^https?:\/\//.test(target)) {
		const hint = state?.baseUrl ? `${state.baseUrl}${target ?? '/'}` : 'http://localhost:<port>/<page>';
		throw new Error(`Start the app and pass the page's URL: \`${cli()} review ${hint}\`.`);
	}
	const screen = screenFor(state, target);
	if (state && !opts.any) {
		const tasks = mainScreens(state);
		if (!screen || !tasks.some((s) => s.id === screen.id)) {
			console.log(`${new URL(target).pathname} is not one of the tasks (${tasks.map((s) => s.id).join(', ')}). Review the screen of the current task; run \`${cli()}\` to see it.`);
			process.exitCode = 1;
			return;
		}
		const openCount = tasks.filter((t) => !state.reviews[t.id]?.passed && !state.skipped?.[t.id]).length;
		if (openCount > 1) {
			console.log(`The task screens are reviewed together: \`${cli()} review --all ${new URL(target).origin}\` (in parallel, only the ones that changed).`);
			process.exitCode = 1;
			return;
		}
		const last = state.reviews[screen.id];
		if (last && !last.passed && last.files && last.files === filesHash(root, screen)) {
			console.log(`Nothing ${screen.id} is drawn from changed since its last review. Fix its punch list first:\n${last.punch.slice(0, 5).map((p, i) => `  ${i + 1}. ${p.where}: ${p.issue}\n     Fix: ${p.fix}`).join('\n')}`);
			process.exitCode = 1;
			return;
		}
	}
	const surface = screen?.surface ?? state?.surface ?? 'site';
	const outDir = join(root, '.ds', 'review', new Date().toISOString().replace(/[:.]/g, '-'));
	const { shots, outside, facts } = await capture(target, ['desktop', 'mobile'], outDir);
	const previous = screen ? state?.reviews[screen.id] : undefined;
	const stop = blockers(root, screen, outside);
	if (stop.length) {
		console.log([color.red(`${screen?.id ?? target} is not ready for its review (nothing was scored):`), ...stop.map((b) => `  ${b}`), `  Fix these, then review again.`].join('\n'));
		process.exitCode = 1;
		return;
	}
	if (pickEngine() === 'self') {
		const dir = brief(shots, target, surface, previous, screen ? beforeShots(root, screen.id) : [], facts);
		writeFileSync(join(dir, 'meta.json'), `${JSON.stringify({ url: target, screen: screen?.id, outside })}\n`);
		const rel = relative(root, dir);
		console.log(
			[
				`Screenshots of ${target} are saved; there is no separate reviewer here, so you score it.`,
				`  1. Read ${rel}/brief.md and open every image it lists (the brand's pages first, then this screen).`,
				`  2. Score it honestly against the rubric and write ${rel}/scorecard.json in the shape shown there.`,
				`  3. Run \`${cli()} review --submit ${rel}\`.`,
				color.dim('  The person sees which screens were scored by the agent itself.'),
			].join('\n'),
		);
		return;
	}
	const { card, model } = await critique(shots, target, surface, previous, screen ? beforeShots(root, screen.id) : [], facts);
	record(root, state, screen, target, withOutside(card, outside), model, outDir, opts);
}

/**
 * `review --all [base url]`: every task screen not passed yet (and changed since a failed review), scored at once.
 * Restyle several screens, then run this once instead of waiting on one review per screen.
 */
async function reviewAll(root: string, state: State | undefined, target: string | undefined, opts: Opts) {
	if (!state) throw new Error(`Run \`${cli()}\` first.`);
	const base = (target && /^https?:\/\//.test(target) ? new URL(target).origin : state.baseUrl)?.replace(/\/$/, '');
	if (!base) throw new Error(`Start the app and pass its address: \`${cli()} review --all http://localhost:<port>\`.`);
	state.baseUrl = base;
	const due = mainScreens(state).filter((s) => {
		if (!s.url || s.url.includes('[') || state.skipped?.[s.id]) return false;
		const last = state.reviews[s.id];
		return !last?.passed && !(last?.files && last.files === filesHash(root, s));
	});
	if (!due.length) {
		console.log(`No task screen needs a review: each passed, was skipped, or has not changed since its last review. Run \`${cli()}\`.`);
		return;
	}
	const self = pickEngine() === 'self';
	console.log(`Reviewing ${due.length} screens at once: ${due.map((s) => s.id).join(', ')}`);
	const stamp = new Date().toISOString().replace(/[:.]/g, '-');
	const results: { id: string; pass: boolean; line: string }[] = [];
	const queue = [...due];
	const worker = async () => {
		for (let s = queue.shift(); s; s = queue.shift()) {
			const url = `${base}${s.url}`;
			const outDir = join(root, '.ds', 'review', `${stamp}${s.id.replace(/[^\w-]+/g, '_')}`);
			try {
				const { shots, outside, facts } = await capture(url, ['desktop', 'mobile'], outDir);
				const stop = blockers(root, s, outside);
				if (stop.length) {
					results.push({ id: s.id, pass: false, line: [color.red(`Not ready ${s.id} (not scored):`), ...stop.map((b) => `  ${b}`)].join('\n') });
					continue;
				}
				if (self) {
					const dir = brief(shots, url, s.surface, state.reviews[s.id], beforeShots(root, s.id), facts);
					writeFileSync(join(dir, 'meta.json'), `${JSON.stringify({ url, screen: s.id, outside })}\n`);
					results.push({ id: s.id, pass: false, line: `  ${s.id}: score it from ${relative(root, dir)}/brief.md, then \`${cli()} review --submit ${relative(root, dir)}\`` });
					continue;
				}
				const { card, model } = await critique(shots, url, s.surface, state.reviews[s.id], beforeShots(root, s.id), facts);
				const pass = record(root, state, s, url, withOutside(card, outside), model, outDir, { ...opts, brief: true });
				results.push({ id: s.id, pass, line: '' });
			} catch (e) {
				results.push({ id: s.id, pass: false, line: `  ${s.id}: could not review (${(e as Error).message.split('\n')[0]})` });
			}
		}
	};
	await Promise.all(Array.from({ length: Math.min(4, due.length) }, worker));
	for (const r of results.filter((x) => x.line)) console.log(r.line);
	const passed = results.filter((r) => r.pass).length;
	console.log(self ? '' : `${passed} of ${due.length} passed. Fix the punch lists (styling only), then \`${cli()} review --all\` again; \`${cli()}\` shows the next task.`);
	process.exitCode = passed === due.length ? 0 : 1;
}

function submit(root: string, state: State | undefined, opts: Opts) {
	const dir = join(root, opts.submit!);
	const metaPath = join(dir, 'meta.json');
	if (!existsSync(metaPath)) throw new Error(`${opts.submit} is not a review folder (no meta.json). Run \`${cli()} review <url>\` first.`);
	if (!existsSync(join(dir, 'scorecard.json'))) throw new Error(`Write ${opts.submit}/scorecard.json first (the shape is in brief.md).`);
	const meta = JSON.parse(readFileSync(metaPath, 'utf8')) as { url: string; screen?: string; outside?: string[] };
	const parsed = scorecardSchema.safeParse(JSON.parse(readFileSync(join(dir, 'scorecard.json'), 'utf8')));
	if (!parsed.success) throw new Error(`scorecard.json does not match the shape in brief.md: ${parsed.error.issues.slice(0, 3).map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
	const screen = state?.screens.find((s) => s.id === meta.screen);
	record(root, state, screen, meta.url, withOutside(parsed.data, meta.outside ?? []), 'self', dir, opts);
}

/**
 * Content outside the column lines is measured, not judged: any of it is a blocker and caps the coherence score, so
 * the screen cannot pass until everything sits between the lines.
 */
function withOutside(card: Scorecard, outside: string[]): Scorecard {
	if (!outside.length) return card;
	return {
		...card,
		scores: { ...card.scores, coherence: Math.min(card.scores.coherence, 5) },
		punch_list: [{ viewport: 'desktop + mobile', region: 'column lines', issue: `Content crosses the ruled column lines (measured): ${outside.join('; ')}.`, fix: 'Keep every element between the lines: containers use max-width var(--ds-frame-column) with their padding inside (`look column`); pull offset or absolutely placed pieces in; a wide table or code block scrolls inside its card.', severity: 'blocker' }, ...card.punch_list],
	};
}

function record(root: string, state: State | undefined, screen: Screen | undefined, target: string, card: Scorecard, model: string, outDir: string, opts: Opts): boolean {
	const threshold = Number(opts.threshold ?? brand().reviewThreshold);
	// At most two rounds: by the second, a screen with no blocker left passes and its remaining issues go to the person.
	const rounds = (screen && state?.reviews[screen.id]?.rounds ? state.reviews[screen.id].rounds! : 0) + 1;
	const blocker = card.punch_list.some((p) => p.severity === 'blocker');
	const failing = rounds >= MAX_ROUNDS && !blocker ? [] : Object.entries(card.scores).filter(([, v]) => v < threshold);
	if (blocker && !failing.length) failing.push(['blocker', 0]);
	mkdirSync(outDir, { recursive: true });
	writeFileSync(join(outDir, 'scorecard.json'), `${JSON.stringify({ url: target, model, ...card }, null, 2)}\n`);
	if (state) {
		state.baseUrl = new URL(target).origin;
		if (screen) {
			state.reviews[screen.id] = {
				at: new Date().toISOString(),
				url: target,
				scores: card.scores,
				passed: failing.length === 0,
				punch: card.punch_list.map((p) => ({ severity: p.severity, where: `${p.viewport} / ${p.region}`, issue: p.issue, fix: p.fix })),
				verdict: card.verdict,
				by: model,
				files: filesHash(root, screen),
				rounds,
			};
		}
		writeState(root, state);
	}
	if (opts.brief) {
		const scores = Object.entries(card.scores).map(([k, v]) => `${k} ${v < threshold ? color.red(String(v)) : color.green(String(v))}`).join(', ');
		console.log([`${failing.length ? color.red('Not yet') : color.green('Passed')} ${screen?.id ?? target}: ${scores}`, ...card.punch_list.slice(0, 4).map((p, i) => `  ${i + 1}. [${p.severity}] ${p.viewport} / ${p.region}: ${p.issue}\n     Fix: ${p.fix}`)].join('\n'));
		return failing.length === 0;
	}
	emit(opts, { url: target, screen: screen?.id, model, threshold, pass: failing.length === 0, ...card, screenshots: outDir }, () =>
		[
			`Review of ${target}${screen ? ` (screen ${screen.id})` : ''}, threshold ${threshold}`,
			`  For: ${card.purpose}`,
			...Object.entries(card.scores).map(([k, v]) => `  ${k.padEnd(15)} ${v < threshold ? color.red(String(v)) : color.green(String(v))}`),
			'',
			...card.punch_list.map((p, i) => `  ${i + 1}. [${p.severity}] ${p.viewport} / ${p.region}: ${p.issue}\n     Fix: ${p.fix}`),
			'',
			card.verdict,
			failing.length ? color.red(`Below ${threshold}: ${failing.map(([k]) => k).join(', ')}. Fix the punch list (styling only) and review again.`) : color.green(`Passed. Run \`${cli()}\` for the next task.`),
			color.dim(`Screenshots: ${outDir}`),
		].join('\n'),
	);
	process.exitCode = failing.length ? 1 : 0;
	return failing.length === 0;
}

/**
 * `snapshot [base url]`: each main screen as it is now, before hand edits, so every review can check the composition
 * (sizes, proportions, overlaps, effects) stayed the same.
 */
export async function snapshot(target: string | undefined) {
	const root = findProjectRoot();
	const state = readState(root);
	if (!state) throw new Error(`Run \`${cli()}\` first.`);
	const base = (target && /^https?:\/\//.test(target) ? new URL(target).origin : state.baseUrl)?.replace(/\/$/, '');
	if (!base) throw new Error(`Start the app and pass its address: \`${cli()} snapshot http://localhost:<port>\`.`);
	state.baseUrl = base;
	writeState(root, state);
	const queue = mainScreens(state).filter((s) => s.url && !s.url.includes('['));
	const done: string[] = [];
	const worker = async () => {
		for (let s = queue.shift(); s; s = queue.shift()) {
			const dir = join(root, '.ds', 'before', s.id.replace(/[^\w-]+/g, '_') || 'home');
			try {
				await capture(`${base}${s.url}`, ['desktop'], dir);
				done.push(s.id);
			} catch (e) {
				console.log(`  ${s.id}: could not capture (${(e as Error).message.split('\n')[0]})`);
			}
		}
	};
	await Promise.all(Array.from({ length: 4 }, worker));
	console.log(`Saved how ${done.length} screens look before hand edits (.ds/before). Reviews compare against them: keep every element's size, place and effect. Now do the task.`);
}
