import { readFileSync } from 'node:fs';
import type { Canvas, Image } from '@napi-rs/canvas';
import { pkgPath } from '../lib/paths.js';
import { artImage, logoDoc, wordmarkPath } from './brand-art.js';
import { brandFonts, pixelsOf, scratch, surface, tokenColor, toPng, toSvg, type ColorRef, type Ctx } from './canvas.js';
import { drawable } from './glyphs.js';
import { pick } from './io.js';
import { imagesToPdf } from './pdf.js';
import { contrast } from './place.js';
import { hatchLines, inkBox, reefInkIn, tileWords, type DrawnLayer, type Rect } from './share.js';
import { fit } from './text.js';

// Merch print files (brand/assets/merch.json): each item's trim, bleed and safe area in inches, and a layout of the
// approved lockups, the octopus art, the brand's patterns and words, in inches from the trim. A file is the item at 300
// pixels per inch with the bleed around it: SVG at physical size (inches on the root) and PNG at the asked dpi. Colors
// come only from the variant; one-color variants never carry the full-color octopus. No mockups.

export const PX_PER_IN = 300;
type Box = [number, number, number, number];
type Layer =
	| { type: 'logo'; part: 'full' | 'wordmark' | 'mark'; fallback?: 'wordmark'; box: Box; boxOne?: Box; clear?: boolean; align?: 'left' | 'center' }
	| { type: 'art'; id: string; box: Box }
	| { type: 'pattern'; kind: 'tile' | 'outline' | 'hatch' | 'reef'; box: Box; fade?: boolean; drop?: number }
	| { type: 'text'; slot: string; box: Box; size: number; align?: 'left' | 'center' | 'right'; face?: 'sans' | 'mono'; maxLines?: number; highlight?: boolean };

export type MerchItem = { id: string; name: string; size: [number, number]; bleed: number; safe: number; method: string; source: string; cut?: { radius: number }; variants: string[]; layers: Layer[] };
type Variant = { ground: string; ink: ColorRef; line: ColorRef; tile: ColorRef; fullColor: boolean; groundPrinted: boolean; highlight?: string };
type MerchDoc = { dpi: number; sample: Record<string, string>; variants: Record<string, Variant>; items: MerchItem[] };

let doc: MerchDoc | undefined;
export const merchDoc = (): MerchDoc => (doc ??= JSON.parse(readFileSync(pkgPath('brand', 'assets', 'merch.json'), 'utf8')) as MerchDoc);
export const merchItems = () => merchDoc().items;
export const findItem = (id: string): MerchItem => {
	const name = pick('item', id, merchItems().map((i) => i.id));
	return merchItems().find((i) => i.id === name)!;
};

export function merchCatalog() {
	return {
		items: merchItems().map((i) => ({
			id: i.id,
			name: i.name,
			trim: { width: i.size[0], height: i.size[1], unit: 'in' },
			bleed: i.bleed,
			safe: i.safe,
			method: i.method,
			variants: i.variants,
			pixels: { width: Math.round((i.size[0] + 2 * i.bleed) * PX_PER_IN), height: Math.round((i.size[1] + 2 * i.bleed) * PX_PER_IN), dpi: PX_PER_IN },
			dieCut: Boolean(i.cut),
			slots: [...new Set(i.layers.flatMap((l) => (l.type === 'text' ? [l.slot] : [])))],
			source: i.source,
		})),
		variants: Object.entries(merchDoc().variants).map(([id, v]) => ({ id, ground: v.ground || null, ink: v.ink, fullColor: v.fullColor })),
		lockups: logoDoc().lockups,
		note: 'Sizes are common vendor print areas, not a vendor\'s exact template: confirm with the vendor before ordering.',
	};
}

export type MerchRequest = { variant?: string; slots?: Record<string, string>; guides?: boolean; sample?: boolean };

const LOCK = () => logoDoc().lockup;
const WM = () => logoDoc().wordmark;

/** The lockup part's width over its height. */
function ratioOf(part: 'full' | 'wordmark' | 'mark') {
	const L = LOCK();
	if (part === 'wordmark') return WM().w / WM().h;
	if (part === 'mark') return L.mark.w / L.mark.h;
	return L.w / L.h;
}

