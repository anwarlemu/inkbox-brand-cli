import { readFileSync } from 'node:fs';
import { Path2D, type Image } from '@napi-rs/canvas';
import { pkgPath } from '../lib/paths.js';
import { brandColor, logoDoc, themeNames, themes, wordmarkPath } from './brand-art.js';
import { brandFonts, pixelsOf, surface, toPng, toSvg, type Ctx, type Fonts } from './canvas.js';
import { designOf, picturesFor, svgPictures } from './image.js';
import { pick } from './io.js';
import { drawDesign, type Design, type Pictures } from './share.js';
import { loadIcons } from './window.js';

// Deck slides at 1920 by 1080 (brand/assets/deck.json). Every slide but bullets is a share-image template drawn at the
// slide's size with the slide's words, so a deck and a post share their layers; bullets lays out its own points with the
// filled check circle. PNG per slide, the RGB pixels a PDF page wants, and SVG.

export type SlideType = 'cover' | 'section' | 'statement' | 'bullets' | 'stat' | 'quote' | 'image' | 'end';
type SlideDef = { name: string; description: string; template: string; theme: string; slots: Record<string, string> };
type DeckDoc = { width: number; height: number; slides: Record<SlideType, SlideDef> };

let doc: DeckDoc | undefined;
export const deckDoc = (): DeckDoc => (doc ??= JSON.parse(readFileSync(pkgPath('brand', 'assets', 'deck.json'), 'utf8')) as DeckDoc);
export const slideTypes = () => Object.keys(deckDoc().slides) as SlideType[];

export type Slide = { type: string; theme?: string; picture?: Image | null } & Record<string, unknown>;

export function deckCatalog() {
	const d = deckDoc();
	return {
		size: { width: d.width, height: d.height },
		slides: slideTypes().map((id) => ({ id, name: d.slides[id].name, description: d.slides[id].description, template: d.slides[id].template, theme: d.slides[id].theme, slots: d.slides[id].slots, picture: id === 'image' })),
		themes: themeNames(),
	};
}

/** The slots a slide type takes, with what it was given over its opening copy. Unknown slots throw. */
export function slotsFor(type: SlideType, given: Record<string, unknown>): Record<string, string> {
	const def = deckDoc().slides[type].slots;
	const out: Record<string, string> = { ...def };
	for (const [k, v] of Object.entries(given)) {
		if (['type', 'theme', 'picture', 'image'].includes(k)) continue;
		if (!(k in def)) throw new Error(`A ${type} slide does not take "${k}". It takes ${Object.keys(def).map((s) => `"${s}"`).join(', ')}${type === 'image' ? ' and "image"' : ''}.`);
		if (Array.isArray(v) && v.every((x) => typeof x === 'string')) out[k] = v.join(' | ');
		else if (typeof v === 'string') out[k] = v;
		else throw new Error(`A ${type} slide's "${k}" takes text.`);
	}
	return out;
}

/** The share-image design a slide draws (every type but bullets). */
export function slideDesign(type: SlideType, slots: Record<string, string>, theme: string, picture: boolean): Design {
	const def = deckDoc().slides[type];
	const req = { template: def.template, theme, size: 'custom', width: deckDoc().width, height: deckDoc().height, emphasise: false, partner: '' };
	switch (type) {
		case 'cover':
			return designOf({ ...req, headline: slots.title, body: slots.body ?? '', badge: 'none' });
		case 'section': {
			// A section title is a word or two: set larger than a post's headline, the number's badge with it.
			const d = designOf({ ...req, headline: slots.title, body: '', badge: slots.number ? 'dot' : 'none', badgeText: slots.number ?? '' });
			return { ...d, textSize: d.textSize * 1.6, badgeScale: 150 };
		}
		case 'statement':
			return designOf({ ...req, headline: slots.title, body: '', badge: 'none' });
		case 'stat':
			return designOf({ ...req, headline: `*${(slots.stat ?? '').replace(/\*/g, '')}*`, body: slots.title ?? '', badge: 'none' });
		case 'quote':
			return designOf({ ...req, headline: `“${(slots.quote ?? '').replace(/^[“"]|[”"]$/g, '')}”`, body: slots.attribution ?? '', badge: 'none', highlight: 'ink' });
		case 'image':
			return designOf({ ...req, headline: slots.title, body: slots.body ?? '', badge: 'none', picture, pictureUrl: slots.url });
		case 'end':
			return { ...designOf({ ...req, headline: slots.title, body: slots.url ?? '', badge: 'none' }), partnerName: '' };
		default:
			throw new Error(`${type} is not a template slide.`);
	}
}

