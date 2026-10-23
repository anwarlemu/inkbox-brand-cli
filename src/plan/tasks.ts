import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { brand, cli, hasFrame } from '../lib/brand.js';
import { runCheck } from '../check/engine.js';
import { color } from '../lib/output.js';
import type { Screen } from '../project/screens.js';
import { elementsIn } from './elements.js';
import type { State } from './state.js';

// The queue: one task per main screen (the first also covers the shared shell), then a final sweep. A task is done
// when its files pass the check and its review scored at least the threshold; nothing is self-reported.

export const MAX_SCREENS = 4;

/** The touches the CLI adds to a site's home, in words ("The hero's attribute and the accented headings are"). */
export function touchNote() {
	const { hero, accent } = brand().touches;
	const parts = [hero && `The hero's ${hero.attribute} (${hero.does})`, accent && `the closing words of the home headings in ds-accent`].filter(Boolean) as string[];
	return parts.length ? `${parts.join(' and ')} ${parts.length > 1 ? 'are' : 'is'}` : '';
}

export type TaskStatus = { screen: Screen; errors: number; reviewed: boolean; passed: boolean; touches: string[]; skipped: boolean; done: boolean };

/** What a site's home needs beyond styles: the brand's touches (brand.json), the hero's attribute and accented headings. */
export function missingTouches(root: string, screen: Screen, isHome: boolean): string[] {
	if (screen.surface !== 'site' || !isHome) return [];
	const text = screen.files.map((rel) => {
		try {
			return readFileSync(join(root, rel), 'utf8');
		} catch {
			return '';
		}
	}).join('\n');
	const { hero, accent } = brand().touches;
	const missing: string[] = [];
	if (hero && !new RegExp(`\\b${hero.attribute}\\b`).test(text)) missing.push('hero');
	if (accent && !/\bds-accent\b/.test(text)) missing.push('accent');
	return missing;
}

export function taskStatus(root: string, state: State, screen: Screen, index: number): TaskStatus {
	if (state.skipped?.[screen.id]) return { screen, errors: 0, reviewed: false, passed: false, touches: [], skipped: true, done: true };
	const check = runCheck(root, { paths: screen.files });
	const review = state.reviews[screen.id];
	const touches = missingTouches(root, screen, index === 0);
	const native = !screen.url;
	const passed = native ? state.marked.includes(screen.id) : !!review?.passed;
	return { screen, errors: check.findings.length, reviewed: !!review, passed, touches, skipped: false, done: check.findings.length === 0 && passed && touches.length === 0 };
}

/** The screens that are tasks: those chosen by layout at setup (`state.main`), else the first few. */
export const mainScreens = (state: State) => {
	const chosen = state.main?.map((id) => state.screens.find((s) => s.id === id)).filter((s): s is Screen => !!s);
	return chosen?.length ? chosen : state.screens.slice(0, MAX_SCREENS);
};

/**
 * The screens to review, home first: each next one is the screen that adds the most the others do not cover, its own
 * layout or stylesheet (which counts most) and element kinds not seen yet (a pricing table, a form). Screens that
 * add nothing share their look with one already chosen, so its review covers them. At most MAX_SCREENS.
 */
