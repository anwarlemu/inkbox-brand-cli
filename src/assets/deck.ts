import { readFileSync } from 'node:fs';
import { Path2D, type Image } from '@napi-rs/canvas';
import { pkgPath } from '../lib/paths.js';
import { brandColor, logoDoc, themeNames, themes, wordmarkPath } from './brand-art.js';
import { brandFonts, pixelsOf, surface, tokenColor, toJpg, toPng, toSvg, toWebp, type Ctx, type Fonts } from './canvas.js';
import { drawable } from './glyphs.js';
import { designOf, designSvg, measureDesign, picturesFor, svgPictures } from './image.js';
import { pick } from './io.js';
import { drawDesign, type Design, type DrawnLayer, type LayerEdit, type Pictures } from './share.js';
import { drawFitted, fit } from './text.js';
import { loadIcons } from './window.js';

// Deck slides at 1920 by 1080 (brand/assets/deck.json). Every slide but bullets is a share-image template drawn at the
// slide's size with the slide's words, so a deck and a post share their layers; bullets lays out its own points with the
// filled check circle. PNG per slide, the RGB pixels a PDF page wants, and SVG.

export type SlideType = 'cover' | 'section' | 'statement' | 'bullets' | 'agenda' | 'timeline' | 'stat' | 'quote' | 'image' | 'qa' | 'end';
/* The slides that lay out a list of their own; the rest are share templates. */
export const LISTS: SlideType[] = ['bullets', 'agenda', 'timeline'];
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

/* The words a slide cannot do without. */
const MAIN: Partial<Record<SlideType, string>> = { cover: 'title', section: 'title', statement: 'title', bullets: 'items', agenda: 'items', timeline: 'items', stat: 'stat', quote: 'quote', qa: 'title' };

/** The slots a slide type takes, with what it was given (and sample copy for the rest, when asked). Unknown slots throw. */
export function slotsFor(type: SlideType, given: Record<string, unknown>): Record<string, string> {
	const def = deckDoc().slides[type].slots;
	const out: Record<string, string> = given.sample ? { ...def } : {};
	for (const [k0, v] of Object.entries(given)) {
		if (['type', 'theme', 'picture', 'image', 'sample', 'seed', 'edits', 'highlight'].includes(k0)) continue;
		/* The names the image command uses, as well as the slide's own. */
		const k = k0 === 'headline' ? ('title' in def ? 'title' : 'quote' in def ? 'quote' : k0) : k0 === 'badge' && 'number' in def ? 'number' : k0;
		if (!(k in def)) throw new Error(`A ${type} slide does not take "${k}". It takes ${Object.keys(def).map((s) => `"${s}"`).join(', ')}${type === 'image' ? ' and "image"' : ''}.`);
		if (Array.isArray(v) && v.every((x) => typeof x === 'string')) out[k] = v.join(' | ');
		else if (typeof v === 'string') out[k] = v;
		else throw new Error(`A ${type} slide's "${k}" takes text.`);
		if (!out[k]!.trim()) delete out[k];
	}
	const main = MAIN[type];
	if (main && !out[main]) throw new Error(`A ${type} slide needs "${main}". (--sample fills sample copy.)`);
	for (const [k, v] of Object.entries(out)) drawable(k, v);
	return out;
}

/** The share-image design a slide draws (every type but bullets). */
export function slideDesign(type: SlideType, slots: Record<string, string>, theme: string, picture: boolean, more: { seed?: number; edits?: Record<string, LayerEdit>; sample?: boolean; highlight?: string } = {}): Design {
	const def = deckDoc().slides[type];
	const req = { template: def.template, theme, size: 'custom', width: deckDoc().width, height: deckDoc().height, emphasise: false, seed: more.seed, edits: more.edits, highlight: more.highlight };
	switch (type) {
		case 'cover':
			return designOf({ ...req, headline: slots.title, body: slots.body ?? '' });
		case 'section': {
			// A section title is a word or two: set larger than a post's headline, the number's badge with it.
			const d = designOf({ ...req, headline: slots.title, body: '', badgeStyle: 'dot', badgeText: slots.number });
			return { ...d, textSize: d.textSize * 1.6, badgeScale: 120 };
		}
		case 'statement':
		case 'qa':
			return designOf({ ...req, headline: slots.title, body: '' });
		case 'stat':
			return designOf({ ...req, headline: `*${(slots.stat ?? '').replace(/\*/g, '')}*`, body: slots.title ?? '' });
		case 'quote':
			return designOf({ ...req, headline: `“${(slots.quote ?? '').replace(/^[“"]|[”"]$/g, '')}”`, body: slots.attribution ?? '', badge: 'none', highlight: more.highlight ?? 'ink' });
		case 'image':
			return designOf({ ...req, headline: slots.title, body: slots.body ?? '', picture, pictureUrl: slots.url });
		case 'end':
			return designOf({ ...req, headline: slots.title, body: slots.url ?? '' });
		default:
			throw new Error(`${type} is not a template slide.`);
	}
}

