import { type RGBA, hsl, parseColor } from './color.js';
import { walkCss } from './walk.js';

// What a project's colors mean is read from the project itself: its page background and text decide whether it is a
// light or a dark interface, and how each variable is used decides whether it is a text, line or surface color.

export type Family = 'text' | 'border' | 'surface';
export type Mode = 'dark' | 'light';

export type Palette = {
	mode: Mode;
	/** Lightness of the page background and of the main text, 0 to 1. */
	bg: number;
	fg: number;
	found?: boolean;
	vars?: Map<string, string>;
	usage?: Map<string, Family>;
	modes?: Map<string, Mode>;
	series?: Map<string, number>;
	/** Indented Sass and Stylus: a value ends with its line. */
	lines?: boolean;
	/** The theme the brand is applied in (a product may keep its dark theme). */
	target?: Mode;
	/** A site: its wide content containers take the width of the ruled column, so content sits between the lines. */
	column?: boolean;
	/** Web application colors are handled only at identified component usage sites. */
	preserveColors?: boolean;
};

const fromLightness = (bg: RGBA | undefined, fg: RGBA | undefined): Pick<Palette, 'mode' | 'bg' | 'fg' | 'found'> => {
	const lbg = bg ? hsl(bg).l : 1;
	const lfg = fg ? hsl(fg).l : lbg > 0.5 ? 0 : 1;
	return { mode: lbg < 0.4 ? 'dark' : 'light', bg: lbg, fg: Math.abs(lfg - lbg) < 0.2 ? 1 - lbg : lfg, found: !!bg };
};

/** The palette for rules that only apply in the other theme (a site's own dark or light mode block). */
export function themed(palette: Palette, mode: Mode | undefined): Palette {
	if (!mode || mode === palette.mode) return palette;
	return { ...palette, mode, bg: mode === 'dark' ? 0.08 : 1, fg: mode === 'dark' ? 0.95 : 0 };
}

/** Which kind of color a declaration sets, from the property, or for a custom property from its name. */
export function familyOf(prop: string): Family {
	const p = prop.toLowerCase();
	if (p.startsWith('--')) {
		if (/(border|line|rule|divider|stroke|outline|hairline|separator)/.test(p)) return 'border';
		if (/(bg|background|surface|paper|canvas|base|card|panel|elev|overlay|fill)/.test(p)) return 'surface';
		if (/(ink|text|fg|foreground|copy|heading|title|muted|subtle|faint|label)/.test(p)) return 'text';
		return 'surface';
	}
	if (/shadow|^filter$|^backdrop-filter$/.test(p)) return 'border';
	if (/^(color|fill|stroke|caret-color|text-decoration-color|-webkit-text-fill-color|column-rule-color)$/.test(p) || p.startsWith('text-')) return 'text';
	if (/^(border|outline)/.test(p)) return 'border';
	return 'surface';
}

