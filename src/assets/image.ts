import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { loadImage, type Image } from '@napi-rs/canvas';
import { artImage, highlightNames, imageDoc, themeNames, themes } from './brand-art.js';
import { PLATFORMS, sizeAlias } from '../design/platforms.js';
import { brandFonts, scratch, surface, toJpg, toPng, toSvg, toWebp } from './canvas.js';
import { drawable } from './glyphs.js';
import { pick, unknown } from './io.js';
import { BADGES, clampDim, designStart, drawDesign, frameOf, isCircle, layoutFor, mulberry, TEMPLATES, type BadgeStyle, type Design, type Drawn, type DrawnLayer, type LayerEdit, type Pictures, type Template } from './share.js';
import { loadIcons } from './window.js';

// Share images as an API: a request (template or occasion, theme, size, copy, a picture for the window, a layout seed)
// becomes a design, and a design becomes PNG and SVG. The `image` command is a thin layer over this; the deck and the
// video reuse the same drawing.

export type Occasion = string;
export const occasionNames = () => Object.keys(imageDoc().occasions);

/** Every size id with its pixels, its group and the names it also answers to. */
export function imageSizes() {
	const doc = imageDoc();
	const groupOf = (id: string) => Object.entries(doc.groups).find(([, g]) => g.sizes.includes(id))?.[0] ?? 'post';
	return Object.entries(doc.sizes).map(([id, s]) => ({ id, group: groupOf(id), label: s.label, width: s.w, height: s.h, aliases: s.aliases }));
}

/** A size as typed: an id (`og`, `x-banner`), an alias (`wide`, `li-profile`, `9:16`), or `custom`. */
export function sizeId(typed: string): string {
	const t = typed.trim().toLowerCase();
	if (t === 'custom') return 'custom';
	const own = imageSizes();
	const hit = own.find((s) => s.id === t || s.aliases.includes(t)) ?? own.find((s) => s.id === sizeAlias(t));
	if (!hit) throw unknown('size', typed, [...imageSizes().map((s) => s.id), 'custom']);
	return hit.id;
}

/* A phrase in *stars* is drawn in the highlight colour; with none, the editor's endpoint picks one (a sum of money, a
   quoted phrase, or the last two or three words of the last line). */
