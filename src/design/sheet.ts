import { pngSize } from './png.js';

// Contact sheets and side-by-side comparisons, laid out here and painted by the CLI's own canvas or SVG rasterizer,
// so the core needs neither.

export type SheetSpec = {
	width: number; height: number; background: string;
	pictures: { png: Uint8Array; x: number; y: number; w: number; h: number; frame: string }[];
	labels: { text: string; x: number; y: number; size: number; color: string }[];   // y is the baseline
};
export type Painter = (spec: SheetSpec) => Promise<Uint8Array>;
export type SheetItem = { label: string; png: Uint8Array };

const PAD = 32;
const LABEL = 22;

/** Pictures in a grid, each at its own shape, with its label under it. */
export function contactSheet(items: SheetItem[], opts: { columns?: number; width?: number; notes?: string[] } = {}): SheetSpec {
	if (!items.length) throw new Error('A sheet needs at least one picture.');
	const sizes = items.map((i) => pngSize(i.png));
	const ratio = sizes.reduce((n, s) => n + s.width / s.height, 0) / sizes.length;
	const wide = opts.width ?? 1920;
	const cols = Math.min(items.length, opts.columns ?? (ratio > 2.2 ? 2 : ratio > 1.2 ? 3 : ratio > 0.7 ? 4 : 5));
	const cell = Math.floor((wide - PAD * (cols + 1)) / cols);
	const spec: SheetSpec = { width: wide, height: 0, background: '#ebebeb', pictures: [], labels: [] };
	let y = PAD;
	for (let r = 0; r < items.length; r += cols) {
		const row = items.slice(r, r + cols);
		// A row is as tall as its tallest picture at the cell's width, and no taller than one and a half cells.
		const fits = row.map((_, i) => {
			const s = sizes[r + i]!;
			const k = Math.min(cell / s.width, (cell * 1.5) / s.height, 1);
			return { w: Math.round(s.width * k), h: Math.round(s.height * k) };
		});
		const tall = Math.max(...fits.map((f) => f.h));
		row.forEach((it, i) => {
			const x = PAD + i * (cell + PAD);
			const f = fits[i]!;
			spec.pictures.push({ png: it.png, x, y, w: f.w, h: f.h, frame: '#c4c4c4' });
			// Labels are never cut: a long one gets smaller, then takes a second line.
			const size = Math.max(13, Math.min(LABEL, cell / (it.label.length * 0.56)));
			const max = Math.max(8, Math.floor(cell / (size * 0.56)));
			wrapLabel(it.label, max).forEach((line, n) => spec.labels.push({ text: line, x, y: y + tall + 12 + size + n * size * 1.25, size, color: '#1a1a1a' }));
		});
		const most = Math.max(...row.map((it) => {
			const size = Math.max(13, Math.min(LABEL, cell / (it.label.length * 0.56)));
			return wrapLabel(it.label, Math.max(8, Math.floor(cell / (size * 0.56)))).length * size * 1.25;
		}));
		y += tall + 12 + Math.ceil(most) + PAD;
	}
	for (const n of opts.notes ?? []) for (const line of wrapLabel(n, Math.floor((wide - PAD * 2) / (17 * 0.56)))) {
		spec.labels.push({ text: line, x: PAD, y: y + 17, size: 17, color: '#4a4a4a' });
		y += 24;
	}
	spec.height = Math.ceil(y + (opts.notes?.length ? PAD - 8 : 0));
	return spec;
}

/** Two pictures beside each other, with what differs listed under them. */
export function comparison(a: SheetItem, b: SheetItem, notes: string[]): SheetSpec {
	return contactSheet([a, b], { columns: pngSize(a.png).width / pngSize(a.png).height > 3.5 ? 1 : 2, notes: notes.length ? notes : ['No differences.'] });
}

function wrapLabel(text: string, max: number): string[] {
	const out: string[] = [];
	let line = '';
	for (const w of text.split(/\s+/)) {
		if (line && line.length + 1 + w.length > max) {
			out.push(line);
			line = w;
		} else line = line ? `${line} ${w}` : w;
	}
	out.push(line);
	return out;
}

const xml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** The sheet as SVG, for a CLI that rasterizes SVG (resvg): `paint: async (s) => rasterize(sheetSvg(s, 'My Font'))`. */
export function sheetSvg(s: SheetSpec, font = 'sans-serif'): string {
	const pics = s.pictures.map((p) => `<image x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" preserveAspectRatio="none" href="data:image/png;base64,${Buffer.from(p.png).toString('base64')}"/><rect x="${p.x - 0.5}" y="${p.y - 0.5}" width="${p.w + 1}" height="${p.h + 1}" fill="none" stroke="${p.frame}"/>`);
	const labels = s.labels.map((l) => `<text x="${l.x}" y="${l.y.toFixed(2)}" font-family="${xml(font)}" font-size="${l.size.toFixed(2)}" fill="${l.color}">${xml(l.text)}</text>`);
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${s.width}" height="${s.height}" viewBox="0 0 ${s.width} ${s.height}"><rect width="${s.width}" height="${s.height}" fill="${s.background}"/>${pics.join('')}${labels.join('')}</svg>`;
}

/** What sheetCanvas needs of a canvas library (@napi-rs/canvas fits as it is). */
export type CanvasApi = {
	createCanvas(width: number, height: number): {
		getContext(kind: '2d'): unknown;
		toBuffer(type: 'image/png'): Uint8Array;
	};
	loadImage(data: Buffer): Promise<unknown>;
};

/** The sheet on a canvas: `paint: (s) => sheetCanvas(s, { createCanvas, loadImage }, 'My Font')`. */
export async function sheetCanvas(s: SheetSpec, api: CanvasApi, font = 'sans-serif'): Promise<Uint8Array> {
	const canvas = api.createCanvas(s.width, s.height);
	const ctx = canvas.getContext('2d') as {
		fillStyle: string; strokeStyle: string; font: string; imageSmoothingEnabled: boolean; imageSmoothingQuality: string;
		fillRect(x: number, y: number, w: number, h: number): void; strokeRect(x: number, y: number, w: number, h: number): void;
		drawImage(i: unknown, x: number, y: number, w: number, h: number): void; fillText(t: string, x: number, y: number): void;
	};
	ctx.fillStyle = s.background;
	ctx.fillRect(0, 0, s.width, s.height);
	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = 'high';
	for (const p of s.pictures) {
		ctx.drawImage(await api.loadImage(Buffer.from(p.png)), p.x, p.y, p.w, p.h);
		ctx.strokeStyle = p.frame;
		ctx.strokeRect(p.x - 0.5, p.y - 0.5, p.w + 1, p.h + 1);
	}
	for (const l of s.labels) {
		ctx.fillStyle = l.color;
		ctx.font = `${l.size.toFixed(2)}px ${/^["']|,/.test(font) || /^[\w-]+$/.test(font) ? font : `"${font}"`}`;
		ctx.fillText(l.text, l.x, l.y);
	}
	return new Uint8Array(canvas.toBuffer('image/png'));
}
