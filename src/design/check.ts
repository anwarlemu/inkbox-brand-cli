import { sameAs } from './doc.js';
import { platformOf, zonePx } from './platforms.js';
import { decodePng, type Pixels } from './png.js';
import type { Adapter, DesignDoc, DrawnLayer, Finding, Rect, TemplateInfo } from './types.js';

// The check: what the engine drew, against the rules every design keeps. It runs on every write and errors block it.
// Brand rules (color, contrast, the logo, whole words, nothing invented) can never be allowed; composition rules can be
// accepted for one document with --allow <rule>.

export const RULES: { id: string; says: string; severity: 'error' | 'warning' }[] = [
	{ id: 'color', severity: 'error', says: 'Words are drawn in and on the brand\'s own colors.' },
	{ id: 'contrast', severity: 'error', says: 'Words stand out from what is behind them: 4.5 to 1, or 3 to 1 for large text (24 px, or 18.66 px bold, where the picture is usually shown).' },
	{ id: 'logo-size', severity: 'error', says: 'The logo is never smaller than its minimum.' },
	{ id: 'logo-clear', severity: 'error', says: 'Nothing sits inside the logo\'s clear space.' },
	{ id: 'logo-whole', severity: 'error', says: 'The logo is inside the picture, whole.' },
	{ id: 'words', severity: 'error', says: 'Every word that was passed is drawn, whole.' },
	{ id: 'invented', severity: 'error', says: 'No words are drawn that were not passed.' },
	{ id: 'overlap', severity: 'error', says: 'Words, art, pictures and panel edges do not touch.' },
	{ id: 'safe-area', severity: 'error', says: 'Words, the logo and key art stay clear of what the platform covers or crops.' },
	{ id: 'cut', severity: 'error', says: 'Nothing is cut off at the edge: it is whole, it fades out, or it is a pattern meant to run off.' },
	{ id: 'small-text', severity: 'error', says: 'Small text is readable at the width the picture is usually shown at.' },
	{ id: 'upload-size', severity: 'warning', says: 'The file is under what the platform takes.' },
];
export const NEVER_ALLOWED = new Set(['color', 'contrast', 'logo-size', 'logo-clear', 'logo-whole', 'words', 'invented']);

/** Small text at the width it is shown at, in CSS px. */
export const SMALL_FLOOR = 8;
/** Large text, for contrast: CSS px where the picture is shown (WCAG 2.2, 1.4.3: 18 pt, or 14 pt bold). */
export const LARGE = 24;
export const LARGE_BOLD = 18.66;

export type CheckInput = { doc: DesignDoc; info: TemplateInfo; layers: DrawnLayer[]; adapter: Pick<Adapter, 'colors' | 'aliases' | 'words'>; png?: Uint8Array };

const right = (r: Rect) => r.x + r.w;
const bottom = (r: Rect) => r.y + r.h;
/** How far two boxes are into each other (0 or less: apart). */
const into = (a: Rect, b: Rect) => Math.min(Math.min(right(a), right(b)) - Math.max(a.x, b.x), Math.min(bottom(a), bottom(b)) - Math.max(a.y, b.y));
const grow = (r: Rect, by: number): Rect => ({ x: r.x - by, y: r.y - by, w: r.w + by * 2, h: r.h + by * 2 });
const inside = (r: Rect, of: Rect, by = 0) => r.x >= of.x + by - 0.5 && r.y >= of.y + by - 0.5 && right(r) <= right(of) - by + 0.5 && bottom(r) <= bottom(of) - by + 0.5;
export const inkOf = (l: DrawnLayer): Rect[] => (l.ink?.length ? l.ink : [l.box]);
/** The deepest any of two layers' inks are into each other. */
function touch(a: Rect[], b: Rect[]): number {
	let most = -Infinity;
	for (const x of a) for (const y of b) {
		const d = into(x, y);
		if (d > most) most = d;
	}
	return most;
}

