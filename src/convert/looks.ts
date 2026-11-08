import { parse } from '@babel/parser';
import { readFileSync } from 'node:fs';
import { brand, elements, themeClass, tokens } from '../lib/brand.js';
import { pkgPath } from '../lib/paths.js';
import { isLook, useSiteLook } from '../library/adapt.js';
import { loadItemSync } from '../library/registry.js';
import type { Surface } from '../project/surface.js';
import { appThemeColors, classify } from './components.js';
import type { Stats } from './css.js';

// The brand's full look on an app's raw elements, and its scales on every other class: what `look` shows a person,
// applied. A raw <button>, a link drawn as one, an input, a select, a textarea, a badge, a card and a heading take
// their kind's look (the library item's variant for buttons and badges, brand/elements.json for the rest), merged with
// the element's own classes: its layout (margin, width, flex and grid placement) and its variant intent stay, its own
// look (color, radius, padding and height for controls, type, shadow, border) goes. Every other class's default type
// size, radius and shadow moves to the nearest brand step. Only class lists written out in full are changed, and a
// second run changes nothing.

type Scale = { name: string; px: number };
let scales: { text: Scale[]; radius: Scale[]; shadow: string[] } | undefined;

const toPx = (value: string): number | undefined => {
	const v = value.trim();
	const ref = v.match(/^var\((--ds-[\w-]+)\)$/)?.[1];
	if (ref) return toPx(tokens().site[ref] ?? '');
	const n = parseFloat(v);
	if (Number.isNaN(n)) return undefined;
	return /rem$/.test(v) ? n * 16 : n;
};

function brandScales() {
	if (scales) return scales;
	const theme = readFileSync(pkgPath('build', 'theme.css'), 'utf8').match(/@theme inline\s*\{([^}]*)\}/)?.[1] ?? '';
	const read = (prefix: string) => [...theme.matchAll(new RegExp(`--${prefix}-([a-z0-9-]+):\\s*([^;]+);`, 'g'))].filter((m) => !m[1].includes('--')).map((m) => ({ name: m[1], px: toPx(m[2]) })).filter((s): s is Scale => s.px !== undefined);
	scales = { text: read('text'), radius: read('radius'), shadow: [...theme.matchAll(/--shadow-([a-z0-9-]+):/g)].map((m) => m[1]) };
	return scales;
}

// Tailwind 4's defaults, in px.
const TW_TEXT: Record<string, number> = { xs: 12, sm: 14, base: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 30, '4xl': 36, '5xl': 48, '6xl': 60, '7xl': 72, '8xl': 96, '9xl': 128 };
const TW_RADIUS: Record<string, number> = { '': 4, md: 6, lg: 8, xl: 12, '2xl': 16, '3xl': 24, '4xl': 32 };
// On ties the body steps win: a paragraph at 18px is body-lg, not a heading.
const TEXT_ORDER = ['body', 'body-sm', 'body-lg', 'caption', 'micro', 'h4', 'h3', 'h2', 'h1', 'display', 'hero'];

const split = (cls: string) => {
	let depth = 0;
	let at = -1;
	for (let i = 0; i < cls.length; i++) {
		if ('[('.includes(cls[i])) depth++;
		else if ('])'.includes(cls[i])) depth--;
		else if (cls[i] === ':' && depth === 0) at = i;
	}
	return { variants: cls.slice(0, at + 1), base: cls.slice(at + 1) };
};

function nearest(list: Scale[], px: number, order: string[] = []) {
	const rank = (s: Scale) => (order.includes(s.name) ? order.indexOf(s.name) : order.length);
	return [...list].sort((a, b) => Math.abs(a.px - px) - Math.abs(b.px - px) || rank(a) - rank(b))[0];
}

/** A heading's own type step: h1 to the largest heading step the brand has, down by level. */
function headingStep(level: number) {
	const heads = brandScales().text.filter((s) => /^h\d$/.test(s.name)).sort((a, b) => a.name.localeCompare(b.name));
	return heads[Math.min(level, heads.length) - 1]?.name;
}

