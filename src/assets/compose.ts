import type { Canvas, Image } from '@napi-rs/canvas';
import { blockRects, type BlockInfo, type DesignDoc, type DrawnLayer, type LayerEdit, type Rect } from '../design/index.js';
import { artImage, brandColor, highlightColor, logoDoc, themes, wordmarkPath } from './brand-art.js';
import { scratch, tokenColor, withAlpha, type Ctx, type Fonts } from './canvas.js';
import { drawable } from './glyphs.js';
import { glyphs } from './icons.js';
import { contrast, over } from './place.js';
import { floorsOf, hatchLines, inkBox, reefInkIn, tileWords } from './share.js';
import { setFont, wrap } from './text.js';
import { APP_H, APP_W, drawApp, type Icons } from './window.js';
import { Path2D } from '@napi-rs/canvas';

// The brand's blocks for compose designs: the share images' own parts (the headline with its highlight, the line under
// it, the pill and dot badges, the lockup, the octopus sitting or hanging, the reef, the wordmark tile, the outline band,
// hatching, the console in a window) drawn into any cells of the grid. The card, stat, quote, list, button, search field,
// chart, divider and icon are not in the share-image editor: they are built from the library's own parts and the tokens
// (the card's 24 px corners and Shadow/S, the purple pill, the check circle, the chart-series colors, the Phosphor
// glyphs), as brand/assets/image.json notes. Words fit their cells or the block fails saying what to shorten.

type Can = DrawnLayer['can'];
const TEXT: Can = { scale: [0.5, 1.6], hide: true, align: true };
const PART: Can = { scale: [0.5, 1.6], hide: true };
const DECOR: Can = { hide: true };

export const BLOCKS: BlockInfo[] = [
	{ type: 'headline', names: ['title', 'heading'], kind: 'text', description: 'The headline in Inter SemiBold; *stars* set a phrase in the highlight.', copy: [{ id: 'text', required: true }], span: { cols: 12, rows: 3 }, place: 'top', sample: { text: 'Every agent gets *an inbox*' } },
	{ type: 'body', names: ['subtitle', 'text', 'paragraph', 'credit'], kind: 'text', description: 'A line or a paragraph.', copy: [{ id: 'text', required: true }], span: { cols: 8, rows: 2 }, sample: { text: 'Email, phone and calendars for every agent.' } },
	{ type: 'badge', names: ['eyebrow', 'chip', 'tag', 'label', 'pill'], kind: 'text', description: 'The pill badge with its pink dot, or the dot badge.', copy: [{ id: 'text', required: true }], options: [{ id: 'style', values: ['pill', 'dot', 'solid'] }], span: { cols: 3, rows: 1 }, place: 'top-left', sample: { text: 'New' } },
	{ type: 'logo', names: ['lockup', 'wordmark'], kind: 'logo', description: 'The lockup: the octopus and the wordmark.', copy: [], options: [{ id: 'part', values: ['full', 'wordmark'] }], span: { cols: 4, rows: 1 }, place: 'top-left' },
	{ type: 'art', names: ['octopus', 'mascot', 'character'], kind: 'art', description: 'The octopus, sitting or hanging (the brand\'s own art, never redrawn).', copy: [], options: [{ id: 'pose', values: ['sit', 'hang'] }], span: { cols: 4, rows: 4 }, place: 'right' },
	{ type: 'reef', names: ['seabed', 'scene'], kind: 'art', description: 'The reef along the foot of its cells, faded into the ground on light themes.', copy: [], span: { cols: 12, rows: 4 }, place: 'bottom', under: true },
	{ type: 'tile', names: ['pattern', 'wordmark-tile'], kind: 'art', description: 'The wordmark repeated in rows, whole words only.', copy: [], options: [{ id: 'stagger', values: ['true', 'false'] }], span: { cols: 5, rows: 12 }, place: 'right', under: true },
	{ type: 'band', names: ['outline', 'outline-band'], kind: 'art', description: 'The wordmark huge and hollow on its rule, one whole word.', copy: [], span: { cols: 12, rows: 3 }, place: 'bottom', under: true },
	{ type: 'hatch', names: ['hatching', 'floor'], kind: 'art', description: '45 degree hairlines under a rule.', copy: [], span: { cols: 12, rows: 3 }, place: 'bottom', under: true },
	{ type: 'window', names: ['console', 'screenshot', 'picture', 'image', 'product'], kind: 'picture', description: 'The console in a window (Acme placeholder mail), or your capture.', copy: [], image: { values: ['none'] }, span: { cols: 10, rows: 7 }, place: 'bottom' },
	{ type: 'card', names: ['feature', 'panel'], kind: 'panel', description: 'A white card (24 px corners, Shadow/S) with a heading and a line.', copy: [{ id: 'heading', required: true }, { id: 'text' }], sample: { heading: 'Email', text: 'Every agent gets an address.' }, span: { cols: 6, rows: 3 } },
	{ type: 'stat', names: ['number', 'metric', 'figure'], kind: 'text', description: 'A big number in the highlight, with a line under it.', copy: [{ id: 'value', required: true }, { id: 'label' }], sample: { value: '42%', label: 'less time on setup' }, span: { cols: 5, rows: 4 } },
	{ type: 'quote', names: ['testimonial'], kind: 'text', description: 'A quote in the headline face with who said it (a role at Acme, never a made-up person).', copy: [{ id: 'text', required: true }, { id: 'attribution' }], sample: { text: 'Our agent answers its own email now.', attribution: 'Head of operations, Acme' }, span: { cols: 10, rows: 5 } },
	{ type: 'list', names: ['bullets', 'points', 'checklist'], kind: 'text', description: 'Points with | between, each led by the filled check circle.', copy: [{ id: 'items', required: true }], sample: { items: 'An email address | A phone number | An Agent Card' }, span: { cols: 6, rows: 5 } },
	{ type: 'button', names: ['cta'], kind: 'text', description: 'The purple pill button.', copy: [{ id: 'text', required: true }], span: { cols: 3, rows: 1 }, place: 'bottom-left', sample: { text: 'Get started' } },
	{ type: 'search', names: ['search-bar', 'input', 'field'], kind: 'text', description: 'A 40 px field with its lilac-gray edge and the magnifier.', copy: [{ id: 'text', required: true }], span: { cols: 8, rows: 1 }, place: 'center', sample: { text: 'Search messages' } },
	{ type: 'chart', names: ['graph'], kind: 'text', description: 'A bar, line or donut chart from "label value | label value", in the chart-series colors.', copy: [{ id: 'data', required: true }, { id: 'title' }], options: [{ id: 'kind', values: ['bar', 'line', 'donut'] }], sample: { data: 'Email 42 | Phone 31 | Cards 27', title: 'Messages by channel' }, span: { cols: 6, rows: 6 } },
	{ type: 'divider', names: ['rule', 'line'], kind: 'art', description: 'A hairline in the theme\'s line color.', copy: [], span: { cols: 12, rows: 1 }, place: 'center' },
	{ type: 'icon', names: ['glyph'], kind: 'key', description: 'One of the console\'s Phosphor glyphs (MIT), by name.', copy: [], options: [{ id: 'name', values: glyphNames() }], span: { cols: 1, rows: 1 } },
];

