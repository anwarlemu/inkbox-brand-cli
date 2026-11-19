import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { loadImage, type Image } from '@napi-rs/canvas';
import { artImage, highlightNames, imageDoc, themeNames, themes } from './brand-art.js';
import { brandFonts, scratch, surface, toPng, toSvg } from './canvas.js';
import { pick, unknown } from './io.js';
import { BADGES, clampDim, designStart, drawDesign, frameOf, layoutFor, TEMPLATES, type BadgeStyle, type Design, type Pictures, type Template } from './share.js';
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
	const hit = imageSizes().find((s) => s.id === t || s.aliases.includes(t));
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
	badge?: string;
	badgeText?: string;
	highlight?: string;
	partner?: string;
	/** Puts the caller's picture in the template's window (templates with a window only). */
	picture?: boolean;
	pictureUrl?: string;
	/** A new on-brand layout for the same words: one seed, one layout (the editor's "new layout"). */
	seed?: number;
	/** Auto-highlight a phrase when the headline has no stars (the editor's endpoint does). */
	emphasise?: boolean;
};

/** The design a request draws: the template's layout at the size, the occasion's words, then the request's. */
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
	if (!template) template = (occ?.looks[0]?.template as Template | undefined) ?? 'tile';
	const theme = req.theme ? pick('theme', req.theme, themeNames()) : occ?.looks.find((l) => l.template === template)?.theme ?? occ?.looks[0]?.theme ?? 'paper';
	const size = req.size ? sizeId(req.size) : 'og';
	if (size === 'custom' && (!req.width || !req.height)) throw new Error('A custom size needs --width and --height (160 to 4000).');
	if (size !== 'custom' && (req.width || req.height)) throw new Error(`--width and --height go with --size custom, not ${size}.`);
	const known = doc.sizes[size];
	const w = known?.w ?? clampDim(req.width!);
	const h = known?.h ?? clampDim(req.height!);
	const at = { size, w, h };
	const look = occ?.looks.find((l) => l.template === template && l.theme === theme) ?? occ?.looks.find((l) => l.template === template);
	const words = { ...(occ?.words ?? {}), ...(look?.words ?? {}) } as Partial<Design>;
	const start = designStart();
	let d: Design = {
		...start,
		...words,
		theme,
		highlight: words.highlight ?? start.highlight,
		reefFade: themes()[theme]!.reefFade,
		...layoutFor(template, at),
		template,
		size,
		w,
		h,
		name: template,
	};
	if (words.badge) d.badge = words.badge as BadgeStyle;
	if (words.badgeText) d.badgeText = words.badgeText;
	if (words.headline) d.headline = words.headline;
	if (words.body !== undefined) d.body = words.body;
	if (req.headline !== undefined) d.headline = (req.emphasise === false ? req.headline : emphasise(req.headline)).replace(/\\n/g, '\n');
	if (req.body !== undefined) d.body = req.body.replace(/\\n/g, '\n');
	if (req.badge) d.badge = pick('badge', req.badge, BADGES);
	if (req.badgeText !== undefined) d.badgeText = req.badgeText;
	if (req.highlight) d.highlight = pick('highlight', req.highlight, highlightNames());
	if (req.partner) {
		d.partnerName = req.partner;
		d.logo = true;
	} else if (req.headline !== undefined) d.partnerName = '';
	else if (words.partnerName) d.partnerName = String(words.partnerName);
	d.credit = req.credit ?? '';
	if (req.seed !== undefined) d = varyLayout(d, req.seed);
	if (req.picture) {
		if (d.window === 'none') throw new Error(`The ${d.template} template has no window for a picture. Templates with one: ${TEMPLATES.filter((t) => layoutFor(t, at).window !== 'none').join(', ')}.`);
		d = { ...d, window: 'picture', winUrl: req.pictureUrl ?? d.winUrl, winChrome: true, winZoom: 1, winPanX: 0, winPanY: 0, winRatio: 0 };
	}
	return d;
}

/* Seeds: 1 to 1,000,000,000. The editor's mulberry32, so a seed means the same template here as there. */
function mulberry(seed: number) {
	let a = seed >>> 0 || 1;
	return () => {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** One seed, one layout: another of the brand's templates for the same words, laid out exactly as designed. */
export function varyLayout(base: Design, seed: number): Design {
	const rnd = mulberry(seed);
	const template = TEMPLATES[Math.floor(rnd() * TEMPLATES.length)]!;
	const laid = layoutFor(template, { size: base.size, w: base.w, h: base.h });
	return {
		...base,
		...laid,
		template,
		theme: base.theme,
		highlight: base.highlight,
		reefFade: themes()[base.theme]!.reefFade,
		headline: base.headline,
		body: base.body,
		credit: base.credit,
		badge: base.badge,
		badgeText: base.badgeText,
		partnerName: base.partnerName,
		size: base.size,
		w: base.w,
		h: base.h,
		app: base.app,
	};
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

export type Rendered = { png?: Buffer; svg?: string; width: number; height: number };

/** Draws a design. `scale` multiplies the PNG's pixels; the SVG is at the frame size. */
export async function renderDesign(d: Design, pics: Pictures, opts: { png?: boolean; svg?: boolean; scale?: number } = { png: true }): Promise<Rendered> {
	const L = frameOf(d);
	const icons = await loadIcons();
	const fonts = brandFonts();
	const scale = opts.scale ?? 1;
	const out: Rendered = { width: Math.round(L.w * scale), height: Math.round(L.h * scale) };
	if (opts.png !== false) {
		const s = surface(L.w, L.h, { scale });
		drawDesign(s.ctx, d, pics, icons, fonts, scale);
		out.png = toPng(s);
	}
	if (opts.svg) {
		const s = surface(L.w, L.h, { svg: true });
		drawDesign(s.ctx, d, await svgPictures(pics, Math.max(L.w, L.h)), icons, fonts, 2, true);
		out.svg = toSvg(s);
	}
	return out;
}

/** What `manifest` and `image --list` say about the templates. */
export function imageCatalog() {
	const doc = imageDoc();
	return {
		templates: TEMPLATES.map((id) => ({ id, name: doc.templates[id]!.label, description: doc.templates[id]!.description, window: layoutFor(id, { size: 'og', w: 1200, h: 630 }).window !== 'none' })),
		occasions: occasionNames().map((id) => ({ id, name: doc.occasions[id]!.label, words: doc.occasions[id]!.words, looks: doc.occasions[id]!.looks.map((l) => ({ template: l.template, theme: l.theme, label: l.label })) })),
		groups: Object.entries(doc.groups).map(([id, g]) => ({ id, label: g.label, sizes: g.sizes })),
		sizes: [...imageSizes(), { id: 'custom', group: 'post', label: 'Custom', width: 0, height: 0, aliases: [] as string[], note: '--width and --height, 160 to 4000' }],
		themes: Object.entries(doc.themes).map(([id, t]) => ({ id, label: t.label, dark: t.dark, bg: t.bg, ink: t.ink })),
		highlights: Object.entries(doc.highlights).map(([id, h]) => ({ id, label: h.label, color: h.color || null })),
		badges: BADGES,
		slots: ['headline', 'body', 'credit', 'badge-text', 'partner'],
		picture: 'image: a PNG, JPEG, WebP, GIF or SVG shown in the window (app and feature templates only)',
		seed: 'A new on-brand layout for the same words: an integer from 1 to 1000000000; the same seed always rebuilds the same layout.',
		notes: doc.notes,
	};
}
