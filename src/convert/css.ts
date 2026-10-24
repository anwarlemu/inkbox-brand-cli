import { isToken, nearest, scales } from '../lib/brand.js';
import { COLOR_IN_VALUE, hsl, parseColor } from './color.js';
import { type Palette, familyOf, themed } from './palette.js';
import { cssColor, mapColor, onColor } from './roles.js';
import { walkCss } from './walk.js';

// Converts a stylesheet to the brand declaration by declaration, keeping every selector, rule and element. Colors map
// by role; type, radius, spacing and motion snap to the nearest brand token; shadows become the brand's.

export type Stats = { colors: number; fonts: number; type: number; radius: number; spacing: number; motion: number; shadows: number };
export const newStats = (): Stats => ({ colors: 0, fonts: 0, type: 0, radius: 0, spacing: 0, motion: 0, shadows: 0 });

/** Remove only the delay slot of each transition, preserving its duration and easing. */
function immediateTransition(value: string): string {
	let depth = 0, times = 0, start = 0, result = '';
	const flush = (end: number) => {
		const token = value.slice(start, end);
		const timing = /^-?\d*\.?\d+(?:ms|s)$/.test(token) || /^var\(--ds-duration-[\w-]+\)$/.test(token);
		result += timing && ++times > 1 ? '0ms' : token;
	};
	for (let i = 0; i <= value.length; i++) {
		const c = value[i];
		if (c === '(') depth++;
		if (c === ')') depth--;
		if (i === value.length || depth === 0 && /[\s,]/.test(c)) {
			flush(i);
			if (i < value.length) result += c;
			if (c === ',') times = 0;
			start = i + 1;
		}
	}
	return result;
}

const toPx = (n: string, unit: string) => Number(n) * (unit === 'rem' || unit === 'em' ? 16 : 1);

function mapLengths(value: string, list: [string, number][], { pill = false } = {}) {
	return value.replace(/(-?)(\d*\.?\d+)(px|rem)\b/g, (all, sign: string, n: string, unit: string) => {
		const px = toPx(n, unit);
		if (px === 0) return '0';
		if (pill && px >= 100) return 'var(--ds-radius-pill)';
		const name = nearest(list, px);
		return sign ? `calc(-1 * var(${name}))` : `var(${name})`;
	});
}

