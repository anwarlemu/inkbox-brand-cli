import { Path2D, type Canvas, type Image } from '@napi-rs/canvas';
import { brandColor, brandColors, highlightColor, imageDoc, logoDoc, themes, toneColor, wordmarkPath } from './brand-art.js';
import { scratch, withAlpha, type Ctx, type Fonts } from './canvas.js';
import { SMALL_FLOOR } from '../design/check.js';
import { platformOf, zonePx } from '../design/platforms.js';
import { contrast, emptyRects, grow, inter, over, union } from './place.js';
import type { DrawnLayer, LayerEdit, Rect } from '../design/types.js';
import { APP_H, APP_W, appStart, drawApp, type AppContent, type Icons } from './window.js';

/*
 * Share images, social posts and banners, ported from the share-image editor (agd-playground
 * src/components/inkbox-og/draw.ts) to draw headless on a Skia canvas. A design is built from the layers the brand's own
 * Figma frames use: the ground, the reef, the wordmark tile, the outline band, hatching, guides and a border, the app
 * window, the words with their badge, the lockup, and the octopi. Every position is a share of the image and every
 * size a unit that grows with its area, so one design redraws well at any size. The drawing below is the editor's own,
 * kept in its terms so the two diff cleanly; colors, sizes, copy and the logo come from brand/assets (image.json,
 * logo.json) instead of constants. Left out: the editor's selection handles, its safe-zone overlay and the third-party
 * badge (see image.json notes).
 */

export type { DrawnLayer, LayerEdit, Rect };

export type Template = 'tile' | 'app' | 'outline' | 'hatch' | 'reef' | 'feature' | 'partner' | 'funding' | 'announce' | 'card' | 'mark';
export const TEMPLATES: Template[] = ['tile', 'app', 'outline', 'hatch', 'reef', 'feature', 'partner', 'funding', 'announce', 'card', 'mark'];

export type Align = 'left' | 'center' | 'right';
export type BadgeStyle = 'pill' | 'solid' | 'dot' | 'none';
export const BADGES: BadgeStyle[] = ['pill', 'solid', 'dot', 'none'];
/* Which of the editor's faces a piece of words is set in. display, text and plex are the brand sans; mono is the mono. */
export type Face = 'display' | 'text' | 'plex' | 'mono';
const faceOf = (f: Fonts, k: Face | undefined) => (k === 'mono' ? f.mono : f.sans);

/* A picture on the image: an octopus or anything passed in. */
export type Sticker = {
	src: string;
	x: number;
	y: number;
	/* Width, as a share of the image's short side. */
	size: number;
	rotate: number;
	flip?: boolean;
	shadow?: boolean;
	behind?: boolean;
	/* Rides on the window: y is then from the window's top edge. */
	onWindow?: boolean;
	hidden?: boolean;
	auto?: boolean;
	radius?: number;
	opacity?: number;
	ratio?: number;
	fit?: 'cover' | 'contain';
	/* What it rests on, so it keeps its place when it is made smaller for the words: an edge it hangs over (the edge's
	   Down, in pixels), a ground it sits on (the ground's Down), or its own middle. */
	rest?: 'hang' | 'sit' | 'middle';
	edge?: number;
};

export type Design = {
	name: string;
	template: Template;
	size: string;
	w: number;
	h: number;
	theme: string;
	highlight: string;
	badge: BadgeStyle;
	badgeText: string;
	badgeScale: number;
	headline: string;
	body: string;
	credit: string;
	/* A carousel's number, as 1/5. */
	page: string;
	align: Align;
	/* Where the words may go, in pixels; they take the largest part of it that nothing else stands in. */
	area: Rect;
	valign: 'top' | 'middle' | 'bottom';
	/* The content's edges: the margins, or just inside what a platform covers. */
	pad: { l: number; t: number; r: number; b: number };
	/* The lockup and the words centred together, one over the other. */
	group: boolean;
	/* A layout with no words (the lockup or the octopus alone). */
	wordless: boolean;
	textSize: number;
	/* The most the headline may be, in pixels, so the pictures of one carousel share a size. */
	textCap: number;
	tracking: number;
	leading: number;
	bodyScale: number;
	badgeAt: 'words' | 'corner';
	badgeX: number;
	badgeY: number;
	foot: boolean;
	footLeft: string;
	footRight: string;
	footBox: { l: number; r: number; b: number };
	logo: boolean;
	logoX: number;
	logoY: number;
	logoSize: number;
	logoAnchor: Align;
	/* The most a lockup with a partner's name may be wide, in pixels; 0 is no limit. */
	logoMax: number;
	partnerName: string;
	pattern: 'none' | 'panel' | 'full';
	panel: Rect;
	tileSize: number;
	tileStrength: number;
	tileStagger: boolean;
	panelBorder: boolean;
	outline: boolean;
	outlineSize: number;
	outlineY: number;
	/* Where a hatched floor under the band starts, in pixels; 0 is none. */
	outlineFloor: number;
	outlineShift: number;
	outlineRule: boolean;
	hatch: 'none' | 'floor' | 'sides' | 'both';
	hatchY: number;
	hatchGap: number;
	hatchMirror: boolean;
	sideWidth: number;
	guides: boolean;
	guideInset: number;
	reef: boolean;
	reefScale: number;
	reefFade: number;
	/* How far the reef sinks under the foot, as a share of its height. */
	reefDrop: number;
	frame: 'none' | 'line' | 'hatch' | 'tile' | 'solid';
	frameWidth: number;
	frameRadius: number;
	frameTone: 'lilac' | 'violet' | 'purple' | 'ink' | 'pink';
	window: 'none' | 'app' | 'picture';
	winX: number;
	winY: number;
	winW: number;
	winRatio: number;
	winRadius: number;
	winFollow: boolean;
	winGap: number;
	winMinTop: number;
	winChrome: boolean;
	winUrl: string;
	app: Partial<AppContent>;
	stickers: Sticker[];
	headWeight: number;
	headFont: Face;
	badgeGap: number;
	badgeWeight: number;
	badgeFont: Face;
	badgeTracking: number;
	bodyAlpha: number;
	bodyFont: Face;
	bodyWeight: number;
	bodyLeading: number;
	bodyGap: number;
	bodyWidth: number;
	logoMark: boolean;
	logoWord: boolean;
	logoMarkScale: number;
	logoMarkLift: number;
	logoGap: number;
	footSize: number;
	footWeight: number;
	footInset: number;
	/* Leave the ground unpainted (an illustration's SVG lays the ground and the vector reef under the drawing). */
	bare?: boolean;
	/* The words as they were asked for, with their highlight marks, for the check. */
	asked: Record<string, string>;
	/* Sample copy was asked for (--sample). */
	sample?: boolean;
	seed?: number;
	/* Changes to its layers, applied while it is drawn. */
	edits: Record<string, LayerEdit>;
};

/* Where the pictures a design draws come from: the brand art by id (sit, hang, reef) and the caller's picture. */
export type Pictures = Map<string, Image | Canvas>;
const iw = (im: Image | Canvas) => ('naturalWidth' in im && im.naturalWidth) || im.width || 1;
const ih = (im: Image | Canvas) => ('naturalHeight' in im && im.naturalHeight) || im.height || 1;

/* A video's hook: for a named layer (badge, line:0, body, credit, window, lockup, foot, sticker:0, ...), how far it has
   come in at this moment: opacity, an offset in frame pixels and a scale about the layer's own center. Still images
   pass none. */
export type LayerState = { a?: number; x?: number; y?: number; s?: number };
export type Motion = (layer: string) => LayerState | undefined;
let motion: Motion | undefined;

/* Runs `draw` with the layer's state applied: alpha times the current one, the offset, and the scale about (cx, cy). */
function layer(ctx: Ctx, name: string, cx: number, cy: number, draw: () => void) {
	const st = motion?.(name);
	if (!st) return draw();
	if ((st.a ?? 1) <= 0) return;
	ctx.save();
	ctx.globalAlpha *= st.a ?? 1;
	ctx.translate((st.x ?? 0) + cx, (st.y ?? 0) + cy);
	ctx.scale(st.s ?? 1, st.s ?? 1);
	ctx.translate(-cx, -cy);
	draw();
	ctx.restore();
}

export const clampDim = (n: number) => Math.round(Math.min(4000, Math.max(160, n || 0)));

export function frameOf(d: Pick<Design, 'size' | 'w' | 'h'>) {
	const s = imageDoc().sizes[d.size];
	return s ? { w: s.w, h: s.h } : { w: clampDim(d.w), h: clampDim(d.h) };
}

/* One unit: a pixel of the 1200 by 630 link preview, grown with the area (the part no platform covers). */
export function unitOf(d: Pick<Design, 'size' | 'w' | 'h'>) {
	const { F } = frameFor(d);
	return Math.sqrt((F.w * F.h) / (1200 * 630));
}

const WM = () => logoDoc().wordmark;
const LOCKUP = () => logoDoc().lockup;

function panelWidth(cols: number, tile: number, u: number) {
	const tw = (tile * WM().w) / WM().h;
	const gx = tile * (18.43 / 51.61);
	return (24 + cols * tw + (cols - 1) * gx + 2) * u;
}

/* -------------------------------------------------------------- layout */

type At = { size: string; w: number; h: number };

/* The canvas, the frame inside it that no platform crops, and what a platform puts over it (a profile picture). The
   numbers and where they come from are in design/platforms.ts. */
export function frameFor(at: At) {
	const { w: W, h: H } = frameOf(at);
	const p = platformOf(at.size, W, H);
	const inset = { t: 0, r: 0, b: 0, l: 0 };
	const avoid: Rect[] = [];
	for (const z of p.avoid) {
		const q = zonePx(z, W, H);
		/* A strip along a whole side is a margin; anything else is something to stay clear of. */
		if (q.w > W - 1) q.y < 1 ? (inset.t = Math.max(inset.t, q.h)) : (inset.b = Math.max(inset.b, H - q.y));
		else if (q.h > H - 1) q.x < 1 ? (inset.l = Math.max(inset.l, q.w)) : (inset.r = Math.max(inset.r, W - q.x));
		else avoid.push(q);
	}
	if (p.safe) {
		const q = zonePx(p.safe, W, H);
		inset.t = Math.max(inset.t, q.y);
		inset.l = Math.max(inset.l, q.x);
		inset.r = Math.max(inset.r, W - q.x - q.w);
		inset.b = Math.max(inset.b, H - q.y - q.h);
	}
	const F: Rect = { x: inset.l, y: inset.t, w: W - inset.l - inset.r, h: H - inset.t - inset.b };
	return { W, H, F, inset, avoid, shown: p.shown, circle: isCircle(at.size) };
}

/** A size cropped to a circle (the profile picture). */
export const isCircle = (size: string) => size === 'avatar';

/** The smallest headline and the smallest other words, in pixels, that can be read at the width the size is shown at. */
export function floorsOf(at: At) {
	const { W, shown } = frameFor(at);
	const k = Math.max(1, W / shown);
	return { head: 16 * k, small: (SMALL_FLOOR + 1) * k };
}

const sit = (x: number, y: number, size: number, extra: Partial<Sticker> = {}): Sticker => ({ src: 'sit', x, y, size, rotate: 0, shadow: true, auto: true, rest: 'middle', ...extra });
const hang = (x: number, y: number, size: number, extra: Partial<Sticker> = {}): Sticker => ({ src: 'hang', x, y, size, rotate: 0, shadow: false, auto: true, rest: 'hang', ...extra });

const BARE = { pattern: 'none' as const, outline: false, hatch: 'none' as const, guides: false, reef: false, frame: 'none' as const, window: 'none' as const, logo: false, foot: false, stickers: [] as Sticker[] };