export function pickMain(root: string, screens: Screen[], shell: string[]): string[] {
	if (!screens.length) return [];
	// A small site is reviewed in full; the choosing is for sites with more screens than slots.
	const isError = (s: Screen) => /(^|\/)(404|500|_?error|not-found)(\.html?)?$/i.test(s.url ?? s.id);
	if (screens.filter((s) => !isError(s)).length <= MAX_SCREENS) return screens.filter((s) => !isError(s)).map((s) => s.id);
	const shared = new Set(shell);
	const own = (s: Screen) => s.files.filter((f) => !shared.has(f));
	const signature = (s: Screen) => own(s).filter((f) => /\.(css|scss|sass|less|styl)$/.test(f) || /(^|\/)(layouts?|templates?)\//i.test(f));
	const kinds = new Map<string, Set<string>>();
	for (const s of screens) {
		const set = new Set<string>();
		for (const rel of own(s)) {
			try {
				for (const h of elementsIn(rel, readFileSync(join(root, rel), 'utf8'), s.surface)) set.add(h.kind);
			} catch {}
		}
		kinds.set(s.id, set);
	}
	// The pages the header links to are the ones people see most.
	const headerFiles = shell.filter((rel) => /(^|\/)[^/]*(header|nav|navbar|topbar|menu)[^/]*\.\w+$/i.test(rel) && !/footer/i.test(rel));
	const navText = (headerFiles.length ? headerFiles : shell).map((rel) => {
		try {
			return readFileSync(join(root, rel), 'utf8');
		} catch {
			return '';
		}
	}).join('\n');
	const navBlocks = headerFiles.length ? navText : [...navText.replace(/<footer\b[\s\S]*?<\/footer>/gi, '').matchAll(/<(nav|header)\b[\s\S]*?<\/\1>/gi)].map((m) => m[0]).join('\n');
	const linked = new Set([...navBlocks.matchAll(/href=["'{`]+(\/[\w\-/]*)/g)].map((m) => m[1].replace(/(.)\/$/, '$1').replace(/\.html$/, '')).flatMap((u) => [u, `${u}.html`]));
	const picked = [screens[0]];
	const seenKinds = new Set(kinds.get(screens[0].id));
	const seenFiles = new Set(signature(screens[0]));
	while (picked.length < Math.min(MAX_SCREENS, screens.length)) {
		let best: Screen | undefined;
		let bestScore = -1;
		for (const s of screens) {
			if (picked.includes(s) || isError(s)) continue;
			const k = kinds.get(s.id) ?? new Set();
			const score = (linked.has(s.url ?? '') ? 4 : 0) + signature(s).filter((f) => !seenFiles.has(f)).length * 3 + [...k].filter((x) => !seenKinds.has(x)).length - (k.size < 3 ? 3 : 0);
			if (score > bestScore) [best, bestScore] = [s, score];
		}
		if (!best || bestScore <= 0) break;
		picked.push(best);
		for (const k of kinds.get(best.id) ?? []) seenKinds.add(k);
		for (const f of signature(best)) seenFiles.add(f);
	}
	return picked.map((s) => s.id);
}

/** The text of one task: short, concrete, with the elements to restyle and how the task is checked. */
export function renderTask(root: string, state: State, status: TaskStatus, index: number, total: number): string {
	const s = status.screen;
	const threshold = brand().reviewThreshold;
	const where = s.url ? `${s.url === '/' ? 'the home page' : s.url}` : s.id;
	const kinds = new Map<string, Map<string, number>>();
	for (const rel of s.files) {
		let text = '';
		try {
			text = readFileSync(join(root, rel), 'utf8');
		} catch {
			continue;
		}
		const counts = new Map<string, number>();
		for (const h of elementsIn(rel, text, s.surface)) counts.set(h.kind, (counts.get(h.kind) ?? 0) + 1);
		if (counts.size) kinds.set(rel, counts);
	}
	const url = s.url && state.baseUrl ? `${state.baseUrl.replace(/\/$/, '')}${s.url}` : s.url ? `http://localhost:<port>${s.url}` : undefined;
	const snapped = existsSync(join(root, '.ds', 'before'));
	const lines = [
		...(index === 0 && !snapped && s.url ? [color.bold(`Before any edit: run the app and \`${cli()} snapshot ${state.baseUrl ?? 'http://localhost:<port>'}\` (saves how each screen looks now; reviews check sizes, places and effects stay the same).`)] : []),
		color.bold(`Task ${index + 1} of ${total}: ${where}${index === 0 ? (s.surface === 'product' ? ' and the app shell (sidebar, top bar, page)' : ' and the shared shell (header, footer, page)') : ''} (${s.surface === 'product' ? 'product screen' : 'site page'}).`),
		`  First say in one line what this screen is for. Keep that: its main action stays the most prominent thing; no words or elements change.`,
		`  Restyle each element the way \`${cli()} look <file>\` shows (exact CSS and Tailwind, with states):`,
		...[...kinds].slice(0, 8).map(([rel, counts]) => `    ${rel}: ${[...counts].map(([k, n]) => (n > 1 ? `${k} x${n}` : k)).join(', ')}`),
		...(kinds.size > 8 ? [`    ...and ${kinds.size - 8} more files`] : []),
		...(status.touches.includes('hero') ? [`  Add ${brand().touches.hero!.attribute} to the hero section (${brand().touches.hero!.does}).`] : []),
		...(status.touches.includes('accent') ? [`  Wrap the closing words of the hero headline and of each section heading in <span class="ds-accent"> (same words, ${brand().touches.accent!.does}; never a whole heading).`] : []),
		...(status.errors ? [`  ${status.errors} values here are not brand tokens yet: \`${cli()} check ${s.files.slice(0, 3).join(' ')}${s.files.length > 3 ? ' ...' : ''}\` lists each with the token to use.`] : []),
		url
			? `  Then run the app and \`${cli()} review ${url}\`. Done when every score is ${threshold} or more and the check is clean; fix its punch list until then.`
			: `  Native screen: build and look at it, then \`${cli()} done ${s.id}\`.`,
		`  If it cannot pass without changing words or elements (or cannot run here), \`${cli()} skip ${s.id} --reason "<why>"\`; the person sees every skip.`,
		...(status.reviewed && !status.passed ? [color.yellow(`  Last review did not pass: ${(state.reviews[s.id]?.punch ?? []).slice(0, 3).map((p) => p.issue).join('; ')}`)] : []),
		`  Then run \`${cli()}\` for the next task.`,
	];
	return lines.join('\n');
}

/**
 * Once the shell and home are done, the remaining screens are one task: restyle them all (they share the shell, so
 * most of the look is already there), then score them together with `review --all`.
 */
/**
 * What the component pass decided that the agent finishes: components identified as a library item the CLI could not
 * apply on its own (a header, a pricing table), to restyle as that item, and the least certain identifications, to
 * confirm. Read from .ds/components.json.
 */
function componentNotes(root: string): string[] {
	let decisions: { file: string; name: string; item?: string; confidence: number; action: string }[] = [];
	try {
		decisions = JSON.parse(readFileSync(join(root, '.ds', 'components.json'), 'utf8')).components ?? [];
	} catch {
		return [];
	}
	const finish = decisions.filter((d) => d.item && d.action === 'refine');
	const unsure = decisions.filter((d) => d.item && d.action !== 'refine' && d.confidence < 0.7);
	const list = (ds: typeof decisions) => ds.slice(0, 8).map((d) => `${d.name} (${d.item}, ${d.file})`).join('; ');
	return [
		...(finish.length ? [`  These components are library items the CLI left to you: restyle each as its item (\`${cli()} look <file>\` shows the item and its component): ${list(finish)}${finish.length > 8 ? `, and ${finish.length - 8} more in .ds/components.json` : ''}.`] : []),
		...(unsure.length ? [`  Check these identifications (the CLI was least sure); if one is wrong, put the component back from git and restyle it as what it is: ${list(unsure)}.`] : []),
	];
}

export function renderBatch(root: string, state: State, statuses: TaskStatus[], done: number, total: number): string {
	const threshold = brand().reviewThreshold;
	const base = state.baseUrl ?? 'http://localhost:<port>';
	const home = statuses.find((st) => st.screen.id === state.screens[0]?.id);
	const snapped = existsSync(join(root, '.ds', 'before'));
	const lines = [
		...(!snapped ? [color.bold(`Before any edit: run the app and \`${cli()} snapshot ${base}\` (saves how each screen looks now; reviews check sizes, places and effects stay the same).`)] : []),
		color.bold(`Task 1 of 2: ${statuses.length === 1 ? 'the main screen' : `${statuses.length} main screens`}${home ? ` and the shared shell (${home.screen.surface === 'product' ? 'sidebar, top bar, page' : 'header, footer, page'})` : ''} (${done} of ${total} done). Restyle them all, then review them together.`),
		`  For each: say in one line what it is for and keep that; no words or elements change. Restyle its elements the way \`${cli()} look <file>\` shows.`,
		...(home ? [`  The shell (${home.screen.surface === 'product' ? 'sidebar, top bar, page' : 'header, footer, page frame'}) shows on every page: start there.${home.screen.surface === 'site' && touchNote() ? ` ${touchNote()} already in place; check ${brand().touches.hero && brand().touches.accent ? 'them' : 'it'}.` : ''}`] : []),
		...(home?.touches.includes('hero') ? [`  Add ${brand().touches.hero!.attribute} to the hero section where it is not yet (${brand().touches.hero!.does}).`] : []),
		...(home?.touches.includes('accent') ? ['  Wrap the closing words of the hero headline and of each section heading in <span class="ds-accent"> where they are not yet (same words; never a whole heading).'] : []),
		...componentNotes(root),
	];
	for (const st of statuses) {
		const s = st.screen;
		const kinds = new Map<string, number>();
		for (const rel of s.files) {
			let text = '';
			try {
				text = readFileSync(join(root, rel), 'utf8');
			} catch {
				continue;
			}
			for (const h of elementsIn(rel, text, s.surface)) kinds.set(h.kind, (kinds.get(h.kind) ?? 0) + 1);
		}
		const last = state.reviews[s.id];
		const status = last && !last.passed ? color.yellow(` last review: ${last.punch.slice(0, 2).map((p) => p.issue).join('; ').slice(0, 160)}`) : '';
		const errors = st.errors ? ` ${st.errors} values to change (\`${cli()} check ${s.files[0]}\`).` : '';
		lines.push(`    ${s.url ?? s.id} (${s.file}): ${[...kinds].slice(0, 6).map(([k, n]) => (n > 1 ? `${k} x${n}` : k)).join(', ') || 'shell only'}.${errors}${status}`);
	}
	lines.push(
		`  Then run the app and \`${cli()} review --all ${base}\`: it checks values${hasFrame() ? ' and the column lines' : ''} first, then scores every changed screen at once. Each is done at ${threshold} or more; fix the punch lists and run it again.`,
		`  A screen that cannot pass without changing words or elements: \`${cli()} skip <screen> --reason "<why>"\`.`,
		`  Then run \`${cli()}\`.`,
	);
	return lines.join('\n');
}
