import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { elements, isOwnFile } from '../lib/brand.js';
import { elementsIn } from '../plan/elements.js';
import type { Surface } from '../project/surface.js';
import { type Writer, upsertBlock } from './files.js';

// The element layer: on the first run every element the project's stylesheets name (.btn-primary, .plan-card,
// .nav a.active) gets the brand's styling for its kind, in one marked block at the end of the same stylesheet, so it
// wins at equal specificity and the site reads as the brand at once. Only the skin changes (color, type, border,
// radius, shadow, motion; padding for controls): layout, size and position stay the project's own.

const START = '/* ds:elements:start (the brand styling for each element; adjust it here) */';
const END = '/* ds:elements:end */';
const BLOCK = /\/\* ds:elements:start[\s\S]*?\/\* ds:elements:end \*\/\n?/;

// Applied only where the class itself says what the element is; anything less certain is left to the tasks.
const SURE: Record<string, RegExp> = {
	'menu-panel': /(^|[-_])(?:dropdown[-_](?:menu|content)|dropdown[-_]menu[-_]content|menu[-_](?:panel|content)|select[-_]content)$/,
	'menu-item': /(^|[-_])(?:dropdown[-_](?:menu[-_])?item|menu[-_]item|select[-_]item)$/,
	'glass-menu': /(^|[-_])(?:glass[-_](?:menu|dropdown)|dock[-_]card)$/,
	'glass-menu-item': /(^|[-_])(?:glass[-_](?:menu|dropdown)[-_]item|dock[-_]card[-_]item)$/,
	'popover-panel': /(^|[-_])popover[-_](?:panel|content)$/,
	'button-primary': /(^|[-_])(btn|button)[-_]?(primary|solid|filled|dark)\b|^(btn|button)[-_]?cta$|(^|[-_])cta[-_]?(btn|button)$/,
	'button-secondary': /(^|[-_])(btn|button)[-_]?(secondary|ghost|outline|outlined|light|tertiary)\b/,
	card: /(^|[-_])(card|tile)$/,
	'card-ring': /(^|[-_])(card[-_]?ring|frame)$/,
	chip: /(^|[-_])(chip|badge|pill|tag)$/,
	eyebrow: /(^|[-_])(eyebrow|kicker|overline)$/,
	input: /(^|[-_])(input|field|textarea|select)$/,
	'nav-link': /(^|[-_])nav[-_]?(link|item)s?$/,
	'section-heading': /(^|[-_])section[-_]?(title|heading)$/,
	'hero-title': /(^|[-_])hero[-_]?(title|heading|headline)$/,
	column: /^(nav|header|navbar|topbar|site-header)[-_]?(inner|container|wrap|wrapper|content)$/,
	header: /^(nav|navbar|header|site-header|site-nav|main-nav|topbar|masthead)$/,
	'logo-strip': /(^|[-_])(marquee|logo[-_]?(strip|wall|row|cloud|bar)|logos)$/,
};
// The header's inner row sits on the column like the brand's: width only, its own layout stays.
const COLUMN_PLACE: [string, string][] = [['box-sizing', 'border-box'], ['width', '100%'], ['max-width', 'var(--ds-frame-column)'], ['margin-inline', 'auto']];
/** The class of a selector's last compound (.plan-card in .pricing .plan-card), or the parent's for `.nav-links > a`. */
const lastClasses = (sel: string) => {
	const parts = sel.split(/\s*[>+~]\s*|\s+/).filter(Boolean);
	return parts.slice(-2).flatMap((p) => [...p.matchAll(/\.([\w-]+)/g)].map((m) => m[1].toLowerCase()));
};
const SKIN = /^(color|background(-color|-image|-clip)?|border(-[a-z]+)*|outline(-[a-z]+)*|box-shadow|font-(family|size|weight|style)|line-height|letter-spacing|text-(transform|decoration)|transition|backdrop-filter)$/;
const CONTROL_KINDS = /(button|chip|input|action|announcement|menu|popover)/;
const CONTROL = /^(padding(-[a-z]+)*|gap|white-space)$/;

type Def = { css: Record<string, string>; states?: Record<string, Record<string, string>> };