function rgb(hex: string): [number, number, number] | undefined {
	const m = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(hex.trim());
	if (!m) return undefined;
	const h = m[1]!.length === 3 ? [...m[1]!].map((c) => c + c).join('') : m[1]!;
	return [0, 2, 4].map((i) => Number.parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

const norm = (hex: string) => {
	const c = rgb(hex);
	return c ? c.map((n) => n.toString(16).padStart(2, '0')).join('') : hex.toLowerCase();
};

export function luminance(hex: string): number {
	const c = rgb(hex);
	if (!c) return Number.NaN;
	const [r, g, b] = c.map((n) => {
		const v = n / 255;
		return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
	}) as [number, number, number];
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** The WCAG contrast of two hex colors, 1 to 21. */
export function contrast(a: string, b: string): number {
	const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m) as [number, number];
	return (x + 0.05) / (y + 0.05);
}

/** Words as they are compared: no case, no line breaks, and no marks that only separate (a list's # or |). */
export function wordsOf(text: string): string[] {
	return text.normalize('NFC').toUpperCase().toLowerCase().split(/[\s|]+/).map((w) => w.replace(/^#+/, '')).filter((w) => w && !/^[*\-–]+$/.test(w));
}

function missing(want: string[], have: string[]): string[] {
	const pool = new Map<string, number>();
	for (const w of have) pool.set(w, (pool.get(w) ?? 0) + 1);
	return want.filter((w) => {
		const n = pool.get(w) ?? 0;
		if (n) pool.set(w, n - 1);
		return !n;
	});
}

const list = (a: string[]) => (a.length > 1 ? `${a.slice(0, -1).join(', ')} and ${a.at(-1)}` : (a[0] ?? ''));
const r0 = Math.round;

/** Everything wrong with a drawn design, errors first. Allowed rules come back as warnings. */
export function checkDesign({ doc, layers, adapter, png }: CheckInput): Finding[] {
	const out: Finding[] = [];
	const { width: W, height: H } = doc.size;
	const canvas: Rect = { x: 0, y: 0, w: W, h: H };
	const platform = platformOf(doc.size.id, W, H);
	const accepted = new Set(doc.allow ?? []);
	const add = (rule: string, ids: string[], message: string) => {
		const spec = RULES.find((r) => r.id === rule)!;
		const allowable = !NEVER_ALLOWED.has(rule);
		const ok = allowable && accepted.has(rule);
		out.push({ rule, severity: ok ? 'warning' : spec.severity, allowable, layers: ids, message: ok ? `${message} (allowed)` : message });
	};
	const moved = doc.kind === 'image' || doc.kind === 'slide';
	const texts = layers.filter((l) => l.text);
	const plainWords = (t: string) => wordsOf(adapter.words ? adapter.words(t) : t);
	const brandColors = adapter.colors ? new Set(adapter.colors().map(norm)) : undefined;

	for (const l of texts) {
		const t = l.text!;
		if (brandColors) {
			const off = [t.color, ...t.ground].filter((c) => !brandColors.has(norm(c)));
			if (off.length) add('color', [l.id], `The ${l.id} uses ${list([...new Set(off)])}, which ${off.length > 1 ? 'are' : 'is'} not brand color${off.length > 1 ? 's' : ''}.`);
		}
		// Large text by WCAG: 24 px, or 18.66 px bold, at the width the picture is usually shown at.
		const css = (t.size * platform.shown) / W;
		const need = css >= LARGE - 0.01 || (t.bold && css >= LARGE_BOLD - 0.01) ? 3 : 4.5;
		for (const g of new Set(t.ground)) {
			const c = contrast(t.color, g);
			if (c < need - 0.005) add('contrast', [l.id], `The ${l.id} is ${t.color} on ${g}, a contrast of ${c.toFixed(2)} (it needs ${need}).`);
		}
		const shown = (t.size * platform.shown) / W;
		if (moved && shown < SMALL_FLOOR - 0.05) add('small-text', [l.id], `The ${l.id} is ${t.size.toFixed(1)} px, about ${shown.toFixed(1)} px where ${platform.label} is shown ${r0(platform.shown)} px wide. It needs ${Math.ceil((SMALL_FLOOR * W) / platform.shown)} px or more: shorten it, or use a bigger size.`);
		const asked = plainWords(t.asked);
		const drawn = plainWords(t.drawn);
		if (asked.join(' ') !== drawn.join(' ')) {
			const gone = missing(asked, drawn);
			add('words', [l.id], gone.length ? `The ${l.id} lost "${gone.join(' ')}". Shorten it to fit.` : `The ${l.id} reads "${t.drawn}", not "${t.asked}".`);
		}
	}

	// Copy that never reached a layer, and layers that say more than the copy.
	const ids = layers.map((l) => l.id);
	const hidden = Object.entries(doc.layers).filter(([, e]) => e.hidden).map(([id]) => id);
	const drawnWords = texts.flatMap((l) => plainWords(l.text!.asked));
	for (const [slot, v] of Object.entries(doc.copy)) {
		if (hidden.some((h) => h === slot || (!ids.includes(slot) && sameAs(slot, [h], adapter.aliases?.copy) === h))) continue;
		const gone = missing(plainWords(v), drawnWords);
		if (gone.length) add('words', [slot], `The ${slot} was passed "${gone.join(' ')}", which is not drawn.`);
	}
	const allWords = Object.values(doc.copy).flatMap(plainWords);
	for (const l of texts) {
		if (l.text!.own || l.text!.sample) continue;
		const extra = plainWords(l.text!.drawn).filter((w) => !allWords.includes(w));
		if (extra.length) add('invented', [l.id], `The ${l.id} says "${extra.join(' ')}", which nobody passed.`);
	}

	const logos = layers.filter((l) => l.kind === 'logo');
	for (const l of logos) {
		if (l.logo && l.box.h < l.logo.min - 0.05) add('logo-size', [l.id], `The logo is ${l.box.h.toFixed(1)} px tall; the least is ${l.logo.min.toFixed(1)} px here.`);
		if (moved && !inside(l.box, canvas)) add('logo-whole', [l.id], 'The logo runs off the picture.');
		const clear = grow(l.box, l.logo?.clear ?? 0);
		const near = layers.filter((o) => o !== l && !l.over?.includes(o.id) && !o.over?.includes(l.id) && touch(inkOf(o), [clear]) > 0.5);
		if (near.length) add('logo-clear', [l.id, ...near.map((o) => o.id)], `The ${list(near.map((o) => o.id))} ${near.length > 1 ? 'sit' : 'sits'} inside the logo's clear space (${r0(l.logo?.clear ?? 0)} px around it).`);
	}

	if (moved) {
		for (let i = 0; i < layers.length; i++) for (let j = i + 1; j < layers.length; j++) {
			const [a, b] = [layers[i]!, layers[j]!];
			if (a.kind === 'logo' || b.kind === 'logo') continue;   // logo-clear covers it
			const sits = a.over?.includes(b.id) ? [a, b] : b.over?.includes(a.id) ? [b, a] : undefined;
			if (sits) {
				const [top, under] = sits as [DrawnLayer, DrawnLayer];
				// Words on a panel stay inside its edges.
				if (under.kind === 'panel' && (top.kind === 'text' || top.kind === 'key') && !inkOf(top).every((r) => inside(r, under.box, 2))) add('overlap', [top.id, under.id], `The ${top.id} touches the edge of the ${under.id}.`);
				continue;
			}
			// Two pieces of art, or art over a panel, are the layout's own business.
			const matters = [a, b].some((l) => l.kind === 'text' || l.kind === 'key');
			if (!matters) continue;
			const d = touch(inkOf(a), inkOf(b));
			if (d > 0.5) add('overlap', [a.id, b.id], `The ${a.id} and the ${b.id} overlap by ${Math.max(1, r0(d))} px.`);
		}

		const kept = layers.filter((l) => l.kind === 'text' || l.kind === 'logo' || l.kind === 'key');
		for (const l of kept) {
			for (const z of platform.avoid) {
				if (touch(inkOf(l), [zonePx(z, W, H)]) > 0.5) add('safe-area', [l.id], `The ${l.id} is under ${z.name} on ${platform.label}${z.official ? '' : ' (its place is approximate)'}.`);
			}
			if (platform.safe) {
				const s = zonePx(platform.safe, W, H);
				if (!inkOf(l).every((r) => inside(r, s, -0.5))) add('safe-area', [l.id], `The ${l.id} leaves ${platform.safe.name} on ${platform.label}.`);
			}
		}

		let pixels: Pixels | undefined;
		for (const l of layers) {
			if (l.kind === 'logo') continue;   // logo-whole
			const box = l.kind === 'text' ? inkOf(l) : [l.box];
			if (box.every((r) => inside(r, canvas))) continue;
			if (l.kind === 'text' || l.kind === 'key') add('cut', [l.id], `The ${l.id} runs off the picture.`);
			else if (box.every((r) => into(r, canvas) <= 0)) add('cut', [l.id], `The ${l.id} is outside the picture.`);
			else if (l.bleeds) continue;
			else if (!l.fades) add('cut', [l.id], `The ${l.id} is cut off hard at the edge of the picture.`);
			else if (png) {
				pixels ??= decodePng(png);
				const side = pixels && hardEdge(pixels, l, layers, W, H);
				if (side) add('cut', [l.id], `The ${l.id} should fade out before the ${side} edge, but it is still drawn there.`);
			}
		}
	}

	if (png && platform.limit && png.byteLength > platform.limit.bytes) add('upload-size', [], `The PNG is ${(png.byteLength / 1048576).toFixed(1)} MB and ${platform.label} takes ${(platform.limit.bytes / 1048576).toFixed(0)} MB${platform.limit.official ? '' : ' (approximate)'}. Use --format jpg or webp.`);
	return out.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'error' ? -1 : 1));
}

/** The side where a layer that says it fades is still visible on the edge of the picture, if any. Read as the median
 * light of short stretches of the last few rows, so grain and thin lines (a rule crossing the edge) do not count. */
function hardEdge(px: Pixels, l: DrawnLayer, all: DrawnLayer[], W: number, H: number): string | undefined {
	const k = px.width / W;
	const canvas = { x: 0, y: 0, w: W, h: H };
	// Other layers at the edge are not this one's business. One that covers the whole canvas (a ground, a frame) counts
	// only by its ink; without ink it is the ground itself.
	const others = all.filter((o) => o !== l && o.kind !== 'panel' && (!inside(canvas, o.box) || !!o.ink?.length));
	const sides = [
		{ name: 'top', on: l.box.y < -0.5, at: (t: number, d: number) => [t, d], from: l.box.x, to: right(l.box), end: W },
		{ name: 'bottom', on: bottom(l.box) > H + 0.5, at: (t: number, d: number) => [t, H - d], from: l.box.x, to: right(l.box), end: W },
		{ name: 'left', on: l.box.x < -0.5, at: (t: number, d: number) => [d, t], from: l.box.y, to: bottom(l.box), end: H },
		{ name: 'right', on: right(l.box) > W + 0.5, at: (t: number, d: number) => [W - d, t], from: l.box.y, to: bottom(l.box), end: H },
	];
	const light = (x: number, y: number) => {
		const i = (Math.min(px.height - 1, Math.max(0, Math.floor(y * k))) * px.width + Math.min(px.width - 1, Math.max(0, Math.floor(x * k)))) * 4;
		return 0.2126 * px.data[i]! + 0.7152 * px.data[i + 1]! + 0.0722 * px.data[i + 2]!;
	};
	const SPAN = 12;
	/** The median light of a stretch along the edge, three rows deep. */
	const stretch = (s: (typeof sides)[number], t: number) => {
		const v: number[] = [];
		for (let a = 0; a < SPAN; a++) for (const d of [0.5, 1.5, 2.5]) {
			const [x, y] = s.at(t + a, d) as [number, number];
			v.push(light(x, y));
		}
		v.sort((p, q) => p - q);
		return v[v.length >> 1]!;
	};
	const near = (s: (typeof sides)[number], t: number) => others.some((o) => inkOf(o).some((r) => {
		const [x, y] = s.at(t, 0) as [number, number];
		const [x2, y2] = s.at(t + SPAN, 3) as [number, number];
		return Math.max(x, x2) >= r.x - 2 && Math.min(x, x2) <= right(r) + 2 && Math.max(y, y2) >= r.y - 2 && Math.min(y, y2) <= bottom(r) + 2 && (r.w > 3 && r.h > 3);
	}));
	for (const s of sides) {
		if (!s.on) continue;
		const from = Math.max(0, s.from - SPAN);
		const to = Math.min(s.end, s.to + SPAN) - SPAN * 2;
		for (let t = from; t <= to; t += SPAN / 2) {
			if (near(s, t) || near(s, t + SPAN)) continue;
			if (Math.abs(stretch(s, t) - stretch(s, t + SPAN)) > 20) return s.name;
		}
	}
	return undefined;
}

export const errorsOf = (f: Finding[]) => f.filter((x) => x.severity === 'error');

/** The findings as lines for a person. */
export function checkText(f: Finding[]): string {
	const e = errorsOf(f).length;
	const w = f.length - e;
	const head = `Check: ${e ? `${e} error${e > 1 ? 's' : ''}` : 'no errors'}${w ? `, ${w} warning${w > 1 ? 's' : ''}` : ''}`;
	return [head, ...f.map((x) => `  ${x.severity} ${x.rule}: ${x.message}${x.severity === 'error' && x.allowable ? ` (--allow ${x.rule} accepts it)` : ''}`)].join('\n');
}
