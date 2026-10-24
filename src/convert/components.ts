import { declarations } from '../check/rules.js';
import { elementName, jsxAttr, literalAttr, loadSource, type Node } from '../check/source.js';
import { elements, themeClass, tokens } from '../lib/brand.js';
import { libraryClasses } from '../library/adapt.js';
import { loadItemSync } from '../library/registry.js';
import { kindOf, splitClasses } from '../plan/elements.js';
import { MARKUP, SCRIPT, STYLES } from '../project/detect.js';
import type { Surface } from '../project/surface.js';
import { parseColor } from './color.js';
import type { Stats } from './css.js';
import { specimen } from './markup.js';

// Color replacements belong to a component and its state, never to a shared palette declaration. The same ranges
// constrain the application check, so a later check --fix cannot undo the colors we deliberately preserve.
export type ColorEdit = { start: number; end: number; text: string };
type Recipe = Record<string, Record<string, string>>;
const CONTENT = /(^|[\s_.-])(chart|graph|plot|series|swatch|palette|artwork|illustration|logo|canvas)(?=$|[\s_.-])/i;
const PROPERTY: Record<string, string> = { bg: 'background-color', text: 'color', border: 'border-color', outline: 'outline-color', ring: 'outline-color', placeholder: 'placeholder-color' };
const canonical = (value: string) => value.replace(/["']/g, '').replace(/^::?/, '').replace(/^focus$/, 'focus-visible')
	.replace(/^(aria|data)-\[(.+)\]$/, '[$1-$2]').replace(/^aria-(invalid|selected|checked|disabled)$/, '[aria-$1=true]');
const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** Split variants without treating a colon inside a Tailwind arbitrary value as a separator. */
function utility(value: string) {
	let depth = 0, split = -1;
	for (let i = 0; i < value.length; i++) {
		if ('[('.includes(value[i])) depth++;
		if ('])'.includes(value[i])) depth--;
		if (value[i] === ':' && depth === 0) split = i;
	}
	return { variants: value.slice(0, split + 1), base: value.slice(split + 1) };
}

function cssColors(css: Record<string, string>) {
	const result: Record<string, string> = {};
	for (const [prop, value] of Object.entries(css)) {
		const token = value.match(/var\(--ds-color-[\w-]+\)/)?.[0];
		if (!token) continue;
		const key = prop === 'background' ? 'background-color' : prop === 'border' ? 'border-color' : prop === 'outline' ? 'outline-color' : prop;
		if (/^(color|background-color|border(?:-[a-z]+)?-color|outline-color)$/.test(key)) result[key] = token;
	}
	return result;
}

function classRecipe(classes: string): Recipe {
	const result: Recipe = { '': {} };
	for (const cls of classes.split(/\s+/)) {
		const { variants, base } = utility(cls);
		const m = base.match(/^(bg|text|border|outline|ring)-(.+)$/);
		const name = m && tokens().theme[m[2]];
		if (!m || !name) continue;
		const state = canonical(variants.replace(/:$/, ''));
		(result[state] ??= {})[PROPERTY[m[1]]] = `var(--ds-color-${name})`;
	}
	return result;
}

const recipeCache = new Map<string, Recipe | undefined>();
function libraryRecipe(item: string, variant: string): Recipe | undefined {
	const key = `${item}:${variant}`;
	if (recipeCache.has(key)) return recipeCache.get(key);
	recipeCache.set(key, undefined);
	const content = loadItemSync(item)?.files?.find((f) => f.path.endsWith(`/${item}.tsx`))?.content;
	if (!content) return;
	let valid = false;
	const classes = libraryClasses(content, item, (values) => { valid = values.includes(variant); return valid ? variant : undefined; });
	if (!classes || !valid) return;
	const result = classRecipe(classes);
	recipeCache.set(key, result);
	return result;
}

function recipe(tag: string, classes: string, attrs: string, surface: Surface, context: string[] = []): Recipe | undefined {
	const name = tag.split('.').pop()!;
	const component = /^[A-Z]/.test(name) ? kebab(name).replace(/^-/, '') : '';
	if (/^(svg|path|rect|circle|stop|canvas|img|figure|video)$/i.test(name) || CONTENT.test(`${component} ${classes}`)) return;
	const split = splitClasses(`${classes} ${component}`.split(/\s+/));
	const el = { tag: component ? (/button$/.test(component) ? 'button' : /^(input|textarea|select)$/.test(component) ? component : 'div') : tag, ...split, attrs, context };
	if (/type\s*=\s*["']?(color|range)\b/.test(attrs)) return;
	const kind = /^(input|textarea|select)$/.test(el.tag) ? 'input' : /(?:^|\s)(badge|chip|pill|tag)(?:$|\s)/.test(split.heads) ? 'chip' : kindOf(el, surface);
	if (!kind) return;
	const def = elements()[surface][kind];
	if (!def) return;
	const result: Recipe = { '': cssColors(def.css) };
	for (const [state, css] of Object.entries(def.states ?? {})) result[canonical(state)] = cssColors(css);
	for (const [state, css] of Object.entries(classRecipe(def.tailwind))) result[state] = { ...result[state], ...css };
	const item = /button/.test(kind) || el.tag === 'button' ? 'button' : kind === 'chip' ? 'badge' : undefined;
	if (item) {
		const variant = attrs.match(/(?:data-)?variant\s*=\s*["'{]*([\w-]+)/)?.[1]
			?? `${split.words} ${attrs.match(/data-status\s*=\s*["']([\w-]+)/)?.[1] ?? ''}`.match(/(?:^|[\s_-])(destructive|danger|success|secondary|outline|outlined|ghost|quiet|soft|link|pink|green|blue|purple|gray)(?=$|[\s_-])/)?.[1];
		const aliases: Record<string, string> = { danger: 'destructive', quiet: 'ghost', outlined: 'outline', primary: 'default', solid: 'default', filled: 'default' };
		const selected = variant ? aliases[variant] ?? variant : item === 'button' ? (kind === 'button-secondary' ? 'outline' : kind === 'header-action' ? 'soft' : 'default') : component === 'badge' ? 'default' : 'blue';
		return libraryRecipe(item, selected) ?? (variant ? undefined : result);
	}
	return result;
}

function valueFor(def: Recipe, prop: string, state = ''): string | undefined {
	// Complex selectors, conditional variants and unsupported states keep their own colors for review.
	const key = canonical(state);
	if (key && !/^(hover|active|focus-visible|dark)$/.test(key) && !def[key]) return;
	return def[key]?.[prop] ?? def[''][prop];
}

function colorValue(value: string, target: string): string | undefined {
	if (/var\(--ds-|gradient\(|url\(|\b(?:inherit|currentcolor|transparent|none|initial|unset|revert)\b/i.test(value)) return;
	// Replace a usage of a shared variable, leaving its definition and every unrelated consumer alone.
	if (/^var\(--[\w-]+(?:\s*,[^()]*)?\)$/.test(value.trim())) return target;
	const important = value.match(/\s*!important\s*$/i)?.[0];
	if (important) { const mapped = colorValue(value.slice(0, -important.length), target); return mapped ? mapped + important : undefined; }
	if (/^(red|blue|green|gray|grey|orange|purple|yellow|pink|navy|teal|silver|maroon|olive|aqua|fuchsia|lime)$/i.test(value.trim())) return target;
	const rgba = parseColor(value.trim());
	if (!rgba || rgba[3] === 0) return;
	return rgba[3] < 0.995 ? `color-mix(in srgb, ${target} ${Math.round(rgba[3] * 1000) / 10}%, transparent)` : target;
}

function declarationEdits(css: string, offset: number, def: Recipe, state: string, edits: ColorEdit[]) {
	for (const d of declarations(css)) {
		const prop = d.prop === 'background' ? 'background-color' : /^(border|outline)(-[a-z]+)?$/.test(d.prop) && !d.prop.endsWith('color') ? `${d.prop}-color` : d.prop;
		const target = valueFor(def, prop, state);
		if (!target || d.prop.startsWith('--')) continue;
		let next = colorValue(d.value, target);
		if (!next && /^(border|outline)(-[a-z]+)?$/.test(d.prop) && !/var\(--ds-/.test(d.value)) {
			next = d.value.replace(/var\(--[\w-]+\)|#[\da-f]{3,8}\b|(?:rgba?|hsla?)\([^)]*\)|\b(?:white|black|red|blue|green|gray|grey|purple)\b/gi, (raw) => colorValue(raw, target) ?? raw);
		}
		if (next && next !== d.value) edits.push({ start: offset + d.valueOffset, end: offset + d.valueOffset + d.value.length, text: next });
	}
}

function classEdit(value: string, offset: number, def: Recipe, theme: boolean): ColorEdit | undefined {
	const { variants, base } = utility(value);
	const m = base.match(/^(!?)(bg|text|border(?:-[xytrblse])?|outline|ring|placeholder)-(.+?)(!)?$/);
	if (!m) return;
	const prefix = m[2], raw = m[3];
	if (/^(transparent|current|inherit|none)$/.test(raw) || /--ds-/.test(raw)) return;
	const name = raw.replace(/\/[^/]+$/, '');
	const arbitrary = /^\[.+\]$/.test(name) ? name.slice(1, -1).replace(/_/g, ' ').replace(/^color:/, '') : undefined;
	const color = /^(?:[a-z]+-(?:50|[1-9]00|950)|white|black)$/.test(name) || arbitrary && (parseColor(arbitrary) || /^var\(--/.test(arbitrary));
	if (!color) return;
	const state = variants.replace(/:$/, '').replace(/^dark:/, '');
	const target = valueFor(def, PROPERTY[prefix] ?? 'border-color', state);
	if (!target) return;
	const token = target.match(/^var\(--ds-color-(.+)\)$/)?.[1];
	if (!token) return;
	const alpha = arbitrary ? parseColor(arbitrary)?.[3] : undefined;
	const modifier = raw.slice(name.length) || (alpha !== undefined && alpha < 0.995 ? `/${Math.round(alpha * 100)}` : '');
	return { start: offset, end: offset + value.length, text: `${variants}${m[1]}${prefix}-${theme ? themeClass(token) ?? `[${target}]` : `[${target}]`}${modifier}${m[4] ?? ''}` };
}

function stylesheetEdits(css: string, offset: number, surface: Surface, edits: ColorEdit[]) {
	for (const d of declarations(css)) {
		if (d.fontFace || !d.selector || d.prop.startsWith('--') || CONTENT.test(d.selector)) continue;
		const mapped = d.selector.split(',').map((selector) => {
			// Leave pseudo-elements and ambiguous functional selectors for review.
			if (/::|[()&@]/.test(selector)) return;
			const last = selector.trim().split(/\s*[>+~]\s*|\s+/).pop()!;
			const tag = last.match(/^[a-z][\w-]*/i)?.[0] ?? 'div';
			const classes = [...last.matchAll(/\.([\w-]+)/g)].map((m) => m[1]).join(' ');
			const def = recipe(tag, classes, last.match(/\[[^\]]*\]/g)?.join(' ') ?? '', surface);
			if (!def) return;
			const states = [...last.matchAll(/:(hover|active|focus-visible|focus|disabled|checked)\b|\[(?:aria|data)-[^\]]+\]|\[disabled\]/g)].map((m) => m[0]).filter((s) => !/^\[data-(variant|status|slot)=/.test(s));
			if (states.length > 1) return;
			const state = states[0] ?? '';
			const local: ColorEdit[] = [];
			declarationEdits(`${d.prop}: ${d.value};`, 0, def, state, local);
			return local[0]?.text;
		});
		if (mapped[0] && mapped.every((v) => v === mapped[0])) edits.push({ start: offset + d.valueOffset, end: offset + d.valueOffset + d.value.length, text: mapped[0] });
	}
}

/** Conservative edits for identified components only. Unknown roles, dynamic styles and content colors stay. */
export function componentColorEdits(rel: string, text: string, surface: Surface = 'site', theme = true): ColorEdit[] {
	recipeCache.clear();
	const edits: ColorEdit[] = [];
	if (STYLES.test(rel)) stylesheetEdits(text, 0, surface, edits);
	else if (SCRIPT.test(rel)) {
		const file = loadSource(rel, text);
		const recipes = new Map<Node, Recipe | undefined>();
		for (const el of file.jsxElements) {
			const classes = file.classTokens.filter((t) => t.element === el).map((t) => t.value).join(' ');
			const attrs = ['variant', 'data-variant', 'role', 'data-status', 'type'].map((a) => `${a}="${literalAttr(el, a) ?? ''}"`).join(' ');
			let parent = file.parents.get(el), protectedContent = false;
			while (parent) {
				if (parent.type === 'JSXElement' && /^(svg|canvas)$/i.test(elementName(parent))) protectedContent = true;
				parent = file.parents.get(parent);
			}
			const dynamicVariant = ['variant', 'data-variant'].some((a) => jsxAttr(el, a) && literalAttr(el, a) === undefined);
			recipes.set(el, protectedContent || dynamicVariant ? undefined : recipe(elementName(el), classes, attrs, surface));
		}
		const conditional = (offset: number, style = false) => {
			let node = [...file.parents.keys()].find((n) => n.type === 'StringLiteral' && n.start + 1 === offset || n.type === 'TemplateElement' && n.start === offset);
			while (node && node.type !== 'JSXAttribute') {
				if (/^(ConditionalExpression|LogicalExpression)$/.test(node.type) || !style && node.type === 'ObjectProperty') return true;
				node = file.parents.get(node);
			}
			return false;
		};
		for (const str of file.strings) {
			const def = str.element && recipes.get(str.element);
			if (!def || text.slice(str.offset, str.offset + str.value.length) !== str.value) continue;
			if (str.context === 'className' && !conditional(str.offset)) {
				for (const m of str.value.matchAll(/\S+/g)) {
					const edit = classEdit(m[0], str.offset + m.index, def, theme);
					if (edit) edits.push(edit);
				}
			} else if (str.context === 'style' && str.styleKey && !conditional(str.offset, true)) {
				const target = valueFor(def, kebab(str.styleKey).replace(/^background$/, 'background-color'));
				const next = target && colorValue(str.value, target);
				if (next) edits.push({ start: str.offset, end: str.offset + str.value.length, text: next });
			}
		}
	} else if (MARKUP.test(rel)) {
		for (const m of text.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) stylesheetEdits(m[1], m.index + m[0].indexOf('>') + 1, surface, edits);
		const markup = text.replace(/<!--[^]*?-->|<(script|style|svg|canvas)\b[^]*?<\/\1>/gi, (m) => m.replace(/[^\n]/g, ' '));
		for (const m of markup.matchAll(/<([\w.-]+)((?:[^>"']|"[^"]*"|'[^']*')*)>/g)) {
			const attrs = m[2], cls = attrs.match(/\sclass(?:Name)?\s*=\s*(["'])(.*?)\1/);
			const def = recipe(m[1], cls?.[2] ?? '', attrs, surface);
			if (!def) continue;
			const start = m.index + 1 + m[1].length;
			if (cls) {
				const at = start + cls.index! + cls[0].length - cls[2].length - 1;
				for (const t of cls[2].matchAll(/\S+/g)) { const edit = classEdit(t[0], at + t.index, def, theme); if (edit) edits.push(edit); }
			}
			const style = attrs.match(/\sstyle\s*=\s*(["'])(.*?)\1/);
			const close = text.indexOf(`</${m[1]}>`, m.index + m[0].length);
			const inner = close < 0 ? '' : text.slice(m.index + m[0].length, close);
			if (style && !specimen(style[2], inner)) declarationEdits(style[2], start + style.index! + style[0].length - style[2].length - 1, def, '', edits);
		}
	}
	return edits;
}

export function applyComponentColors(rel: string, text: string, surface: Surface, stats: Stats, theme: boolean) {
	for (const edit of componentColorEdits(rel, text, surface, theme).sort((a, b) => b.start - a.start)) {
		if (text.slice(edit.start, edit.end) === edit.text) continue;
		text = text.slice(0, edit.start) + edit.text + text.slice(edit.end);
		stats.colors++;
	}
	return text;
}