/** One class at the brand's nearest step (text size, emphasis weight, radius, shadow), or itself. */
export function brandStep(cls: string, stats?: Stats, heading?: number): string {
	const { variants, base } = split(cls);
	const bang = base.startsWith('!') ? '!' : '';
	const b = base.replace(/^!/, '');
	const text = b.match(/^text-(xs|sm|base|lg|xl|[2-9]xl)$/)?.[1];
	if (text) {
		const s = brandScales().text;
		const name = heading ? headingStep(heading) : undefined;
		const step = name ?? nearest(s, TW_TEXT[text], TEXT_ORDER)?.name;
		if (!step) return cls;
		if (stats) stats.type++;
		return `${variants}${bang}text-${step}`;
	}
	if (/^font-(semibold|bold|extrabold|black)$/.test(b) && !brand().type?.bold) {
		if (stats) stats.fonts++;
		return `${variants}${bang}font-medium`;
	}
	// Sentence case and normal tracking where the brand has them.
	if (/^tracking-(wide|wider|widest)$/.test(b)) {
		if (stats) stats.type++;
		return `${variants}${bang}tracking-normal`;
	}
	if (b === 'uppercase' && !brand().type?.caps) {
		if (stats) stats.type++;
		return `${variants}${bang}normal-case`;
	}
	const radius = b.match(/^rounded(-[trblse]{1,2})?(?:-(md|lg|xl|2xl|3xl|4xl|full))?$/);
	if (radius && (radius[2] !== undefined || b === 'rounded' || /^rounded-[trblse]{1,2}$/.test(b))) {
		const s = brandScales().radius;
		if (!s.length) return cls;
		const px = radius[2] === 'full' ? Number.POSITIVE_INFINITY : TW_RADIUS[radius[2] ?? ''];
		const step = px === Number.POSITIVE_INFINITY ? [...s].sort((a, c) => c.px - a.px)[0] : nearest(s, px);
		if (stats) stats.radius++;
		return `${variants}${bang}rounded${radius[1] ?? ''}-${step.px === 0 ? 'none' : step.name}`;
	}
	const shadow = b.match(/^shadow-(2xs|xs|sm|md|lg|xl|2xl)$/)?.[1];
	if (shadow) {
		const have = brandScales().shadow;
		const want = /^(2xs|xs|sm)$/.test(shadow) ? ['card', 's', 'raised'] : /^(md|lg)$/.test(shadow) ? ['floating', 'raised', 'card'] : ['dialog', 'floating'];
		const step = want.find((n) => have.includes(n));
		if (stats) stats.shadows++;
		return `${variants}${bang}shadow-${step ?? 'none'}`;
	}
	return cls;
}

const TYPE = (cls: string) => {
	const b = split(cls).base.replace(/^!/, '');
	return /^(font-|leading-|tracking-)/.test(b) || /^text-(xs|sm|base|lg|xl|[2-9]xl|\[[\d.]+(px|rem)\])$/.test(b) || brandScales().text.some((s) => b === `text-${s.name}`);
};

