import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { brand, cli, elements, isOwnFile } from '../lib/brand.js';
import { globToRegExp } from '../lib/glob.js';
import { componentsIn } from '../library/components.js';
import { loadIndexSync } from '../library/registry.js';
import { matchName, norm, suggest } from '../lib/names.js';
import type { Project } from '../project/detect.js';
import { type Screen, drawnFrom, shellFiles } from '../project/screens.js';

// A selection: the components or pages a person names, instead of the whole app. `apply button card /settings`
// resolves each target (a route, a file or glob, a library item, or one of the app's own components), and every step
// of the apply, the checks, the hooks and the pre-commit then work only inside it. The shared setup a component
// needs to render (the brand stylesheet with its tokens and theme, the fonts, the registry configuration and agent
// rules) is always installed; the base layer that restyles every element on every page is not.

/** What a person asked for, kept in .ds/state.json so `--redo` repeats it and a later apply widens it. */
export type ScopeSpec = {
	/** Library items (button, card, alert-dialog), applied wherever the app uses them. */
	items: string[];
	/** The app's own components by name (PrimaryButton), each with the file that defines it. */
	own: { file: string; name: string }[];
	/** Routes (/settings) of the app's pages. */
	pages: string[];
	/** Files the person named, or that a glob they named matched (each treated as a page). */
	files: string[];
	/** Include the layout and shell files the named pages share with others. */
	withShared: boolean;
};

/** The selection as files and element kinds, recorded beside the spec so checks and hooks need no project scan. */
export type ResolvedScope = {
	/** Files of the named pages (and of own components); undefined when no page or file was named. */
	files?: string[];
	/** Element kinds and library items that are in scope everywhere (or inside `files` when both are given). */
	kinds?: string[];
	/** Shared files the named pages draw from that were left out. */
	left: string[];
};

/** One apply's selection, with what it resolved to. */
export type ScopePart = ScopeSpec & { resolved: ResolvedScope };
/**
 * What the app has applied: one part per apply (`apply /settings`, then `apply button`), so a later apply widens the
 * selection instead of narrowing it (buttons everywhere and all of /settings, not buttons on /settings).
 */
export type StoredScope = { parts: ScopePart[] };

/** How much of a file a selection covers: all of it, only the elements of its kinds, or none of it. */
export type Coverage = 'full' | 'kinds' | 'none';

export const emptySpec = (): ScopeSpec => ({ items: [], own: [], pages: [], files: [], withShared: false });
export const isWhole = (spec: ScopeSpec) => !spec.items.length && !spec.own.length && !spec.pages.length && !spec.files.length;

const tidyRoute = (r: string) => (r.replace(/\/+/g, '/').replace(/(.)\/$/, '$1') || '/').toLowerCase();

/**
 * The element kinds (brand/elements.json) that are each library item in an app's own markup: a raw <button> is a
 * button, a .badge span a badge. Registry items may declare their kinds; the rest are read from the kind names.
 */
const ITEM_KINDS: [RegExp, RegExp][] = [
	[/^(button|button-group|toggle|toggle-group|copy-button)$/, /(^|-)button(-|$)|^header-action$/],
	[/^(badge|chip|tag)$/, /^chip$|(^|-)badge(-|$)/],
	[/^(card|stat-card|item)$/, /^(card|card-raised|stat)$|^app-card/],
	[/^(input|textarea|select|native-select|field|input-group|combobox|date-picker|input-otp)$/, /^input$|^app-input|^app-field/],
	[/^(table|data-table)$/, /^table$|^app-table/],
	[/^(tabs|segmented-control)$/, /^tabs$|^app-tabs/],
	[/^(accordion|collapsible|faq)$/, /^faq$/],
	[/^(dropdown-menu|context-menu|menubar|command)$/, /^(menu-panel|menu-item|glass-menu|glass-menu-item)$/],
	[/^(popover|hover-card|tooltip)$/, /^popover-panel$/],
	[/^(navigation-menu|site-header|header)$/, /^(header|nav-link|nav-dock|column)$/],
	[/^(sidebar)$/, /^app-nav|^app-sidebar/],
	[/^(code-block|code-window)$/, /^code-window$/],
	[/^(typography)$/, /^(hero-title|hero-subtitle|section-heading|section-description|eyebrow|body-text|caption|card-title|link)$/],
	[/^(site-footer|footer)$/, /^footer$/],
	[/^(logo-strip)$/, /^logo-strip$/],
];