/** Bullets: the title top left, the points in one or two columns each led by the filled check circle, hatched strips
 * down the sides (the outline template's), and the lockup bottom left. */
function drawBullets(ctx: Ctx, slots: Record<string, string>, theme: string, pics: Pictures, fonts: Fonts) {
	const W = deckDoc().width;
	const H = deckDoc().height;
	const t = themes()[theme]!;
	const u = Math.sqrt((W * H) / (1200 * 630));
	const items = (slots.items ?? '').split('|').map((s) => s.trim()).filter(Boolean);
	if (items.length > 6) throw new Error(`A bullets slide holds up to 6 points; it was given ${items.length}. Split it.`);
	ctx.fillStyle = t.bg;
	ctx.fillRect(0, 0, W, H);
	// Hatched strips down the sides, as the outline template draws them.
	const sw = 32 * u;
	const g = 19 * u;
	ctx.strokeStyle = t.line;
	ctx.lineWidth = Math.max(0.5, u);
	for (const [x, mirror] of [[0, false], [W - sw, true]] as const) {
		ctx.save();
		ctx.beginPath();
		ctx.rect(x, 0, sw, H);
		ctx.clip();
		ctx.translate(x + sw / 2, H / 2);
		ctx.rotate(((mirror ? 1 : -1) * 45 * Math.PI) / 180);
		ctx.beginPath();
		const L = Math.hypot(sw, H) + g * 2;
		for (let y = -L / 2; y <= L / 2; y += g / Math.SQRT2) {
			ctx.moveTo(-L / 2, y);
			ctx.lineTo(L / 2, y);
		}
		ctx.stroke();
		ctx.restore();
	}
	ctx.fillStyle = t.line;
	ctx.fillRect(sw - u, 0, u, H);
	ctx.fillRect(W - sw, 0, u, H);
	const left = sw + 96 * u;
	// The title, in the headline face at the share images' tracking.
	const title = slots.title ?? '';
	let size = 66 * u;
	ctx.font = `600 ${size}px ${fonts.sans}`;
	ctx.letterSpacing = `${-0.01 * size}px`;
	while (ctx.measureText(title).width > W - left * 2 && size > 40 * u) {
		size -= 2;
		ctx.font = `600 ${size}px ${fonts.sans}`;
		ctx.letterSpacing = `${-0.01 * size}px`;
	}
	ctx.fillStyle = t.ink;
	ctx.textBaseline = 'alphabetic';
	ctx.textAlign = 'left';
	const top = 120 * u;
	ctx.fillText(title, left, top + size * 0.82);
	ctx.letterSpacing = '0px';
	// The points: a check circle in the highlight's place (the brand purple on light themes, pink on dark), then the words.
	const cols = items.length > 4 ? 2 : 1;
	const colW = (W - left * 2 - (cols - 1) * 64 * u) / cols;
	const rows = Math.ceil(items.length / cols);
	const pt = 30 * u;
	const check = new Path2D('M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm45.66,85.66-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35a8,8,0,0,1,11.32,11.32Z');
	const listTop = top + size + 72 * u;
	const textW = colW - pt * 1.7;
	ctx.font = `400 ${pt}px ${fonts.sans}`;
	// Each point wraps to two lines at most; longer copy is an error, never cut off.
	const wrapped = items.map((text) => {
		const lines: string[] = [];
		let line = '';
		for (const word of text.split(/\s+/)) {
			const next = line ? `${line} ${word}` : word;
			if (line && ctx.measureText(next).width > textW) {
				lines.push(line);
				line = word;
			} else line = next;
		}
		lines.push(line);
		if (lines.length > 2 || lines.some((l) => ctx.measureText(l).width > textW)) throw new Error(`The point "${text}" is too long for a bullets slide (two lines of ${Math.round(textW)}px at ${Math.round(pt)}px). Shorten it.`);
		return lines;
	});
	const lockTop = H - 64 * u - logoDoc().lockup.h * u;
	const pitch = Math.min(pt * 1.35 * 2 + pt * 0.9, (lockTop - 48 * u - listTop) / rows);
	wrapped.forEach((lines, i) => {
		const col = Math.floor(i / rows);
		const row = i % rows;
		const x = left + col * (colW + 64 * u);
		const y = listTop + row * pitch;
		ctx.save();
		ctx.translate(x, y - pt * 0.1);
		ctx.scale((pt * 1.2) / 256, (pt * 1.2) / 256);
		ctx.fillStyle = t.dark ? brandColor('pink') : brandColor('purple');
		ctx.fill(check);
		ctx.restore();
		ctx.font = `400 ${pt}px ${fonts.sans}`;
		ctx.fillStyle = t.ink;
		ctx.textBaseline = 'middle';
		lines.forEach((l, j) => ctx.fillText(l, x + pt * 1.7, y + pt * 0.5 + j * pt * 1.35));
	});
	// The lockup, bottom left.
	const L = logoDoc().lockup;
	const lh = L.h * u;
	const k = lh / L.h;
	const ly = H - 64 * u - lh;
	const mark = pics.get('sit');
	if (mark) ctx.drawImage(mark, left, ly, L.mark.w * k, L.mark.h * k);
	ctx.save();
	ctx.translate(left + L.word.x * k, ly + L.word.y * k);
	ctx.scale(k, k);
	ctx.fillStyle = t.ink;
	ctx.fill(wordmarkPath());
	ctx.restore();
}

