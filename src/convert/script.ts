import { colorHex, nearest, scales, themeClass, type BrandTheme } from '../lib/brand.js';
import { type RGBA, fromHsl, hsl, parseColor } from './color.js';
import { type Stats, convertCss } from './css.js';
import { type Family, type Palette, themed } from './palette.js';
import { type ColorToken, colorToken, onColor } from './roles.js';

// Script files (JS, TS, JSX): Tailwind color classes become brand classes, inline style objects and CSS-in-JS get brand
// tokens, and any other color in code (a chart config that cannot read CSS variables) gets the brand's literal value.

// Tailwind's built-in palette, close enough to place each class by role.
const TW_HUES: Record<string, [number, number]> = {
	slate: [215, 0.2], gray: [220, 0.12], zinc: [240, 0.05], neutral: [0, 0], stone: [25, 0.06],
	red: [0, 0.84], orange: [25, 0.95], amber: [38, 0.92], yellow: [48, 0.96], lime: [84, 0.81], green: [142, 0.71], emerald: [160, 0.84], teal: [173, 0.8], cyan: [189, 0.94], sky: [199, 0.89], blue: [217, 0.91], indigo: [239, 0.84], violet: [258, 0.9], purple: [271, 0.91], fuchsia: [292, 0.84], pink: [330, 0.81], rose: [350, 0.89],
};
const TW_GRAY_L: Record<string, number> = { 50: 0.98, 100: 0.96, 200: 0.91, 300: 0.84, 400: 0.65, 500: 0.46, 600: 0.34, 700: 0.27, 800: 0.17, 900: 0.11, 950: 0.05 };
const TW_COLOR_L: Record<string, number> = { 50: 0.97, 100: 0.94, 200: 0.88, 300: 0.8, 400: 0.68, 500: 0.57, 600: 0.48, 700: 0.4, 800: 0.32, 900: 0.25, 950: 0.15 };

export function tailwindColor(name: string): RGBA | undefined {
	if (name === 'white') return [255, 255, 255, 1];
	if (name === 'black') return [0, 0, 0, 1];
	const m = name.match(/^([a-z]+)-(50|[1-9]00|950)$/);
	const hue = m && TW_HUES[m[1]];
	if (!hue) return undefined;
	return fromHsl(hue[0], hue[1], (hue[1] < 0.25 ? TW_GRAY_L : TW_COLOR_L)[m[2]]);
}

const TW_FAMILY: [RegExp, Family][] = [
	[/^(bg|from|via|to)$/, 'surface'],
	[/^(text|placeholder|caret|decoration|fill|stroke|accent)$/, 'text'],
	[/^(border(-[xytrblse])?|ring|ring-offset|outline|divide)$/, 'border'],
];

/**
 * Tailwind color classes (palette, white, black, arbitrary hex) as brand classes: the theme's names when the brand
 * theme is loaded, else arbitrary values that read the brand variables. Variants and opacity modifiers are kept.
 */
const WIDE_TW = /(?<![\w-])((?:[\w-]+:)*)max-w-(5xl|6xl|7xl|screen-lg|screen-xl|screen-2xl|\[(\d{3,4})px\])(?![\w-])/g;