function glyphNames(): string[] {
	try {
		return glyphs().map((g) => g.name);
	} catch {
		return [];
	}
}

const kindOf = (type: string) => BLOCKS.find((b) => b.type === type)?.kind ?? 'text';

export type ComposePictures = { sit: Image; hang: Image; reef: Image; pictures: Record<string, Image | null> };

export async function composePictures(doc: DesignDoc, read: (file: string) => Promise<Image | null>): Promise<ComposePictures> {
	const pictures: Record<string, Image | null> = {};
	for (const b of doc.blocks ?? []) if (b.type === 'window') pictures[b.id] = doc.images[b.id] && doc.images[b.id] !== 'none' ? await read(doc.images[b.id]!) : null;
	return { sit: await artImage('sit'), hang: await artImage('hang'), reef: await artImage('reef'), pictures };
}

type Face = { family: string; weight: number; tracking?: number; leading: number };
type Fitted = { lines: string[]; widths: number[]; size: number; face: Face; w: number; h: number; asked: string };

/** Draws a compose design onto a context in canvas pixels and reports one layer per block. */
export function drawCompose(ctx: Ctx, doc: DesignDoc, pics: ComposePictures, icons: Icons, fonts: Fonts, svg = false): DrawnLayer[] {
	const W = doc.size.width;
	const H = doc.size.height;
	const t = themes()[doc.theme ?? 'paper'] ?? themes().paper!;
	const hi = highlightColor('pink', doc.theme ?? 'paper') || t.ink;
	const u = Math.sqrt((W * H) / (1200 * 630));
	const floor = floorsOf({ size: doc.size.id, w: W, h: H }).small;
	const layers: DrawnLayer[] = [];
	const e = (id: string): LayerEdit => doc.layers[id] ?? {};
	const words = (id: string, slot: string) => doc.copy[`${id}.${slot}`]?.trim() ?? '';
	const tooLong = (id: string) => new Error(`The ${id} is too long for its cells. Shorten it, or give it more cells (make it wider or taller).`);
	ctx.save();
	ctx.fillStyle = t.bg;
	ctx.fillRect(0, 0, W, H);
	const placed = blockRects(doc).filter((b) => !e(b.block.id).hidden);
	// What art and patterns keep clear of: every block with words or the lockup.
	const keep = placed.filter((b) => kindOf(b.block.type) !== 'art' && b.block.type !== 'window').map((b) => ({ x: b.rect.x - 8 * u, y: b.rect.y - 8 * u, w: b.rect.w + 16 * u, h: b.rect.h + 16 * u }));

	const fitText = (id: string, text: string, face: Face, from: number, r: Rect, least = floor): Fitted => {
		drawable(id, text, face.family === fonts.mono ? 'mono' : 'sans');
		const plain = text.replace(/\*/g, '');
		const tryAt = (size: number): Fitted | null => {
			setFont(ctx, { family: face.family, weight: face.weight, size, tracking: face.tracking ?? 0 });
			const lines = wrap(ctx, plain, r.w);
			const widths = lines.map((l) => ctx.measureText(l).width);
			ctx.letterSpacing = '0px';
			const h = lines.length * size * face.leading;
			/* The last line's descenders hang under its line box, and stay in the cells. */
			if (widths.some((x) => x > r.w + 0.5) || h + size * Math.max(0, 1.18 - face.leading) > r.h + 0.5) return null;
			return { lines, widths, size, face, w: Math.max(0, ...widths), h, asked: text };
		};
		let got: Fitted | null = null;
		for (let s = Math.max(from, least); s >= least - 0.01; s *= 0.96) if ((got = tryAt(s))) break;
		if (!got) throw tooLong(id);
		const k = e(id).scale ?? 1;
		if (k === 1) return got;
		const scaled = tryAt(got.size * k);
		if (!scaled || scaled.size < floor - 0.01) throw tooLong(`${id} at that size`);
		return scaled;
	};
	/* Draws fitted lines; *stars* in the asked words take the highlight. Returns the ink, one rect per line. */
	const drawText = (f: Fitted, r: Rect, align: 'left' | 'center' | 'right', color: string, top = r.y): Rect[] => {
		setFont(ctx, { family: f.face.family, weight: f.face.weight, size: f.size, tracking: f.face.tracking ?? 0 });
		ctx.textBaseline = 'alphabetic';
		ctx.textAlign = 'left';
		const lit = new Set<number>();
		let on = false;
		let n = 0;
		for (const part of f.asked.split('*')) {
			for (const _w of part.split(/\s+/).filter(Boolean)) {
				if (on) lit.add(n);
				n++;
			}
			on = !on;
		}
		const ink: Rect[] = [];
		let word = 0;
		f.lines.forEach((line, i) => {
			const lw = f.widths[i]!;
			let x = align === 'center' ? r.x + (r.w - lw) / 2 : align === 'right' ? r.x + r.w - lw : r.x;
			const base = top + i * f.size * f.face.leading + f.size * 0.92;
			const m = ctx.measureText(line);
			ink.push({ x, y: base - m.actualBoundingBoxAscent, w: lw, h: m.actualBoundingBoxAscent + m.actualBoundingBoxDescent });
			for (const w of line.split(' ')) {
				ctx.fillStyle = lit.has(word) ? hi : color;
				ctx.fillText(w, x, base);
				x += ctx.measureText(`${w} `).width;
				word++;
			}
		});
		ctx.letterSpacing = '0px';
		return ink;
	};
	const union = (rs: Rect[]): Rect => {
		const x = Math.min(...rs.map((q) => q.x));
		const y = Math.min(...rs.map((q) => q.y));
		return { x, y, w: Math.max(...rs.map((q) => q.x + q.w)) - x, h: Math.max(...rs.map((q) => q.y + q.h)) - y };
	};
	const textLayer = (id: string, f: Fitted, ink: Rect[], color: string, ground: string, can: Can, extra: Partial<DrawnLayer> = {}): DrawnLayer => ({
		id,
		kind: 'text',
		box: union(ink),
		ink,
		text: { asked: f.asked, drawn: f.lines.join(' '), size: f.size, color, ground: [ground], ...(f.face.weight >= 600 ? { bold: true } : {}) },
		can,
		...extra,
	});
	const sans = (weight: number, leading: number, tracking = 0): Face => ({ family: fonts.sans, weight, leading, tracking });
	const lockupAt = (x: number, y: number, h: number, part: string) => {
		const L = logoDoc().lockup;
		const k = h / L.h;
		if (part !== 'wordmark') ctx.drawImage(pics.sit, x, y, L.mark.w * k, L.mark.h * k);
		const wk = part === 'wordmark' ? h / logoDoc().wordmark.h : k;
		ctx.save();
		ctx.translate(part === 'wordmark' ? x : x + L.word.x * k, part === 'wordmark' ? y : y + L.word.y * k);
		ctx.scale(wk, wk);
		ctx.fillStyle = t.ink;
		ctx.fill(wordmarkPath());
		ctx.restore();
	};

	for (const { block, rect: r } of placed) {
		const id = block.id;
		const k = e(id).scale ?? 1;
		switch (block.type) {
			case 'headline': {
				const f = fitText(id, words(id, 'text'), sans(600, 1.04, -0.01), Math.min(r.h, 96 * u), r, floor * 1.4);
				const ink = drawText(f, r, e(id).align ?? 'left', t.ink);
				const litColor = f.asked.includes('*') && contrast(hi, t.bg) < contrast(t.ink, t.bg) ? hi : t.ink;
				layers.push(textLayer(id, f, ink, litColor, t.bg, TEXT));
				break;
			}
			case 'body': {
				const f = fitText(id, words(id, 'text'), sans(400, 1.4), Math.max(floor, Math.min(30 * u, r.h)), r);
				layers.push(textLayer(id, f, drawText(f, r, e(id).align ?? 'left', t.muted), t.muted, t.bg, TEXT));
				break;
			}
			case 'badge': {
				const style = String(doc.options[`${id}.style`] ?? 'pill');
				const fs0 = Math.max(floor, Math.min(19 * u, r.h * 0.45));
				const f = fitText(id, words(id, 'text'), sans(500, 1.0), fs0, { ...r, w: r.w - fs0 * 2.6, h: r.h / 1.45 });
				const fs = f.size;
				const h = Math.min(r.h, style === 'solid' ? fs * 2.2 : fs * 1.9);
				const w = f.w + (style === 'dot' ? fs * 1.2 : fs * 2.4);
				const box = { x: r.x, y: r.y + (r.h - h) / 2, w, h };
				let ground = t.bg;
				let color = t.ink;
				if (style === 'pill') {
					ctx.fillStyle = t.pill;
					ctx.strokeStyle = t.dark ? brandColor('pillStrokeDark') : brandColor('pillStroke');
					ctx.lineWidth = Math.max(1, fs * 0.06);
					ctx.beginPath();
					ctx.roundRect(box.x, box.y, w, h, h / 2);
					ctx.fill();
					ctx.stroke();
					ground = over(t.pill, t.bg);
				} else if (style === 'solid') {
					ctx.fillStyle = t.ink;
					ctx.beginPath();
					ctx.roundRect(box.x, box.y, w, h, h / 2);
					ctx.fill();
					ground = t.ink;
					color = t.bg;
				}
				const dx = style === 'dot' ? 0 : fs * 0.75;
				if (style !== 'solid') {
					ctx.fillStyle = brandColor('pink');
					ctx.beginPath();
					ctx.arc(box.x + dx + fs * 0.24, box.y + h / 2, fs * 0.24, 0, Math.PI * 2);
					ctx.fill();
				}
				const tx = box.x + (style === 'solid' ? fs * 1.2 : dx + fs * 0.9);
				drawText(f, { x: tx, y: box.y + (h - fs * 1.2) / 2, w: f.w + 1, h: fs * 1.2 }, 'left', color, box.y + (h - fs * 1.2) / 2 + fs * 0.06);
				layers.push({ id, kind: 'text', box, ink: [box], text: { asked: f.asked, drawn: f.lines.join(' '), size: fs, color, ground: [ground] }, can: PART });
				break;
			}
			case 'logo': {
				const part = String(doc.options[`${id}.part`] ?? 'full');
				const ratio = part === 'wordmark' ? logoDoc().wordmark.w / logoDoc().wordmark.h : logoDoc().lockup.w / logoDoc().lockup.h;
				const least = logoDoc().clear.min * u * 0.7;
				const clearK = logoDoc().clear.share;
				const h = Math.max(least, Math.min(r.h / (1 + 2 * clearK), (r.w - 2 * clearK * r.h) / ratio, 60 * u)) * k;
				const w = h * ratio;
				if (w > r.w + 1) throw new Error(`The ${id} needs more cells: ${Math.ceil(w)} px wide here. Make it wider (too long for its cells as it is).`);
				/* It keeps to the side of its cells the grid puts it on. */
				const g = doc.grid ?? { cols: 12, rows: 12 };
				const x = block.at.col + block.at.cols >= g.cols && block.at.col > 0 ? r.x + r.w - w : block.at.col > 0 && Math.abs(block.at.col * 2 + block.at.cols - g.cols) <= 1 ? r.x + (r.w - w) / 2 : r.x;
				const box = { x, y: r.y + (r.h - h) / 2, w, h };
				lockupAt(box.x, box.y, h, part);
				layers.push({ id, kind: 'logo', box, logo: { clear: h * clearK, min: least }, can: PART });
				break;
			}
			case 'art': {
				const pose = String(doc.options[`${id}.pose`] ?? 'sit') === 'hang' ? 'hang' : 'sit';
				const im = pose === 'hang' ? pics.hang : pics.sit;
				const ratio = im.height / im.width;
				const w = Math.min(r.w, r.h / ratio) * k;
				const h = w * ratio;
				const x = r.x + (r.w - w) / 2;
				const y = r.y + (r.h - h) / (pose === 'hang' ? 1 : 2);
				ctx.save();
				if (pose === 'sit' && !svg) {
					const kk = w / 281.7;
					const c = (a: number) => withAlpha(brandColor('shadow'), a);
					ctx.filter = `drop-shadow(0 ${8 * kk}px ${8.5 * kk}px ${c(0.12)}) drop-shadow(0 ${31 * kk}px ${15 * kk}px ${c(0.1)})`;
				}
				ctx.drawImage(im, x, y, w, h);
				ctx.restore();
				const ink = inkBox(pose, x, y, w);
				layers.push({ id, kind: 'art', box: ink, can: PART });
				break;
			}
			case 'reef': {
				const R = logoDoc().reef;
				const rw = r.w;
				const rh = (rw * R.h) / R.w;
				const off = scratch(Math.max(1, Math.round(rw)), Math.max(1, Math.round(rh)));
				off.ctx.drawImage(pics.reef, 0, 0, off.canvas.width, off.canvas.height);
				if (t.reefFade > 0) {
					off.ctx.globalCompositeOperation = 'source-atop';
					off.ctx.globalAlpha = t.reefFade;
					off.ctx.fillStyle = t.bg;
					off.ctx.fillRect(0, 0, off.canvas.width, off.canvas.height);
				}
				const foot = r.y + r.h;
				const drop = rh > r.h ? (rh - r.h) / rh : 0;
				ctx.save();
				ctx.beginPath();
				ctx.rect(r.x, r.y, r.w, r.h);
				ctx.clip();
				ctx.drawImage(off.canvas as unknown as Canvas, r.x, foot - rh * (1 - drop), rw, rh);
				ctx.restore();
				const ink = reefInkIn(pics.reef, r.x, foot, rw, drop);
				layers.push({ id, kind: 'art', box: r, ink, can: DECOR });
				break;
			}
			case 'tile': {
				ctx.save();
				ctx.fillStyle = t.tile;
				ctx.globalAlpha = Math.min(1, t.tileAlpha);
				const ink = tileWords(ctx, r, 51.6 * Math.min(1, r.w / (300 * u)), u, String(doc.options[`${id}.stagger`] ?? 'false') === 'true', keep);
				ctx.restore();
				layers.push({ id, kind: 'art', box: r, ink: ink.length ? ink : [{ x: r.x, y: r.y, w: 1, h: 1 }], can: DECOR });
				break;
			}
			case 'band': {
				const WM = logoDoc().wordmark;
				const kk = Math.min(r.h / WM.h, r.w / WM.w);
				const bw = WM.w * kk;
				const rule = r.y + r.h - WM.h * kk + WM.xTop * kk;
				ctx.fillStyle = t.line;
				ctx.fillRect(r.x, rule, r.w, Math.max(0.5, u));
				ctx.save();
				ctx.translate(r.x + (r.w - bw) / 2, r.y + r.h - WM.h * kk);
				ctx.scale(kk, kk);
				ctx.fillStyle = t.bg;
				ctx.fill(wordmarkPath());
				ctx.strokeStyle = t.line;
				ctx.lineWidth = (1.3 * u) / kk;
				ctx.stroke(wordmarkPath());
				ctx.restore();
				layers.push({ id, kind: 'art', box: { x: r.x, y: rule, w: r.w, h: r.y + r.h - rule }, can: DECOR });
				break;
			}
			case 'hatch': {
				ctx.strokeStyle = t.line;
				ctx.lineWidth = Math.max(0.5, u);
				hatchLines(ctx, r, 19 * u, 45);
				ctx.fillStyle = t.line;
				ctx.fillRect(r.x, r.y, r.w, Math.max(0.5, u));
				layers.push({ id, kind: 'art', box: r, can: DECOR });
				break;
			}
			case 'window': {
				const pic = pics.pictures[id] ?? null;
				const ratio = pic ? pic.height / pic.width : APP_H / APP_W;
				const w = Math.min(r.w, r.h / ratio) * k;
				const h = Math.min(r.h, w * ratio);
				const box = { x: r.x + (r.w - w) / 2, y: r.y, w, h };
				const rad = 10 * u;
				ctx.save();
				if (!svg) {
					ctx.shadowColor = withAlpha(brandColor('shadow'), 0.16);
					ctx.shadowBlur = 40 * u;
					ctx.shadowOffsetY = 14 * u;
				}
				ctx.fillStyle = brandColor('window');
				ctx.beginPath();
				ctx.roundRect(box.x, box.y, w, h, rad);
				ctx.fill();
				ctx.restore();
				ctx.save();
				ctx.beginPath();
				ctx.roundRect(box.x, box.y, w, h, rad);
				ctx.clip();
				if (pic) {
					const c = Math.max(w / pic.width, h / pic.height);
					ctx.drawImage(pic, box.x + (w - pic.width * c) / 2, box.y, pic.width * c, pic.height * c);
				} else {
					const view = w < 760 * u ? 700 : APP_W;
					ctx.translate(box.x, box.y);
					ctx.scale(w / view, w / view);
					drawApp(ctx, { width: view, showWorkspace: view === APP_W }, icons, fonts, pics.sit);
				}
				ctx.restore();
				ctx.strokeStyle = t.line;
				ctx.lineWidth = Math.max(0.5, u);
				ctx.beginPath();
				ctx.roundRect(box.x, box.y, w, h, rad);
				ctx.stroke();
				layers.push({ id, kind: 'picture', box, can: PART });
				break;
			}
			case 'card': {
				const fill = tokenColor('white');
				const rad = Math.min(24 * u, r.h / 4);
				ctx.save();
				if (!svg) {
					ctx.shadowColor = 'rgba(23, 47, 41, 0.08)';
					ctx.shadowBlur = 4 * u;
					ctx.shadowOffsetY = 2 * u;
				}
				ctx.fillStyle = fill;
				ctx.beginPath();
				ctx.roundRect(r.x, r.y, r.w, r.h, rad);
				ctx.fill();
				ctx.restore();
				ctx.strokeStyle = tokenColor('border-default');
				ctx.lineWidth = Math.max(0.5, u * 0.75);
				ctx.beginPath();
				ctx.roundRect(r.x, r.y, r.w, r.h, rad);
				ctx.stroke();
				layers.push({ id, kind: 'panel', box: r, can: PART });
				const pad = Math.min(24 * u, r.h * 0.18, r.w * 0.08);
				const inner = { x: r.x + pad, y: r.y + pad, w: r.w - 2 * pad, h: r.h - 2 * pad };
				const ink = tokenColor('ink');
				const hd = fitText(`${id}-heading`, words(id, 'heading'), sans(500, 1.25), Math.max(floor, 26 * u), { ...inner, h: inner.h * 0.5 });
				layers.push(textLayer(`${id}-heading`, hd, drawText(hd, inner, 'left', ink), ink, fill, {}, { over: [id] }));
				const body = words(id, 'text');
				if (body) {
					const top = inner.y + hd.h + 10 * u;
					const muted = tokenColor('text-secondary');
					const bb = fitText(`${id}-text`, body, sans(400, 1.4), Math.max(floor, 19 * u), { ...inner, y: top, h: inner.y + inner.h - top });
					layers.push(textLayer(`${id}-text`, bb, drawText(bb, { ...inner, y: top }, 'left', muted), muted, fill, {}, { over: [id] }));
				}
				break;
			}
			case 'stat': {
				const value = words(id, 'value');
				const label = words(id, 'label');
				const vf = fitText(id, value, sans(600, 1.0, -0.02), Math.min(r.h * (label ? 0.6 : 0.9), 200 * u), { ...r, h: r.h * (label ? 0.66 : 1) }, floor * 2);
				const statColor = contrast(hi, t.bg) >= 3 ? hi : t.ink;
				const vi = drawText(vf, r, e(id).align ?? 'left', statColor);
				layers.push(textLayer(id, vf, vi, statColor, t.bg, PART));
				if (label) {
					const top = r.y + vf.h + vf.size * 0.12;
					const lf = fitText(`${id}-label`, label, sans(400, 1.35), Math.max(floor, vf.size * 0.24), { ...r, y: top, h: r.y + r.h - top });
					layers.push(textLayer(`${id}-label`, lf, drawText(lf, { ...r, y: top }, e(id).align ?? 'left', t.muted), t.muted, t.bg, {}));
				}
				break;
			}
			case 'quote': {
				const text = words(id, 'text');
				const who = words(id, 'attribution');
				const af = who ? fitText(`${id}-attribution`, who, sans(500, 1.3), Math.max(floor, 18 * u), { ...r, h: r.h * 0.22 }) : undefined;
				const qf = fitText(id, `“${text.replace(/^[“"]|[”"]$/g, '')}”`, sans(600, 1.12, -0.01), Math.min(56 * u, r.h * 0.4), { ...r, h: r.h - (af ? af.h + 18 * u : 0) }, floor * 1.4);
				qf.asked = text;
				const qi = drawText({ ...qf, asked: qf.lines.join(' ') }, r, e(id).align ?? 'left', t.ink);
				layers.push({ ...textLayer(id, qf, qi, t.ink, t.bg, TEXT), text: { asked: text, drawn: qf.lines.join(' ').replace(/^“|”$/g, ''), size: qf.size, color: t.ink, ground: [t.bg], bold: true } });
				if (af) {
					const top = r.y + qf.h + 18 * u;
					layers.push(textLayer(`${id}-attribution`, af, drawText(af, { ...r, y: top }, e(id).align ?? 'left', t.muted), t.muted, t.bg, {}));
				}
				break;
			}
			case 'list': {
				const items = words(id, 'items').split('|').map((x) => x.trim()).filter(Boolean);
				for (const it of items) drawable(id, it);
				let fs = Math.min(30 * u, r.h / (items.length * 1.8)) * k;
				let fitted: Fitted[] = [];
				for (; fs >= floor - 0.01; fs *= 0.95) {
					try {
						fitted = items.map((it) => {
							setFont(ctx, { family: fonts.sans, weight: 400, size: fs, tracking: 0 });
							const lines = wrap(ctx, it, r.w - fs * 1.7);
							const widths = lines.map((l) => ctx.measureText(l).width);
							if (widths.some((x) => x > r.w - fs * 1.7 + 0.5)) throw tooLong(id);
							return { lines, widths, size: fs, face: sans(400, 1.35), w: Math.max(...widths), h: lines.length * fs * 1.35, asked: it };
						});
					} catch {
						continue;
					}
					const h = fitted.reduce((n, b) => n + b.h, 0) + fs * 0.55 * (items.length - 1);
					if (h <= r.h + 0.5) break;
				}
				if (fs < floor - 0.01) throw tooLong(id);
				const check = new Path2D('M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm45.66,85.66-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35a8,8,0,0,1,11.32,11.32Z');
				let y = r.y;
				const ink: Rect[] = [];
				for (const b of fitted) {
					ctx.save();
					ctx.translate(r.x, y + fs * 0.08);
					ctx.scale((fs * 1.15) / 256, (fs * 1.15) / 256);
					ctx.fillStyle = t.dark ? brandColor('pink') : brandColor('purple');
					ctx.fill(check);
					ctx.restore();
					ink.push(...drawText(b, { x: r.x + fs * 1.7, y, w: r.w - fs * 1.7, h: b.h }, 'left', t.ink, y));
					y += b.h + fs * 0.55;
				}
				layers.push({ id, kind: 'text', box: union(ink), ink, text: { asked: items.join(' '), drawn: fitted.flatMap((b) => b.lines).join(' '), size: fs, color: t.ink, ground: [t.bg] }, can: PART });
				break;
			}
			case 'button': {
				const fs0 = Math.max(floor, Math.min(18 * u, r.h / 2.6));
				const f = fitText(id, words(id, 'text'), sans(500, 1.2), fs0, { ...r, w: r.w - fs0 * 2.6, h: r.h / 2.4 });
				const bh = f.size * 2.5;
				const bw = f.w + f.size * 2.6;
				const box = { x: r.x, y: r.y + (r.h - bh) / 2, w: bw, h: bh };
				const fill = tokenColor('action-primary');
				const ink = tokenColor('action-primary-fg');
				ctx.fillStyle = fill;
				ctx.beginPath();
				ctx.roundRect(box.x, box.y, bw, bh, bh / 2);
				ctx.fill();
				drawText(f, { x: box.x + f.size * 1.3, y: box.y, w: f.w + 1, h: bh }, 'left', ink, box.y + (bh - f.size * 1.2) / 2 + f.size * 0.04);
				layers.push({ id, kind: 'text', box, ink: [box], text: { asked: f.asked, drawn: f.lines.join(' '), size: f.size, color: ink, ground: [fill] }, can: PART });
				break;
			}
			case 'search': {
				const fs0 = Math.max(floor, Math.min(15 * u, r.h * 0.38));
				const f = fitText(id, words(id, 'text'), sans(400, 1.2), fs0, { ...r, w: r.w - fs0 * 4, h: r.h * 0.6 });
				const bh = Math.min(r.h, f.size * 2.7);
				const box = { x: r.x, y: r.y + (r.h - bh) / 2, w: r.w, h: bh };
				const white = tokenColor('white');
				const muted = tokenColor('text-muted');
				ctx.fillStyle = white;
				ctx.beginPath();
				ctx.roundRect(box.x, box.y, box.w, bh, bh / 2);
				ctx.fill();
				ctx.strokeStyle = tokenColor('border-field');
				ctx.lineWidth = Math.max(1, u);
				ctx.stroke();
				const glass = icons.get('MagnifyingGlass');
				if (glass) {
					ctx.save();
					ctx.translate(box.x + bh * 0.4, box.y + bh / 2 - f.size * 0.55);
					ctx.scale((f.size * 1.1) / 256, (f.size * 1.1) / 256);
					ctx.fillStyle = muted;
					ctx.fill(glass);
					ctx.restore();
				}
				const textColor = tokenColor('text-secondary');
				drawText(f, { x: box.x + bh * 0.4 + f.size * 1.6, y: box.y, w: f.w + 1, h: bh }, 'left', textColor, box.y + (bh - f.size * 1.2) / 2 + f.size * 0.04);
				layers.push({ id, kind: 'text', box, ink: [box], text: { asked: f.asked, drawn: f.lines.join(' '), size: f.size, color: textColor, ground: [white] }, can: PART });
				break;
			}
			case 'chart': {
				const data = words(id, 'data').split('|').map((x) => x.trim()).filter(Boolean).map((row) => {
					const m = /^(.*\S)\s+(-?\d+(?:\.\d+)?)%?$/.exec(row);
					if (!m) throw new Error(`The ${id}'s data is "label value" rows with | between; "${row}" has no value at its end.`);
					drawable(id, m[1]!);
					return { label: m[1]!, value: Number(m[2]) };
				});
				if (data.length < 2 || data.length > 8) throw new Error(`The ${id} takes 2 to 8 rows, not ${data.length}.`);
				const series = [1, 2, 3, 4, 5].map((n) => tokenColor(`chart-series-${n}`));
				const kind = String(doc.options[`${id}.kind`] ?? 'bar');
				const title = words(id, 'title');
				const fs = Math.max(floor, Math.min(17 * u, r.h / (data.length * 2.6)));
				const tf = title ? fitText(`${id}-title`, title, sans(500, 1.25), Math.max(floor, 24 * u), { ...r, h: r.h * 0.2 }) : undefined;
				if (tf) layers.push(textLayer(`${id}-title`, tf, drawText(tf, r, 'left', t.ink), t.ink, t.bg, {}));
				const area = { ...r, y: r.y + (tf ? tf.h + 12 * u : 0), h: r.h - (tf ? tf.h + 12 * u : 0) };
				const max = Math.max(...data.map((x) => x.value), 0) || 1;
				const ink: Rect[] = [];
				const drawn: string[] = [];
				const label = (text: string, x: number, y: number, w: number, align: 'left' | 'center' | 'right' = 'left') => {
					setFont(ctx, { family: fonts.sans, weight: 400, size: fs, tracking: 0 });
					const tw = ctx.measureText(text).width;
					if (tw > w + 0.5) throw tooLong(id);
					const f: Fitted = { lines: [text], widths: [tw], size: fs, face: sans(400, 1.2), w: tw, h: fs * 1.2, asked: text };
					ink.push(...drawText(f, { x: align === 'right' ? x - w : align === 'center' ? x - w / 2 : x, y, w, h: fs * 1.2 }, align, t.ink, y));
					drawn.push(text);
				};
				// The bars and the line take the purple, the donut each series color in order; a pink on a light ground is
				// a mark, not words.
				if (kind === 'bar') {
					setFont(ctx, { family: fonts.sans, weight: 400, size: fs, tracking: 0 });
					const lw = Math.min(area.w * 0.4, Math.max(...data.map((x) => ctx.measureText(x.label).width)));
					const vw = Math.max(...data.map((x) => ctx.measureText(String(x.value)).width));
					const row = area.h / data.length;
					const bh = Math.min(row * 0.55, fs * 1.4);
					data.forEach((x, i) => {
						const y = area.y + i * row + (row - fs * 1.2) / 2;
						label(x.label, area.x, y, lw);
						const bx = area.x + lw + fs;
						const full = area.w - lw - vw - fs * 2.5;
						const w = Math.max(bh, (full * x.value) / max);
						ctx.fillStyle = series[0]!;
						ctx.beginPath();
						ctx.roundRect(bx, area.y + i * row + (row - bh) / 2, w, bh, bh / 2);
						ctx.fill();
						label(String(x.value), bx + w + fs * 0.5, y, vw + 2);
					});
				} else if (kind === 'line') {
					const plot = { x: area.x + fs, y: area.y + fs * 0.5, w: area.w - 2 * fs, h: area.h - fs * 2.6 };
					ctx.fillStyle = t.line;
					ctx.fillRect(plot.x, plot.y + plot.h, plot.w, Math.max(0.5, u));
					const pts = data.map((x, i) => ({ x: plot.x + (plot.w * i) / (data.length - 1), y: plot.y + plot.h - (plot.h * x.value) / max }));
					ctx.strokeStyle = series[0]!;
					ctx.lineWidth = Math.max(2, 3 * u);
					ctx.beginPath();
					pts.forEach((pt, i) => (i ? ctx.lineTo(pt.x, pt.y) : ctx.moveTo(pt.x, pt.y)));
					ctx.stroke();
					ctx.fillStyle = series[0]!;
					for (const pt of pts) {
						ctx.beginPath();
						ctx.arc(pt.x, pt.y, Math.max(3, 5 * u), 0, Math.PI * 2);
						ctx.fill();
					}
					const slot = plot.w / Math.max(1, data.length - 1);
					data.forEach((x, i) => label(`${x.label} ${x.value}`, pts[i]!.x, plot.y + plot.h + fs * 0.5, i === 0 || i === data.length - 1 ? slot : slot * 0.95, i === 0 ? 'left' : i === data.length - 1 ? 'right' : 'center'));
				} else {
					const total = data.reduce((n, x) => n + Math.max(0, x.value), 0) || 1;
					const R = Math.min(area.h / 2, area.w * 0.26);
					const cx = area.x + R;
					const cy = area.y + area.h / 2;
					let a = -Math.PI / 2;
					data.forEach((x, i) => {
						const b = a + (Math.PI * 2 * Math.max(0, x.value)) / total;
						ctx.strokeStyle = series[i % series.length]!;
						ctx.lineWidth = R * 0.34;
						ctx.beginPath();
						ctx.arc(cx, cy, R * 0.83, a, b);
						ctx.stroke();
						a = b;
					});
					const lx = cx + R + fs * 1.5;
					data.forEach((x, i) => {
						const y = area.y + (area.h - data.length * fs * 1.6) / 2 + i * fs * 1.6;
						ctx.fillStyle = series[i % series.length]!;
						ctx.beginPath();
						ctx.arc(lx + fs * 0.4, y + fs * 0.6, fs * 0.4, 0, Math.PI * 2);
						ctx.fill();
						label(`${x.label} ${x.value}`, lx + fs * 1.3, y, area.x + area.w - lx - fs * 1.3);
					});
				}
				layers.push({ id, kind: 'text', box: union(ink), ink, text: { asked: data.map((x) => `${x.label} ${x.value}`).join(' '), drawn: drawn.join(' '), size: fs, color: t.ink, ground: [t.bg] }, can: PART });
				break;
			}
			case 'divider': {
				const h = Math.max(1, u);
				const y = r.y + r.h / 2 - h / 2;
				ctx.fillStyle = t.line;
				ctx.fillRect(r.x, y, r.w, h);
				layers.push({ id, kind: 'art', box: { x: r.x, y, w: r.w, h }, can: DECOR });
				break;
			}
			case 'icon': {
				const name = String(doc.options[`${id}.name`] ?? 'envelope-simple');
				const g = glyphs().find((x) => x.name === name);
				const d = g?.svg.match(/\sd="([^"]+)"/)?.[1];
				const sz = Math.min(r.w, r.h) * k;
				const box = { x: r.x + (r.w - sz) / 2, y: r.y + (r.h - sz) / 2, w: sz, h: sz };
				if (d) {
					ctx.save();
					ctx.translate(box.x, box.y);
					ctx.scale(sz / 256, sz / 256);
					ctx.fillStyle = t.dark ? t.ink : brandColor('purple');
					ctx.fill(new Path2D(d));
					ctx.restore();
				}
				layers.push({ id, kind: 'key', box, can: PART });
				break;
			}
		}
	}
	ctx.restore();
	return layers;
}