/** A drop shadow becomes the brand's: a lift is the card hairline, a large blur the floating shadow. Rings keep shape. */
function mapShadow(value: string) {
	if (/var\(--ds-shadow-|^\s*none\s*$/.test(value)) return undefined;
	const layers = value.split(/,(?![^(]*\))/).map((l) => l.trim());
	const numbers = (l: string) =>
		l.replace(/color-mix\((?:[^()]|\([^()]*\))*\)|var\((?:[^()]|\([^()]*\))*\)|(?:rgba?|hsla?)\([^)]*\)|#[0-9a-f]+/gi, '').trim().split(/\s+/).filter((t) => /^-?\d*\.?\d+(px)?$/.test(t)).map(Number.parseFloat);
	const drops = layers.filter((l) => {
		const [x = 0, y = 0, blur = 0, spread = 0] = numbers(l);
		return !/\binset\b/.test(l) && !(x === 0 && y === 0 && blur === 0 && spread > 0);
	});
	if (!drops.length) return undefined;
	return Math.max(...drops.map((l) => numbers(l)[2] ?? 0)) > 24 ? 'var(--ds-shadow-floating)' : 'var(--ds-shadow-card)';
}

const SCALED = /^(font-size|border(-[a-z]+)*-radius|padding(-[a-z]+)*|margin(-[a-z]+)*|gap|row-gap|column-gap|transition(-duration|-delay)?|animation(-duration|-delay)?)$/;
const SCRIM = /(backdrop|overlay|scrim|modal|lightbox|dimmer|mask)/i;
const SERIES_NAME = /(series|chart|graph|plot|dataset|legend|swatch)/i;

/** Site variables in a size, replaced by their own values (through chains and fallbacks); colors stay as vars. */
function resolveSiteVars(value: string, vars: Map<string, string>, depth = 0): string {
	if (depth > 5) return value;
	return value.replace(/var\((--(?!ds-)[\w-]+)\s*(?:,\s*([^()]*(?:\([^()]*\))?[^()]*))?\)/g, (all, name: string, fallback?: string) => {
		const raw = vars.get(name) ?? fallback?.trim();
		if (!raw || /var\(--ds-|#|rgb|hsl|oklch/.test(raw)) return all;
		return resolveSiteVars(raw, vars, depth + 1);
	});
}

/** Rebrands a stylesheet or a style attribute. Rules for the project's other theme are read against that theme. */
// A container is a width of 900px or more; narrower widths are measures (a text column, a form) and stay.
const CONTAINER_VAR = /(max-?w|container|content-?w|wrap|site-?w|page-?w|layout-?w|column-?w|max-?width)/;
const isWide = (value: string) => {
	const m = value.trim().match(/^(\d*\.?\d+)(px|rem)$/);
	return !!m && toPx(m[1], m[2]) >= 900;
};

/** A selector for a heading: a heading tag or a class named for a title, headline or hero. */
const HEADING = /(^|[\s,>+~])h[1-6]\b|title|heading|headline|display|hero-h|hero__h/i;

export function convertCss(css: string, palette: Palette, stats: Stats) {
	palette.series ??= new Map();
	return walkCss(css, (decls, ctx) => (ctx.fontFace ? decls : convertDecls(decls, themed(palette, ctx.mode), stats, ctx.selector)));
}

function convertDecls(css: string, palette: Palette, stats: Stats, selector: string) {
	const bgValue = css.match(/(?:^|[;{\s])background(?:-color)?\s*:\s*([^;}]+)/)?.[1];
	const background = bgValue?.match(COLOR_IN_VALUE)?.map((c) => parseColor(c)).find(Boolean);
	const decl = palette.lines ? /(^|[{;\s])(--[\w-]+|[a-z-]+)(\s*:\s*)([^;{}\n]+?)(\s*)(?=;|\}|$)/gm : /(^|[{;\s])(--[\w-]+|[a-z-]+)(\s*:\s*)([^;{}]+?)(\s*)(?=;|\}|$)/g;
	return css.replace(decl, (all, lead: string, prop: string, sep: string, value: string, trail: string) => {
		if (prop.startsWith('--ds-') || /^(src|content|grid-template|grid-area|font-feature|unicode-range|size-adjust|ascent|descent|line-gap)/.test(prop) || (/url\(/.test(value) && !/gradient/.test(value))) return all;
		const p = prop.toLowerCase();
		const isVar = p.startsWith('--');
		const pal = isVar && palette.modes?.get(p) ? themed(palette, palette.modes.get(p)) : palette;
		let next = !isVar && SCALED.test(p) && palette.vars ? resolveSiteVars(value, palette.vars) : value;
		if (palette.vars && !palette.preserveColors)
			next = next.replace(/\b(rgba?)\(\s*var\((--[\w-]+)\)\s*(?:[/,]\s*([\d.]+%?)\s*)?\)/g, (m, fn: string, name: string, alpha?: string) => {
				const channels = palette.vars?.get(name)?.match(/^(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})$/);
				if (!channels) return m;
				const a = alpha ? (alpha.endsWith('%') ? Number(alpha.slice(0, -1)) / 100 : Number(alpha)) : 1;
				return `rgba(${channels[1]}, ${channels[2]}, ${channels[3]}, ${a})`;
			});
		if (!palette.preserveColors && (!/var\(--ds-/.test(next) || /,/.test(next))) {
			const series = SERIES_NAME.test(isVar ? p : selector) ? (isVar ? p : selector) : undefined;
			next = next.replace(COLOR_IN_VALUE, (c) => {
				const rgba = parseColor(c);
				if (!rgba) return c;
				stats.colors++;
				const family = (isVar && palette.usage?.get(p)) || familyOf(prop);
				if (family === 'surface' && rgba[3] >= 0.3 && rgba[3] < 0.995 && hsl(rgba).l < 0.2 && SCRIM.test(selector)) return 'var(--ds-color-bg-scrim)';
				const on = isVar ? undefined : onColor(rgba, family, background, pal);
				return on ? cssColor(on) : mapColor(rgba, family, pal, series, isVar ? p : `${selector} ${p}`);
			});
		}
		if (!palette.preserveColors && (p === 'box-shadow' || (isVar && /shadow/.test(p))) && /px/.test(next)) {
			const shadow = mapShadow(next);
			if (shadow) {
				stats.shadows++;
				next = shadow;
			}
		}
		const fontStack = /^font-family$/.test(p) || (isVar && /(font|family|typeface)/.test(p) && /["',]|serif|sans|mono/.test(next));
		if (fontStack && !/var\(--ds-font/.test(next)) {
			stats.fonts++;
			// A brand with a display face sets headings in it: heading selectors and variables named for headings.
			const heading = isToken('--ds-font-display') && (isVar ? /(heading|display|title|serif)/i.test(p) : HEADING.test(selector));
			next = /mono|code|courier|consolas|menlo/i.test(next) ? 'var(--ds-font-mono)' : heading ? 'var(--ds-font-display)' : 'var(--ds-font-sans)';
		} else if (p === 'font-weight' && /^(\d{3}|bold|bolder|semibold|normal|lighter)$/.test(next.trim())) {
			stats.type++;
			// Headings take the brand's heading weight (regular when it has none: size carries them). Elsewhere a heavier
			// weight becomes medium.
			const heading = HEADING.test(selector);
			next = heading ? (isToken('--ds-font-weight-heading') ? 'var(--ds-font-weight-heading)' : 'var(--ds-font-weight-regular)') : /^(bold|bolder|semibold)$/.test(next) || Number(next) >= 500 ? 'var(--ds-font-weight-medium)' : 'var(--ds-font-weight-regular)';
		} else if (p === 'letter-spacing' && !/^(0|normal|0em|0px|inherit)$/.test(next.trim())) {
			stats.type++;
			// Large headings keep the brand's tight tracking; everything else is set normally.
			next = /^-/.test(next.trim()) && /\bh[1-3]\b|title|heading|display|hero/i.test(selector) ? 'var(--ds-tracking-tight)' : 'normal';
		} else if (p === 'font-size' && /\d(px|rem)/.test(next)) {
			stats.type++;
			// A fluid size (clamp, min, max, vw) stays fluid with each end on the brand scale, so headlines still shrink.
			next = /clamp\(|min\(|max\(|v[wh]\b|calc\(/.test(next)
				? next.replace(/(\d*\.?\d+)(px|rem)\b/g, (m, n: string, unit: string) => `var(${nearest(scales().text, toPx(n, unit))})`)
				: `var(${nearest(scales().text, Math.max(...[...next.matchAll(/(\d*\.?\d+)(px|rem)/g)].map((m) => toPx(m[1], m[2]))))})`;
		} else if (/^border(-[a-z]+)*-radius$/.test(p) && /\d(px|rem)/.test(next)) {
			stats.radius++;
			next = mapLengths(next, scales().radius, { pill: true });
		} else if (/^border(-[a-z]+)*-radius$/.test(p) && /^\s*50%\s*$/.test(next)) {
			stats.radius++;
			next = 'var(--ds-radius-pill)';
		} else if (palette.column && (p === 'max-width' || (isVar && CONTAINER_VAR.test(p))) && isWide(next)) {
			stats.spacing++;
			next = 'var(--ds-frame-column)';
		} else if (/^(padding|margin|gap|row-gap|column-gap)(-[a-z]+)*$/.test(p) && /\d(px|rem)/.test(next) && !/calc|clamp|min\(|max\(/.test(next)) {
			stats.spacing++;
			next = mapLengths(next, scales().space);
		} else if (!palette.preserveColors && /^(-webkit-)?filter$/.test(p) && palette.mode === 'dark' && palette.target !== 'dark' && /\binvert\((1|100%)?\)/.test(next)) {
			// Logos whitened for the dark page are drawn dark on the light one.
			stats.colors++;
			next = next.replace(/\binvert\((1|100%)?\)/g, 'invert(0)');
		} else if (/^(transition|animation)(-duration|-timing-function|-delay)?$/.test(p)) {
			const before = next;
			if (p === 'transition') next = immediateTransition(next);
			next = next
				// A looping or long animation (a marquee, a spinner) keeps its own timing; interface motion moves to the brand's.
				.replace(/(?<![\w.-])(\d*\.?\d+)(ms|s)\b/g, (m, n: string, unit: string) => {
					const ms = Number(n) * (unit === 's' ? 1000 : 1);
					if (ms === 0 || p === 'transition-delay') return '0ms';
					return p.startsWith('animation') && (ms > 1000 || /\binfinite\b/.test(value)) ? m : `var(${nearest(scales().duration, ms)})`;
				})
				.replace(/\bcubic-bezier\([^)]*\)|\bease-in-out\b|\bease-in\b|\bease-out\b|(?<![\w-])ease(?![\w-])/g, (e) => (e === 'ease-in-out' ? 'var(--ds-easing-in-out)' : 'var(--ds-easing-out)'))
				.replace(/(?<![\w-])all(?![\w-])/g, 'color, background-color, border-color, box-shadow, opacity, transform');
			if (next !== before) stats.motion++;
		}
		return next === value ? all : `${lead}${prop}${sep}${next}${trail}`;
	});
}