export function convertClasses(value: string, palette: Palette, stats: Stats, theme: boolean) {
	if (palette.column)
		value = value.replace(WIDE_TW, (all, variants: string, size: string, px?: string) => {
			if (px && Number(px) < 900) return all;
			stats.spacing++;
			return `${variants}${theme ? 'max-w-(--ds-frame-column)' : 'max-w-[var(--ds-frame-column)]'}`;
		});
	const bgClass = value.match(/(?:^|\s)bg-((?:[a-z]+-(?:50|[1-9]00|950))|\[#[0-9a-fA-F]{3,8}\])(?![\w-])/)?.[1];
	const background = bgClass ? (bgClass.startsWith('[') ? parseColor(bgClass.slice(1, -1)) : tailwindColor(bgClass)) : undefined;
	return value.replace(/(?<![\w-])((?:[\w-]+:|\[[^\]\s]+\]:)*)(!?)(-?)(bg|text|border(?:-[xytrblse])?|ring(?:-offset)?|outline|divide|fill|stroke|from|via|to|decoration|placeholder|caret|accent)-((?:[a-z]+-(?:50|[1-9]00|950))|white|black|\[#[0-9a-fA-F]{3,8}\])(?:\/(\d{1,3}|\[[\d.]+%?\]))?(?![\w-])/g, (all, variants: string, bang: string, neg: string, prefix: string, color: string, opacity?: string) => {
		const rgba = color.startsWith('[') ? parseColor(color.slice(1, -1)) : tailwindColor(color);
		if (!rgba || neg) return all;
		const family = TW_FAMILY.find(([re]) => re.test(prefix))?.[1] ?? 'surface';
		const mapped = onColor(rgba, family, variants ? undefined : background, palette) ?? colorToken(rgba, family, /(^|:)dark:/.test(variants) ? themed(palette, 'dark') : palette);
		stats.colors++;
		if (mapped === 'transparent') return `${variants}${bang}${prefix}-transparent`;
		const name = theme ? themeClass(mapped.name) : undefined;
		const alpha = opacity ? undefined : mapped.alpha < 0.995 ? Math.round(mapped.alpha * 100) : undefined;
		const mod = opacity ? `/${opacity}` : alpha !== undefined ? `/${alpha}` : '';
		return `${variants}${bang}${prefix}-${name ?? `[var(--ds-color-${mapped.name})]`}${mod}`;
	});
}

const CSS_PROPS_CAMEL = /^(color|background|backgroundColor|backgroundImage|border|border(Top|Right|Bottom|Left|Inline|Block)?(Color)?|outline(Color)?|fill|stroke|boxShadow|textShadow|caretColor|accentColor|textDecorationColor|fontFamily|fontWeight|letterSpacing|borderRadius|border(Top|Bottom)(Left|Right)Radius|transition|animation)$/;
const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** A brand color's literal value in a theme, written as hex (or ARGB for native code). */
export function brandLiteral(t: ColorToken | 'transparent', theme: BrandTheme = 'site', form: 'hex' | 'argb' = 'hex') {
	if (t === 'transparent') return form === 'argb' ? '00000000' : '#00000000';
	const value = (colorHex(t.name, theme) ?? colorHex(t.name) ?? '#000000').slice(0, 7);
	const alpha = Math.round(t.alpha * 255).toString(16).padStart(2, '0').toUpperCase();
	if (form === 'argb') return `${alpha}${value.slice(1)}`;
	return t.alpha >= 0.995 ? value : `${value}${alpha}`;
}

export function convertScript(text: string, palette: Palette, stats: Stats, opts: { tailwind?: 'theme' | 'arbitrary'; theme?: BrandTheme }) {
	palette.series ??= new Map();
	let next = text
		// styled.div`...`, css`...`, createGlobalStyle`...`, keyframes`...`
		.replace(/(\b(?:styled(?:\.\w+|\([^)]*\))(?:\.attrs\([^)]*\))?|css|createGlobalStyle|keyframes|injectGlobal)\s*`)([^`]*)`/g, (all, head: string, body: string) => `${head}${convertCss(body, palette, stats)}\``)
		// style={{ color: '#fff', fontFamily: 'Inter' }} and other objects keyed by CSS properties
		.replace(/(\b|["'])([a-zA-Z]+)\1(\s*:\s*)(["'`])([^"'`\n]+)\4/g, (all, q: string, key: string, sep: string, quote: string, value: string) => {
			if (!CSS_PROPS_CAMEL.test(key)) return all;
			const decl = convertCss(`${kebab(key)}: ${value}`, palette, stats);
			const out = decl.slice(decl.indexOf(':') + 1).trim();
			return out === value ? all : `${q}${key}${q}${sep}${quote}${out}${quote}`;
		});
	// style={{ marginTop: 16, gap: 6 }}: React reads bare numbers as pixels. Only in a style: an inline style attribute,
	// or an object whose keys are mostly CSS properties. Elsewhere a number named gap or padding is a setting (a
	// canvas's dot spacing), and a string there would not type-check.
	const styleLike = (obj: string) => {
		const keys = [...obj.matchAll(/([a-zA-Z]+)\s*:/g)].map((m) => m[1]);
		return keys.length > 0 && keys.filter((k) => CSS_PROPS_CAMEL.test(k) || /^(margin|padding|gap|rowGap|columnGap|width|height|top|left|right|bottom|fontSize|lineHeight|display|position|opacity|zIndex)/.test(k)).length / keys.length >= 0.6;
	};
	next = next.replace(/(\bstyle=\{)?\{[^{}]*\}/g, (obj, inStyle?: string) =>
		!inStyle && !styleLike(obj) ? obj : obj.replace(/(\b(?:margin|padding)(?:Top|Right|Bottom|Left|Inline|Block)?|\b(?:row|column)?[gG]ap)(\s*:\s*)(\d+(?:\.\d+)?)(?=\s*[,}\n])/g, (all, key: string, sep: string, n: string) => {
			if (Number(n) === 0) return all;
			stats.spacing++;
			return `${key}${sep}'var(${nearest(scales().space, Number(n))})'`;
		}),
	);
	if (opts.tailwind) next = next.replace(/(["'`])((?:(?!\1)[^\n\\])*)\1/g, (all, q: string, body: string) => (/(?:^|\s|:)(?:bg|text|border|ring|fill|stroke|from|via|to|divide|outline|decoration|placeholder|caret|accent)-/.test(body) ? `${q}${convertClasses(body, palette, stats, opts.tailwind === 'theme')}${q}` : all));
	// A 3D or drawn scene's colors (terrain, materials, shaders, particles) are what it shows, not its styling; only
	// the plain white or black it draws for a dark page flips with the page.
	if (SCENE.test(text)) return flipNeutrals(next, palette, opts.theme ?? 'site');
	return convertLiterals(next, palette, stats, (t) => brandLiteral(t, opts.theme ?? 'site'));
}