export function kindsForItems(items: string[]): string[] {
	const all = new Set([...Object.keys(elements().site ?? {}), ...Object.keys((elements() as Record<string, Record<string, unknown>>).product ?? {})]);
	const index = loadIndexSync();
	const out = new Set<string>(items);
	for (const item of items) {
		for (const k of index.find((i) => i.name === item)?.kinds ?? []) out.add(k);
		for (const [names, kinds] of ITEM_KINDS) if (names.test(item)) for (const k of all) if (kinds.test(k)) out.add(k);
		for (const k of all) if (k === item || k.startsWith(`${item}-`)) out.add(k);
	}
	return [...out];
}

/** Library items people can name: interface components, not the theme, helpers or hooks. */
const nameable = () => loadIndexSync().filter((i) => !['theme', 'lib', 'hook'].includes(i.type));

/** A library item for a name, case- and dash-insensitive (Button, button, alert-dialog, AlertDialog, buttons). */
export function itemFor(name: string): string | undefined {
	return matchName(name, nameable().map((i) => i.name));
}

export type Resolution = { spec: ScopeSpec; unresolved: { target: string; suggestions: string[] }[] };

/** The app's own components (PascalCase, defined in its script files), for names like PrimaryButton. */
export function appComponents(root: string, files: string[]) {
	const out: { file: string; name: string }[] = [];
	for (const rel of files.filter((f) => /\.(tsx|jsx)$/.test(f) && !/(^|\/)components\/ds\//.test(f))) {
		try {
			for (const c of componentsIn(rel, readFileSync(join(root, rel), 'utf8'))) out.push({ file: rel, name: c.name });
		} catch {}
	}
	return out;
}

/**
 * Resolves what a person typed. Positional targets try, in order: a route, a file or glob, a library item, then one
 * of the app's components. `--components` names only items or components; `--pages` only routes, files or globs.
 */
export function resolveTargets(root: string, screens: Screen[], files: string[], input: { targets?: string[]; components?: string | string[]; pages?: string | string[]; withShared?: boolean }): Resolution {
	const spec = emptySpec();
	spec.withShared = !!input.withShared;
	const unresolved: Resolution['unresolved'] = [];
	let own: { file: string; name: string }[] | undefined;
	const ownComponents = () => (own ??= appComponents(root, files));
	const asPage = (t: string): boolean => {
		const route = tidyRoute(t);
		if (t.startsWith('/')) {
			const s = screens.find((x) => x.url && tidyRoute(x.url) === route);
			if (s) {
				if (!spec.pages.includes(s.url!)) spec.pages.push(s.url!);
				return true;
			}
		}
		const rel = relative(root, join(process.cwd(), t)).split('\\').join('/');
		const asIs = [rel, t.replace(/^\.\//, '')].find((p) => p && !p.startsWith('..') && existsSync(join(root, p)));
		if (asIs) {
			const matched = statSync(join(root, asIs)).isDirectory() ? files.filter((f) => f.startsWith(`${asIs.replace(/\/$/, '')}/`)) : [asIs];
			if (!matched.length) return false;
			for (const f of matched) if (!spec.files.includes(f)) spec.files.push(f);
			return true;
		}
		if (/[*?{[]/.test(t)) {
			const re = globToRegExp(rel.startsWith('..') ? t.replace(/^\.\//, '') : rel);
			const matched = files.filter((f) => re.test(f));
			if (!matched.length) return false;
			for (const f of matched) if (!spec.files.includes(f)) spec.files.push(f);
			return true;
		}
		return false;
	};
	const asComponent = (t: string): boolean => {
		const item = itemFor(t);
		if (item) {
			if (!spec.items.includes(item)) spec.items.push(item);
			return true;
		}
		const mine = ownComponents().filter((c) => norm(c.name) === norm(t));
		if (mine.length) {
			for (const c of mine) if (!spec.own.some((o) => o.file === c.file && o.name === c.name)) spec.own.push(c);
			return true;
		}
		return false;
	};
	const fail = (t: string, pool: string[]) => unresolved.push({ target: t, suggestions: suggest(t, pool) });
	const pagePool = () => [...screens.map((s) => s.url ?? s.id), ...files.filter((f) => screens.some((s) => s.file === f))];
	const componentPool = () => [...nameable().map((i) => i.name), ...ownComponents().map((c) => c.name)];
	// A target that looks like a path is matched against pages for suggestions; a name against components.
	for (const t of input.targets ?? []) if (!asPage(t) && !asComponent(t)) fail(t, /[/.*]/.test(t) ? pagePool() : componentPool());
	for (const t of [input.components ?? []].flat().flatMap((x) => x.split(',')).map((x) => x.trim()).filter(Boolean)) if (!asComponent(t)) fail(t, componentPool());
	for (const t of [input.pages ?? []].flat().flatMap((x) => x.split(',')).map((x) => x.trim()).filter(Boolean)) if (!asPage(t)) fail(t, pagePool());
	return { spec, unresolved };
}

/** The message for targets that did not resolve: each with the closest names, and where to see them all. */
export function unresolvedMessage(unresolved: Resolution['unresolved']) {
	return [
		`Nothing was written: ${unresolved.length === 1 ? 'this target matches' : 'these targets match'} no route, file, library component or app component.`,
		...unresolved.map((u) => `  ${u.target}${u.suggestions.length ? `: did you mean ${u.suggestions.join(', ')}?` : ''}`),
		`  \`${cli()} list\` lists the library components; \`${cli()} apply --dry-run\` lists the app's screens.`,
	].join('\n');
}

/** The recorded selection with one more part (the same selection named again is not added twice). */
export function widen(scope: StoredScope | undefined, part: ScopePart): StoredScope {
	const key = (p: ScopeSpec) => JSON.stringify([[...p.items].sort(), p.own.map((o) => `${o.file}#${o.name}`).sort(), [...p.pages].sort(), [...p.files].sort(), p.withShared]);
	const parts = scope?.parts ?? [];
	// Naming a part again keeps its place (the same apply twice leaves the state as it was).
	return parts.some((p) => key(p) === key(part)) ? { parts: parts.map((p) => (key(p) === key(part) ? part : p)) } : { parts: [...parts, part] };
}

export const specOf = (p: ScopeSpec): ScopeSpec => ({ items: p.items, own: p.own, pages: p.pages, files: p.files, withShared: p.withShared });

/**
 * The files and kinds a selection covers. A page is its file and the local files only it draws from; files other
 * pages draw from too, and the shell (layouts, header, footer, main stylesheet), are shared and left out unless
 * named or `withShared`.
 */
export function resolveScope(project: Project, screens: Screen[], files: string[], spec: ScopeSpec): ResolvedScope {
	const resolved: ResolvedScope = { left: [] };
	if (spec.items.length) resolved.kinds = kindsForItems(spec.items);
	const named = [...spec.pages.map((p) => screens.find((s) => s.url === p)?.file).filter((f): f is string => !!f), ...spec.files];
	if (named.length || spec.own.length) {
		// The library's own files (components/ds, its utils) belong to the shared setup, never to a page.
		const library = new RegExp(`(^|/)components/ds/|(^|/)${brand().bin}-utils\\.[jt]sx?$`);
		const reach = (entry: string) => drawnFrom(project, entry, files, 4).filter((f) => !isOwnFile(f) && !library.test(f));
		const shell = new Set(shellFiles(project, files));
		const others = new Set<string>();
		for (const s of screens) if (!named.includes(s.file)) for (const f of reach(s.file)) others.add(f);
		const out = new Set<string>();
		for (const entry of named) {
			out.add(entry);
			for (const f of reach(entry)) {
				if (f === entry) continue;
				if (spec.withShared || (!others.has(f) && !shell.has(f))) out.add(f);
				else if (!resolved.left.includes(f)) resolved.left.push(f);
			}
		}
		for (const o of spec.own) out.add(o.file);
		resolved.files = [...out].sort();
		resolved.left = resolved.left.filter((f) => !out.has(f)).sort();
	}
	return resolved;
}

/** How much of a file one part covers. Own components and named pages are covered in full; items by kind. */
function partCoverage(part: ScopePart, rel: string): Coverage {
	const r = part.resolved;
	if (part.own.some((o) => o.file === rel)) return 'full';
	const pageFiles = r.files?.filter((f) => !part.own.some((o) => o.file === f));
	if (r.kinds) return !pageFiles?.length || pageFiles.includes(rel) ? 'kinds' : 'none';
	return r.files?.includes(rel) ? 'full' : 'none';
}

/** How much of a file the applied selection covers; with no selection (the whole app), all of it. */
export function coverage(scope: StoredScope | undefined, rel: string): Coverage {
	if (!scope) return 'full';
	let kinds = false;
	for (const part of scope.parts) {
		const c = partCoverage(part, rel);
		if (c === 'full') return 'full';
		if (c === 'kinds') kinds = true;
	}
	return kinds ? 'kinds' : 'none';
}

/** The element kinds the selection covers in a file it covers by kind. */
export function kindsIn(scope: StoredScope | undefined, rel: string): string[] | undefined {
	if (!scope || coverage(scope, rel) !== 'kinds') return undefined;
	return [...new Set(scope.parts.filter((p) => partCoverage(p, rel) === 'kinds').flatMap((p) => p.resolved.kinds ?? []))];
}

/** Whether a component the app defines is in the selection (its name, its item, or its file). */
export function componentInScope(scope: StoredScope | undefined, c: { file: string; name: string; item?: string }) {
	if (!scope) return true;
	return scope.parts.some((part) => {
		if (part.own.some((o) => o.file === c.file && o.name === c.name)) return true;
		const r = part.resolved;
		const pageFiles = r.files?.filter((f) => !part.own.some((o) => o.file === f));
		if (!r.kinds && !pageFiles?.length) return false;
		if (r.kinds && !(c.item && (part.items.includes(c.item) || r.kinds.includes(c.item)))) return false;
		if (pageFiles?.length && !pageFiles.includes(c.file)) return false;
		return true;
	});
}

/** The pages a selection names (its screens to review). */
export const scopePages = (scope: StoredScope) => ({ pages: scope.parts.flatMap((p) => p.pages), files: scope.parts.flatMap((p) => p.files) });
/** Shared files the selection's pages draw from that were left out. */
export const scopeLeft = (scope: StoredScope) => [...new Set(scope.parts.flatMap((p) => p.resolved.left))];
/** The library items a selection names. */
export const scopeItems = (scope: StoredScope) => [...new Set(scope.parts.flatMap((p) => p.items))];

function describePart(part: ScopeSpec) {
	const what = [
		...(part.items.length ? [part.items.join(', ')] : []),
		...(part.own.length ? [part.own.map((o) => o.name).join(', ')] : []),
	].join(', ');
	const where = [...part.pages, ...part.files.slice(0, 4), ...(part.files.length > 4 ? [`${part.files.length - 4} more files`] : [])].join(', ');
	return what && where ? `${what} on ${where}` : what || where;
}

/** One line for a person: what the selection is. */
export function describeScope(scope: StoredScope | undefined) {
	if (!scope) return 'the whole app';
	return scope.parts.map(describePart).join('; ');
}
