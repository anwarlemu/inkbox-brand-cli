import type { Rect } from './share.js';

// Where words may go: the empty rectangles left in an area once everything that must stay clear of them is taken out.

export const inter = (a: Rect, b: Rect, gap = 0) => a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap;
export const grow = (r: Rect, by: number): Rect => ({ x: r.x - by, y: r.y - by, w: r.w + 2 * by, h: r.h + 2 * by });
export const union = (rs: Rect[]): Rect => {
	const x = Math.min(...rs.map((r) => r.x));
	const y = Math.min(...rs.map((r) => r.y));
	return { x, y, w: Math.max(...rs.map((r) => r.x + r.w)) - x, h: Math.max(...rs.map((r) => r.y + r.h)) - y };
};

/** Every maximal empty rectangle of `area` around `obstacles`, largest first. */
export function emptyRects(area: Rect, obstacles: Rect[]): Rect[] {
	if (area.w <= 0 || area.h <= 0) return [];
	let free: Rect[] = [area];
	for (const o of obstacles) {
		const next: Rect[] = [];
		for (const f of free) {
			if (!inter(f, o)) {
				next.push(f);
				continue;
			}
			if (o.x > f.x) next.push({ x: f.x, y: f.y, w: o.x - f.x, h: f.h });
			if (o.x + o.w < f.x + f.w) next.push({ x: o.x + o.w, y: f.y, w: f.x + f.w - o.x - o.w, h: f.h });
			if (o.y > f.y) next.push({ x: f.x, y: f.y, w: f.w, h: o.y - f.y });
			if (o.y + o.h < f.y + f.h) next.push({ x: f.x, y: o.y + o.h, w: f.w, h: f.y + f.h - o.y - o.h });
		}
		const inside = (a: Rect, b: Rect) => a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h;
		free = next.filter((a, i) => a.w > 1 && a.h > 1 && !next.some((b, j) => j !== i && inside(a, b) && (!inside(b, a) || j < i)));
		if (free.length > 48) free = free.sort((a, b) => b.w * b.h - a.w * a.h).slice(0, 48);
	}
	return free.sort((a, b) => b.w * b.h - a.w * a.h || a.y - b.y || a.x - b.x);
}

/* ------------------------------------------------------------ color */

function rgb(color: string): [number, number, number, number] {
	const m = color.match(/rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:\s*[,/]\s*([\d.]+))?/);
	if (m) return [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4] ?? 1)];
	const n = (i: number) => Number.parseInt(color.slice(i, i + 2), 16);
	return [n(1), n(3), n(5), color.length === 9 ? n(7) / 255 : 1];
}

export function luminance(color: string): number {
	const lin = (c: number) => {
		const v = c / 255;
		return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
	};
	const [r, g, b] = rgb(color);
	return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrast(a: string, b: string): number {
	const [x, y] = [luminance(a), luminance(b)];
	return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** `color` over `ground` at `alpha` (times the color's own), as an opaque hex. */
export function over(color: string, ground: string, alpha = 1): string {
	const c = rgb(color);
	const g = rgb(ground);
	const a = c[3] * alpha;
	return `#${[0, 1, 2].map((i) => Math.round(c[i]! * a + g[i]! * (1 - a)).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

/** The asked opacity, or the least one at which `color` on `ground` still passes `min`. */
export function readableAlpha(color: string, ground: string, asked: number, min: number): number {
	for (let a = asked; a < 1; a += 0.02) if (contrast(over(color, ground, a), ground) >= min) return a;
	return 1;
}