const SCENE = /from\s+["'](?:three|@react-three\/[\w-]+|pixi\.js|@babylonjs\/[\w-]+|postprocessing|ogl|regl|p5)["']|\bTHREE\.\w+|\bgetContext\(\s*["'](?:webgl2?|2d)["']|\bgl_FragColor\b|\bvec[34]\(/;

/**
 * White or black drawn in code for a dark page (a glow, a cursor trail, grid pixels) would vanish on the light one:
 * it becomes the brand's ink or paper at the same strength. Colored values stay. Also catches the partial form
 * 'rgba(255,255,255,' + alpha + ')'.
 */
export function flipNeutrals(text: string, palette: Palette, theme: BrandTheme = 'site') {
	if (palette.mode !== 'dark' || palette.target === 'dark') return text;
	const channels = (name: string) => {
		const hex = brandLiteral({ name, alpha: 1 }, theme).replace('#', '');
		return [0, 2, 4].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
	};
	const swap = (r: number, g: number, b: number) => {
		const { s, l } = hsl([r, g, b, 1]);
		return s > 0.1 ? undefined : l > 0.85 ? channels('text-default') : l < 0.15 ? channels('bg-default') : undefined;
	};
	return text
		.replace(/(["'`])(rgba?\()\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(?=\1)/g, (all, q: string, fn: string, r: string, g: string, b: string) => {
			const to = swap(+r, +g, +b);
			return to ? `${q}${fn}${to.join(',')},` : all;
		})
		.replace(LITERAL, (all, q: string, value: string) => {
			const c = parseColor(value);
			const to = c && swap(c[0], c[1], c[2]);
			if (!c || !to) return all;
			return `${q}${c[3] < 0.995 || /^rgba?\(/.test(value) ? `rgba(${to.join(', ')}, ${Math.round(c[3] * 1000) / 1000})` : `#${to.map((x) => x.toString(16).padStart(2, '0')).join('').toUpperCase()}`}${q}`;
		});
}

const LITERAL = /(["'`])(#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?|#[0-9a-fA-F]{3,4}|(?:rgba?|hsla?)\([^()"'`]*\))\1/g;
const COLORISH_LINE = /(colou?r|bg|background|fill|stroke|border|fg|foreground|tint|accent|palette|theme|series|stops?)/i;

/** The family a code line suggests: a background, a border, else text. */
export const lineFamily = (line: string): Family =>
	// A property that names text decides first: words in the line's own copy ("Your cards") must not make it a surface.
	/\b(foregroundColor|foregroundStyle|textColor|setTextColor|titleColor|tintColor|contentColor)\b/.test(line) && !/\b(background|backgroundColor|fill)\s*[(:=]/.test(line)
		? 'text'
		: /(bg|background|surface|fill|canvas|card|panel)/i.test(line)
			? 'surface'
			: /(border|stroke|line|divider|outline|ring)/i.test(line)
				? 'border'
				: 'text';

/** Color strings in any language become the brand's literal for the same role. A run of strong colors is a chart. */
export function convertLiterals(text: string, palette: Palette, stats: Stats, hex: (t: ColorToken | 'transparent') => string) {
	palette.series ??= new Map();
	return text
		.split('\n')
		.map((line, index) => {
			const strong = [...line.matchAll(LITERAL)].filter((m) => {
				const c = parseColor(m[2]);
				return c && hsl(c).s > 0.3 && hsl(c).l > 0.12 && hsl(c).l < 0.88;
			}).length;
			const seriesKey = (strong >= 2 && /\[|\(/.test(line)) || /(series|chart|dataset|graph|plot)/i.test(line) ? `line:${index}` : undefined;
			let n = 0;
			return line.replace(LITERAL, (all, q: string, value: string) => {
				if (/^#[0-9a-f]{3,4}$/i.test(value) && !COLORISH_LINE.test(line)) return all;
				const rgba = parseColor(value);
				if (!rgba) return all;
				stats.colors++;
				return `${q}${hex(colorToken(rgba, lineFamily(line), palette, seriesKey ? `${seriesKey}:${n++}` : undefined, line))}${q}`;
			});
		})
		.join('\n');
}