function skin(kind: string, decls: Record<string, string>, state = false) {
	const out: [string, string][] = [];
	for (const [k, v] of Object.entries(decls)) if (SKIN.test(k) || (CONTROL_KINDS.test(kind) && CONTROL.test(k)) || (state && (k === 'transform' || /menu-item$/.test(kind) && ['opacity', 'pointer-events'].includes(k)))) out.push([k, v]);
	return out;
}

const decls = (list: [string, string][], pad: string) => list.map(([k, v]) => `${pad}${k}: ${v};`).join('\n');
const withState = (selectors: string[], state: string) => selectors.map((x) => `${x}${state}`).join(',\n');

/** The block for one stylesheet, or '' when it names no element it is safe to style. */
export function elementLayer(rel: string, text: string, surface: Surface): { block: string; count: number; styled: { selector: string; kind: string }[] } {
	const bySelector = new Map<string, string>();
	for (const hit of elementsIn(rel, text.replace(BLOCK, ''), surface)) {
		const sel = hit.selector;
		// Bare tags (button, a) are left to the base layer: one selector would restyle every one of them.
		if (!sel || !SURE[hit.kind] || /[&%@:]/.test(sel) || !lastClasses(sel).some((c) => SURE[hit.kind].test(c))) continue;
		if (!bySelector.has(sel)) bySelector.set(sel, hit.kind);
	}
	const byKind = new Map<string, string[]>();
	for (const [sel, kind] of bySelector) byKind.set(kind, [...(byKind.get(kind) ?? []), sel]);
	const rules: string[] = [];
	const moving: string[] = [];
	for (const [kind, selectors] of byKind) {
		const def = (elements()[surface][kind] ?? elements()[surface === 'site' ? 'product' : 'site'][kind]) as Def | undefined;
		if (!def) continue;
		// A logo strip or marquee runs between the lines and clips there, as the brand's does.
		const base = kind === 'column' ? COLUMN_PLACE : kind === 'logo-strip' ? [...COLUMN_PLACE, ['overflow', 'hidden'] as [string, string]] : skin(kind, def.css);
		if (!base.length) continue;
		rules.push(`${selectors.join(',\n')} {\n${decls(base, '\t')}\n}`);
		if (base.some(([k]) => k === 'transition')) moving.push(...selectors);
		for (const [state, o] of Object.entries(def.states ?? {})) {
			const list = skin(kind, o, true);
			if (!list.length) continue;
			if (state === ':hover') rules.push(`@media (hover: hover) and (pointer: fine) {\n\t${selectors.map((x) => `${x}:hover`).join(',\n\t')} {\n${decls(list, '\t\t')}\n\t}\n}`);
			else if (state.startsWith('@media')) rules.push(`${state} {\n\t${selectors.join(',\n\t')} {\n${decls(list, '\t\t')}\n\t}\n}`);
			else rules.push(`${withState(selectors, state)} {\n${decls(list, '\t')}\n}`);
		}
	}
	if (!rules.length) return { block: '', count: 0, styled: [] };
	if (moving.length) rules.push(`@media (prefers-reduced-motion: reduce) {\n\t${moving.join(',\n\t')} {\n\t\ttransition: none;\n\t}\n}`);
	const styled = [...byKind].flatMap(([kind, selectors]) => selectors.map((selector) => ({ selector, kind })));
	return { block: rules.join('\n\n'), count: styled.length, styled };
}

/** Writes the element layer into every stylesheet that names brand elements; returns how many, the files, and each selector styled as which kind. */
export function installElementLayer(w: Writer, files: string[], surfaceOf: (rel: string) => Surface) {
	let count = 0;
	const written: string[] = [];
	const styled: { file: string; selector: string; kind: string }[] = [];
	for (const rel of files) {
		if (!/\.(css|scss|less)$/.test(rel) || isOwnFile(rel)) continue;
		const text = readFileSync(join(w.root, rel), 'utf8');
		const { block, count: n, styled: s } = elementLayer(rel, text, surfaceOf(rel));
		const without = text.replace(BLOCK, '');
		if (!block) {
			if (without !== text) w.write(rel, without);
			continue;
		}
		count += n;
		styled.push(...s.map((x) => ({ file: rel, ...x })));
		w.write(rel, upsertBlock(text, block, START, END));
		written.push(rel);
	}
	return { count, files: written, styled };
}