/* Seeds: 1 to 1,000,000,000. The editor's mulberry32. */
export function mulberry(seed: number) {
	let a = seed >>> 0 || 1;
	return () => {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/* What a seed changes inside a template: which side things are on, where the band starts and where the octopus is. */
function varied(seed: number | undefined) {
	if (seed === undefined) return { flip: false, shift: 0, spot: 0.5, on: false };
	const rnd = mulberry(seed);
	rnd();
	return { flip: rnd() < 0.5, shift: Math.round(rnd() * 100) / 100, spot: 0.2 + Math.round(rnd() * 60) / 100, on: true };
}

/*
 * Where a template puts everything at a size. Read off the Figma frames at their own sizes and kept in units, so margins
 * stay margins at any size. `area` is where the words may go: they are set in the largest part of it that nothing else
 * stands in (resolve), so words never meet the art, the lockup or a platform's own furniture.
 */
export function layoutFor(t: Template, at: At, seed?: number): Partial<Design> {
	const fr0 = frameFor(at);
	const { W, H, avoid } = fr0;
	let { F, inset } = fr0;
	/* A very low banner cannot put its art over or under a covered right corner: everything keeps to its left. */
	const corner = F.w / F.h > 4 ? avoid.find((a) => a.x > W / 2) : undefined;
	if (corner) {
		inset = { ...inset, r: W - corner.x };
		F = { ...F, w: corner.x - F.x };
	}
	const u = unitOf(at);
	const S = Math.min(F.w, F.h);
	const A = F.w / F.h;
	const wide = A >= 1.4;
	const banner = A >= 2.4;
	const ultra = A > 4;
	const tall = F.h / F.w > 1.15;
	const squareish = !wide && !tall;
	const v = varied(seed);
	/* Banners are short: their sizes follow the height, not the area. */
	const hk = banner ? Math.min(1, F.h / (500 * u)) : 1;
	const m = (banner ? 48 * hk : 40) * u;
	const near = 12 * u;
	/* The content's edges: the margin, or just inside what a platform covers. */
	const P = { l: F.x + (inset.l ? near : m), t: F.y + (inset.t ? near : m), r: F.x + F.w - (inset.r ? near : m), b: F.y + F.h - (inset.b ? near : m) };
	const box = (l: number, top: number, r: number, b: number): Rect => ({ x: l, y: top, w: Math.max(1, r - l), h: Math.max(1, b - top) });
	const fx = (px: number) => px / W;
	const fy = (px: number) => px / H;
	const sz = (px: number) => px / Math.min(W, H);
	const fb = F.y + F.h;
	const fr = F.x + F.w;
	const cx = F.x + F.w / 2;
	const lockH = LOCKUP().h * hk;
	const lockBL = { logoX: fx(P.l), logoY: fy(P.b - lockH * u), logoAnchor: 'left' as const, logoSize: lockH };
	const base: Partial<Design> = {
		...at,
		...BARE,
		seed,
		...lockBL,
		valign: 'top',
		tracking: -10,
		leading: 1.04,
		badgeScale: 100,
		bodyScale: 100,
		winGap: 40,
		badgeAt: 'words',
		headFont: 'display',
		bodyFont: 'text',
		badgeFont: 'text',
		badgeTracking: 0,
		badgeWeight: 500,
		bodyAlpha: 78,
		bodyLeading: 1.4,
		bodyGap: 30,
		bodyWidth: 0,
		logoMarkScale: 100,
		logoMarkLift: 0,
		logoGap: 100,
		logoMark: true,
		logoWord: true,
		group: false,
		outlineFloor: 0,
		pad: P,
	};

	/* The band of outlined wordmarks: its letters stand on the canvas's foot, or on a hatched floor where a platform
	   covers the foot. */
	const band = (size: number, oct: number) => {
		const bh = size * u;
		let bottom = H > fb ? Math.min(H, fb - 0.235 * oct - 6 * u + bh * (1 - WM().xTop / WM().h)) : H;
		if (H - bottom < 0.05 * H) bottom = H;
		return { bottom, rule: bottom - bh + (bh * WM().xTop) / WM().h, floor: bottom < H - 1 ? bottom : 0 };
	};

	switch (t) {
		case 'tile': {
			const below = tall || squareish;
			let cols = banner && !avoid.length ? 3 : 2;
			while (cols > 1 && panelWidth(cols, 51.6 * hk, u) > F.w * 0.5) cols--;
			const tile = 51.6 * hk;
			const pw = panelWidth(cols, tile, u);
			if (below) {
				const top = F.y + F.h * (tall ? 0.46 : 0.5);
				const bottom = P.b - lockH * u - 26 * u;
				const panel = box(P.l, top, P.r, bottom);
				return {
					...base,
					align: 'left',
					area: box(P.l, P.t, P.r, top - 24 * u),
					textSize: tall ? 78 : 66,
					badge: 'pill',
					pattern: 'panel',
					panel,
					tileSize: 51.6,
					tileStrength: 100,
					tileStagger: false,
					panelBorder: true,
					logo: true,
					stickers: [sit(fx(panel.x + panel.w * (v.on ? 0.3 + v.spot * 0.4 : 0.62)), fy(panel.y + panel.h / 2), sz(Math.min(panel.w * 0.5, panel.h * 0.86)))],
				};
			}
			const left = v.flip;
			const px = left ? (inset.l ? P.l : F.x + 40 * u * hk) : (inset.r ? P.r : fr - 40 * u * hk) - pw;
			return {
				...base,
				align: 'left',
				area: left ? box(px + pw + m, P.t, P.r, P.b) : box(P.l, P.t, px - m, P.b),
				textSize: (banner ? 58 : 61.4) * hk,
				badge: 'pill',
				pattern: 'panel',
				panel: { x: px, y: -22 * u, w: pw, h: H + 44 * u },
				tileSize: tile,
				tileStrength: 100,
				tileStagger: false,
				panelBorder: true,
				logo: !banner,
				...(left ? { logoX: fx(px + pw + m) } : {}),
				stickers: [sit(fx(px + pw / 2), fy(F.y + F.h * (v.on ? 0.42 + 0.16 * v.spot : 0.5)), sz(Math.min(0.568 * pw, 0.62 * F.h)))],
			};
		}
		case 'app': {
			if (banner) {
				const ww = Math.min((avoid.length ? 0.42 : 0.5) * F.w, F.h * 1.6);
				const os = Math.min(210 * u * hk, F.h * 0.46);
				const wx = v.flip && !avoid.length ? P.l + ww / 2 : P.r - ww / 2;
				const top = P.t + os * 0.4;
				return {
					...base,
					align: 'left',
					area: wx < cx ? box(wx + ww / 2 + m, P.t, P.r, P.b) : box(P.l, P.t, wx - ww / 2 - m, P.b),
					textSize: 54 * hk,
					badge: 'pill',
					window: 'app',
					winX: fx(wx),
					winY: fy(top),
					winW: ww / W,
					winRatio: APP_H / APP_W,
					winRadius: 10 * hk,
					stickers: [hang(fx(wx + ww / 2 - os * 0.5), 0, sz(os), { onWindow: true, edge: 23 * (os / 286) })],
				};
			}
			const gi = (tall ? 40 : 80) * u + F.x;
			const ww = W - 2 * gi;
			const os = 286 * u * (tall ? 0.95 : 1);
			const left = v.flip;
			const ox = left ? gi + 127 * u : W - gi - 127 * u;
			const rise = 0.42 * os;
			const area = tall || squareish ? box(gi + 20 * u, P.t, W - gi - 20 * u, fb - 0.34 * F.h) : left ? box(ox + 0.4 * os + 20 * u, P.t, W - gi - 20 * u, fb - 0.34 * F.h) : box(gi + 20 * u, P.t, ox - 0.4 * os - 20 * u, fb - 0.34 * F.h);
			return {
				...base,
				align: 'left',
				area,
				textSize: tall ? 74 : 61.4,
				badge: 'pill',
				guides: true,
				guideInset: gi / u,
				reef: true,
				reefScale: tall ? 260 : 100,
				window: 'app',
				winFollow: true,
				winGap: tall || squareish ? rise / u + 24 : 44,
				winMinTop: fy(P.t + rise),
				winX: 0.5,
				winY: fy(F.y + 263 * u),
				winW: ww / W,
				winRatio: tall ? 1.2 : squareish ? 0.8 : APP_H / APP_W,
				winRadius: 10,
				stickers: [hang(fx(ox), 0, sz(os), { onWindow: true, edge: 23 * u * (tall ? 0.95 : 1) })],
			};
		}
		case 'outline':
		case 'funding': {
			const big = t === 'funding';
			const oct = (big ? (tall ? 380 : 300) : 286) * u * hk * (banner && !ultra ? 0.9 : 1);
			const b = band(188.8 * hk, oct);
			const sw = 32 * u * hk;
			const beside = banner;
			const spot = beside ? (v.flip && !avoid.length ? 0.14 : 0.84) : v.on ? v.spot : big ? 0.5 : 0.503;
			return {
				...base,
				align: beside ? 'left' : 'center',
				area: box(Math.max(P.l, sw + 30 * u), inset.t ? P.t : F.y + Math.max(44 * u * hk, (big ? (tall ? 110 : 58) : 64) * u * hk), Math.min(P.r, W - sw - 30 * u), b.rule - 14 * u * hk),
				textSize: (big ? (tall ? 120 : banner ? 76 : wide ? 88 : 96) : banner ? 66 : tall ? 80 : 66) * hk,
				badge: 'pill',
				badgeScale: big ? 115 : 100,
				outline: true,
				outlineSize: 188.8 * hk,
				outlineY: fy(b.bottom),
				outlineFloor: b.floor,
				outlineShift: v.on ? v.shift : big ? 0.2 : 0,
				outlineRule: true,
				hatch: 'sides',
				hatchGap: 19 * Math.max(0.6, hk),
				sideWidth: 32 * hk,
				stickers: [hang(fx(F.x + F.w * spot), 0, sz(oct), { edge: b.rule, y: fy(b.rule - (23 / 286) * oct) })],
			};
		}
		case 'hatch': {
			const floor = fb - Math.max(167 * u * hk, 0);
			const oct = 286 * u * hk;
			const left = v.flip && !avoid.length;
			const ox = left ? F.x + 143 * u * hk + (inset.l ? 0 : 8 * u) : fr - 143 * u * hk - (inset.r ? 0 : 8 * u);
			const beside = banner;
			const area = beside ? (left ? box(ox + oct * 0.4 + m, P.t, P.r, floor - 14 * u * hk) : box(P.l, P.t, ox - oct * 0.4 - m * 0.6, floor - 14 * u * hk)) : box(Math.max(P.l, F.x + 60 * u), inset.t ? P.t : F.y + 64 * u, Math.min(P.r, fr - 60 * u), floor - 16 * u);
			return {
				...base,
				align: left ? 'left' : 'right',
				area,
				textSize: (banner ? 58 : tall ? 76 : 61.4) * hk,
				badge: 'pill',
				hatch: 'floor',
				hatchY: fy(floor),
				hatchGap: 19 * Math.max(0.6, hk),
				hatchMirror: left,
				stickers: [hang(fx(ox), fy(floor - 23 * u * hk), sz(oct), { edge: floor })],
			};
		}
		case 'reef': {
			const R = logoDoc().reef;
			const scale = banner ? 100 : tall ? 260 : 120;
			const rh = (W * (scale / 100) * R.h) / R.w;
			const oct = banner ? 0.46 * F.h : (tall ? 0.52 : 0.4) * S;
			const drop = banner ? Math.min(0.26, Math.max(0.16, 1 - (0.55 * F.h) / rh)) : 0;
			const sand = H - rh * (0.285 - drop);
			const ground = Math.min(sand + oct * 0.04, fb - 14 * u, banner ? F.y + F.h * 0.94 : fb);
			const spot = banner ? (v.flip && !avoid.length ? 0.24 : 0.72) : v.on ? 0.3 + v.spot * 0.4 : 0.5;
			return {
				...base,
				align: banner ? 'left' : 'center',
				area: box(Math.max(P.l, banner ? F.x + F.w * 0.1 : P.l), P.t, P.r, P.b),
				textSize: (banner ? 58 : tall ? 84 : 66) * hk,
				badge: 'pill',
				reef: true,
				reefScale: scale,
				reefDrop: drop,
				logo: !banner,
				logoSize: lockH,
				logoX: tall ? fx(cx) : fx(P.l),
				logoY: fy(P.t),
				logoAnchor: tall ? 'center' : 'left',
				stickers: [sit(fx(F.x + F.w * spot), fy(ground - (oct * 0.8055 * 0.99) / 2), sz(oct), { rest: 'sit', edge: ground })],
			};
		}
		case 'feature': {
			const fw = (tall ? 26 : 22) * u * hk;
			const frame = { frame: 'hatch' as const, frameWidth: fw / u, frameRadius: 18 * hk, frameTone: 'lilac' as const };
			const L = { l: Math.max(P.l, fw + 40 * u * hk), r: Math.min(P.r, W - fw - 40 * u * hk) };
			if (banner) {
				const ww = Math.min((avoid.length ? 0.42 : 0.46) * F.w, (F.h - fw) * 1.7);
				const onLeft = v.flip && !avoid.length;
				const wx = onLeft ? L.l + ww / 2 : L.r - ww / 2;
				return {
					...base,
					align: 'left',
					area: onLeft ? box(wx + ww / 2 + m, Math.max(P.t, fw + 24 * u * hk), L.r, Math.min(P.b, H - fw - 24 * u * hk)) : box(L.l, Math.max(P.t, fw + 24 * u * hk), wx - ww / 2 - m, Math.min(P.b, H - fw - 24 * u * hk)),
					valign: 'middle',
					textSize: 54 * hk,
					badge: 'pill',
					...frame,
					window: 'app',
					winX: fx(wx),
					winY: fy(Math.max(P.t, fw + 34 * u * hk)),
					winW: ww / W,
					winRatio: APP_H / APP_W,
					winRadius: 12 * hk,
					winChrome: true,
				};
			}
			return {
				...base,
				align: 'center',
				area: box(L.l, inset.t ? P.t : fw + (tall ? 90 : 48) * u, L.r, fb - 0.4 * F.h),
				textSize: tall ? 74 : wide ? 54 : 64,
				badge: 'pill',
				...frame,
				window: 'app',
				winFollow: true,
				winGap: tall ? 60 : 36,
				winMinTop: fy(inset.t ? P.t : fw + 48 * u),
				winX: 0.5,
				winY: 0.42,
				winW: tall ? 0.84 : wide ? 0.78 : 0.84,
				winRatio: tall ? 1.2 : squareish ? 0.8 : APP_H / APP_W,
				winRadius: 12,
				winChrome: true,
			};
		}
		case 'partner': {
			const fw = 30 * u * hk;
			return {
				...base,
				align: 'center',
				area: box(Math.max(P.l, fw + 60 * u * hk), Math.max(P.t, fw + 22 * u * hk), Math.min(P.r, W - fw - 60 * u * hk), Math.min(P.b, H - fw - 22 * u * hk)),
				valign: 'middle',
				textSize: (tall ? 70 : wide ? 52 : 60) * hk,
				badge: 'pill',
				pattern: 'full',
				tileSize: (v.on ? 40 + v.spot * 24 : 51.6) * hk,
				tileStrength: 55,
				tileStagger: v.on ? !v.flip : true,
				panelBorder: false,
				frame: 'line',
				frameWidth: fw / u,
				frameRadius: 20 * hk,
				frameTone: 'lilac',
				logo: true,
				logoSize: 60 * hk,
				logoX: fx(cx),
				logoY: fy(F.y + F.h * (banner ? 0.18 : tall ? 0.36 : wide ? 0.25 : 0.3)),
				logoAnchor: 'center',
				group: true,
			};
		}
		case 'announce': {
			const inner = m + 34 * u * hk;
			const I = { l: Math.max(P.l, inner), t: Math.max(P.t, inner), r: Math.min(P.r, W - inner), b: Math.min(P.b, H - inner) };
			const left = v.flip && !avoid.length;
			const oct = (banner ? (ultra ? 0.5 : 0.42) : 0.32) * S;
			const lk = LOCKUP().h * hk * u;
			return {
				...base,
				align: 'left',
				area: box(I.l, I.t + (banner || inset.t ? 0 : tall ? 40 * u : 30 * u), I.r, I.b),
				textSize: (tall ? 92 : banner ? 56 : wide ? 72 : 76) * hk,
				badge: 'dot',
				frame: 'solid',
				frameWidth: 34 * hk,
				frameRadius: 26 * hk,
				frameTone: 'purple',
				logo: true,
				logoX: banner ? fx(left ? I.l : I.r) : fx(left ? I.r : I.l),
				logoY: banner ? fy(I.t) : fy(I.b - lk),
				logoAnchor: banner ? (left ? 'left' : 'right') : left ? 'right' : 'left',
				logoSize: LOCKUP().h * hk,
				stickers: ultra ? [] : [sit(fx(left ? I.l + oct / 2 : I.r - oct / 2), fy(I.b - (oct * 0.8055) / 2), sz(oct), { rest: 'sit', edge: I.b })],
			};
		}
		case 'card': {
			/* The new-feature card, measured off a 1200 by 1200 post: the lockup top left, a solid pill top right, the
			   words centred between them, and a mono footer. `q` turns those pixels into this size's. */
			const mm = Math.min(71 * u, 0.09 * S);
			const q = mm / 98;
			const px = (n: number) => (n * q) / u;
			const { small } = floorsOf(at);
			const l = Math.max(P.l, F.x + mm);
			const r = Math.min(P.r, fr - mm);
			const top0 = inset.t ? P.t : F.y + mm;
			const bot0 = inset.b ? P.b : fb - mm;
			const footH = Math.max(28 * q, small);
			const foot = F.h > footH * 9;
			const logoPx = Math.max(68.7 * q, ultra ? 0.2 * F.h : 0);
			const top = top0 + logoPx * 1.3 + 28 * q;
			const bottom = foot ? bot0 - footH - 40 * q : bot0;
			return {
				...base,
				align: 'left',
				area: box(l, top, r, bottom),
				valign: 'middle',
				textSize: px(112),
				tracking: -28,
				leading: 1.06,
				headFont: 'plex',
				headWeight: 600,
				bodyFont: 'plex',
				bodyWeight: 400,
				bodyScale: 111,
				bodyLeading: 1.41,
				bodyGap: 37,
				bodyAlpha: 100,
				bodyWidth: banner ? 0 : 0.876,
				badge: 'solid',
				badgeAt: 'corner',
				badgeX: fx(r),
				badgeY: fy(top0 + Math.max(41 * q, 1.24 * Math.max(26 * q, small))),
				badgeScale: (100 * 26 * q) / (19 * u),
				badgeFont: 'mono',
				badgeWeight: 600,
				badgeTracking: 80,
				logo: true,
				logoX: fx(l),
				logoY: fy(top0 + Math.max(22 * q, 0.31 * logoPx)),
				logoAnchor: 'left',
				logoSize: logoPx / u,
				logoMarkScale: 117,
				logoMarkLift: 21.8,
				logoGap: 76,
				foot,
				footSize: footH / u,
				footInset: 0,
				footBox: { l, r, b: bot0 },
			};
		}
		case 'mark': {
			const circle = frameFor(at).circle;
			const side = avoid.filter((a) => a.y < F.y + F.h * 0.7).map((a) => (a.x < cx ? cx - (a.x + a.w) : a.x - cx) - 30 * u);
			const lw = circle ? 0 : Math.min(F.w * 0.5, (F.h * 0.34 * LOCKUP().w) / LOCKUP().h, ...side.map((x) => Math.max(60, x * 2)));
			const logoPx = circle ? 0 : (lw * LOCKUP().h) / LOCKUP().w;
			return {
				...base,
				align: 'center',
				area: box(P.l, P.t, P.r, P.b),
				textSize: 60,
				badge: 'none',
				logo: !circle,
				logoSize: logoPx / u,
				logoX: fx(cx),
				logoY: fy(F.y + F.h / 2 - logoPx / 2),
				logoAnchor: 'center',
				wordless: true,
				logoMax: Math.min(P.r - P.l, ...side.map((x) => Math.max(60, x * 2))),
				stickers: circle ? [sit(0.5, 0.5, 0.62)] : [],
			};
		}
	}
}

/* What every design starts from before a template lays it out. */
export function designStart(): Design {
	const s = imageDoc().start;
	return {
		name: 'Untitled',
		template: 'tile',
		size: 'og',
		w: 1200,
		h: 630,
		theme: 'paper',
		highlight: 'pink',
		badge: 'pill',
		badgeText: '',
		badgeScale: 100,
		headline: '',
		body: '',
		credit: '',
		page: '',
		align: 'left',
		area: { x: 40, y: 40, w: 600, h: 400 },
		valign: 'top',
		pad: { l: 40, t: 40, r: 1160, b: 590 },
		group: false,
		wordless: false,
		textSize: 61.4,
		textCap: 0,
		tracking: -10,
		leading: 1.04,
		bodyScale: 100,
		badgeAt: 'words',
		badgeX: 0.95,
		badgeY: 0.08,
		foot: false,
		footLeft: s.footLeft ?? '',
		footRight: s.footRight ?? '',
		footBox: { l: 40, r: 1160, b: 590 },
		logo: true,
		logoX: 0.033,
		logoY: 0.863,
		logoSize: 46.08,
		logoAnchor: 'left',
		logoMax: 0,
		partnerName: '',
		pattern: 'none',
		panel: { x: 0, y: 0, w: 1, h: 1 },
		tileSize: 51.6,
		tileStrength: 100,
		tileStagger: false,
		panelBorder: true,
		outline: false,
		outlineSize: 188.8,
		outlineY: 1,
		outlineFloor: 0,
		outlineShift: 0,
		outlineRule: true,
		hatch: 'none',
		hatchY: 0.66,
		hatchGap: 19,
		hatchMirror: false,
		sideWidth: 32,
		guides: false,
		guideInset: 80,
		reef: false,
		reefScale: 100,
		reefFade: themes().paper!.reefFade,
		reefDrop: 0,
		frame: 'none',
		frameWidth: 24,
		frameRadius: 18,
		frameTone: 'lilac',
		window: 'none',
		winX: 0.5,
		winY: 0.42,
		winW: 0.86,
		winRatio: APP_H / APP_W,
		winRadius: 10,
		winFollow: false,
		winGap: 40,
		winMinTop: 0,
		winChrome: false,
		winUrl: s.winUrl ?? '',
		app: appStart(),
		stickers: [],
		headWeight: 600,
		headFont: 'display',
		badgeGap: 21,
		badgeWeight: 500,
		badgeFont: 'text',
		badgeTracking: 0,
		bodyAlpha: 78,
		bodyFont: 'text',
		bodyWeight: 400,
		bodyLeading: 1.4,
		bodyGap: 30,
		bodyWidth: 0,
		logoMark: true,
		logoWord: true,
		logoMarkScale: 100,
		logoMarkLift: 0,
		logoGap: 100,
		footSize: 20,
		footWeight: 500,
		footInset: 56,
		edits: {},
		asked: {},
	};
}

/* --------------------------------------------------------------- words */

type Word = { text: string; hi: boolean; space: boolean; tail?: { text: string; hi: boolean }[] };

/* "*AI agent*" highlights; a line break starts a new line; "\*" is a star to show. */
const STAR = '\u0000';
function parseLine(line: string): Word[] {
	const out: Word[] = [];
	let hi = false;
	line = line.replaceAll('\\*', STAR);
	/* A star with no partner is a star to show, not a highlight to the end of the line. */
	if ((line.split('*').length - 1) % 2) line = line.replace(/\*(?=[^*]*$)/, STAR);
	for (const [i, chunk] of line.split('*').entries()) {
		if (i > 0) hi = !hi;
		for (const b of chunk.split(/(\s+)/)) {
			if (!b) continue;
			if (/^\s+$/.test(b)) {
				if (out.length) out[out.length - 1]!.space = true;
			} else {
				/* "*reply*." keeps its full stop on the word. */
				const prev = out[out.length - 1];
				if (prev && !prev.space) prev.tail = [...(prev.tail ?? []), { text: b.replaceAll(STAR, '*'), hi }];
				else out.push({ text: b.replaceAll(STAR, '*'), hi, space: false });
			}
		}
	}
	return out;
}
const whole = (w: Word) => w.text + (w.tail ?? []).map((t) => t.text).join('');

/** A headline's words without the highlight marks, as they are read. */
export const plainWords = (s: string) =>
	s
		.split('\n')
		.map((l) => parseLine(l).map(whole).join(' '))
		.join(' ')
		.replace(/\s+/g, ' ')
		.trim();

type Line = { words: Word[]; w: number };

function wrapWords(ctx: Ctx, words: Word[], max: number): Line[] {
	const space = ctx.measureText(' ').width;
	const lines: Line[] = [];
	let cur: Word[] = [];
	let w = 0;
	for (const wd of words) {
		const ww = ctx.measureText(whole(wd)).width;
		const add = cur.length ? space + ww : ww;
		if (cur.length && w + add > max) {
			lines.push({ words: cur, w });
			cur = [wd];
			w = ww;
		} else {
			cur.push(wd);
			w += add;
		}
	}
	if (cur.length) lines.push({ words: cur, w });
	return lines;
}

/* Lines as even as they can be in the same number of lines, so no line is left with one word. */
function balanced(ctx: Ctx, text: string, max: number): Line[] {
	return text.split('\n').flatMap((l) => {
		const words = parseLine(l);
		const greedy = wrapWords(ctx, words, max);
		if (greedy.length < 2) return greedy;
		let lo = max * 0.45;
		let hi = max;
		for (let i = 0; i < 9; i++) {
			const mid = (lo + hi) / 2;
			const t = wrapWords(ctx, words, mid);
			if (t.length <= greedy.length && t.every((x) => x.w <= mid + 0.01)) hi = mid;
			else lo = mid;
		}
		const out = wrapWords(ctx, words, hi);
		return out.length === greedy.length ? out : greedy;
	});
}

/* The baseline of a line set at `size` with line height `lh`, as CSS sets it. */
function baselineIn(ctx: Ctx, lineTop: number, size: number, lh: number) {
	const m = ctx.measureText('Hg');
	const asc = m.fontBoundingBoxAscent || size * 0.9;
	const desc = m.fontBoundingBoxDescent || size * 0.22;
	return lineTop + (size * lh - (asc + desc)) / 2 + asc;
}

/* ------------------------------------------------------------- drawing */

/* The design's colours: the theme's. */
export function colorsOf(d: Pick<Design, 'theme' | 'highlight'>) {
	const t = themes()[d.theme]!;
	return { bg: t.bg, ink: t.ink, muted: t.muted, line: t.line, tile: t.tile, border: t.border, hi: highlightColor(d.highlight, d.theme), dark: t.dark, tileAlpha: t.tileAlpha };
}
type Colors = ReturnType<typeof colorsOf>;

/* Parallel lines across `r`, `gap` apart along the edge, at `angle`. */
export function hatchLines(ctx: Ctx, r: Rect, gap: number, angle = 45, mirror = false) {
	ctx.save();
	ctx.beginPath();
	ctx.rect(r.x, r.y, r.w, r.h);
	ctx.clip();
	const L = Math.hypot(r.w, r.h) + gap * 2;
	const sp = Math.max(1, gap / Math.SQRT2);
	ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
	ctx.rotate(((mirror ? 1 : -1) * angle * Math.PI) / 180);
	ctx.beginPath();
	for (let y = -L / 2; y <= L / 2; y += sp) {
		ctx.moveTo(-L / 2, y);
		ctx.lineTo(L / 2, y);
	}
	ctx.stroke();
	ctx.restore();
}

/* The wordmark in rows, whole words only, centred in `r`; a word that would meet `keep` is left out. Returns where each
   word is. */
export function tileWords(ctx: Ctx, r: Rect, tile: number, u: number, stagger: boolean, keep: Rect[] = []): Rect[] {
	const th = tile * u;
	const k = th / WM().h;
	const tw = WM().w * k;
	const gx = th * (18.43 / 51.61);
	const gy = th * (10 / 51.61);
	const n = Math.max(1, Math.floor((r.w + gx) / (tw + gx)));
	const rows = Math.max(1, Math.floor((r.h + gy) / (th + gy)));
	/* What is left over opens the gaps, so the rows reach both sides. */
	const sx = n > 1 ? Math.min(gx * 1.6, gx + (r.w - n * tw - (n - 1) * gx - gx) / (n - 1)) : gx;
	const sy = rows > 1 ? Math.min(gy * 1.8, gy + Math.max(0, r.h - rows * th - (rows - 1) * gy - gy) / (rows - 1)) : gy;
	const gapX = Math.max(gx, sx);
	const x0 = r.x + (r.w - (n * tw + (n - 1) * gapX)) / 2;
	const y0 = r.y + (r.h - (rows * th + (rows - 1) * sy)) / 2;
	const path = wordmarkPath();
	const out: Rect[] = [];
	for (let row = 0; row < rows; row++) {
		const odd = stagger && row % 2 === 1 && n > 1;
		for (let c = 0; c < (odd ? n - 1 : n); c++) {
			const box = { x: x0 + c * (tw + gapX) + (odd ? (tw + gapX) / 2 : 0), y: y0 + row * (th + sy), w: tw, h: th };
			if (keep.some((q) => inter(box, q))) continue;
			ctx.save();
			ctx.translate(box.x, box.y);
			ctx.scale(k, k);
			ctx.fill(path);
			ctx.restore();
			out.push(box);
		}
	}
	return out;
}

function drawLockup(ctx: Ctx, d: Design, b: LogoBox, ink: string, pics: Pictures, fonts: Fonts) {
	const L = LOCKUP();
	const { k, x, y, lh } = b;
	const mark = pics.get('sit');
	if (d.logoMark && mark) ctx.drawImage(mark, x, b.my, b.markW, b.mh);
	if (d.logoWord) {
		ctx.save();
		ctx.translate(x + b.markW + b.wordGap, y + L.word.y * k);
		ctx.scale(k, k);
		ctx.fillStyle = ink;
		ctx.fill(wordmarkPath());
		ctx.restore();
	}
	if (b.partner) {
		let px = x + b.lw + b.gap;
		const cy = y + lh / 2;
		const cx = px + b.times / 2;
		ctx.strokeStyle = ink;
		ctx.globalAlpha *= 0.55;
		ctx.lineWidth = 2.2 * k;
		ctx.lineCap = 'round';
		ctx.beginPath();
		ctx.moveTo(cx - b.times / 2, cy - b.times / 2);
		ctx.lineTo(cx + b.times / 2, cy + b.times / 2);
		ctx.moveTo(cx + b.times / 2, cy - b.times / 2);
		ctx.lineTo(cx - b.times / 2, cy + b.times / 2);
		ctx.stroke();
		ctx.globalAlpha /= 0.55;
		px = cx + b.times / 2 + b.gap;
		ctx.fillStyle = ink;
		ctx.textBaseline = 'middle';
		ctx.textAlign = 'left';
		ctx.font = `600 ${lh * 0.72}px ${fonts.sans}`;
		ctx.fillText(b.partner, px, cy + lh * 0.03);
	}
}

function drawBadge(ctx: Ctx, d: Design, x: number, y: number, size: number, ink: string, _hi: string, dark: boolean, fonts: Fonts, measureOnly: boolean, bg: string) {
	if (d.badge === 'none' || !d.badgeText.trim()) return { w: 0, h: 0 };
	const fs = size;
	const text = d.badgeText.replace(/\s+/g, ' ').trim();
	const sq = fs * 1.2857;
	const wordInk = d.badge === 'solid' ? bg : ink;
	const face = faceOf(fonts, d.badgeFont);
	const track = (d.badgeTracking / 1000) * fs;
	ctx.font = `${d.badgeWeight} ${fs}px ${face}`;
	ctx.letterSpacing = `${track}px`;
	/* Letter spacing trails the last letter too; it isn't part of the words. */
	const tw = ctx.measureText(text).width - (track > 0 ? track : 0);
	ctx.letterSpacing = '0px';
	const words = (x: number, y: number) => {
		ctx.font = `${d.badgeWeight} ${fs}px ${face}`;
		ctx.letterSpacing = `${track}px`;
		ctx.fillStyle = wordInk;
		ctx.textBaseline = 'middle';
		ctx.textAlign = 'left';
		ctx.fillText(text, x, y + fs * 0.04);
		ctx.letterSpacing = '0px';
	};
	/* A filled pill with the words in the ground's colour, as on the new-feature card. */
	if (d.badge === 'solid') {
		const padX = fs * 1.08;
		const h = fs * 2.46;
		const w = tw + padX * 2;
		if (!measureOnly) {
			ctx.fillStyle = ink;
			ctx.beginPath();
			ctx.roundRect(x, y, w, h, h / 2);
			ctx.fill();
			words(x + padX, y + h / 2);
		}
		return { w, h };
	}
	if (d.badge === 'pill') {
		const padX = fs * 0.75;
		const h = fs * 1.9;
		const w = tw + padX * 2 + fs * 0.9;
		if (!measureOnly) {
			ctx.fillStyle = themes()[d.theme]!.pill;
			ctx.strokeStyle = dark ? brandColor('pillStrokeDark') : brandColor('pillStroke');
			ctx.lineWidth = Math.max(1, fs * 0.06);
			ctx.beginPath();
			ctx.roundRect(x, y, w, h, h / 2);
			ctx.fill();
			ctx.stroke();
			ctx.fillStyle = brandColor('pink');
			ctx.beginPath();
			ctx.arc(x + padX + fs * 0.22, y + h / 2, fs * 0.24, 0, Math.PI * 2);
			ctx.fill();
			words(x + padX + fs * 0.9, y + h / 2);
		}
		return { w, h };
	}
	/* dot */
	const r = fs * 0.3;
	const w = r * 2 + fs * 0.55 + tw;
	if (!measureOnly) {
		ctx.fillStyle = brandColor('pink');
		ctx.beginPath();
		ctx.arc(x + r, y + sq / 2, r, 0, Math.PI * 2);
		ctx.fill();
		words(x + r * 2 + fs * 0.55, y + sq / 2);
	}
	return { w, h: sq };
}

/* A line's own ink: its glyphs' real bounds at the current font. */
function glyphBox(ctx: Ctx, text: string, x: number, base: number, w: number): Rect {
	const m = ctx.measureText(text);
	return { x, y: base - m.actualBoundingBoxAscent, w, h: m.actualBoundingBoxAscent + m.actualBoundingBoxDescent };
}

/* The words, laid out at one headline size: each piece's lines, sizes and tops, from the block's own top left. */
type Block = {
	size: number;
	w: number;
	h: number;
	badge?: { w: number; h: number; fs: number; top: number };
	head?: { lines: Line[]; top: number };
	body?: { lines: { text: string; w: number }[]; size: number; top: number };
	credit?: { lines: { text: string; w: number }[]; size: number; top: number };
	/* The widest single word, which no wrap makes narrower. */
	word: number;
};

const edit = (d: Design, id: string): LayerEdit => d.edits[id] ?? {};
const hidden = (d: Design, id: string) => !!d.edits[id]?.hidden;

function layWords(ctx: Ctx, d: Design, base: number, maxW: number, fonts: Fonts, forced?: number): Block {
	const { small } = floorsOf(d);
	const size = forced ?? base;
	const out: Block = { size, w: 0, h: 0, word: 0 };
	let y = 0;
	if (d.badgeAt === 'words' && d.badge !== 'none' && d.badgeText.trim() && !hidden(d, 'badge')) {
		const fs = Math.max(small, base * 0.3046 * (d.badgeScale / 100)) * (edit(d, 'badge').scale ?? 1);
		const b = drawBadge(ctx, d, 0, 0, fs, '#000000', '', false, fonts, true, '#FFFFFF');
		out.badge = { ...b, fs, top: y };
		out.word = Math.max(out.word, b.w);
		out.w = Math.max(out.w, b.w);
		y += b.h;
	}
	if (d.headline.trim() && !hidden(d, 'headline')) {
		if (y) y += size * (d.badgeGap / 100);
		ctx.font = `${d.headWeight} ${size}px ${faceOf(fonts, d.headFont)}`;
		ctx.letterSpacing = `${(d.tracking / 1000) * size}px`;
		const lines = balanced(ctx, d.headline, maxW);
		for (const l of lines) {
			out.w = Math.max(out.w, l.w);
			for (const wd of l.words) out.word = Math.max(out.word, ctx.measureText(whole(wd)).width);
		}
		ctx.letterSpacing = '0px';
		out.head = { lines, top: y };
		y += lines.length * size * d.leading;
		/* A tight last line's descenders hang under its line box. */
		if (!d.body.trim() && !d.credit.trim()) y += size * Math.max(0, 1.1 - d.leading);
	}
	const plain = (id: 'body' | 'credit', text: string, fs: number, weight: number, leading: number, width: number, gap: number) => {
		if (!text.trim() || hidden(d, id)) return;
		const f = fs * (edit(d, id).scale ?? 1);
		if (y) y += gap;
		ctx.font = `${weight} ${f}px ${faceOf(fonts, d.bodyFont)}`;
		const lines = text.split('\n').flatMap((l) => {
			const words = parseLine(l.replaceAll('*', '\\*'));
			return wrapWords(ctx, words, width).map((ln) => ({ text: ln.words.map(whole).join(' '), w: ln.w, words: ln.words }));
		});
		for (const l of lines) {
			out.w = Math.max(out.w, l.w);
			for (const wd of l.words) out.word = Math.max(out.word, ctx.measureText(whole(wd)).width);
		}
		out[id] = { lines: lines.map((l) => ({ text: l.text, w: l.w })), size: f, top: y };
		y += lines.length * f * leading;
	};
	const bw = d.bodyWidth > 0 ? d.bodyWidth * maxW : maxW;
	plain('body', d.body, Math.max(small * 1.1, base * 0.34 * (d.bodyScale / 100)), d.bodyWeight, d.bodyLeading, bw, base * (d.bodyGap / 100) * (out.head ? 1 : 0.6));
	const credit = d.credit.trim();
	if (credit) plain('credit', credit, Math.max(small, base * 0.2), 500, 1.15, bw, base * (d.body.trim() ? 0.14 : 0.24));
	out.h = y;
	return out;
}

/* Each piece's own offset, from its edit: the headline takes the words under and over it along. */
function nudge(d: Design, id: 'headline' | 'body' | 'credit' | 'badge') {
	const { w: W, h: H } = frameOf(d);
	const e = edit(d, id);
	const h = id === 'headline' ? {} : edit(d, 'headline');
	return { x: ((e.dx ?? 0) + (h.dx ?? 0)) * W, y: ((e.dy ?? 0) + (h.dy ?? 0)) * H };
}

type Placed = { block: Block; x: number; y: number; w: number; align: Align };
/* A piece's left edge for its own width. */
const leftOf = (p: Placed, w: number) => (p.align === 'left' ? p.x : p.align === 'center' ? p.x + (p.w - w) / 2 : p.x + p.w - w);

function drawWords(ctx: Ctx, d: Design, p: Placed, C: Colors, fonts: Fonts, out: DrawnLayer[]) {
	const { w: W } = frameOf(d);
	const b = p.block;
	const { small, head: headFloor } = floorsOf(d);
	if (b.badge) {
		const n = nudge(d, 'badge');
		const x = leftOf(p, b.badge.w) + n.x;
		const y = p.y + b.badge.top + n.y;
		layer(ctx, 'badge', x + b.badge.w / 2, y + b.badge.h / 2, () => drawBadge(ctx, d, x, y, b.badge!.fs, C.ink, C.hi, C.dark, fonts, false, C.bg));
		out.push(badgeLayer(d, { x, y, w: b.badge.w, h: b.badge.h }, b.badge.fs, C));
	}
	if (b.head) {
		const n = nudge(d, 'headline');
		const size = b.size;
		const lh = d.leading;
		ctx.font = `${d.headWeight} ${size}px ${faceOf(fonts, d.headFont)}`;
		ctx.letterSpacing = `${(d.tracking / 1000) * size}px`;
		ctx.textAlign = 'left';
		ctx.textBaseline = 'alphabetic';
		const space = ctx.measureText(' ').width;
		const hi = C.hi || C.ink;
		const ink: Rect[] = [];
		let lit = false;
		const drawn: string[] = [];
		b.head.lines.forEach((line, li) => {
			let x = leftOf(p, line.w) + n.x;
			const top = p.y + b.head!.top + n.y + li * size * lh;
			const base = baselineIn(ctx, top, size, lh);
			ink.push(glyphBox(ctx, line.words.map(whole).join(' '), x, base, line.w));
			layer(ctx, `line:${li}`, x + line.w / 2, top + (size * lh) / 2, () =>
				line.words.forEach((wd, i) => {
					let at = x;
					for (const part of [{ text: wd.text, hi: wd.hi }, ...(wd.tail ?? [])]) {
						ctx.fillStyle = part.hi ? hi : C.ink;
						if (part.hi) lit = true;
						ctx.fillText(part.text, at, base);
						at += ctx.measureText(part.text).width;
					}
					x += ctx.measureText(whole(wd)).width + (i < line.words.length - 1 ? space : 0);
				}),
			);
			drawn.push(line.words.map(whole).join(' '));
		});
		ctx.letterSpacing = '0px';
		const color = lit && contrast(hi, C.bg) < contrast(C.ink, C.bg) ? hi : C.ink;
		out.push({ id: 'headline', kind: 'text', box: union(ink), ink, text: { ...said(d, 'headline', plainWords(d.headline), drawn.join(' ')), size, color, ground: [C.bg] }, can: canOf(d, 'headline') });
		void headFloor;
	}
	const para = (id: 'body' | 'credit', weight: number, leading: number, color: string, asked: string) => {
		const part = b[id];
		if (!part) return;
		const n = nudge(d, id);
		ctx.font = `${weight} ${part.size}px ${faceOf(fonts, d.bodyFont)}`;
		ctx.textAlign = 'left';
		ctx.textBaseline = 'alphabetic';
		ctx.fillStyle = color;
		const ink: Rect[] = [];
		part.lines.forEach((l, i) => {
			const x = leftOf(p, l.w) + n.x;
			const top = p.y + part.top + n.y + i * part.size * leading;
			const base = baselineIn(ctx, top, part.size, leading);
			ink.push(glyphBox(ctx, l.text, x, base, l.w));
			layer(ctx, id, x + l.w / 2, top, () => ctx.fillText(l.text, x, base));
		});
		out.push({ id, kind: 'text', box: union(ink), ink, text: { ...said(d, id, asked.replace(/\s+/g, ' ').trim(), part.lines.map((l) => l.text).join(' ')), size: part.size, color, ground: [C.bg] }, can: canOf(d, id) });
	};
	para('body', d.bodyWeight, d.bodyLeading, d.bodyAlpha >= 100 ? C.ink : C.muted, d.body);
	para('credit', 500, 1.15, C.muted, d.credit);
	void W;
	void small;
}

const ANCHORS = ['top-left', 'top', 'top-right', 'left', 'center', 'right', 'bottom-left', 'bottom', 'bottom-right'] as NonNullable<DrawnLayer['can']['anchors']>;

/* What a piece was asked to say and what it says: as it was asked, highlight marks and all, when every word is there. */
function said(d: Design, slot: string, want: string, drawn: string) {
	const raw = d.asked[slot];
	const whole = want === drawn.replace(/\s+/g, ' ').trim();
	return { asked: raw ?? want, drawn: whole && raw !== undefined ? raw : drawn, ...(raw === undefined ? { sample: true } : {}) };
}

type Can = DrawnLayer['can'];
/** Every layer a template can draw and what may be changed about it, the same list the drawing reports. */
export function layerCans(t: Template): { id: string; can: Can }[] {
	const words: { id: string; can: Can }[] = [
		{ id: 'headline', can: { move: true, scale: [0.6, 1.6], align: true, hide: true, ...(headAnchors(t).length ? { anchors: headAnchors(t) } : {}) } },
		{ id: 'body', can: { move: true, scale: [0.8, 1.6], hide: true } },
		{ id: 'badge', can: { move: true, scale: [0.8, 1.6], hide: true } },
		{ id: 'credit', can: { move: true, scale: [0.8, 1.6], hide: true } },
	];
	const logo = { id: 'logo', can: { move: true, scale: [0.7, 2], hide: true, anchors: ANCHORS } as Can };
	const art = (anchors?: Can['anchors']) => ({ id: 'art', can: { move: true, scale: [0.5, 1.6], hide: true, ...(anchors ? { anchors } : {}) } as Can });
	const window = { id: 'window', can: { move: true, scale: [0.7, 1.2], hide: true } as Can };
	const decor = (...ids: string[]) => ids.map((id) => ({ id, can: { hide: true } as Can }));
	const own: Record<Template, { id: string; can: Can }[]> = {
		tile: [art(), ...decor('pattern')],
		app: [window, art(), ...decor('reef', 'guides')],
		outline: [art(EDGE), ...decor('band', 'hatch')],
		funding: [art(EDGE), ...decor('band', 'hatch')],
		hatch: [art(EDGE), ...decor('hatch')],
		reef: [art(EDGE), ...decor('reef')],
		feature: [window, ...decor('frame')],
		partner: decor('pattern', 'frame'),
		announce: [art(EDGE), ...decor('frame')],
		card: decor('handle', 'footer'),
		mark: [art()],
	};
	return [...(t === 'mark' ? [] : words), logo, { id: 'partner', can: {} }, ...own[t], ...(t === 'mark' ? [] : [{ id: 'page', can: { hide: true } }])];
}
const canOf = (d: Design, id: string): Can => layerCans(d.template).find((l) => l.id === id)?.can ?? {};
/* Along an edge or a ground: what hangs or sits stays on it. */
const EDGE = ['left', 'center', 'right', 'bottom-left', 'bottom', 'bottom-right'] as NonNullable<Can['anchors']>;

/* Where a template's words may be put: wherever its art leaves them room. */
export function headAnchors(t: Template): NonNullable<DrawnLayer['can']['anchors']> {
	if (t === 'outline' || t === 'funding' || t === 'hatch' || t === 'reef') return ['top-left', 'top', 'top-right'];
	if (t === 'announce' || t === 'card') return ['top-left', 'top', 'left'];
	if (t === 'tile') return ['top-left', 'left'];
	return [];
}

function badgeLayer(d: Design, box: Rect, fs: number, C: Colors): DrawnLayer {
	const ground = d.badge === 'solid' ? C.ink : d.badge === 'pill' ? over(themes()[d.theme]!.pill, C.bg) : C.bg;
	return { id: 'badge', kind: 'text', box, text: { ...said(d, 'badge', d.badgeText.replace(/\s+/g, ' ').trim(), d.badgeText.replace(/\s+/g, ' ').trim()), size: fs, color: d.badge === 'solid' ? C.bg : C.ink, ground: [ground] }, can: canOf(d, 'badge') };
}

/* ------------------------------------------------------------- placing */

/** What a design draws and where: the words in the room they have, the octopus and the lockup beside them. */
type Resolved = { placed: Placed | null; logo: LogoBox | null; corner: { x: number; y: number; w: number; h: number; fs: number } | null; foot: FootBox | null; page: PageBox | null; stickers: Sticker[]; winTop: number | null; size: number };

const inkOf: Record<string, [number, number, number, number]> = { sit: [0, 0, 1, 0.8055], hang: [0.117, 0.158, 0.742, 0.651] };
/** The octopus's own box in its picture drawn `w` wide at (x, y). */
export function inkBox(id: string, x: number, y: number, w: number): Rect {
	const r = inkOf[id] ?? [0, 0, 1, 1];
	return { x: x + r[0] * w, y: y + r[1] * w, w: r[2] * w, h: r[3] * w };
}
/* The octopus's own outline in its picture, so its empty margins keep nothing away. */
function stickerInk(s: Sticker, W: number, H: number, winTop: number | null): Rect {
	const S = Math.min(W, H);
	const w = s.size * S;
	const r = inkOf[s.src] ?? [0, 0, 1, s.ratio ?? 1];
	const h = w * (s.src === 'sit' ? 0.8055 : 1);
	const x = s.x * W - w / 2;
	const y = s.y * H + (s.onWindow && winTop !== null ? winTop : 0) - h / 2;
	return { x: x + r[0] * w, y: y + r[1] * w, w: r[2] * w, h: r[3] * w };
}

function placedSticker(d: Design, s: Sticker, k: number, mirror: boolean): Sticker {
	const { w: W, h: H } = frameOf(d);
	const { F } = frameFor(d);
	const e = edit(d, 'art');
	const size = s.size * k;
	const S = Math.min(W, H);
	let x = s.x;
	let y = s.y;
	if (mirror && s.rest !== 'middle') x = (2 * F.x + F.w) / W - s.x;
	const ratio = s.src === 'sit' ? 0.8055 : 1;
	const at = (kk: number) => {
		const w = s.size * kk * S;
		if (s.rest === 'hang' && s.onWindow) return (-(s.edge ?? 0) * kk) / H;
		if (s.rest === 'hang') return ((s.edge ?? 0) - (23 / 286) * w) / H;
		if (s.rest === 'sit') return ((s.edge ?? 0) - (w * ratio) / 2) / H;
		return s.y;
	};
	if (s.rest) y = at(k);
	if (e.anchor) {
		const w = size * S;
		const P = d.pad;
		const ink = inkOf[s.src] ?? [0, 0, 1, ratio];
		const half = (ink[2] * w) / 2;
		if (e.anchor.includes('left')) x = (P.l + half) / W;
		else if (e.anchor.includes('right')) x = (P.r - half) / W;
		else x = (P.l + P.r) / 2 / W;
		/* The hanging octopus stays on its edge: it has nothing to hang over anywhere else. */
		if (s.rest !== 'hang') {
			if (e.anchor.startsWith('top')) y = (P.t + (w * ratio) / 2) / H;
			else if (e.anchor.startsWith('bottom')) y = (P.b - (w * ratio) / 2) / H;
			else if (s.rest !== 'sit') y = (P.t + P.b) / 2 / H;
		}
	}
	return { ...s, size, x: x + (e.dx ?? 0), y: y + (e.dy ?? 0) };
}

/* The edges the lockup keeps inside: the content's, and whatever the layout draws along them. */
function innerOf(d: Design, u: number, clear: number) {
	const { W, H } = frameFor(d);
	const P = d.pad;
	const ring = d.frame === 'none' || hidden(d, 'frame') ? 0 : d.frameWidth * u + Math.max(clear, 16 * u);
	const side = Math.max(ring, d.hatch === 'sides' && !hidden(d, 'hatch') ? d.sideWidth * u + Math.max(clear, 16 * u) : 0, d.guides && !hidden(d, 'guides') ? d.guideInset * u + Math.max(clear, 16 * u) : 0);
	const floor = Math.min(d.outline && !hidden(d, 'band') ? d.outlineY * H - d.outlineSize * u : H, d.hatch === 'floor' && !hidden(d, 'hatch') ? d.hatchY * H : H);
	return { l: Math.max(P.l, side), r: Math.min(P.r, W - side), t: Math.max(P.t, ring), b: Math.min(P.b, H - ring, floor < H ? floor - clear : H) };
}

type LogoBox = { x: number; y: number; w: number; h: number; k: number; lh: number; markW: number; wordGap: number; lw: number; top: number; my: number; mh: number; gap: number; times: number; pw: number; partner: string; clear: number };

/* The lockup's own gap between the octopus and the wordmark, the only spacing the logo file draws, kept clear round it
   (logo.json `clear`). */
const clearOf = (lh: number) => lh * logoDoc().clear.share;

function logoBox(ctx: Ctx, d: Design, u: number, fonts: Fonts): LogoBox | null {
	if (!d.logo || (!d.logoMark && !d.logoWord) || hidden(d, 'logo')) return null;
	const L = LOCKUP();
	const { w: W, h: H } = frameOf(d);
	const e = edit(d, 'logo');
	const partner = d.partnerName.trim();
	/* A partner's name is read, so it keeps to the smallest readable size; a lockup on its own keeps to its room. */
	let base = partner ? Math.max(d.logoSize, floorsOf(d).small / 0.72 / u) : d.logoSize;
	if (partner && d.logoMax > 0) {
		ctx.font = `600 100px ${fonts.sans}`;
		ctx.letterSpacing = '0px';
		const wide = (n: number) => (n * u * (L.w + 26 * 2 + 16)) / L.h + (ctx.measureText(partner).width / 100) * n * u * 0.72;
		if (wide(base) > d.logoMax) base *= d.logoMax / wide(base);
	}
	const size = base * (e.scale ?? 1);
	const k = (size * u) / L.h;
	const ms = (d.logoMarkScale ?? 100) / 100;
	const markW = d.logoMark ? L.mark.w * k * ms : 0;
	const wordGap = d.logoMark && d.logoWord ? (L.word.x - L.mark.w) * k * (d.logoGap / 100) : 0;
	const wordW = d.logoWord ? L.word.w * k : 0;
	const lw = markW + wordGap + wordW;
	const lh = L.h * k;
	/* With a partner, the row is: lockup  ×  partner (a name; never another company's logo). */
	const gap = 26 * k;
	const times = 16 * k;
	let pw = 0;
	if (partner) {
		ctx.font = `600 ${lh * 0.72}px ${fonts.sans}`;
		ctx.letterSpacing = '0px';
		pw = ctx.measureText(partner).width;
	}
	const total = partner ? lw + gap * 2 + times + pw : lw;
	let x = d.logoAnchor === 'left' ? d.logoX * W : d.logoAnchor === 'center' ? d.logoX * W - total / 2 : d.logoX * W - total;
	let y = d.logoY * H;
	const mh = L.mark.h * k * ms;
	if (e.scale && !e.anchor) {
		/* Scaled about the corner it is anchored at. */
		const was = base * u;
		y = d.logoY * H + (d.logoY > 0.5 ? was - lh : d.group ? (was - lh) / 2 : 0);
	}
	if (e.anchor) {
		const P = innerOf(d, u, clearOf(lh));
		x = e.anchor.includes('left') ? P.l : e.anchor.includes('right') ? P.r - total : (P.l + P.r) / 2 - total / 2;
		y = e.anchor.startsWith('top') ? P.t : e.anchor.startsWith('bottom') ? P.b - lh : (P.t + P.b) / 2 - lh / 2;
	}
	x += (e.dx ?? 0) * W;
	y += (e.dy ?? 0) * H;
	const my = y + lh / 2 - mh / 2 - ((d.logoMarkLift ?? 0) / 100) * lh;
	const top = d.logoMark ? Math.min(y, my) : y;
	const bottom = d.logoMark ? Math.max(y + lh, my + mh) : y + lh;
	return { x, y, w: total, h: bottom - top, top, k, lh, markW, wordGap, lw, my, mh, gap, times, pw, partner, clear: clearOf(lh) };
}
const logoRect = (b: LogoBox): Rect => ({ x: b.x, y: b.top, w: b.w, h: b.h });

/* Where the lockup goes in a layout that does not draw one (a partner's name was given, or it was asked for): the first
   corner nothing stands in. The words then keep clear of it. */
function freeCorner(d: Design, b: LogoBox, u: number, pics: Pictures): LogoBox | null {
	const { W, H, avoid } = frameFor(d);
	const { l, r, t, b: bt } = innerOf(d, u, b.clear);
	const taken: Rect[] = [...avoid];
	if (d.pattern === 'panel') taken.push(d.panel);
	if (d.outline) taken.push({ x: 0, y: d.outlineY * H - d.outlineSize * u, w: W, h: H });
	if (d.hatch === 'floor') taken.push({ x: 0, y: d.hatchY * H, w: W, h: H });
	const reef = pics.get('reef');
	if (d.reef && reef) taken.push(...reefInk(d, reef, W, H));
	if (d.window !== 'none') taken.push({ x: d.winX * W - (d.winW * W) / 2, y: d.winFollow ? d.area.y + d.area.h * 0.6 : d.winY * H, w: d.winW * W, h: H });
	for (const s of d.stickers) if (!s.onWindow) taken.push(stickerInk(s, W, H, null));
		else taken.push({ x: s.x * W - (s.size * Math.min(W, H)) / 2, y: 0, w: s.size * Math.min(W, H), h: d.winY * H });
	const lift = b.y - b.top;
	const left = d.align === 'right' ? [r - b.w, l] : [l, r - b.w];
	const center = (l + r) / 2 - b.w / 2;
	const xs = d.align === 'center' ? [center, l, r - b.w] : [...left, center];
	const spots = [...xs.slice(0, 2).map((x) => ({ x, y: bt - b.h })), ...xs.map((x) => ({ x, y: t }))];
	for (const p of spots) {
		const box = { x: p.x, y: p.y, w: b.w, h: b.h };
		if (taken.some((q) => inter(box, q, b.clear))) continue;
		const e = edit(d, 'logo');
		const x = p.x + (e.dx ?? 0) * W;
		const y = p.y + (e.dy ?? 0) * H;
		return { ...b, x, y: y + lift, top: y, my: b.my + y - b.top };
	}
	return null;
}

type FootBox = { fs: number; mid: number; l: number; r: number; left: string; right: string; rects: { id: string; box: Rect; text: string }[] };
function footBox(ctx: Ctx, d: Design, u: number, fonts: Fonts): FootBox | null {
	if (!d.foot) return null;
	const fs = d.footSize * u;
	const { l, r, b } = d.footBox;
	ctx.font = `${d.footWeight} ${fs}px ${fonts.mono}`;
	ctx.letterSpacing = '0px';
	const left = d.footLeft.trim();
	const right = d.page ? '' : d.footRight.trim();
	const rects: FootBox['rects'] = [];
	if (left && !hidden(d, 'handle')) rects.push({ id: 'handle', box: { x: l, y: b - fs, w: ctx.measureText(left).width, h: fs }, text: left });
	if (right && !hidden(d, 'footer')) {
		const w = ctx.measureText(right).width;
		rects.push({ id: 'footer', box: { x: r - w, y: b - fs, w, h: fs }, text: right });
	}
	/* The handle and the address are the brand's own, so where a platform covers one it is left out. */
	const { avoid } = frameFor(d);
	const shown = rects.filter((x) => !avoid.some((a) => inter(x.box, a, fs)));
	const has = (t: string) => shown.some((x) => x.text === t);
	return { fs, mid: b - fs * 0.5, l, r, left: left && has(left) ? left : '', right: right && has(right) ? right : '', rects: shown };
}

type PageBox = { fs: number; box: Rect; text: string };
/* A carousel's number (1/5), bottom right in the mono, inside the content's corner. */
function pageBox(ctx: Ctx, d: Design, u: number, fonts: Fonts): PageBox | null {
	if (!d.page || hidden(d, 'page')) return null;
	const fs = Math.max(floorsOf(d).small, 20 * u);
	ctx.font = `500 ${fs}px ${fonts.mono}`;
	ctx.letterSpacing = '0px';
	const w = ctx.measureText(d.page).width;
	const P = d.pad;
	const f = d.frame !== 'none' ? d.frameWidth * u * 1.4 : 0;
	const r = Math.min(P.r, frameOf(d).w - Math.max(f, 0) - 8 * u);
	const b = Math.min(P.b, frameOf(d).h - Math.max(f, 0) - 8 * u);
	return { fs, text: d.page, box: { x: r - w, y: b - fs, w, h: fs } };
}

/* The reef's outline in 24 columns, from its own picture (the Figma vectors), as rectangles on the canvas. */
let reefTops: number[] | undefined;
export function reefInkIn(reef: Image | Canvas, x0: number, foot: number, rw: number, drop: number): Rect[] {
	const R = logoDoc().reef;
	if (!reefTops) {
		const w = 240;
		const h = Math.round((w * R.h) / R.w);
		const off = scratch(w, h);
		off.ctx.drawImage(reef, 0, 0, w, h);
		const data = off.ctx.getImageData(0, 0, w, h).data;
		reefTops = [];
		for (let c = 0; c < 48; c++) {
			let top = h;
			for (let x = c * 5; x < c * 5 + 5; x++) for (let y = 0; y < top; y++) if (data[(y * w + x) * 4 + 3]! > 24) top = y;
			reefTops.push(top / h);
		}
	}
	const rh = (rw * R.h) / R.w;
	return reefTops.map((t, c) => ({ x: x0 + (rw * c) / 48, y: foot - rh + rh * (t + drop), w: rw / 48, h: rh * (1 - t - drop) })).filter((r) => r.h > 0);
}
export function reefInk(d: Design, reef: Image | Canvas, W: number, H: number): Rect[] {
	const rw = W * (d.reefScale / 100);
	return reefInkIn(reef, W * 0.5 - rw / 2, H, rw, d.reefDrop).filter((r) => r.x + r.w > 0 && r.x < W);
}

export class TooLong extends Error {}

function resolve(ctx: Ctx, d: Design, u: number, pics: Pictures, fonts: Fonts): Resolved {
	const { W, H, avoid } = frameFor(d);
	const floors = floorsOf(d);
	let logo = logoBox(ctx, d, u, fonts);
	if (logo && !layoutFor(d.template, { size: d.size, w: d.w, h: d.h }, d.seed).logo && !edit(d, 'logo').anchor) logo = freeCorner(d, logo, u, pics) ?? logo;
	const gap = 14 * u;
	const foot = footBox(ctx, d, u, fonts);
	const page = pageBox(ctx, d, u, fonts);
	let corner: Resolved['corner'] = null;
	if (d.badgeAt === 'corner' && d.badge !== 'none' && d.badgeText.trim() && !hidden(d, 'badge')) {
		const e = edit(d, 'badge');
		const fs = Math.max(floors.small, 19 * u * (d.badgeScale / 100)) * (e.scale ?? 1);
		const b = drawBadge(ctx, d, 0, 0, fs, '#000000', '', false, fonts, true, '#FFFFFF');
		corner = { x: d.badgeX * W - b.w + (e.dx ?? 0) * W, y: d.badgeY * H - b.h / 2 + (e.dy ?? 0) * H, w: b.w, h: b.h, fs };
	}
	/* The words keep to the area; what stands in it takes its room. */
	const fixed: Rect[] = avoid.map((a) => grow(a, gap));
	if (logo && !d.group) fixed.push(grow(logoRect(logo), Math.max(logo.clear, gap)));
	if (corner) fixed.push(grow(corner, gap));
	if (foot) for (const r of foot.rects) fixed.push(grow(r.box, gap));
	if (page) fixed.push(grow(page.box, gap));
	const reef = pics.get('reef');
	if (d.reef && reef && !hidden(d, 'reef')) fixed.push(...reefInk(d, reef, W, H).map((r) => ({ ...r, y: r.y - gap, h: r.h + gap })));
	const visible = hidden(d, 'art') ? [] : d.stickers.filter((s) => !s.hidden);
	const head = edit(d, 'headline');
	const align: Align = head.align ?? (head.anchor ? (head.anchor.includes('left') ? 'left' : head.anchor.includes('right') ? 'right' : 'center') : d.align);
	const moved = !!head.anchor || !!head.align;
	let area = d.area;
	if (head.anchor) {
		const I = innerOf(d, u, gap);
		area = { x: I.l, y: I.t, w: I.r - I.l, h: Math.max(1, Math.min(I.b, d.area.y + d.area.h) - I.t) };
	}
	if (head.anchor && d.pattern === 'panel' && !hidden(d, 'pattern')) fixed.push(grow(d.panel, 24 * u));
	const hasWords = d.headline.trim() || d.body.trim() || d.credit.trim() || (d.badgeAt === 'words' && d.badge !== 'none' && d.badgeText.trim());
	if (d.group && logo && hasWords) {
		/* The lockup over the words, centred together. */
		const e = edit(d, 'logo');
		if (e.anchor || e.dx || e.dy) fixed.push(grow(logoRect(logo), Math.max(logo.clear, gap)));
		else area = { ...area, y: area.y + logo.h + 34 * u, h: area.h - logo.h - 34 * u };
	}
	const nominal0 = d.textSize * u;
	const nominal = Math.max(floors.head, d.textCap > 0 ? Math.min(d.textCap, nominal0) : nominal0);

	/* The largest size the words fit a rectangle at, no smaller than the floor; null when they do not. */
	const memo = new Map<string, Block>();
	const lay = (s: number, w: number, forced?: number) => {
		const key = `${s.toFixed(2)}|${w.toFixed(1)}|${forced ?? ''}`;
		let b = memo.get(key);
		if (!b) memo.set(key, (b = layWords(ctx, d, s, w, fonts, forced)));
		return b;
	};
	const fits = (b: Block, r: Rect) => b.h <= r.h + 0.5 && b.word <= r.w + 0.5 && b.w <= r.w + 0.5;
	const fit = (r: Rect): number | null => {
		if (!fits(lay(floors.head, r.w), r)) return null;
		if (fits(lay(nominal, r.w), r)) return nominal;
		let lo = floors.head;
		let hi = nominal;
		for (let i = 0; i < 9; i++) {
			const mid = (lo + hi) / 2;
			if (fits(lay(mid, r.w), r)) lo = mid;
			else hi = mid;
		}
		return lo;
	};
	const center = d.area.x + d.area.w / 2;
	type Spot = { r: Rect; size: number; score: number };
	const spotsIn = (obstacles: Rect[]): Rect[] => {
		const out: Rect[] = [];
		for (const r of emptyRects(area, obstacles)) {
			if (align === 'center' && !head.anchor) {
				const half = Math.min(center - r.x, r.x + r.w - center);
				if (half > 1) out.push({ x: center - half, y: r.y, w: half * 2, h: r.h });
			}
			out.push(r);
		}
		return out;
	};
	const want = (b: Block, r: Rect): { x: number; y: number } => {
		const v = head.anchor ? (head.anchor.startsWith('top') ? 'top' : head.anchor.startsWith('bottom') ? 'bottom' : 'middle') : d.valign;
		const mid = Math.max(r.y, Math.min(r.y + r.h - b.h, area.y + area.h / 2 - b.h / 2));
		return { x: r.x, y: v === 'top' ? r.y : v === 'bottom' ? r.y + r.h - b.h : mid };
	};
	const rate = (r: Rect, size: number): number => {
		const b = lay(size, r.w);
		const p = want(b, r);
		const ax = align === 'left' ? area.x : align === 'right' ? area.x + area.w : head.anchor ? area.x + area.w / 2 : center;
		const px = align === 'left' ? r.x : align === 'right' ? r.x + r.w : r.x + r.w / 2;
		const v = head.anchor ? (head.anchor.startsWith('top') ? 0 : head.anchor.startsWith('bottom') ? 1 : 0.5) : d.valign === 'top' ? 0 : d.valign === 'bottom' ? 1 : 0.5;
		const off = Math.hypot((px - ax) / W, (p.y + b.h * v - (area.y + area.h * v)) / H);
		/* A stack of short lines reads worse than fewer, a little smaller. */
		const lines = b.head?.lines.length ?? 0;
		const words = plainWords(d.headline).split(' ').length;
		return size / nominal - off * 1.1 - Math.max(0, lines - Math.max(2, words / 3)) * 0.08;
	};
	const solve = (obstacles: Rect[]): Spot | null => {
		let best: Spot | null = null;
		for (const r of spotsIn(obstacles)) {
			const size = fit(r);
			if (size === null) continue;
			const score = rate(r, size);
			if (!best || score > best.score + 1e-6) best = { r, size, score };
		}
		return best;
	};

	const own = edit(d, 'art').scale;
	type Picked = { spot: Spot | null; stickers: Sticker[]; score: number; k: number; mirror: boolean };
	const clash = (list: Sticker[]) => list.some((s) => {
		if (s.onWindow) return false;
		const ink = stickerInk(s, W, H, null);
		return avoid.some((a) => inter(ink, a)) || (logo && !d.group && inter(ink, grow(logoRect(logo), logo.clear))) || (page && inter(ink, grow(page.box, gap)));
	});
	const choose = (ladder: number[], mirrors: boolean[]): Picked | null => {
		let best: Picked | null = null;
		for (const [k, mirror] of visible.length ? ladder.flatMap((k): [number, boolean][] => mirrors.map((m): [number, boolean] => [k, m])) : ([[1, false]] as [number, boolean][])) {
			const stickers = visible.map((s) => placedSticker(d, s, k, mirror));
			const bad = clash(stickers);
			if (mirror && mirrors.length > 1 && !clash(visible.map((s) => placedSticker(d, s, k, false)))) continue;
			const obstacles = [...fixed, ...stickers.filter((s) => !s.onWindow).map((s) => grow(stickerInk(s, W, H, null), gap))];
			const spot = hasWords ? solve(obstacles) : null;
			if (hasWords && !spot) continue;
			const score = (spot ? Math.min(1, spot.size / nominal / 0.9) : 1) + k * 0.45 - (bad ? 1.5 : 0) - (mirror ? 0.02 : 0) + (spot ? Math.min(0, spot.score - spot.size / nominal) * 0.6 : 0);
			if (!best || score > best.score + 1e-6) best = { spot, stickers, score, k, mirror };
			if (!hasWords && !bad) break;
		}
		return best;
	};
	const free = [1, 0.9, 0.8, 0.72, 0.64, 0.56];
	const moved2 = !!edit(d, 'art').anchor || !!edit(d, 'art').dx;
	let pickd = choose(free, moved2 ? [false] : [false, true]);
	/* An asked size is times the one it would have had. */
	const ladder = own ? [(pickd?.k ?? free[free.length - 1]!) * own] : free;
	if (own) pickd = choose(ladder, [pickd?.mirror ?? false]);
	if (!pickd) throw tooLong();
	const chosen: Picked = pickd;
	function tooLong() {
		const what = d.body.trim().length > plainWords(d.headline).length * 2 ? 'line under the headline' : 'headline';
		const key = what === 'headline' ? 'headline' : 'body';
		const obstacles = [...fixed, ...visible.map((s) => placedSticker(d, s, ladder[ladder.length - 1]!, false)).filter((s) => !s.onWindow).map((s) => grow(stickerInk(s, W, H, null), gap))];
		const words = d[key].split(/\s+/).filter(Boolean);
		const long = [...words].sort((a, b) => b.length - a.length)[0] ?? '';
		const rects = spotsIn(obstacles);
		const widest = Math.max(0, ...rects.map((r) => r.w));
		ctx.font = `${d.headWeight} ${floors.head}px ${faceOf(fonts, d.headFont)}`;
		const wide = what === 'headline' && ctx.measureText(long.replace(/\*/g, '')).width > widest;
		let n = words.length;
		const keep = d[key];
		if (!wide) {
			while (n > 0) {
				n--;
				(d as Record<string, unknown>)[key] = words.slice(0, n).join(' ').replace(/\*/g, '');
				memo.clear();
				if (rects.some((r) => fit(r) !== null)) break;
			}
			(d as Record<string, unknown>)[key] = keep;
			memo.clear();
		}
		const fitChars = words.slice(0, n).join(' ').replace(/\*/g, '').length;
		const at = d.size === 'custom' ? `${W}x${H}` : `${d.size} (${W}x${H})`;
		return new TooLong(
			wide
				? `The word "${long.replace(/\*/g, '')}" is too long for ${d.template} at ${at}: it is wider than the room for words at the smallest readable size (${Math.round(floors.head)} px). Shorten it, add a space, or use another template or size.`
				: `The ${what} is too long for ${d.template} at ${at}: ${fitChars ? `at the smallest readable size about ${fitChars} characters fit, and it has ${keep.replace(/\*/g, '').length}. Shorten it,` : 'at the smallest readable size there is no room for it under the other words. Shorten them, leave it out,'} or use another template or size.`,
		);
	}

	let placed: Placed | null = null;
	let size = nominal;
	if (chosen.spot) {
		let { r } = chosen.spot;
		size = chosen.spot.size;
		let block = lay(size, r.w);
		const scale = head.scale ?? 1;
		if (scale !== 1) {
			/* An asked size is kept as asked: the words are set again at it in the room that holds them best, and the octopus
			   gives way as far as it can. Where nothing holds them, the check says what they run into. */
			const forced = size * scale;
			let found: { r: Rect; stickers: Sticker[]; score: number } | null = null;
			let fallback: { r: Rect; stickers: Sticker[]; over: number } | null = null;
			for (const k of visible.length ? ladder : [1]) {
				const stickers = visible.map((s, i) => (own ? chosen.stickers[i]! : placedSticker(d, s, k, chosen.mirror)));
				const obstacles = [...fixed, ...stickers.filter((s) => !s.onWindow).map((s) => grow(stickerInk(s, W, H, null), gap))];
				for (const x of spotsIn(obstacles)) {
					const b = lay(size, x.w, forced);
					if (fits(b, x)) {
						const score = k * 0.3 + rate(x, size);
						if (!found || score > found.score + 1e-6) found = { r: x, stickers, score };
					} else {
						const over = Math.max(0, b.h - x.h) / H + Math.max(0, Math.max(b.w, b.word) - x.w) / W;
						if (!fallback || over < fallback.over - 1e-6) fallback = { r: x, stickers, over };
					}
				}
			}
			const use = found ?? fallback;
			if (use) {
				r = use.r;
				chosen.stickers = use.stickers;
				block = lay(size, r.w, forced);
			}
		}
		const p = want(block, r);
		let x = r.x;
		let w = r.w;
		if (moved && head.align && !head.anchor) {
			/* A new alignment keeps the block's room and sets its lines to the other side of it. */
			x = r.x;
			w = r.w;
		}
		let y = p.y;
		if (d.group && logo) {
			const e = edit(d, 'logo');
			if (!e.anchor && !e.dx && !e.dy && !head.anchor) {
				const total = logo.h + 34 * u + block.h;
				const top = Math.max(d.area.y, d.area.y + (d.area.h - total) / 2);
				const shift = top - logo.top;
				logo = { ...logo, y: logo.y + shift, top: top, my: logo.my + shift };
				y = top + logo.h + 34 * u;
				const all = { x, y, w, h: block.h };
				if (fixed.some((f) => inter(all, f))) y = p.y;
			}
		}
		const n = nudge(d, 'headline');
		placed = { block, x, y, w, align };
		size = block.size;
		void n;
	} else if (d.group && logo && !edit(d, 'logo').anchor) {
		const top = d.area.y + (d.area.h - logo.h) / 2 + (edit(d, 'logo').dy ?? 0) * H;
		const shift = top - logo.top;
		logo = { ...logo, y: logo.y + shift, top, my: logo.my + shift };
	}

	let winTop: number | null = null;
	if (d.window !== 'none' && !hidden(d, 'window')) {
		const n = nudge(d, 'headline');
		const follow = d.winFollow ? (placed ? Math.max(d.winMinTop * H, placed.y + placed.block.h + n.y + d.winGap * u) : d.winMinTop * H) : d.winY * H;
		winTop = follow + (edit(d, 'window').dy ?? 0) * H;
	}
	return { placed, logo, corner, foot, page, stickers: chosen.stickers, winTop, size };
}

/* The brand's soft shadow, scaled to a thing `w` wide: the editor's three drop shadows in the ink. */
function shadowFilter(w: number) {
	const k = w / 281.7;
	const c = (a: number) => withAlpha(brandColor('shadow'), a);
	return `drop-shadow(0 ${8 * k}px ${8.5 * k}px ${c(0.12)}) drop-shadow(0 ${31 * k}px ${15 * k}px ${c(0.1)}) drop-shadow(0 ${70 * k}px ${21 * k}px ${c(0.05)})`;
}

/* A picture: drawn into its own canvas first (rounded corners, cover or contain), so the shadow follows its shape. */
function drawItem(ctx: Ctx, s: Sticker, im: Image | Canvas | undefined, S: number, W: number, H: number, winTop: number | null, svg = false): Rect {
	const w = s.size * S;
	const own = im ? ih(im) / iw(im) : 1;
	const h = w * (s.ratio && s.ratio > 0 ? s.ratio : own);
	const cx = s.x * W;
	const cy = s.y * H + (s.onWindow && winTop !== null ? winTop : 0);
	const box = { x: cx - w / 2, y: cy - h / 2, w, h };
	if (w < 1 || h < 0.5 || !im) return box;
	const radius = s.radius ?? 0;
	const draw = () => {
		if (!radius && !s.ratio) {
			ctx.drawImage(im, -w / 2, -h / 2, w, h);
			return;
		}
		ctx.save();
		ctx.beginPath();
		ctx.roundRect(-w / 2, -h / 2, w, h, (Math.min(w, h) / 2) * (radius / 50));
		ctx.clip();
		const fit = s.fit === 'contain' ? Math.min(w / iw(im), h / ih(im)) : Math.max(w / iw(im), h / ih(im));
		const dw = iw(im) * fit;
		const dh = ih(im) * fit;
		ctx.drawImage(im, -dw / 2, -dh / 2, dw, dh);
		ctx.restore();
	};
	ctx.save();
	ctx.translate(cx, cy);
	ctx.rotate((s.rotate * Math.PI) / 180);
	if (s.flip) ctx.scale(-1, 1);
	ctx.globalAlpha = (s.opacity ?? 100) / 100;
	/* Skia's SVG backend drops a filtered draw, so an SVG keeps the picture and leaves its soft shadow out. */
	if (s.shadow && !svg) ctx.filter = shadowFilter(Math.max(w, 60));
	draw();
	ctx.restore();
	return box;
}

/* The window's own frame and what's in it: the console, or the caller's picture. */
function windowBox(d: Design, pics: Pictures, top: number): { x: number; y: number; w: number; h: number; chrome: number } {
	const { w: W } = frameOf(d);
	const e = edit(d, 'window');
	const ww = d.winW * W * (e.scale ?? 1);
	const pic = d.window === 'picture' ? pics.get('picture') : undefined;
	const ratio = d.winRatio > 0 ? d.winRatio : pic ? ih(pic) / iw(pic) : APP_H / APP_W;
	const chrome = d.winChrome ? 30 * (ww / Math.max(700, 1040 * Math.min(1, d.winW * 1.2))) : 0;
	return { x: d.winX * W - ww / 2 + (e.dx ?? 0) * W, y: top, w: ww, h: ww * ratio + chrome, chrome };
}

/* How much of a window 1040 wide shows: the whole console, or, in a narrow tall window, the mailbox and its list. */
function appView(d: Design, b: { w: number; h: number; chrome: number }): Partial<AppContent> & { width: number } {
	const ratio = (b.h - b.chrome) / b.w;
	if (ratio > 1) return { showWorkspace: false, showOpen: false, width: 378 };
	if (ratio > 0.7) return { showWorkspace: false, width: 700 };
	return { width: APP_W };
}

function drawWindow(ctx: Ctx, d: Design, u: number, pics: Pictures, icons: Icons, fonts: Fonts, line: string, box: ReturnType<typeof windowBox>, svg = false) {
	const { x, y, w: ww, h: wh, chrome } = box;
	const pic = d.window === 'picture' ? pics.get('picture') : undefined;
	const r = d.winRadius * u;
	const bg = brandColor('window');

	ctx.save();
	ctx.save();
	/* Skia's SVG backend draws a shadow with no blur, so an SVG leaves it out. */
	if (!svg) {
		ctx.shadowColor = withAlpha(brandColor('shadow'), 0.16);
		ctx.shadowBlur = 40 * u;
		ctx.shadowOffsetY = 14 * u;
	}
	ctx.fillStyle = bg;
	ctx.beginPath();
	ctx.roundRect(x, y, ww, wh, r);
	ctx.fill();
	ctx.restore();

	ctx.save();
	ctx.beginPath();
	ctx.roundRect(x, y, ww, wh, r);
	ctx.clip();
	ctx.fillStyle = bg;
	ctx.fillRect(x, y, ww, wh);
	if (chrome) {
		const k = chrome / 30;
		ctx.fillStyle = brandColor('chrome');
		ctx.fillRect(x, y, ww, chrome);
		brandColors('chromeDots').forEach((c, i) => {
			ctx.fillStyle = c;
			ctx.beginPath();
			ctx.arc(x + (16 + i * 13) * k, y + chrome / 2, 4.2 * k, 0, Math.PI * 2);
			ctx.fill();
		});
		if (d.winUrl.trim()) {
			const bw = Math.min(300 * k, ww * 0.5);
			ctx.fillStyle = brandColor('chromeUrl');
			ctx.beginPath();
			ctx.roundRect(x + ww / 2 - bw / 2, y + chrome * 0.2, bw, chrome * 0.6, chrome * 0.3);
			ctx.fill();
			ctx.fillStyle = brandColor('chromeUrlInk');
			let fs = 8.4 * k * 1.3;
			ctx.font = `400 ${fs}px ${fonts.sans}`;
			const tw = ctx.measureText(d.winUrl).width;
			if (tw > bw * 0.9) fs *= (bw * 0.9) / tw;
			ctx.font = `400 ${fs}px ${fonts.sans}`;
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillText(d.winUrl, x + ww / 2, y + chrome / 2 + 0.5 * k);
		}
		ctx.fillStyle = brandColor('chromeRule');
		ctx.fillRect(x, y + chrome - 0.6 * k, ww, 0.6 * k);
	}
	ctx.beginPath();
	ctx.rect(x, y + chrome, ww, wh - chrome);
	ctx.clip();
	if (d.window === 'app') {
		const view = appView(d, box);
		const s = ww / view.width;
		ctx.translate(x, y + chrome);
		ctx.scale(s, s);
		drawApp(ctx, { ...d.app, ...view }, icons, fonts, (pics.get('sit') as Image | undefined) ?? null);
	} else if (pic) {
		/* The whole width of the picture, from its top; a portrait one runs on and fades with the window. */
		const bh = wh - chrome;
		const cover = Math.max(ww / iw(pic), bh / ih(pic));
		const dw = iw(pic) * cover;
		ctx.drawImage(pic, x - (dw - ww) / 2, y + chrome, dw, ih(pic) * cover);
	}
	ctx.restore();

	ctx.strokeStyle = line;
	ctx.lineWidth = Math.max(0.5, u);
	ctx.beginPath();
	ctx.roundRect(x + ctx.lineWidth / 2, y + ctx.lineWidth / 2, ww - ctx.lineWidth, wh - ctx.lineWidth, r);
	ctx.stroke();
	ctx.restore();
}

/* Where a window that does not fit fades into the ground: it starts going at `from` and is gone at `to`. */
function windowFade(d: Design, u: number, box: { y: number; h: number }): { from: number; to: number } | null {
	const { H, F, inset } = frameFor(d);
	const ring = d.frame === 'none' ? 0 : d.frameWidth * u;
	const end = Math.min(H - ring, F.y + F.h) - (inset.b || ring ? 2 * u : 0);
	const room = ring || inset.b ? 0 : 28 * u;
	if (box.y + box.h <= end - Math.max(room, 10 * u)) return null;
	const from = Math.max(box.y + (end - box.y) * 0.45, end - (d.reef ? 90 : 190) * u);
	return { from, to: end };
}

/* The border round the image: a band of hatching, tile or a colour, with the inside rounded. */
function drawFrame(ctx: Ctx, d: Design, u: number, W: number, H: number, bg: string) {
	if (d.frame === 'none') return;
	const fw = d.frameWidth * u;
	const r = d.frameRadius * u;
	const tone = toneColor(d.frameTone);
	const dark = themes()[d.theme]!.dark;
	ctx.save();
	ctx.beginPath();
	ctx.rect(0, 0, W, H);
	ctx.roundRect(fw, fw, W - fw * 2, H - fw * 2, r);
	ctx.clip('evenodd');
	if (d.frame === 'solid') {
		ctx.fillStyle = tone;
		ctx.fillRect(0, 0, W, H);
	} else {
		ctx.fillStyle = bg;
		ctx.fillRect(0, 0, W, H);
		if (d.frame === 'hatch') {
			ctx.strokeStyle = tone;
			ctx.lineWidth = Math.max(0.5, u);
			hatchLines(ctx, { x: 0, y: 0, w: W, h: H }, d.hatchGap * u * 0.8, 45);
		} else if (d.frame === 'tile') {
			ctx.fillStyle = tone;
			ctx.globalAlpha = (dark ? 0.5 : 0.35) * (d.tileStrength / 100);
			tileWords(ctx, { x: 0, y: 0, w: W, h: H }, Math.max(8, d.frameWidth * 0.7), u, true);
			ctx.globalAlpha = 1;
		}
	}
	ctx.restore();
	if (d.frame !== 'solid') {
		ctx.strokeStyle = tone;
		ctx.lineWidth = Math.max(0.5, u);
		ctx.beginPath();
		ctx.roundRect(fw, fw, W - fw * 2, H - fw * 2, r);
		ctx.stroke();
	}
}

/* The reef, faded into the ground on light themes, drawn through its own canvas so the fade only covers the art. */
function drawReef(ctx: Ctx, d: Design, reef: Image | Canvas, W: number, H: number, bg: string, px: number) {
	const R = logoDoc().reef;
	const rw = W * (d.reefScale / 100);
	const rh = (rw * R.h) / R.w;
	const off = scratch(Math.max(1, Math.round(rw * px)), Math.max(1, Math.round(rh * px)));
	const o = off.ctx;
	o.drawImage(reef, 0, 0, off.canvas.width, off.canvas.height);
	if (d.reefFade > 0) {
		o.globalCompositeOperation = 'source-atop';
		o.globalAlpha = d.reefFade;
		o.fillStyle = bg;
		o.fillRect(0, 0, off.canvas.width, off.canvas.height);
	}
	ctx.drawImage(off.canvas, W * 0.5 - rw / 2, H - rh * (1 - d.reefDrop), rw, rh);
}

function drawFoot(ctx: Ctx, d: Design, f: FootBox, ink: string, fonts: Fonts) {
	ctx.save();
	ctx.fillStyle = ink;
	ctx.font = `${d.footWeight} ${f.fs}px ${fonts.mono}`;
	ctx.letterSpacing = '0px';
	ctx.textBaseline = 'middle';
	ctx.textAlign = 'left';
	if (f.left) ctx.fillText(f.left, f.l, f.mid);
	ctx.textAlign = 'right';
	if (f.right) ctx.fillText(f.right, f.r, f.mid);
	ctx.restore();
}

export type Drawn = { layers: DrawnLayer[]; text: Rect | null; logo: Rect | null; window: Rect | null; stickers: Rect[]; size: number; fade: { from: number; to: number } | null };

/* Which part of the drawing to make: an SVG draws the window on its own so a mask can fade it. */
export type Phase = 'all' | 'under' | 'window' | 'over' | 'none';

const bandStops = (g: { addColorStop(o: number, c: string): void }, color: string) => {
	g.addColorStop(0, withAlpha(color, 0));
	g.addColorStop(0.16, color);
	g.addColorStop(0.84, color);
	g.addColorStop(1, withAlpha(color, 0));
};

/*
 * Draws the design onto a context whose transform maps the design's frame onto the surface (`px` device pixels per
 * frame pixel, used for the off-screen reef and window; `svg` when the surface records SVG). Returns what it drew.
 */
export function drawDesign(ctx: Ctx, d: Design, pics: Pictures, icons: Icons, fonts: Fonts, px = 1, svg = false, move?: Motion, phase: Phase = 'all'): Drawn {
	motion = move;
	const { w: W, h: H } = frameOf(d);
	const u = unitOf(d);
	const S = Math.min(W, H);
	const C = colorsOf(d);
	const layers: DrawnLayer[] = [];
	const under = phase === 'all' || phase === 'under';
	const top = phase === 'all' || phase === 'over';
	ctx.save();
	ctx.globalAlpha = 1;
	ctx.globalCompositeOperation = 'source-over';
	ctx.letterSpacing = '0px';
	/* Everything is placed before anything is drawn, so the patterns leave the words their room. */
	const at = resolve(ctx, d, u, pics, fonts);
	ctx.restore();
	ctx.save();

	const wordsBox = at.placed ? placedBox(d, at.placed) : null;
	const clearWords: Rect[] = [];
	if (wordsBox) clearWords.push(grow(wordsBox, 10 * u));
	if (at.logo) clearWords.push(grow(logoRect(at.logo), Math.max(at.logo.clear, 8 * u)));
	if (at.page) clearWords.push(grow(at.page.box, 8 * u));

	if (under) {
		ctx.fillStyle = C.bg;
		if (!d.bare) ctx.fillRect(0, 0, W, H);
	}

	const reef = pics.get('reef');
	if (d.reef && reef && !hidden(d, 'reef')) {
		if (under) drawReef(ctx, d, reef, W, H, C.bg, px);
		const ink = reefInk(d, reef, W, H);
		layers.push({ id: 'reef', kind: 'art', box: union(ink), ink, bleeds: true, can: canOf(d, 'reef') });
	}

	/* The wordmark tile. */
	if (d.pattern !== 'none' && !hidden(d, 'pattern')) {
		const alpha = Math.min(1, C.tileAlpha * (d.tileStrength / 100));
		const ring = d.frame === 'none' ? 0 : d.frameWidth * u;
		const r: Rect = d.pattern === 'full' ? { x: ring + 14 * u, y: ring + 12 * u, w: W - 2 * ring - 28 * u, h: H - 2 * ring - 24 * u } : d.panel;
		const inner: Rect = d.pattern === 'full' ? r : { x: r.x + 10 * u, y: Math.max(r.y, 0) + 8 * u, w: r.w - 20 * u, h: Math.min(r.y + r.h, H) - Math.max(r.y, 0) - 16 * u };
		ctx.save();
		ctx.fillStyle = C.tile;
		ctx.globalAlpha = alpha;
		const words = under ? tileWords(ctx, inner, d.tileSize, u, d.tileStagger, clearWords) : [];
		ctx.restore();
		if (d.pattern === 'panel' && d.panelBorder && under) {
			ctx.strokeStyle = C.border;
			ctx.lineWidth = Math.max(1, u);
			ctx.beginPath();
			ctx.rect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
			ctx.stroke();
		}
		layers.push({ id: 'pattern', kind: 'panel', box: d.pattern === 'full' ? r : d.panel, ink: d.pattern === 'full' ? words : [{ x: r.x, y: Math.max(0, r.y), w: r.w, h: Math.min(H, r.y + r.h) - Math.max(0, r.y) }], bleeds: d.pattern === 'panel', can: canOf(d, 'pattern') });
	}

	/* The outline band: the wordmark, huge and hollow, standing on the foot, its rule through the x-height. Its ends
	   fade into the ground, so no letter is cut. */
	if (d.outline && !hidden(d, 'band')) {
		const bh = d.outlineSize * u;
		const k = bh / WM().h;
		const bw = WM().w * k;
		const gap = bh * 0.12;
		const bottom = d.outlineY * H - 0.9 * u;
		const t0 = bottom - bh;
		const oc = C.line;
		const l = d.hatch === 'sides' && !hidden(d, 'hatch') ? d.sideWidth * u : 0;
		if (under) {
			if (d.outlineFloor > 0) {
				ctx.strokeStyle = oc;
				ctx.lineWidth = Math.max(0.5, u);
				hatchLines(ctx, { x: 0, y: d.outlineFloor, w: W, h: H - d.outlineFloor }, d.hatchGap * u, 45);
				ctx.fillStyle = oc;
				ctx.fillRect(0, d.outlineFloor, W, Math.max(0.5, u));
			}
			if (d.outlineRule) {
				ctx.fillStyle = oc;
				ctx.fillRect(0, t0 + WM().xTop * k, W, Math.max(0.5, u));
			}
			let x0 = W / 2 - bw / 2 + d.outlineShift * (bw + gap);
			while (x0 > l - bw) x0 -= bw + gap;
			for (let x = x0; x < W - l; x += bw + gap) {
				ctx.save();
				ctx.beginPath();
				ctx.rect(l, 0, W - 2 * l, H);
				ctx.clip();
				ctx.translate(x, t0);
				ctx.scale(k, k);
				const grad = (color: string) => {
					const g = ctx.createLinearGradient((l - x) / k, 0, (W - l - x) / k, 0);
					bandStops(g, color);
					return g;
				};
				ctx.fillStyle = grad(C.bg);
				ctx.fill(wordmarkPath());
				ctx.strokeStyle = grad(oc);
				ctx.lineWidth = (1.3 * u) / k;
				ctx.stroke(wordmarkPath());
				ctx.restore();
			}
		}
		const rule = t0 + WM().xTop * k;
		layers.push({ id: 'band', kind: 'art', box: { x: 0, y: rule, w: W, h: H - rule }, bleeds: true, can: canOf(d, 'band') });
	}

	/* Hatching. */
	if (d.hatch !== 'none' && !hidden(d, 'hatch')) {
		const g = d.hatchGap * u;
		const hc = C.line;
		const lw = Math.max(0.5, u);
		const ink: Rect[] = [];
		ctx.strokeStyle = hc;
		ctx.lineWidth = lw;
		if (d.hatch === 'floor' || d.hatch === 'both') {
			const hy = d.hatchY * H;
			if (under) {
				ctx.fillStyle = C.bg;
				if (!d.bare) ctx.fillRect(0, hy, W, H - hy);
				hatchLines(ctx, { x: 0, y: hy, w: W, h: H - hy }, g, 45, d.hatchMirror);
				ctx.fillStyle = hc;
				ctx.fillRect(0, hy, W, lw);
			}
			ink.push({ x: 0, y: hy, w: W, h: H - hy });
		}
		if (d.hatch === 'sides' || d.hatch === 'both') {
			const sw = d.sideWidth * u;
			if (under) {
				ctx.fillStyle = C.bg;
				ctx.fillRect(0, 0, sw, H);
				ctx.fillRect(W - sw, 0, sw, H);
				ctx.strokeStyle = hc;
				hatchLines(ctx, { x: 0, y: 0, w: sw, h: H }, g, 45);
				hatchLines(ctx, { x: W - sw, y: 0, w: sw, h: H }, g, 45, true);
				ctx.fillStyle = hc;
				ctx.fillRect(sw - lw, 0, lw, H);
				ctx.fillRect(W - sw, 0, lw, H);
			}
			ink.push({ x: 0, y: 0, w: sw, h: H }, { x: W - sw, y: 0, w: sw, h: H });
		}
		layers.push({ id: 'hatch', kind: 'art', box: union(ink), ink, bleeds: true, can: canOf(d, 'hatch') });
	}

	if (d.guides && !hidden(d, 'guides')) {
		const gi = d.guideInset * u;
		const gw = Math.max(0.5, u);
		if (under) {
			ctx.fillStyle = C.line;
			ctx.fillRect(gi, 0, gw, H);
			ctx.fillRect(W - gi - gw, 0, gw, H);
		}
		const ink = [{ x: gi, y: 0, w: gw, h: H }, { x: W - gi - gw, y: 0, w: gw, h: H }];
		layers.push({ id: 'guides', kind: 'art', box: union(ink), ink, bleeds: true, can: canOf(d, 'guides') });
	}

	if (d.frame !== 'none' && !hidden(d, 'frame')) {
		if (under) drawFrame(ctx, d, u, W, H, C.bg);
		const fw = d.frameWidth * u;
		const ink = [{ x: 0, y: 0, w: W, h: fw }, { x: 0, y: H - fw, w: W, h: fw }, { x: 0, y: 0, w: fw, h: H }, { x: W - fw, y: 0, w: fw, h: H }];
		layers.push({ id: 'frame', kind: 'panel', box: { x: 0, y: 0, w: W, h: H }, ink, bleeds: true, can: canOf(d, 'frame') });
	}

	const boxes: Rect[] = [];
	const item = (s: Sticker, i: number) => {
		const cy = s.y * H + (s.onWindow && at.winTop !== null ? at.winTop : 0);
		layer(ctx, `sticker:${i}`, s.x * W, cy, () => void drawItem(ctx, s, pics.get(s.src), S, W, H, at.winTop, svg));
	};

	let win: Rect | null = null;
	let fade: Drawn['fade'] = null;
	if (at.winTop !== null && d.window !== 'none' && !hidden(d, 'window')) {
		const box = windowBox(d, pics, at.winTop);
		fade = windowFade(d, u, box);
		win = fade ? { x: box.x, y: box.y, w: box.w, h: Math.min(box.h, fade.to - box.y) } : { x: box.x, y: box.y, w: box.w, h: box.h };
		if (phase === 'all' || phase === 'window')
			layer(ctx, 'window', d.winX * W, box.y + box.h / 2, () => {
				if (!fade || svg) return drawWindow(ctx, d, u, pics, icons, fonts, C.line, box, svg);
				/* Drawn on its own and masked, so what is under it shows through as it goes. */
				const off = scratch(W * px, H * px);
				off.ctx.setTransform(px, 0, 0, px, 0, 0);
				drawWindow(off.ctx, d, u, pics, icons, fonts, C.line, box);
				off.ctx.globalCompositeOperation = 'destination-in';
				const g = off.ctx.createLinearGradient(0, fade.from, 0, fade.to);
				g.addColorStop(0, 'rgba(0, 0, 0, 1)');
				g.addColorStop(1, 'rgba(0, 0, 0, 0)');
				off.ctx.fillStyle = g;
				off.ctx.fillRect(0, 0, W, H);
				ctx.drawImage(off.canvas, 0, 0, W, H);
			});
		layers.push({ id: 'window', kind: 'picture', box: win, over: ['reef', 'guides', 'frame', 'hatch', 'pattern'], can: canOf(d, 'window') });
	}

	const behind = ['pattern', 'frame', 'window'];
	const words: DrawnLayer[] = [];
	const sink = top ? ctx : null;
	if (at.placed) {
		if (sink) drawWords(sink, d, at.placed, C, fonts, words);
		else drawWords(scratch(1, 1).ctx, d, at.placed, C, fonts, words);
	}
	for (const w of words) layers.push({ ...w, over: ['frame', ...(d.pattern === 'full' ? ['pattern'] : []), ...(d.guides ? ['guides'] : [])] });
	if (at.logo) {
		const b = at.logo;
		if (top) layer(ctx, 'lockup', b.x + b.w / 2, b.top + b.h / 2, () => drawLockup(ctx, d, b, C.ink, pics, fonts));
		layers.push({ id: 'logo', kind: 'logo', box: logoRect(b), over: ['frame', ...(d.pattern === 'full' ? ['pattern'] : [])], logo: { clear: b.clear, min: logoDoc().clear.min * u * Math.min(1, frameFor(d).F.h / (500 * u)) }, can: canOf(d, 'logo') });
		if (b.partner) layers.push({ id: 'partner', kind: 'text', box: { x: b.x + b.lw + b.gap * 2 + b.times, y: b.top, w: b.pw, h: b.h }, over: ['logo', 'frame', ...(d.pattern === 'full' ? ['pattern'] : [])], text: { ...said(d, 'partner', d.partnerName.trim(), b.partner), size: b.lh * 0.72, color: C.ink, ground: [C.bg] }, can: {} });
	}

	/* The badge on its own, its right edge at badgeX and middle at badgeY. */
	if (at.corner) {
		const c = at.corner;
		if (top) layer(ctx, 'badge', c.x + c.w / 2, c.y + c.h / 2, () => drawBadge(ctx, d, c.x, c.y, c.fs, C.ink, C.hi, C.dark, fonts, false, C.bg));
		layers.push({ ...badgeLayer(d, { x: c.x, y: c.y, w: c.w, h: c.h }, c.fs, C), over: ['frame'] });
	}
	if (at.foot) {
		const f = at.foot;
		if (top) layer(ctx, 'foot', W / 2, H, () => drawFoot(ctx, d, f, C.ink, fonts));
		for (const r of f.rects) layers.push({ id: r.id, kind: 'text', box: r.box, text: { asked: r.text, drawn: r.text, size: f.fs, color: C.ink, ground: [C.bg], own: true }, can: canOf(d, r.id) });
	}
	if (at.page) {
		const p = at.page;
		if (top) {
			ctx.font = `500 ${p.fs}px ${fonts.mono}`;
			ctx.letterSpacing = '0px';
			ctx.fillStyle = C.ink;
			ctx.textAlign = 'left';
			ctx.textBaseline = 'middle';
			ctx.fillText(p.text, p.box.x, p.box.y + p.box.h / 2);
		}
		layers.push({ id: 'page', kind: 'text', box: p.box, over: ['frame', 'hatch', 'pattern'], text: { asked: p.text, drawn: p.text, size: p.fs, color: C.ink, ground: [C.bg], own: true }, can: canOf(d, 'page') });
	}

	at.stickers.forEach((s, i) => {
		if (top) item(s, i);
		const ink = stickerInk(s, W, H, at.winTop);
		boxes.push(ink);
		layers.push({ id: at.stickers.length > 1 && i ? `art-${i + 1}` : 'art', kind: 'art', box: ink, over: [...behind, 'reef', 'band', 'hatch', 'guides'], can: canOf(d, 'art') });
	});
	ctx.restore();
	motion = undefined;
	return { layers, text: wordsBox, logo: at.logo ? logoRect(at.logo) : null, window: win, stickers: boxes, size: at.size, fade };
}

/* The words' own box, lines and all. */
function placedBox(d: Design, p: Placed): Rect {
	const n = nudge(d, 'headline');
	return { x: leftOf(p, p.block.w) + n.x, y: p.y + n.y, w: p.block.w, h: p.block.h };
}