/** A color in a variable value, through var() chains and channel triplets (--black: 0 0 0 used as rgb(var(--black))). */
export function resolveColor(value: string | undefined, vars: Map<string, string>, depth = 0): RGBA | undefined {
	if (!value) return undefined;
	const ref = value.match(/^var\((--[\w-]+)/)?.[1];
	if (ref && depth < 5) return resolveColor(vars.get(ref), vars, depth + 1);
	const triplet = value.match(/^rgba?\(\s*var\((--[\w-]+)\)/)?.[1];
	const channels = triplet ? vars.get(triplet)?.match(/^(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})$/) : undefined;
	return channels ? parseColor(`rgb(${channels[1]}, ${channels[2]}, ${channels[3]})`) : parseColor(value);
}

/** The palette of a stylesheet (or all of a project's styles joined): its page colors and how its variables are used. */
export function sitePalette(css: string): Palette {
	const vars = new Map<string, string>();
	for (const m of css.matchAll(/(--[\w-]+)\s*:\s*([^;}]+)/g)) if (!vars.has(m[1])) vars.set(m[1], m[2].trim());
	const resolve = (v?: string) => resolveColor(v, vars);
	const pick = (re: RegExp) => [...vars].find(([n, v]) => re.test(n) && resolve(v))?.[1];
	// The page's own colors: body or html, also scoped (body:has(#app)), or the root element of a page that styles
	// itself apart from the rest of the site (#fx-root, .page-root).
	const roots = [...css.matchAll(/(?:^|[}\s,])((?:html|body)(?:[:.#[][^{,]*)?|[#.][\w-]*(?:root|page|site|app)\b[^{,]*)\s*\{([^}]*)\}/g)].map((m) => m[2]);
	const body = roots.find((r) => /background(?:-color)?\s*:/.test(r) && resolve(r.match(/background(?:-color)?\s*:\s*([^;]+)/)?.[1])) ?? roots[0] ?? '';
	const bg = resolve(body.match(/background(?:-color)?\s*:\s*([^;]+)/)?.[1]) ?? resolve(pick(/^--(bg|background|surface|paper|canvas|base)$/)) ?? resolve(pick(/(bg|background|paper|canvas)/));
	const fg = resolve(body.match(/(?:^|;|\s)color\s*:\s*([^;]+)/)?.[1]) ?? resolve(pick(/^--(ink|text|fg|foreground|body)$/)) ?? resolve(pick(/(ink|text|fg|foreground)/));
	return { ...fromLightness(bg, fg), vars, ...variableUse(css) };
}

/**
 * What each site variable is used for (text, a border, a background) and in which theme, from the rules that use it,
 * since names like --15-light or --gray-2 say nothing. A variable used only by dark-theme rules is a dark color.
 */
function variableUse(css: string) {
	const counts = new Map<string, Record<Family, number>>();
	const themes = new Map<string, { dark: number; light: number }>();
	const defs: [string, string, Mode | undefined][] = [];
	const add = (name: string, family: Family, mode?: Mode) => {
		const c = counts.get(name) ?? { text: 0, border: 0, surface: 0 };
		c[family]++;
		counts.set(name, c);
		const t = themes.get(name) ?? { dark: 0, light: 0 };
		t[mode === 'dark' ? 'dark' : 'light']++;
		themes.set(name, t);
	};
	walkCss(css, (decls, ctx) => {
		for (const m of decls.matchAll(/(?:^|[{;\s])(--[\w-]+|[a-z-]+)\s*:\s*([^;{}]*var\(--[^;{}]*)/g)) {
			if (m[1].startsWith('--')) {
				defs.push([m[1], m[2], ctx.mode]);
				continue;
			}
			if (/^(transition|animation|font|width|height|margin|padding|gap|top|left|right|bottom|inset|grid|flex|z-index|opacity|transform)/.test(m[1])) continue;
			for (const v of m[2].matchAll(/var\((--(?!ds-)[\w-]+)/g)) add(v[1], familyOf(m[1]), ctx.mode);
		}
		return decls;
	});
	// A variable defined through another (--15-light: var(--dk-text-1)) passes its use on, a few levels deep.
	for (let pass = 0; pass < 3; pass++) {
		for (const [name, value, mode] of defs) {
			const c = counts.get(name);
			const family = c ? (Object.entries(c) as [Family, number][]).sort((x, y) => y[1] - x[1])[0][0] : familyOf(name);
			for (const v of value.matchAll(/var\((--(?!ds-)[\w-]+)/g)) if (pass === 0 || !counts.has(v[1])) add(v[1], family, mode);
		}
	}
	const usage = new Map([...counts].map(([name, c]) => [name, (Object.entries(c) as [Family, number][]).sort((a, b) => b[1] - a[1])[0][0]]));
	const modes = new Map<string, Mode>();
	for (const [name, t] of themes) if (t.dark && !t.light) modes.set(name, 'dark');
	for (const name of counts.keys()) if (!modes.has(name) && /(^--|-)(dk|dark)(-|$)/.test(name)) modes.set(name, 'dark');
	return { usage, modes };
}

/** The palette of an app with no stylesheet (SwiftUI, Compose, Flutter, Android), from lines that name background and text. */
export function nativePalette(sources: string[], readNative: (line: string) => RGBA | undefined): Palette {
	let bg: RGBA | undefined;
	let fg: RGBA | undefined;
	for (const text of sources) {
		for (const line of text.split('\n')) {
			const isBg = /(background|scaffold|canvas|window|launch|\bbg\b)/i.test(line) && !/on-?background/i.test(line);
			const isFg = /(text|foreground|onBackground|on_background|label|\bfg\b|ink)/i.test(line);
			if (!isBg && !isFg) continue;
			const color = readNative(line) ?? [...line.matchAll(/#[0-9a-fA-F]{6}\b/g)].map((m) => parseColor(m[0])).find(Boolean);
			if (!color) continue;
			// A page is a neutral: a strong color on a background line is a button or a badge, not the page.
			if (isBg && !bg) {
				if (hsl(color).s < 0.25) bg = color;
			}
			else if (isFg && !isBg && !fg) fg = color;
		}
	}
	return fromLightness(bg, fg);
}

/** The palette a file's own Tailwind classes set (bg-zinc-950 on its outermost element makes a dark page). */
export function classPalette(text: string, base: Palette, twColor: (name: string) => RGBA | undefined): Palette {
	const color = (prefix: string) => {
		const m = text.match(new RegExp(`(?<![\\w:-])${prefix}-((?:[a-z]+-(?:50|[1-9]00|950))|white|black|\\[#[0-9a-fA-F]{3,8}\\])(?![\\w-])`));
		return m ? (m[1].startsWith('[') ? parseColor(m[1].slice(1, -1)) : twColor(m[1])) : undefined;
	};
	const bg = color('bg');
	if (!bg) return base;
	return { ...base, ...fromLightness(bg, color('text')), found: base.found };
}