/** Each image template as blocks: the same words laid out on the grid, so any of them can be the start of a compose design. */
export function recipeFor(template: string, size: string, copy: Record<string, string>) {
	const at = (col: number, row: number, cols: number, rows: number) => ({ col, row, cols, rows });
	const w = (id: string, slot: string, v?: string) => (v?.trim() ? { [`${id}.${slot}`]: v } : {});
	const words = { ...w('headline', 'text', copy.headline), ...w('body', 'text', copy.body), ...w('badge', 'text', copy.badge), ...w('credit', 'text', copy.credit), ...w('partner', 'text', copy.partner) };
	const has = (k: string) => !!copy[k]?.trim();
	const tall = ['square', 'portrait', 'story', 'li-square', 'avatar'].includes(size);
	/* The words stacked from a row down, in the columns given. */
	const stack = (col: number, row: number, cols: number, center = false) => {
		const out: { id: string; type: string; at: ReturnType<typeof at> }[] = [];
		let r = row;
		if (has('badge')) out.push({ id: 'badge', type: 'badge', at: at(center ? col + Math.floor((cols - 3) / 2) : col, r++, Math.min(cols, 3), 1) });
		if (has('headline')) {
			out.push({ id: 'headline', type: 'headline', at: at(col, r, cols, 3) });
			r += 3;
		}
		if (has('body')) out.push({ id: 'body', type: 'body', at: at(col, r++, cols, 1) });
		if (has('credit')) out.push({ id: 'credit', type: 'body', at: at(col, r++, cols, 1) });
		return { blocks: out, end: r };
	};
	const align = (center: boolean) => (center ? Object.fromEntries(['headline', 'body', 'credit'].filter(has).map((k) => [k, { align: 'center' as const }])) : {});
	const partner = (col: number, row: number, cols = 3) => (has('partner') ? [{ id: 'partner', type: 'body', at: at(col, row, cols, 1) }] : []);
	switch (template) {
		case 'tile': {
			const s = stack(0, 0, tall ? 12 : 6);
			return tall
				? { theme: 'paper', blocks: [{ id: 'tile', type: 'tile', at: at(0, 7, 12, 4) }, ...s.blocks, { id: 'art', type: 'art', at: at(4, 7, 4, 4) }, { id: 'logo', type: 'logo', at: at(0, 11, 4, 1) }, ...partner(5, 11)], copy: words }
				: { theme: 'paper', blocks: [{ id: 'tile', type: 'tile', at: at(7, 0, 5, 12) }, ...s.blocks, { id: 'art', type: 'art', at: at(7, 3, 5, 6) }, { id: 'logo', type: 'logo', at: at(0, 11, 4, 1) }, ...partner(4, 11)], copy: words };
		}
		case 'app':
		case 'feature': {
			const center = template === 'feature';
			const s = stack(center ? 1 : 0, 0, center ? 10 : 8, center);
			const top = Math.max(s.end, 5);
			return { theme: 'paper', blocks: [...s.blocks, { id: 'window', type: 'window', at: at(1, top, 10, 11 - top) }, ...(center ? [] : [{ id: 'art', type: 'art', at: at(9, 0, 3, 4) }]), { id: 'logo', type: 'logo', at: at(0, 11, 3, 1) }, ...partner(4, 11)], copy: words, layers: align(center) };
		}
		case 'outline':
		case 'funding': {
			const s = stack(1, 0, 10, true);
			return { theme: template === 'outline' ? 'mono' : 'paper', blocks: [{ id: 'band', type: 'band', at: at(0, 9, 12, 3) }, ...s.blocks, { id: 'art', type: 'art', at: at(5, 7, 2, 3) }, ...partner(0, 11 - 4, 3)].filter((b) => b.id !== 'partner' || s.end <= 7), copy: words, layers: align(true) };
		}
		case 'hatch': {
			const s = stack(2, 0, 10);
			return { theme: 'paper', blocks: [{ id: 'hatch', type: 'hatch', at: at(0, 9, 12, 3) }, ...s.blocks, { id: 'art', type: 'art', at: at(9, 6, 3, 4) }, ...partner(0, 7)], copy: words, layers: Object.fromEntries(['headline', 'body', 'credit'].filter(has).map((k) => [k, { align: 'right' as const }])) };
		}
		case 'reef': {
			const s = stack(1, 1, 10, true);
			return { theme: 'lavender', blocks: [{ id: 'reef', type: 'reef', at: at(0, 9, 12, 3) }, { id: 'logo', type: 'logo', at: at(0, 0, 3, 1) }, ...partner(3, 0), ...s.blocks, { id: 'art', type: 'art', at: at(5, Math.max(s.end, 7), 2, 12 - Math.max(s.end, 7) - 1) }], copy: words, layers: align(true) };
		}
		case 'partner': {
			const s = stack(1, 4, 10, true);
			return { theme: 'paper', blocks: [{ id: 'logo', type: 'logo', at: at(3, 2, 3, 1) }, ...partner(6, 2), ...s.blocks], copy: words, layers: align(true) };
		}
		case 'announce': {
			const s = stack(0, 0, 9);
			return { theme: 'paper', blocks: [...s.blocks, { id: 'logo', type: 'logo', at: at(0, 11, 3, 1) }, ...partner(3, 11), { id: 'art', type: 'art', at: at(9, 8, 3, 4) }], copy: words };
		}
		case 'card': {
			const s = stack(0, 3, 12);
			const blocks = s.blocks.filter((b) => b.id !== 'badge');
			return { theme: 'mist', blocks: [{ id: 'logo', type: 'logo', at: at(0, 0, 3, 1) }, ...partner(3, 0), ...(has('badge') ? [{ id: 'badge', type: 'badge', at: at(9, 0, 3, 1) }] : []), ...blocks], copy: words };
		}
		case 'mark':
			return { theme: 'paper', blocks: [{ id: 'logo', type: 'logo', at: at(3, 5, 6, 2) }, ...partner(4, 8, 4)], copy: words };
		default:
			return undefined;
	}
}