function drawLockupPart(ctx: Ctx, part: 'full' | 'wordmark' | 'mark', x: number, y: number, h: number, ink: string, mark: Image) {
	const L = LOCK();
	if (part === 'wordmark') {
		const k = h / WM().h;
		ctx.save();
		ctx.translate(x, y);
		ctx.scale(k, k);
		ctx.fillStyle = ink;
		ctx.fill(wordmarkPath());
		ctx.restore();
		return;
	}
	const k = h / L.h;
	ctx.drawImage(mark, x, y, L.mark.w * k, L.mark.h * k);
	if (part === 'mark') return;
	ctx.save();
	ctx.translate(x + L.word.x * k, y + L.word.y * k);
	ctx.scale(k, k);
	ctx.fillStyle = ink;
	ctx.fill(wordmarkPath());
	ctx.restore();
}

/** Draws an item on a context in its own pixels (300 per inch, bleed included). */
export async function drawItem(ctx: Ctx, item: MerchItem, req: MerchRequest = {}) {
	const variant = pick(`variant for ${item.id}`, req.variant ?? item.variants[0]!, item.variants);
	const v = merchDoc().variants[variant]!;
	const ink = tokenColor(v.ink);
	const line = tokenColor(v.line);
	const ground = v.ground ? tokenColor(v.ground) : '';
	const o = item.bleed * PX_PER_IN;
	const W = (item.size[0] + 2 * item.bleed) * PX_PER_IN;
	const H = (item.size[1] + 2 * item.bleed) * PX_PER_IN;
	const px = (b: Box): Rect => ({ x: b[0] * PX_PER_IN + o, y: b[1] * PX_PER_IN + o, w: b[2] * PX_PER_IN, h: b[3] * PX_PER_IN });
	const takes = new Set(item.layers.flatMap((l) => (l.type === 'text' ? [l.slot] : [])));
	for (const k of Object.keys(req.slots ?? {})) if (!takes.has(k)) throw new Error(`${item.id} does not draw --${k}.${takes.size ? ` It takes ${[...takes].map((s) => `--${s}`).join(', ')}.` : ' It takes no text.'}`);
	const slots: Record<string, string> = { ...(req.sample ? Object.fromEntries(Object.entries(merchDoc().sample).filter(([k]) => takes.has(k))) : {}), ...Object.fromEntries(Object.entries(req.slots ?? {}).filter(([, t]) => t.trim())) };
	for (const l of item.layers) if (l.type === 'text') drawable(l.slot, slots[l.slot], l.face === 'mono' ? 'mono' : 'sans');
	const layers: DrawnLayer[] = [];
	const inGround = [ground || tokenColor('white')];
	const add = (id: string, kind: DrawnLayer['kind'], box: Rect, more: Partial<DrawnLayer> = {}) => {
		const n = layers.filter((x) => x.id === id || x.id.startsWith(`${id}-`)).length;
		layers.push({ id: n ? `${id}-${n + 1}` : id, kind, box, can: {}, ...more });
	};
	const fonts = brandFonts();
	const mark = await artImage('sit');
	if (v.groundPrinted && ground) {
		ctx.fillStyle = ground;
		ctx.fillRect(0, 0, W, H);
	}
	const u = PX_PER_IN / 60;
	/* Whole wordmarks inside the safe area, so the trim never cuts one. */
	const safe: Rect = { x: o + item.safe * PX_PER_IN, y: o + item.safe * PX_PER_IN, w: W - 2 * (o + item.safe * PX_PER_IN), h: H - 2 * (o + item.safe * PX_PER_IN) };
	const inSafe = (r: Rect): Rect => {
		const x = Math.max(r.x, safe.x);
		const y = Math.max(r.y, safe.y);
		return { x, y, w: Math.min(r.x + r.w, safe.x + safe.w) - x, h: Math.min(r.y + r.h, safe.y + safe.h) - y };
	};
	for (const l of item.layers) {
		const b = px(l.box);
		if (l.type === 'pattern') {
			// Patterns stay inside their box; on a printed ground the box may run into the bleed.
			const r = { ...b };
			if (v.groundPrinted) {
				if (r.x <= o + 0.01) {
					r.w += r.x;
					r.x = 0;
				}
				if (r.x + r.w >= W - o - 0.01) r.w = W - r.x;
				if (r.y + r.h >= H - o - 0.01) r.h = H - r.y;
			}
			// The reef is full-color art and the tile is drawn as a tint, so one-color files leave both out.
			if ((l.kind === 'reef' || l.kind === 'tile') && !v.fullColor) continue;
			add(l.kind, 'art', r, { bleeds: true, ...(l.kind === 'reef' ? { ink: reefInkIn(await artImage('reef'), r.x, r.y + r.h, r.w, l.drop ?? 0) } : {}) });
			if (l.kind === 'hatch') {
				ctx.strokeStyle = line;
				ctx.lineWidth = u;
				hatchLines(ctx, r, 19 * u, 45);
				ctx.fillStyle = line;
				ctx.fillRect(r.x, r.y, r.w, u);
			} else if (l.kind === 'tile') {
				ctx.save();
				ctx.fillStyle = tokenColor(v.tile);
				ctx.globalAlpha = ground && ground !== tokenColor('white') ? 0.22 : 0.12;
				if (l.fade && v.fullColor) {
					// Fading down: the tile drawn through a mask that thins it toward the lockup.
					const off = scratch(r.w, r.h);
					off.ctx.fillStyle = ctx.fillStyle as string;
					const q = inSafe(r);
					tileWords(off.ctx, { x: q.x - r.x, y: q.y - r.y, w: q.w, h: q.h }, 51.6, u, true);
					off.ctx.globalCompositeOperation = 'destination-in';
					const g = off.ctx.createLinearGradient(0, 0, 0, r.h);
					g.addColorStop(0, 'rgba(0,0,0,1)');
					g.addColorStop(1, 'rgba(0,0,0,0)');
					off.ctx.fillStyle = g;
					off.ctx.fillRect(0, 0, r.w, r.h);
					ctx.drawImage(off.canvas, r.x, r.y);
				} else tileWords(ctx, inSafe(r), 51.6, u, true);
				ctx.restore();
			} else if (l.kind === 'outline') {
				/* One whole wordmark, as wide as the box, its rule the box's width. */
				const k = Math.min(r.h / WM().h, r.w / WM().w);
				const bw = WM().w * k;
				ctx.save();
				ctx.fillStyle = line;
				ctx.fillRect(r.x, r.y + WM().xTop * k, r.w, Math.max(1, u));
				ctx.translate(r.x + (r.w - bw) / 2, r.y);
				ctx.scale(k, k);
				if (ground) {
					ctx.fillStyle = ground;
					ctx.fill(wordmarkPath());
				} else {
					/* Nothing is printed inside the letters: the rule shows only between them. */
					ctx.globalCompositeOperation = 'destination-out';
					ctx.fill(wordmarkPath());
					ctx.globalCompositeOperation = 'source-over';
				}
				ctx.strokeStyle = line;
				ctx.lineWidth = (1.6 * u) / k;
				ctx.stroke(wordmarkPath());
				ctx.restore();
			} else {
				const reef = await artImage('reef');
				const R = logoDoc().reef;
				const rh = (r.w * R.h) / R.w;
				const off = scratch(r.w, rh);
				off.ctx.drawImage(reef, 0, 0, r.w, rh);
				if (ground && ground !== tokenColor('brand')) {
					off.ctx.globalCompositeOperation = 'source-atop';
					off.ctx.globalAlpha = 0.62;
					off.ctx.fillStyle = ground;
					off.ctx.fillRect(0, 0, r.w, rh);
				}
				ctx.drawImage(off.canvas, r.x, r.y + r.h - rh * (1 - (l.drop ?? 0)));
			}
		} else if (l.type === 'art') {
			if (!v.fullColor) continue;
			const im = await artImage(l.id);
			const ratio = im.height / im.width;
			const w = Math.min(b.w, b.h / ratio);
			const h = w * ratio;
			ctx.drawImage(im, b.x + (b.w - w) / 2, b.y + (b.h - h) / 2, w, h);
			add('art', 'art', inkBox(l.id, b.x + (b.w - w) / 2, b.y + (b.h - h) / 2, w), { over: ['reef', 'outline', 'tile', 'hatch'] });
		} else if (l.type === 'logo') {
			const part = !v.fullColor && l.part !== 'wordmark' ? l.fallback ?? null : l.part;
			if (!part) continue;
			const at = part !== l.part && l.boxOne ? px(l.boxOne) : b;
			const ratio = ratioOf(part);
			const h = Math.min(at.h, at.w / ratio);
			const w = h * ratio;
			const box = { x: l.align === 'left' ? at.x : at.x + (at.w - w) / 2, y: at.y + (at.h - h) / 2, w, h };
			const clear = part === 'mark' ? 0 : h * logoDoc().clear.share;
			if (l.clear && ground) {
				/* The pattern stops short of the wordmark. */
				ctx.fillStyle = ground;
				ctx.beginPath();
				ctx.roundRect(box.x - clear * 1.2, box.y - clear, box.w + clear * 2.4, box.h + clear * 2, h / 2);
				ctx.fill();
			}
			add('logo', 'logo', box, { logo: { clear: part === 'wordmark' ? 0 : clear, min: 0.25 * PX_PER_IN }, over: ['hatch', 'tile'] });
			drawLockupPart(ctx, part, box.x, box.y, h, ink, mark);
		} else {
			const value = slots[l.slot] ?? '';
			if (!value.trim()) continue;
			const plain = value.replace(/\\n/g, '\n').replace(/\*/g, '');
			const style = l.face === 'mono' ? { family: fonts.mono, weight: 500, size: l.size * PX_PER_IN, tracking: 0, leading: 1.2, color: ink, align: l.align ?? 'center' } : { family: fonts.sans, weight: 600, size: l.size * PX_PER_IN, tracking: -0.01, leading: 1.04, color: ink, align: l.align ?? 'center' };
			const f = fit(ctx, plain, style as never, b.w, l.maxLines ?? 2, 0.6, `${item.id} ${l.slot}`);
			// Highlighted words (in *stars*) take the pink on full-color variants, as the share images do.
			const hi = new Set<number>();
			if (l.highlight && v.fullColor) {
				let on = false;
				let idx = 0;
				for (const part of value.split('*')) {
					for (const _w of part.split(/\s+/).filter(Boolean)) {
						if (on) hi.add(idx);
						idx++;
					}
					on = !on;
				}
			}
			const lh = f.size * (f.style.leading ?? 1.2);
			ctx.font = `${f.style.weight} ${f.size}px ${f.style.family}`;
			ctx.letterSpacing = `${(f.style.tracking ?? 0) * f.size}px`;
			ctx.textBaseline = 'alphabetic';
			ctx.textAlign = 'left';
			let word = 0;
			const lineBoxes: Rect[] = [];
			const hiColor = v.highlight ? tokenColor(v.highlight) : ink;
			f.lines.forEach((ln, i) => {
				const lw = f.widths[i]!;
				let x = f.style.align === 'center' ? b.x + (b.w - lw) / 2 : f.style.align === 'right' ? b.x + b.w - lw : b.x;
				lineBoxes.push({ x, y: b.y + i * lh, w: lw, h: f.size * 1.1 });
				const yb = b.y + i * lh + f.size * 0.92;
				for (const w of ln.split(' ')) {
					ctx.fillStyle = hi.has(word) ? hiColor : ink;
					ctx.fillText(w, x, yb);
					x += ctx.measureText(`${w} `).width;
					word++;
				}
			});
			ctx.letterSpacing = '0px';
			const said = plain.replace(/\s+/g, ' ').trim();
			const box = { x: Math.min(...lineBoxes.map((q) => q.x)), y: lineBoxes[0]!.y, w: Math.max(...lineBoxes.map((q) => q.w)), h: lineBoxes.length * lh };
			add(l.slot, 'text', box, { ink: lineBoxes, text: { asked: said, drawn: f.lines.join(' '), size: f.size, color: hi.size && v.ground && contrast(hiColor, inGround[0]!) < contrast(ink, inGround[0]!) ? hiColor : ink, ground: v.ground ? inGround : [contrast(ink, tokenColor('white')) >= contrast(ink, tokenColor('ink')) ? tokenColor('white') : tokenColor('ink')], ...(req.sample && !req.slots?.[l.slot] ? { sample: true } : {}) } });
		}
	}
	if (req.guides) {
		ctx.save();
		ctx.strokeStyle = tokenColor('status-danger');
		ctx.lineWidth = 3;
		if (item.bleed) ctx.strokeRect(o, o, item.size[0] * PX_PER_IN, item.size[1] * PX_PER_IN);
		const s = item.safe * PX_PER_IN;
		ctx.setLineDash([18, 12]);
		ctx.strokeRect(o + s, o + s, item.size[0] * PX_PER_IN - 2 * s, item.size[1] * PX_PER_IN - 2 * s);
		ctx.restore();
	}
	return { variant, width: W, height: H, layers };
}