/** The variant names a library item's cva declares. */
const libraryVariants = (content: string) => {
	const block = content.match(/variant:\s*\{([\s\S]*?)\n\s*\},/)?.[1] ?? '';
	return [...block.matchAll(/^\s*["']?([\w-]+)["']?\s*:/gm)].map((m) => m[1]);
};

type Look = { classes: string[]; drops: (cls: string) => boolean; heading?: number };

/** The look an element of this tag and classes takes, or undefined when it has none to take. */
function lookFor(tag: string, classes: string, attrs: string, surface: Surface, kinds?: Set<string>): Look | undefined {
	const defs = elements()[surface] ?? elements().site;
	const level = tag.match(/^h([1-6])$/)?.[1];
	if (level) {
		const kind = level === '1' ? 'hero-title' : level === '2' ? 'section-heading' : defs['card-title'] ? 'card-title' : 'section-heading';
		if (kinds && !kinds.has(kind)) return undefined;
		const tw = defs[kind]?.tailwind;
		if (!tw) return undefined;
		// Type only: a heading keeps its color (on a dark band it stays light) and its place.
		return { classes: tw.split(/\s+/).filter((c) => c && TYPE(c)), drops: TYPE, heading: Number(level) };
	}
	const c = classify(tag, classes, attrs, surface);
	if (!c || (kinds && !kinds.has(c.kind) && !(c.item && kinds.has(c.item)))) return undefined;
	if (c.item === 'button' || c.item === 'badge') {
		const content = loadItemSync(c.item)?.files?.[0]?.content;
		if (!content) return undefined;
		// Already one of the library's variants (an earlier run): that variant stays, whatever its classes now suggest.
		const have = new Set(classes.split(/\s+/));
		for (const v of libraryVariants(content)) for (const size of [undefined, 'sm']) {
			const look = appColorSafe(useSiteLook(c.item, content, surface, v, size) ?? []);
			if (look.length && look.every((x) => have.has(x)) && (size || !appColorSafe(useSiteLook(c.item, content, surface, v, 'sm') ?? []).every((x) => have.has(x)))) return { classes: look, drops: (x) => isLook(x, true) };
		}
		// A small control stays small: its own small type or padding, or the library's small size from an earlier run.
		const present = classes.split(/\s+/);
		const sm = c.item === 'button' ? useSiteLook(c.item, content, surface, c.variant, 'sm') ?? [] : [];
		const md = c.item === 'button' ? useSiteLook(c.item, content, surface, c.variant) ?? [] : [];
		const smOnly = sm.filter((x) => !md.includes(x));
		const small = c.item === 'button' && (/(^|\s)(text-(xs|sm)|py-(0|0\.5|1|1\.5)|h-[5-8])(\s|$)/.test(classes) || (smOnly.length > 0 && smOnly.every((x) => present.includes(x))));
		const look = (small ? sm : useSiteLook(c.item, content, surface, c.variant)) ?? [];
		return look.length ? { classes: appColorSafe(look), drops: (x) => isLook(x, true) } : undefined;
	}
	if (c.kind === 'input') {
		// A checkbox or radio keeps its box: only its checked color is the brand's.
		if (/type\s*=\s*["']?(checkbox|radio)\b/.test(attrs)) {
			const accent = themeClass('action-primary');
			return accent ? { classes: appColorSafe([`accent-${accent}`]), drops: (x) => /^accent-/.test(split(x).base) } : undefined;
		}
		const tw = defs.input?.tailwind;
		// A textarea keeps its own height (its rows): only a one-line field takes the field's height.
		const area = tag === 'textarea';
		const keep = (x: string) => area && /^(h|min-h|max-h)-/.test(split(x).base);
		return tw ? { classes: appColorSafe(tw.split(/\s+/).filter((x) => x && isLook(x, true) && !keep(x))), drops: (x) => isLook(x, true) && !keep(x) } : undefined;
	}
	if (c.kind === 'card' || c.kind === 'table') {
		const tw = defs[c.kind]?.tailwind;
		const look = (tw ?? '').split(/\s+/).filter((x) => x && isLook(x, false) && !/^border-(separate|collapse|spacing)/.test(x));
		return look.length ? { classes: appColorSafe(look), drops: (x) => isLook(x, false) && !/^border-(separate|collapse|spacing)/.test(split(x).base) } : undefined;
	}
	return undefined;
}

/**
 * Under a selection the app's own theme keeps color names it defines (a shadcn app's bg-primary): a look's color
 * classes with those names take the brand token directly, as the color pass does.
 */
function appColorSafe(classes: string[]) {
	const own = appThemeColors();
	if (!own.size) return classes;
	const names = tokens().theme as Record<string, string>;
	return classes.map((cls) => {
		const { variants, base } = split(cls);
		const m = base.match(/^(!?)(bg|text|border|outline|ring|fill|stroke|accent)-([a-z][\w-]*?)(\/\d+)?(!?)$/);
		if (!m || !own.has(`--color-${m[3]}`) || !names[m[3]]) return cls;
		return `${variants}${m[1]}${m[2]}-[var(--ds-color-${names[m[3]]})]${m[4] ?? ''}${m[5]}`;
	});
}

type Edit = { start: number; end: number; value: string };

/**
 * The edits that give a file's raw elements their brand look and every class its brand step. `kinds` limits both to
 * the elements of those kinds (a selection of components).
 */
export function elementLookEdits(text: string, surface: Surface, stats?: Stats, kinds?: Iterable<string>): Edit[] {
	let ast: any;
	try {
		ast = parse(text, { sourceType: 'module', errorRecovery: true, plugins: ['jsx', 'typescript'] });
	} catch {
		return [];
	}
	const only = kinds ? new Set(kinds) : undefined;
	const edits: Edit[] = [];
	const done = new Set<number>();
	const literal = (a: any) => (a?.value?.type === 'StringLiteral' ? a.value : a?.value?.type === 'JSXExpressionContainer' && a.value.expression.type === 'StringLiteral' ? a.value.expression : undefined);
	const attrText = (open: any) => open.attributes.filter((a: any) => a.type === 'JSXAttribute' && ['type', 'role', 'variant', 'data-variant', 'data-status'].includes(a.name?.name)).map((a: any) => `${a.name.name}="${literal(a)?.value ?? ''}"`).join(' ');
	const rewrite = (node: any, value: string, quoted: boolean) => {
		if (done.has(node.start)) return;
		done.add(node.start);
		const original = node.type === 'TemplateElement' ? node.value.raw : node.value;
		if (value === original) return;
		edits.push({ start: node.start, end: node.end, value: quoted ? JSON.stringify(value) : value });
	};
	const visit = (n: any) => {
		if (!n || typeof n.type !== 'string') return;
		if (n.type === 'JSXOpeningElement' && n.name?.type === 'JSXIdentifier') {
			const cls = n.attributes.find((a: any) => a.type === 'JSXAttribute' && a.name?.name === 'className');
			const lit = literal(cls);
			const tag = n.name.name;
			if (lit && /^[a-z]/.test(tag)) {
				const present = String(lit.value).split(/\s+/).filter(Boolean);
				const look = lookFor(tag, lit.value, attrText(n), surface, only);
				if (look) {
					const owned = present.filter((x) => look.drops(x));
					const already = look.classes.every((x) => present.includes(x)) && owned.every((x) => look.classes.includes(x));
					if (!already) {
						const kept = present.filter((x) => !look.drops(x)).map((x) => brandStep(x, stats, look.heading));
						if (stats) stats.type++;
						rewrite(lit, [...kept, ...look.classes.filter((x) => !kept.includes(x))].join(' '), true);
					} else done.add(lit.start);
				} else if (!only) rewrite(lit, present.map((x) => brandStep(x, stats, /^h[1-6]$/.test(tag) ? Number(tag[1]) : undefined)).join(' '), true);
			}
		}
		// Every other class list (cn and clsx arguments, template parts): its brand steps (not under a selection of kinds).
		if (!only && n.type === 'JSXAttribute' && n.name?.name === 'className') {
			const strings: any[] = [];
			const collect = (m: any) => {
				if (!m || typeof m.type !== 'string') return;
				if (m.type === 'StringLiteral') strings.push(m);
				if (m.type === 'TemplateLiteral') strings.push(...m.quasis);
				if (m.type === 'ObjectProperty' && !m.computed) return collect(m.value);
				for (const k of Object.keys(m)) if (k !== 'loc') {
					const v = m[k];
					if (Array.isArray(v)) v.forEach(collect);
					else if (v && typeof v.type === 'string') collect(v);
				}
			};
			collect(n.value);
			for (const s of strings) {
				if (done.has(s.start)) continue;
				const value: string = s.type === 'TemplateElement' ? s.value.raw : s.value;
				// Keep the spaces of a template part as they are; only the class words change.
				const next = value.replace(/[^\s]+/g, (w) => brandStep(w, stats));
				if (next !== value) rewrite(s, next, s.type !== 'TemplateElement');
			}
		}
		for (const k of Object.keys(n)) {
			if (k === 'loc') continue;
			const v = n[k];
			if (Array.isArray(v)) v.forEach(visit);
			else if (v && typeof v.type === 'string') visit(v);
		}
	};
	visit(ast.program);
	return edits;
}

export function applyElementLooks(text: string, surface: Surface, stats: Stats, kinds?: Iterable<string>) {
	let out = text;
	for (const e of elementLookEdits(text, surface, stats, kinds).sort((a, b) => b.start - a.start)) out = out.slice(0, e.start) + e.value + out.slice(e.end);
	return out;
}
