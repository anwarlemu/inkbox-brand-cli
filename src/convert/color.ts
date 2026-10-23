// Color parsing shared by every converter.

export type RGBA = [number, number, number, number];

const NAMED: Record<string, RGBA> = { white: [255, 255, 255, 1], black: [0, 0, 0, 1] };

/** Every color written in a CSS value: hex, rgb(), hsl(), white and black. */
export const COLOR_IN_VALUE = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\([^()]*\)|(?<![\w-])(?:white|black)(?![\w-])/g;

export function parseColor(raw: string): RGBA | undefined {
	const v = raw.trim().toLowerCase();
	if (NAMED[v]) return NAMED[v];
	const hex = v.match(/^#([0-9a-f]{3,8})$/)?.[1];
	if (hex) {
		if (![3, 4, 6, 8].includes(hex.length)) return undefined;
		const full = hex.length <= 4 ? [...hex].map((c) => c + c).join('') : hex;
		const n = (i: number) => Number.parseInt(full.slice(i, i + 2), 16);
		return [n(0), n(2), n(4), full.length === 8 ? n(6) / 255 : 1];
	}
	const alpha = (s?: string) => (s === undefined ? 1 : s.endsWith('%') ? Number.parseFloat(s) / 100 : Number(s));
	const fn = v.match(/^rgba?\(\s*([\d.]+%?)[\s,]+([\d.]+%?)[\s,]+([\d.]+%?)(?:[\s,/]+([\d.]+%?))?\s*\)$/);
	if (fn) {
		const ch = (s: string) => (s.endsWith('%') ? (Number.parseFloat(s) * 255) / 100 : Number(s));
		return [ch(fn[1]), ch(fn[2]), ch(fn[3]), alpha(fn[4])];
	}
	const h = v.match(/^hsla?\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%(?:[\s,/]+([\d.]+%?))?\s*\)$/);
	if (h) return fromHsl(Number(h[1]), Number(h[2]) / 100, Number(h[3]) / 100, alpha(h[4]));
	return undefined;
}

export function fromHsl(hue: number, s: number, l: number, a = 1): RGBA {
	const h = hue / 360;
	const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
	const p = 2 * l - q;
	const f = (t: number) => {
		const x = t < 0 ? t + 1 : t > 1 ? t - 1 : t;
		return 255 * (x < 1 / 6 ? p + (q - p) * 6 * x : x < 1 / 2 ? q : x < 2 / 3 ? p + (q - p) * (2 / 3 - x) * 6 : p);
	};
	return [f(h + 1 / 3), f(h), f(h - 1 / 3), a];
}

export function hsl([r, g, b]: RGBA) {
	const [R, G, B] = [r / 255, g / 255, b / 255];
	const max = Math.max(R, G, B);
	const min = Math.min(R, G, B);
	const l = (max + min) / 2;
	const d = max - min;
	const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
	let h = 0;
	if (d) h = max === R ? ((G - B) / d) % 6 : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
	return { h: (h * 60 + 360) % 360, s, l };
}

/** A strong color: saturated and neither near white nor near black (a brand blue, a green badge). */
export const isStrong = (c: RGBA) => {
	const { s, l } = hsl(c);
	return s > 0.3 && l > 0.12 && l < 0.88 && c[3] > 0.5;
};

/** WCAG relative luminance and contrast ratio. */
export function contrast(a: RGBA, b: RGBA) {
	const lum = ([r, g, b2]: RGBA) => {
		const ch = (v: number) => {
			const c = v / 255;
			return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
		};
		return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b2);
	};
	const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
	return (x + 0.05) / (y + 0.05);
}