/** Draws one slide on a 1920 by 1080 context. */
export async function drawSlide(ctx: Ctx, slide: Slide, opts: { px?: number; svg?: boolean; pics?: Pictures } = {}) {
	const type = pick('slide type', slide.type, slideTypes());
	const slots = slotsFor(type, slide);
	const theme = slide.theme ? pick('theme', slide.theme, themeNames()) : deckDoc().slides[type].theme;
	if (slide.picture && type !== 'image') throw new Error(`A ${type} slide holds no picture; "image" goes with the image slide.`);
	const pics = opts.pics ?? (await picturesFor(slide.picture ?? null));
	const fonts = brandFonts();
	if (type === 'bullets') return drawBullets(ctx, slots, theme, pics, fonts);
	const d = slideDesign(type, slots, theme, !!slide.picture);
	drawDesign(ctx, d, pics, await loadIcons(), fonts, opts.px ?? 1, !!opts.svg);
}

export type SlideRender = { png?: Buffer; svg?: string; rgb?: Buffer; width: number; height: number };

/** One slide as PNG (and the RGB pixels a PDF page wants) and SVG. */
export async function renderSlide(slide: Slide, opts: { png?: boolean; svg?: boolean } = { png: true }): Promise<SlideRender> {
	const { width: W, height: H } = deckDoc();
	const out: SlideRender = { width: W, height: H };
	if (opts.png !== false) {
		const s = surface(W, H);
		await drawSlide(s.ctx, slide);
		out.png = toPng(s, { opaque: true });
		const px = pixelsOf(s).data;
		const rgb = Buffer.alloc((px.length / 4) * 3);
		for (let i = 0, j = 0; i < px.length; i += 4, j += 3) {
			rgb[j] = px[i]!;
			rgb[j + 1] = px[i + 1]!;
			rgb[j + 2] = px[i + 2]!;
		}
		out.rgb = rgb;
	}
	if (opts.svg) {
		const s = surface(W, H, { svg: true });
		const pics = await svgPictures(await picturesFor(slide.picture ?? null), W);
		await drawSlide(s.ctx, slide, { svg: true, px: 1, pics });
		out.svg = toSvg(s);
	}
	return out;
}