/** The die line (the cutter's CutContour spot path) for an item with a cut: in the SVG only, never printed. */
export function cutPath(item: MerchItem): string {
	if (!item.cut) return '';
	const o = item.bleed * PX_PER_IN;
	const w = item.size[0] * PX_PER_IN;
	const h = item.size[1] * PX_PER_IN;
	const r = item.cut.radius * PX_PER_IN;
	const d = `M${o + r} ${o}H${o + w - r}A${r} ${r} 0 0 1 ${o + w} ${o + r}V${o + h - r}A${r} ${r} 0 0 1 ${o + w - r} ${o + h}H${o + r}A${r} ${r} 0 0 1 ${o} ${o + h - r}V${o + r}A${r} ${r} 0 0 1 ${o + r} ${o}Z`;
	// The cutter reads the spot color by name; magenta is the industry's convention for a die line, not a brand color.
	return `<g id="CutContour"><path d="${d}" fill="none" stroke="#FF00FF" stroke-width="3"/></g>`;
}

export type MerchRender = { png?: Buffer; svg?: string; pdf?: Buffer; layers: DrawnLayer[]; variant: string; width: number; height: number; widthIn: number; heightIn: number; dpi: number };

/** An item as print files: SVG at physical size (with the die line, if any) and PNG at `dpi` (72 to 600). */
export async function renderItem(item: MerchItem, req: MerchRequest & { png?: boolean; svg?: boolean; pdf?: boolean; dpi?: number } = {}): Promise<MerchRender> {
	const widthIn = item.size[0] + 2 * item.bleed;
	const heightIn = item.size[1] + 2 * item.bleed;
	const W = Math.round(widthIn * PX_PER_IN);
	const H = Math.round(heightIn * PX_PER_IN);
	const dpi = req.dpi ?? PX_PER_IN;
	const out: MerchRender = { layers: [], variant: '', width: Math.round(widthIn * dpi), height: Math.round(heightIn * dpi), widthIn, heightIn, dpi };
	if (req.png !== false || req.pdf) {
		const s = surface(W, H, { scale: dpi / PX_PER_IN });
		const drawn = await drawItem(s.ctx, item, req);
		out.variant = drawn.variant;
		out.layers = drawn.layers;
		if (req.png !== false) out.png = toPng(s, { dpi });
		if (req.pdf) {
			/* One page at the item's physical size, bleed included, on white where nothing is printed. */
			const flat = surface(W, H, { scale: dpi / PX_PER_IN });
			flat.ctx.fillStyle = tokenColor('white');
			flat.ctx.fillRect(0, 0, W, H);
			flat.ctx.setTransform(1, 0, 0, 1, 0, 0);
			flat.ctx.drawImage(s.canvas as Canvas, 0, 0);
			const px = pixelsOf(flat);
			const rgb = Buffer.alloc((px.data.length / 4) * 3);
			for (let i = 0, j = 0; i < px.data.length; i += 4, j += 3) px.data.copy(rgb, j, i, i + 3);
			out.pdf = imagesToPdf([{ rgb, width: px.width, height: px.height }], widthIn * 72);
		}
	}
	if (req.svg) {
		const s = surface(W, H, { svg: true });
		const drawn = await drawItem(s.ctx, item, req);
		out.variant = drawn.variant;
		out.layers = drawn.layers;
		out.svg = toSvg(s, { widthIn, heightIn }).replace(/<\/svg>\s*$/, `${cutPath(item)}</svg>\n`);
	}
	return out;
}