/** Bullets: the title top left, the points in one or two columns each led by the filled check circle, hatched strips
 * down the sides (the outline template's), and the lockup bottom left. */
function drawBullets(ctx: Ctx, slots: Record<string, string>, theme: string, pics: Pictures, fonts: Fonts, mode: 'bullets' | 'agenda' | 'timeline' = 'bullets') {
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
	const layers: DrawnLayer[] = [{ id: 'hatch', kind: 'art', box: { x: 0, y: 0, w: W, h: H }, ink: [{ x: 0, y: 0, w: sw, h: H }, { x: W - sw, y: 0, w: sw, h: H }], bleeds: true, can: {} }];
	// The title, in the headline face at the share images' tracking, on two lines at most.
	const title = (slots.title ?? '').replace(/\*/g, '');
	const top = 110 * u;
	let y0 = top;
	if (title) {
		const f = fit(ctx, title, { family: fonts.sans, weight: 600, size: 62 * u, tracking: -0.01, leading: 1.06, color: t.ink }, W - left * 2, 2, 0.6, 'title');
		const box = drawFitted(ctx, f, left, top);
		layers.push({ id: 'headline', kind: 'text', box, ink: f.lines.map((_l, i) => ({ x: left, y: top + i * f.size * 1.06 + f.size * 0.14, w: f.widths[i]!, h: f.size * 0.98 })), text: { asked: title.replace(/\s+/g, ' ').trim(), drawn: f.lines.join(' '), size: f.size, color: t.ink, ground: [t.bg] }, can: {} });
		y0 = top + f.height;
	}
	// The points: a check circle in the highlight's place (the brand purple on light themes, pink on dark), then the words.
	const cols = items.length > 4 ? 2 : 1;
	const colW = (W - left * 2 - (cols - 1) * 64 * u) / cols;
	const rows = Math.ceil(items.length / cols);
	const check = new Path2D('M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm45.66,85.66-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35a8,8,0,0,1,11.32,11.32Z');
	const listTop = y0 + 60 * u;
	const lockTop = H - 64 * u - logoDoc().lockup.h * u;
	const room = lockTop - 40 * u - listTop;
	// Each point wraps to two lines at most; one size holds them all, and copy that does not fit is an error.
	let pt = 30 * u;
	let wrapped: ReturnType<typeof fit>[] = [];
	for (; ; pt -= u) {
		if (pt < 18 * u) {
			const long = [...items].sort((a, b) => b.length - a.length)[0]!;
			throw new Error(`The points are too long for a bullets slide: at ${Math.round(18 * u)} px they need more room than it has. Shorten "${long}", or split the slide.`);
		}
		try {
			wrapped = items.map((text) => fit(ctx, text, { family: fonts.sans, weight: 400, size: pt, leading: 1.35, color: t.ink }, colW - pt * 1.7, 2, 1, 'point'));
		} catch {
			continue;
		}
		const tallest = Math.max(...wrapped.map((f) => f.height));
		if (rows * tallest + (rows - 1) * pt * 0.6 <= room) break;
	}
	const pitch = Math.min(Math.max(...wrapped.map((f) => f.height)) + pt * 1.1, rows > 1 ? (room - wrapped[0]!.height) / (rows - 1) : Infinity);
	wrapped.forEach((f, i) => {
		const x = left + Math.floor(i / rows) * (colW + 64 * u);
		const y = listTop + (i % rows) * pitch;
		const mark = t.dark ? brandColor('pink') : brandColor('purple');
		if (mode === 'bullets') {
			ctx.save();
			ctx.translate(x, y + pt * 0.1);
			ctx.scale((pt * 1.2) / 256, (pt * 1.2) / 256);
			ctx.fillStyle = mark;
			ctx.fill(check);
			ctx.restore();
		} else {
			/* An agenda numbers its points in the mono; a timeline hangs them on a rule, a dot at each. */
			const cx = x + pt * 0.6;
			const cy = y + pt * 0.7;
			if (mode === 'timeline' && i % rows < rows - 1) {
				ctx.fillStyle = t.line;
				ctx.fillRect(cx - u / 2, cy, u, pitch);
			}
			ctx.fillStyle = mark;
			ctx.beginPath();
			ctx.arc(cx, cy, mode === 'agenda' ? pt * 0.6 : pt * 0.28, 0, Math.PI * 2);
			ctx.fill();
			if (mode === 'agenda') {
				ctx.fillStyle = t.dark ? t.ink : tokenColor('white');
				ctx.font = `600 ${pt * 0.62}px ${fonts.mono}`;
				ctx.textAlign = 'center';
				ctx.textBaseline = 'middle';
				ctx.fillText(String(i + 1), cx, cy + pt * 0.03);
				ctx.textAlign = 'left';
				ctx.textBaseline = 'alphabetic';
			}
		}
		const box = drawFitted(ctx, f, x + pt * 1.7, y + pt * 0.12);
		layers.push({ id: `point-${i + 1}`, kind: 'text', box, text: { asked: items[i]!.replace(/\s+/g, ' ').trim(), drawn: f.lines.join(' '), size: f.size, color: t.ink, ground: [t.bg] }, can: {} });
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
	layers.push({ id: 'logo', kind: 'logo', box: { x: left, y: ly, w: L.w * k, h: lh }, logo: { clear: lh * logoDoc().clear.share, min: logoDoc().clear.min * u }, can: {} });
	return layers;
}

/** The share-image design of a slide of any type but bullets. */
export function slideOf(slide: Slide): Design {
	const type = pick('slide type', slide.type, slideTypes());
	const slots = slotsFor(type, slide);
	const theme = slide.theme ? pick('theme', slide.theme, themeNames()) : deckDoc().slides[type].theme;
	const d = slideDesign(type, slots, theme, !!slide.picture, { seed: typeof slide.seed === 'number' ? slide.seed : undefined, edits: slide.edits as Record<string, LayerEdit> | undefined, highlight: slide.highlight as string | undefined });
	/* What each piece was asked to say, as it was asked (a quote's marks and a stat's highlight are the layout's). */
	const asked: Record<string, string> = {};
	const given = slotsFor(type, { ...slide, sample: false, ...(MAIN[type] && slide.sample ? { [MAIN[type]!]: slots[MAIN[type]!] } : {}) });
	const say = (k: string, v?: string) => {
		if (v !== undefined) asked[k] = v;
	};
	say('headline', given[type === 'stat' ? 'stat' : type === 'quote' ? 'quote' : 'title']);
	say('body', given[type === 'stat' ? 'title' : type === 'quote' ? 'attribution' : type === 'end' ? 'url' : 'body']);
	say('badge', given.number);
	return { ...d, asked, sample: !!slide.sample };
}

/** Draws one slide on a 1920 by 1080 context. */
export async function drawSlide(ctx: Ctx, slide: Slide, opts: { px?: number; svg?: boolean; pics?: Pictures } = {}): Promise<DrawnLayer[]> {
	const type = pick('slide type', slide.type, slideTypes());
	const slots = slotsFor(type, slide);
	const theme = slide.theme ? pick('theme', slide.theme, themeNames()) : deckDoc().slides[type].theme;
	if (slide.picture && type !== 'image') throw new Error(`A ${type} slide holds no picture; "image" goes with the image slide.`);
	const pics = opts.pics ?? (await picturesFor(slide.picture ?? null));
	const fonts = brandFonts();
	if (LISTS.includes(type)) {
		if (slide.edits && Object.keys(slide.edits as object).length) throw new Error('A list slide has no layers to move: change its words, theme or highlight.');
		return drawBullets(ctx, slots, theme, pics, fonts, type as 'bullets');
	}
	return drawDesign(ctx, slideOf(slide), pics, await loadIcons(), fonts, opts.px ?? 1, !!opts.svg).layers;
}

export type SlideRender = { png?: Buffer; svg?: string; jpg?: Buffer; webp?: Buffer; rgb?: Buffer; width: number; height: number; layers: DrawnLayer[] };

/** One slide as PNG (and the RGB pixels a PDF page wants) and SVG. */
export async function renderSlide(slide: Slide, opts: { png?: boolean; svg?: boolean; jpg?: boolean; webp?: boolean; rgb?: boolean; scale?: number } = { png: true }): Promise<SlideRender> {
	const { width: W, height: H } = deckDoc();
	const scale = opts.scale ?? 1;
	const out: SlideRender = { width: Math.round(W * scale), height: Math.round(H * scale), layers: [] };
	if (opts.png !== false || opts.jpg || opts.webp) {
		const s = surface(W, H, { scale });
		out.layers = await drawSlide(s.ctx, slide, { px: scale });
		out.png = toPng(s, { opaque: true });
		if (opts.jpg) out.jpg = toJpg(s);
		if (opts.webp) out.webp = toWebp(s);
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
		const pics = await picturesFor(slide.picture ?? null);
		if (LISTS.includes(slide.type as SlideType)) {
			const s = surface(W, H, { svg: true });
			out.layers = await drawSlide(s.ctx, slide, { svg: true, px: 1, pics: await svgPictures(pics, W) });
			out.svg = toSvg(s);
		} else {
			const d = slideOf(slide);
			out.svg = await designSvg(d, pics);
			if (!out.layers.length) out.layers = (await measureDesign(d, pics)).layers;
		}
	}
	return out;
}