export function emphasise(s: string) {
	if (s.includes('*')) return s;
	const money = s.match(/\$\d[\d,.]*[kKmMbB]?/);
	if (money && money.index !== undefined) return `${s.slice(0, money.index)}*${money[0]}*${s.slice(money.index + money[0].length)}`;
	const quoted = s.match(/[“"]([^”"]{2,48})[”"]/);
	if (quoted && quoted.index !== undefined) return `${s.slice(0, quoted.index)}*${quoted[1]}*${s.slice(quoted.index + quoted[0].length)}`;
	const lines = s.split('\n');
	const last = lines[lines.length - 1]!;
	const words = last.trim().split(/\s+/);
	if (words.length >= 3) {
		const n = words.length > 8 ? 3 : 2;
		lines[lines.length - 1] = `${words.slice(0, -n).join(' ')} *${words.slice(-n).join(' ')}*`;
		return lines.join('\n');
	}
	return s;
}

export type ImageRequest = {
	/** A template (tile, app, ...) or an occasion (launch, feature, ...), which picks that occasion's first look. */
	template?: string;
	occasion?: string;
	theme?: string;
	size?: string;
	width?: number;
	height?: number;
	headline?: string;
	body?: string;
	credit?: string;
	/** The badge's words. One of pill, solid, dot or none alone is its style (as older commands wrote it). */
	badge?: string;
	badgeText?: string;
	badgeStyle?: string;
	highlight?: string;
	partner?: string;
	/** Puts the caller's picture in the template's window (templates with a window only). */
	picture?: boolean;
	pictureUrl?: string;
	/** inbox (the console with Acme placeholder mail) or blank (no messages). */
	console?: string;
	/** Fills the words that were not given with the occasion's sample copy. */
	sample?: boolean;
	/** A variation of the layout: one seed, one layout. With no template named, it picks the template too. */
	seed?: number;
	/** Auto-highlight a phrase when the headline has no stars (the editor's endpoint does). */
	emphasise?: boolean;
	/** A carousel's number (1/5) and the most its headlines may be, so its pictures share one size. */
	page?: string;
	textCap?: number;
	/** Changes to the layers it draws, by layer id. */
	edits?: Record<string, LayerEdit>;
};

/* What the badge flags ask for: its words, its style, or both. */
function badgeOf(req: ImageRequest): { text?: string; style?: BadgeStyle } {
	const styled = req.badge !== undefined && BADGES.find((b) => b === req.badge!.trim().toLowerCase());
	if (styled) return { text: req.badgeText, style: req.badgeStyle ? pick('badge style', req.badgeStyle, BADGES) : styled };
	const text = req.badgeText ?? req.badge;
	return { text: text?.trim() ? text : undefined, style: req.badgeStyle ? pick('badge style', req.badgeStyle, BADGES) : undefined };
}

const given = (s: string | undefined) => (s !== undefined && s.trim() ? s.replace(/\\n/g, '\n').replace(/\r/g, '') : '');

/** The design a request draws: the template's layout at the size, and only the words the request gives it. */
export function designOf(req: ImageRequest): Design {
	const doc = imageDoc();
	let template: Template | undefined;
	let occasion: string | undefined;
	if (req.occasion) occasion = pick('occasion', req.occasion, occasionNames());
	if (req.template) {
		const t = req.template.trim().toLowerCase();
		if ((TEMPLATES as string[]).includes(t)) template = t as Template;
		else if (occasionNames().includes(t)) occasion ??= t;
		else throw unknown('template or occasion', req.template, [...TEMPLATES, ...occasionNames()]);
	}
	if (!occasion && template && doc.templateOccasion[template]) occasion = doc.templateOccasion[template];
	const occ = occasion ? doc.occasions[occasion] : undefined;
	if (!template) {
		const pool = occ ? occ.looks.map((l) => l.template as Template) : TEMPLATES.filter((t) => t !== 'mark');
		template = req.seed !== undefined ? pool[Math.floor(mulberry(req.seed)() * pool.length)]! : occ ? pool[0]! : 'tile';
	}
	const theme = req.theme ? pick('theme', req.theme, themeNames()) : occ?.looks.find((l) => l.template === template)?.theme ?? occ?.looks[0]?.theme ?? 'paper';
	const size = req.size ? sizeId(req.size) : 'og';
	if (size === 'custom' && (!req.width || !req.height)) throw new Error('A custom size needs --width and --height (50 to 4000).');
	if (size !== 'custom' && (req.width || req.height)) throw new Error(`--width and --height go with --size custom, not ${size}.`);
	const known = doc.sizes[size];
	const w = known?.w ?? clampDim(req.width!);
	const h = known?.h ?? clampDim(req.height!);
	const at = { size, w, h };
	if (isCircle(size) && template !== 'mark') throw new Error(`A profile picture (${size}) is cropped to a circle and draws no words: use the mark template.`);
	const look = occ?.looks.find((l) => l.template === template && l.theme === theme) ?? occ?.looks.find((l) => l.template === template);
	const style = { ...(occ?.style ?? {}), ...(look?.style ?? {}) } as Partial<Design>;
	const sample: Record<string, string> = req.sample ? { ...(occ ?? doc.occasions.launch!).sample, ...(look?.sample ?? {}) } : {};
	const b = badgeOf(req);
	let d: Design = {
		...designStart(),
		theme,
		reefFade: themes()[theme]!.reefFade,
		...layoutFor(template, at, req.seed),
		template,
		size,
		w,
		h,
		name: template,
		edits: req.edits ?? {},
		sample: !!req.sample,
	};
	if (style.badge && template !== 'card') d.badge = style.badge as BadgeStyle;
	if (style.highlight) d.highlight = style.highlight;
	d.headline = given(req.headline);
	if (d.headline && req.emphasise !== false) d.headline = emphasise(d.headline);
	d.body = given(req.body);
	d.credit = given(req.credit);
	d.badgeText = given(b.text);
	d.partnerName = given(req.partner);
	d.page = given(req.page);
	if (req.textCap) d.textCap = req.textCap;
	if (req.sample && template !== 'mark') {
		d.headline ||= sample.headline ?? '';
		d.body ||= req.body === undefined ? sample.body ?? '' : '';
		d.badgeText ||= sample.badgeText ?? '';
		if (template === 'partner') d.partnerName ||= sample.partnerName ?? 'Acme';
	}
	if (b.style) d.badge = b.style;
	if (b.style === 'none' && b.text?.trim()) throw new Error('--badge none draws no badge, so it takes no words: leave one of them out.');
	if (req.highlight) d.highlight = pick('highlight', req.highlight, highlightNames());
	/* A lockup that was moved, sized or asked for is drawn, where the layout leaves it out too. */
	if (d.partnerName || (d.edits.logo && !d.edits.logo.hidden)) d.logo = d.logo || !isCircle(size);
	d.asked = Object.fromEntries(([['headline', req.headline], ['body', req.body], ['credit', req.credit], ['badge', b.text], ['partner', req.partner]] as const).flatMap(([k, v]) => (v?.trim() ? [[k, v]] : [])));
	if (d.wordless) {
		for (const [k, v] of [['headline', d.headline], ['body', d.body], ['credit', d.credit], ['badge', d.badgeText]] as const) if (v) throw new Error(`The ${template} template draws no words, so it takes no ${k}. Templates with words: ${TEMPLATES.filter((t) => t !== 'mark').join(', ')}.`);
		if (isCircle(size) && d.partnerName) throw new Error('A profile picture has no room for a partner.');
	}
	for (const [slot, v] of [['headline', d.headline], ['body', d.body], ['credit', d.credit], ['partner', d.partnerName]] as const) drawable(slot, v);
	drawable('badge', d.badgeText, d.badgeFont === 'mono' ? 'mono' : 'sans');
	drawable('page', d.page, 'mono');
	const windowed = () => TEMPLATES.filter((t) => layoutFor(t, at).window && layoutFor(t, at).window !== 'none').join(', ');
	if (req.picture) {
		if (d.window === 'none') throw new Error(`The ${d.template} template has no window for a picture. Templates with one: ${windowed()}.`);
		d = { ...d, window: 'picture', winChrome: true, winRatio: 0 };
	}
	if (req.pictureUrl !== undefined) {
		if (d.window === 'none') throw new Error(`The ${d.template} template has no window for an address. Templates with one: ${windowed()}.`);
		drawable('address', req.pictureUrl);
		d = { ...d, winUrl: req.pictureUrl, winChrome: true };
	} else if (req.picture) d.winUrl = '';
	if (req.console) {
		const c = pick('console', req.console, ['inbox', 'blank'] as const);
		if (d.window !== 'app') throw new Error(`--console goes with the console's window: ${windowed()} without --image.`);
		d.app = { ...d.app, blank: c === 'blank' };
	}
	return d;
}

/** A picture file (PNG, JPEG, WebP, GIF or SVG) relative to `cwd`. */
export async function readPicture(cwd: string, file: string): Promise<Image> {
	const path = isAbsolute(file) ? file : resolve(cwd, file);
	if (!existsSync(path)) throw new Error(`No picture at ${file}.`);
	try {
		return await loadImage(readFileSync(path));
	} catch (err) {
		throw new Error(`Could not read ${file} as a picture (${(err as Error).message}). Pass a PNG, JPEG, WebP, GIF or SVG.`);
	}
}

/** The brand art a design draws, plus the caller's picture under `picture`. */
export async function picturesFor(picture?: Image | null): Promise<Pictures> {
	const map: Pictures = new Map();
	for (const id of ['sit', 'hang', 'reef']) map.set(id, await artImage(id));
	if (picture) map.set('picture', picture);
	return map;
}

/* The art at no more than twice the size it can be drawn, so an SVG embeds a few hundred kilobytes, not megabytes. */
export async function svgPictures(pics: Pictures, longest: number): Promise<Pictures> {
	const out: Pictures = new Map();
	for (const [k, im] of pics) {
		const max = Math.min(Math.round(longest * 0.5), 640);
		if (k === 'reef' || im.width <= max) {
			out.set(k, im);
			continue;
		}
		const h = Math.round((im.height * max) / im.width);
		const c = scratch(max, h);
		c.ctx.drawImage(im, 0, 0, max, h);
		out.set(k, await loadImage(c.canvas.toBuffer('image/png')));
	}
	return out;
}

export type Rendered = { png?: Buffer; svg?: string; jpg?: Buffer; webp?: Buffer; width: number; height: number; layers: DrawnLayer[]; drawn: Drawn };
export type RenderWants = { png?: boolean; svg?: boolean; jpg?: boolean; webp?: boolean; scale?: number };

/** What a design draws, without writing it: its layers and its sizes. */
export async function measureDesign(d: Design, pics: Pictures): Promise<Drawn> {
	return drawDesign(scratch(4, 4).ctx, d, pics, await loadIcons(), brandFonts(), 1, false, undefined, 'none');
}

/** A design as SVG. A window that runs out is drawn on its own and masked with a real gradient. `reef` is an illustration's
 * vector reef, put where the design draws it. */
export async function designSvg(d0: Design, pics: Pictures, reef = ''): Promise<string> {
	const L = frameOf(d0);
	const d = reef ? { ...d0, bare: true } : d0;
	const icons = await loadIcons();
	const fonts = brandFonts();
	const small = await svgPictures(pics, Math.max(L.w, L.h));
	const part = (phase: 'all' | 'under' | 'window' | 'over', n: string) => {
		const s = surface(L.w, L.h, { svg: true });
		const drawn = drawDesign(s.ctx, d, small, icons, fonts, 2, true, undefined, phase);
		/* Ids are the part's own, so the parts can sit in one document. */
		const svg = toSvg(s);
		return { drawn, svg, inner: svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/(id="|url\(#|href="#)([a-z]+_\d+)/g, `$1${n}$2`) };
	};
	const { fade } = drawDesign(scratch(4, 4).ctx, d, small, icons, fonts, 1, false, undefined, 'none');
	if (!fade && !reef) return part('all', '').svg;
	const r2 = (n: number) => String(Math.round(n * 100) / 100);
	const open = `<?xml version="1.0" encoding="utf-8" ?>\n<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${L.w}" height="${L.h}" viewBox="0 0 ${L.w} ${L.h}">${reef ? `<rect width="${L.w}" height="${L.h}" fill="${themes()[d.theme]!.bg}"/>` : ''}`;
	if (!fade) return `${open}${reef}${part('all', '').inner}</svg>\n`;
	const mask = `<defs><linearGradient id="fade" gradientUnits="userSpaceOnUse" x1="0" y1="${r2(fade.from)}" x2="0" y2="${r2(fade.to)}"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient><mask id="window-fade" maskUnits="userSpaceOnUse" x="0" y="0" width="${L.w}" height="${L.h}"><rect width="${L.w}" height="${L.h}" fill="url(#fade)"/></mask></defs>`;
	return `${open}${mask}${reef}${part('under', 'a').inner}<g mask="url(#window-fade)">${part('window', 'b').inner}</g>${part('over', 'c').inner}</svg>\n`;
}

/** Draws a design. `scale` multiplies the pixels; the SVG is at the frame size. */
export async function renderDesign(d: Design, pics: Pictures, opts: RenderWants = { png: true }): Promise<Rendered> {
	const L = frameOf(d);
	const icons = await loadIcons();
	const fonts = brandFonts();
	const scale = opts.scale ?? 1;
	let drawn: Drawn;
	const out = { width: Math.round(L.w * scale), height: Math.round(L.h * scale) } as Rendered;
	if (opts.png !== false || opts.jpg || opts.webp) {
		const s = surface(L.w, L.h, { scale });
		drawn = drawDesign(s.ctx, d, pics, icons, fonts, scale);
		if (opts.png !== false) out.png = toPng(s);
		if (opts.jpg) out.jpg = toJpg(s);
		if (opts.webp) out.webp = toWebp(s);
	} else drawn = await measureDesign(d, pics);
	if (opts.svg) out.svg = await designSvg(d, pics);
	out.drawn = drawn;
	out.layers = drawn.layers;
	return out;
}

/** A carousel: several pictures with one look, one headline size and a number each. */
export async function carouselDesigns(slides: ImageRequest[], pics: (i: number) => Promise<Pictures>): Promise<Design[]> {
	const reqs = slides.map((s, i) => ({ ...s, page: s.page ?? `${i + 1}/${slides.length}` }));
	const sizes: number[] = [];
	for (const [i, r] of reqs.entries()) if (r.headline?.trim()) sizes.push((await measureDesign(designOf(r), await pics(i))).size);
	const cap = sizes.length ? Math.min(...sizes) : undefined;
	return reqs.map((r) => designOf({ ...r, textCap: cap }));
}

/** What `manifest` and `image --list` say about the templates. */
export function imageCatalog() {
	const doc = imageDoc();
	return {
		templates: TEMPLATES.map((id) => ({ id, name: doc.templates[id]!.label, description: doc.templates[id]!.description, window: (layoutFor(id, { size: 'og', w: 1200, h: 630 }).window ?? 'none') !== 'none', words: id !== 'mark' })),
		occasions: occasionNames().map((id) => ({ id, name: doc.occasions[id]!.label, sample: doc.occasions[id]!.sample, looks: doc.occasions[id]!.looks.map((l) => ({ template: l.template, theme: l.theme, label: l.label })) })),
		groups: Object.entries(doc.groups).map(([id, g]) => ({ id, label: g.label, sizes: g.sizes })),
		sizes: [...imageSizes(), { id: 'custom', group: 'post', label: 'Custom', width: 0, height: 0, aliases: [] as string[], note: '--width and --height, 50 to 4000' }],
		safeAreas: PLATFORMS.filter((p) => p.avoid.length || p.safe).map((p) => ({ size: p.id, avoid: p.avoid, safe: p.safe, source: p.source, note: p.note })),
		themes: Object.entries(doc.themes).map(([id, t]) => ({ id, label: t.label, dark: t.dark, bg: t.bg, ink: t.ink })),
		highlights: Object.entries(doc.highlights).map(([id, h]) => ({ id, label: h.label, color: h.color || null, on: h.on ?? {} })),
		badges: BADGES,
		slots: ['headline', 'body', 'credit', 'badge', 'partner'],
		formats: ['png', 'svg', 'jpg', 'webp'],
		picture: 'image: a PNG, JPEG, WebP, GIF or SVG shown in the window (app and feature templates only)',
		console: ['inbox', 'blank'],
		copy: 'Only the words that are passed are drawn, whole: text shrinks to a readable size and wraps, and copy that still does not fit is an error. --sample fills the words that were not passed with sample copy.',
		seed: 'A variation of the named template (its sides, the band\'s start, where the octopus is), or with no template named, a template too: an integer from 1 to 1000000000; the same seed always rebuilds the same layout.',
		notes: doc.notes,
	};
}
