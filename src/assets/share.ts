import { Path2D, type Canvas, type Image } from '@napi-rs/canvas';
import { brandColor, brandColors, highlightColor, imageDoc, logoDoc, themes, toneColor, wordmarkPath } from './brand-art.js';
import { scratch, withAlpha, type Ctx, type Fonts } from './canvas.js';
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

export type Rect = { x: number; y: number; w: number; h: number };

export type Template = 'tile' | 'app' | 'outline' | 'hatch' | 'reef' | 'feature' | 'partner' | 'funding' | 'announce' | 'card';
export const TEMPLATES: Template[] = ['tile', 'app', 'outline', 'hatch', 'reef', 'feature', 'partner', 'funding', 'announce', 'card'];

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
	align: Align;
	textX: number;
	textY: number;
	textSize: number;
	textWidth: number;
	tracking: number;
	leading: number;
	bodyScale: number;
	textFit: number;
	textMiddle: boolean;
	badgeAt: 'words' | 'corner';
	badgeX: number;
	badgeY: number;
	foot: boolean;
	footLeft: string;
	footIcon: 'x' | 'linkedin' | 'none';
	footRight: string;
	logo: boolean;
	logoX: number;
	logoY: number;
	logoSize: number;
	logoAnchor: Align;
	partnerName: string;
	pattern: 'none' | 'panel' | 'full';
	panelSide: 'right' | 'left' | 'bottom';
	panelCols: number;
	panelTop: number;
	tileSize: number;
	tileStrength: number;
	tileStagger: boolean;
	panelBorder: boolean;
	outline: boolean;
	outlineSize: number;
	outlineY: number;
	outlineShift: number;
	outlineRule: boolean;
	hatch: 'none' | 'floor' | 'sides' | 'both';
	hatchY: number;
	hatchGap: number;
	sideWidth: number;
	guides: boolean;
	guideInset: number;
	reef: boolean;
	reefScale: number;
	reefFade: number;
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
	winChrome: boolean;
	winUrl: string;
	winZoom: number;
	winPanX: number;
	winPanY: number;
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

/* One unit: a pixel of the 1200 by 630 link preview, grown with the area. */
export function unitOf(d: Pick<Design, 'size' | 'w' | 'h'>) {
	const { w, h } = frameOf(d);
	return Math.sqrt((w * h) / (1200 * 630));
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

const sit = (x: number, y: number, size: number, extra: Partial<Sticker> = {}): Sticker => ({ src: 'sit', x, y, size, rotate: 0, shadow: true, auto: true, ...extra });
const hang = (x: number, y: number, size: number, onWindow = false): Sticker => ({ src: 'hang', x, y, size, rotate: 0, shadow: false, onWindow, auto: true });

const BARE = { pattern: 'none' as const, outline: false, hatch: 'none' as const, guides: false, reef: false, frame: 'none' as const, window: 'none' as const, logo: false };

/*
 * Where a template puts everything at a size: positions as shares, sizes in units. Read off the Figma frames at their
 * own sizes and kept in units, so margins stay margins at any size.
 */
export function layoutFor(t: Template, at: At): Partial<Design> {
	const { w: W, h: H } = frameOf(at);
	const u = unitOf(at);
	const S = Math.min(W, H);
	const wide = W / H >= 1.4;
	const banner = W / H >= 2.4;
	const ultra = W / H > 4;
	const tall = H / W > 1.15;
	const squareish = !wide && !tall;
	const m = (banner ? 48 : 40) * u;
	/* Banners are short: their sizes follow the height, not the area. */
	const hk = banner ? Math.min(1, H / (500 * u)) : 1;
	const fx = (px: number) => px / W;
	const fy = (px: number) => px / H;
	const lockH = LOCKUP().h;
	const lockBL = { logoX: fx(m), logoY: fy(H - m - lockH * u), logoAnchor: 'left' as const };
	const base = {
		...at,
		...BARE,
		tracking: -10,
		leading: 1,
		badgeScale: 100,
		bodyScale: 100,
		textFit: 0,
		winFollow: false,
		winGap: 40,
		textMiddle: false,
		badgeAt: 'words' as const,
		foot: false,
		headFont: 'display' as const,
		bodyFont: 'text' as const,
		badgeFont: 'text' as const,
		badgeTracking: 0,
		badgeWeight: 500,
		bodyAlpha: 78,
		bodyLeading: 1.4,
		bodyGap: 30,
		bodyWidth: 0,
		logoMarkScale: 100,
		logoMarkLift: 0,
		logoGap: 100,
	};

	switch (t) {
		case 'tile': {
			const side = tall || squareish ? 'bottom' : 'right';
			const cols = banner ? 3 : 2;
			const pw = panelWidth(cols, 51.6, u);
			const panelTop = tall ? 0.52 : squareish ? 0.5 : 0;
			return {
				...base,
				align: 'left',
				textX: fx(m),
				textY: fy(m),
				textSize: (banner ? 56 : 61.4) * hk,
				textWidth: side === 'bottom' ? 0.84 : Math.min(0.5, (W - pw - m * 3) / W),
				textFit: side === 'bottom' ? panelTop - 0.04 : banner ? 0.9 : fy(H - m - lockH * u - 24 * u),
				badge: 'pill',
				pattern: 'panel',
				panelSide: side,
				panelCols: cols,
				panelTop,
				tileSize: 51.6,
				tileStrength: 100,
				tileStagger: false,
				panelBorder: true,
				logo: !banner,
				...lockBL,
				logoSize: lockH,
				stickers: [side === 'bottom' ? sit(0.62, (panelTop + 1) / 2, tall ? 0.55 : 0.42) : sit(fx(W - m - pw / 2), 0.5, Math.min(0.568 * pw, 0.62 * H) / S)],
			};
		}
		case 'app': {
			const inset = (banner ? 120 : tall ? 40 : 80) * u;
			const winW = (W - 2 * inset) / W;
			return {
				...base,
				align: 'left',
				textX: fx(inset + 20 * u),
				textY: fy(39 * u * hk),
				textSize: (banner ? 50 : 61.4) * hk,
				textWidth: banner ? 0.45 : wide ? 0.56 : 0.6,
				textFit: banner ? 0.5 : tall ? 0.4 : 0.55,
				badge: 'pill',
				guides: true,
				guideInset: inset / u,
				reef: true,
				reefScale: tall ? 260 : 100,
				window: 'app',
				winFollow: true,
				winGap: banner ? 24 * hk : tall ? 120 : 60,
				winX: 0.5,
				winY: fy(263 * u),
				winW,
				winRatio: tall ? 1.25 : squareish ? 0.8 : APP_H / APP_W,
				winRadius: 10,
				winChrome: false,
				winZoom: tall ? 1.7 : squareish ? 1.25 : 1,
				winPanX: 0,
				winPanY: 0,
				/* Its middle sits 23 units above the window's top edge, as in Figma. */
				stickers: [hang(fx(W - inset - 127 * u * (tall ? 0.95 : 1)), -(23 * u * (tall ? 0.95 : 1) * hk) / H, ((tall ? 0.95 : 1) * 286 * u * hk) / S, true)],
			};
		}
		case 'outline': {
			const size = 188.8 * hk;
			const bottom = H + 9.84 * u * hk;
			const rule = bottom - size * u + (size * u * WM().xTop) / WM().h;
			const oct = 286 * u * hk;
			return {
				...base,
				align: ultra ? 'left' : 'center',
				textX: ultra ? fx(m * 2) : 0.5,
				textY: fy(84 * u * hk),
				textSize: (banner ? 71.5 : 66) * hk,
				textWidth: ultra ? 0.6 : banner ? 0.6 : 0.86,
				textFit: ultra ? 0.62 : fy(rule - oct * 0.42),
				badge: 'pill',
				outline: true,
				outlineSize: size,
				outlineY: fy(bottom),
				outlineShift: 0,
				outlineRule: true,
				hatch: 'sides',
				hatchGap: 19,
				sideWidth: 32,
				hatchY: 0.66,
				stickers: [hang(ultra ? 0.84 : 0.503, fy(rule - 22 * u * hk), oct / S)],
			};
		}
		case 'hatch': {
			const floor = H - 167 * u * hk;
			return {
				...base,
				align: 'right',
				textX: fx(W - 60 * u),
				textY: fy(80 * u * hk),
				textSize: (banner ? 56.2 : 61.4) * hk,
				textWidth: banner ? 0.45 : 0.62,
				textFit: fy(floor - 20 * u),
				badge: 'pill',
				hatch: 'floor',
				hatchY: fy(floor),
				hatchGap: 19,
				sideWidth: 32,
				stickers: [hang(fx(W - 143 * u * hk), fy(floor - 23 * u * hk), (286 * u * hk) / S)],
			};
		}
		case 'reef': {
			const oct = banner ? 0.42 * H : (tall ? 0.52 : 0.4) * S;
			const cy = banner ? 0.62 : 0.6;
			return {
				...base,
				align: ultra ? 'left' : 'center',
				textX: ultra ? fx(m * 2) : 0.5,
				textY: fy(banner ? 50 * u * hk : tall ? 140 * u : 70 * u),
				textSize: (banner ? 54 : 66) * hk,
				textWidth: banner ? 0.6 : 0.84,
				textFit: ultra ? 0.85 : cy - (oct * 0.42) / H,
				badge: 'pill',
				reef: true,
				reefScale: banner ? 100 : tall ? 260 : 120,
				logo: !banner,
				...lockBL,
				logoSize: lockH,
				stickers: [sit(ultra ? 0.84 : 0.5, cy, oct / S)],
			};
		}
		case 'feature': {
			const fw = tall ? 26 : 22;
			return {
				...base,
				align: 'center',
				textX: 0.5,
				textY: fy(fw * u + (tall ? 120 : banner ? 30 * hk : 64) * u),
				textSize: (tall ? 74 : wide ? 54 : 64) * hk,
				textWidth: banner ? 0.6 : 0.82,
				textFit: banner ? 0.6 : tall ? 0.42 : 0.5,
				badge: 'pill',
				frame: 'hatch',
				frameWidth: fw * hk,
				frameRadius: 18 * hk,
				frameTone: 'lilac',
				window: 'app',
				winFollow: true,
				winGap: (tall ? 90 : banner ? 20 : 44) * hk,
				winX: 0.5,
				winY: 0.42,
				winW: tall ? 0.92 : banner ? 0.6 : wide ? 0.78 : 0.9,
				winRatio: tall ? 1.3 : APP_H / APP_W,
				winRadius: 12,
				winChrome: true,
				winZoom: tall ? 1.55 : 1.15,
				winPanX: tall ? 0.18 : 0,
				winPanY: 0,
				stickers: [],
			};
		}
		case 'partner':
			return {
				...base,
				align: 'center',
				textX: 0.5,
				textY: banner ? 0.5 : tall ? 0.52 : 0.5,
				textSize: (tall ? 70 : wide ? 52 : 60) * hk,
				textWidth: 0.8,
				textFit: 0.94,
				badge: 'pill',
				pattern: 'full',
				panelSide: 'right',
				panelCols: 2,
				panelTop: 0,
				tileSize: 51.6 * hk,
				tileStrength: 55,
				tileStagger: true,
				panelBorder: false,
				frame: 'line',
				frameWidth: 30 * hk,
				frameRadius: 20 * hk,
				frameTone: 'lilac',
				logo: true,
				logoSize: 60 * hk,
				logoX: 0.5,
				logoY: banner ? 0.18 : tall ? 0.36 : wide ? 0.25 : 0.3,
				logoAnchor: 'center',
				stickers: [],
			};
		case 'funding': {
			const oct = (tall ? 380 : 300) * u * hk;
			const octY = H - (banner ? 120 : 160) * u * hk;
			return {
				...base,
				align: ultra ? 'left' : 'center',
				textX: ultra ? fx(m * 2) : 0.5,
				textY: fy((tall ? 200 : banner ? 40 : 70) * u * hk),
				textSize: (tall ? 120 : banner ? 64 : wide ? 88 : 96) * hk,
				textWidth: ultra ? 0.6 : 0.86,
				textFit: ultra ? 0.9 : fy(octY - oct * 0.4),
				badge: 'pill',
				badgeScale: 130,
				outline: true,
				outlineSize: 188.8 * hk,
				outlineY: fy(H + 9.84 * u * hk),
				outlineShift: 0.2,
				outlineRule: true,
				hatch: 'sides',
				hatchGap: 19,
				sideWidth: 32,
				hatchY: 0.66,
				stickers: [hang(ultra ? 0.84 : 0.5, fy(octY), oct / S)],
			};
		}
		case 'announce': {
			const inner = m + 34 * u * hk;
			return {
				...base,
				align: 'left',
				textX: fx(inner),
				textY: fy(inner + (banner ? 10 : 70) * u * hk),
				textSize: (tall ? 96 : banner ? 56 : wide ? 72 : 76) * hk,
				textWidth: banner ? 0.6 : 0.78,
				textFit: banner ? 0.86 : fy(H - inner - lockH * u - 40 * u),
				badge: 'dot',
				frame: 'solid',
				frameWidth: 34 * hk,
				frameRadius: 26 * hk,
				frameTone: 'purple',
				logo: true,
				logoX: banner ? fx(W - inner) : fx(inner),
				logoY: banner ? fy(inner) : fy(H - inner - lockH * u),
				logoAnchor: banner ? 'right' : 'left',
				logoSize: lockH * hk,
				stickers: ultra ? [] : [sit(fx(W - inner - 0.16 * S), fy(H - inner - 0.12 * S), banner ? 0.42 : 0.32)],
			};
		}
		case 'card': {
			/* The new-feature card, measured off a 1200 by 1200 post: the lockup top left, a solid pill top right, the
			   words centred between them, and a mono footer. `q` turns those pixels into this size's. */
			const mm = Math.min(71 * u, 0.09 * S);
			const q = mm / 98;
			const px = (n: number) => (n * q) / u;
			const logoH = 82 * q;
			const footH = 28 * q;
			const top = mm + logoH + 40 * q;
			const bottom = H - mm - footH - 40 * q;
			return {
				...base,
				align: 'left',
				textX: fx(mm),
				textY: fy((top + bottom) / 2 - 4 * q),
				textMiddle: true,
				textSize: px(112),
				textWidth: (W - 2 * mm) / W,
				textFit: Math.max(0.2, (bottom - top) / H),
				tracking: -28,
				leading: 1.036,
				headFont: 'plex',
				headWeight: 600,
				bodyFont: 'plex',
				bodyWeight: 400,
				bodyScale: 111,
				bodyLeading: 1.41,
				bodyGap: 37,
				bodyAlpha: 100,
				bodyWidth: banner ? 0 : (0.876 * (W - 2 * mm)) / W,
				badge: 'solid',
				badgeAt: 'corner',
				badgeX: fx(W - mm),
				badgeY: fy(mm + 41 * q),
				badgeScale: (100 * 26 * q) / (19 * u),
				badgeFont: 'mono',
				badgeWeight: 600,
				badgeTracking: 80,
				logo: true,
				logoX: fx(mm),
				logoY: fy(mm + 22 * q),
				logoAnchor: 'left',
				logoSize: px(68.7),
				logoMark: true,
				logoWord: true,
				logoMarkScale: 117,
				logoMarkLift: 21.8,
				logoGap: 76,
				foot: true,
				footSize: px(28),
				footInset: px(98),
				stickers: [],
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
		badge: (s.badge as BadgeStyle) ?? 'pill',
		badgeText: s.badgeText ?? '',
		badgeScale: 100,
		headline: s.headline ?? '',
		body: '',
		credit: '',
		align: 'left',
		textX: 0.033,
		textY: 0.064,
		textSize: 61.4,
		textWidth: 0.47,
		tracking: -10,
		leading: 1,
		bodyScale: 100,
		textFit: 0,
		textMiddle: false,
		badgeAt: 'words',
		badgeX: 0.95,
		badgeY: 0.08,
		foot: false,
		footLeft: s.footLeft ?? '',
		footIcon: (s.footIcon as Design['footIcon']) ?? 'none',
		footRight: s.footRight ?? '',
		logo: true,
		logoX: 0.033,
		logoY: 0.863,
		logoSize: 46.08,
		logoAnchor: 'left',
		partnerName: '',
		pattern: 'none',
		panelSide: 'right',
		panelCols: 2,
		panelTop: 0,
		tileSize: 51.6,
		tileStrength: 100,
		tileStagger: false,
		panelBorder: true,
		outline: false,
		outlineSize: 188.8,
		outlineY: 1.02,
		outlineShift: 0,
		outlineRule: true,
		hatch: 'none',
		hatchY: 0.66,
		hatchGap: 19,
		sideWidth: 32,
		guides: false,
		guideInset: 80,
		reef: false,
		reefScale: 100,
		reefFade: themes().paper!.reefFade,
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
		winChrome: false,
		winUrl: s.winUrl ?? '',
		winZoom: 1,
		winPanX: 0,
		winPanY: 0,
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
	};
}

/* --------------------------------------------------------------- words */

type Word = { text: string; hi: boolean; space: boolean };

/* "*AI agent*" highlights; a line break starts a new line; "\*" is a star to show. */
const STAR = '\u0000';
function parseLine(line: string): Word[] {
	const out: Word[] = [];
	let hi = false;
	line = line.replaceAll('\\*', STAR);
	for (const [i, chunk] of line.split('*').entries()) {
		if (i > 0) hi = !hi;
		for (const b of chunk.split(/(\s+)/)) {
			if (!b) continue;
			if (/^\s+$/.test(b)) {
				if (out.length) out[out.length - 1]!.space = true;
			} else out.push({ text: b.replaceAll(STAR, '*'), hi, space: false });
		}
	}
	return out;
}

function wrapWords(ctx: Ctx, words: Word[], max: number) {
	const space = ctx.measureText(' ').width;
	const lines: { words: Word[]; w: number }[] = [];
	let cur: Word[] = [];
	let w = 0;
	for (const wd of words) {
		const ww = ctx.measureText(wd.text).width;
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
	if (cur.length || !lines.length) lines.push({ words: cur, w });
	return lines;
}

function plainLines(ctx: Ctx, s: string, max: number) {
	return s
		.split('\n')
		.flatMap((l) => wrapWords(ctx, parseLine(l), max))
		.map((l) => ({ text: l.words.map((w) => w.text).join(' '), w: l.w }));
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
	return { bg: t.bg, ink: t.ink, line: t.line, tile: t.tile, border: t.border, hi: highlightColor(d.highlight), dark: t.dark, tileAlpha: t.tileAlpha };
}

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

export function tileWords(ctx: Ctx, r: Rect, tile: number, u: number, stagger: boolean, startX: number, startY: number) {
	const th = tile * u;
	const k = th / WM().h;
	const tw = WM().w * k;
	const gx = th * (18.43 / 51.61);
	const gy = th * (10 / 51.61);
	const path = wordmarkPath();
	ctx.save();
	ctx.beginPath();
	ctx.rect(r.x, r.y, r.w, r.h);
	ctx.clip();
	let row = 0;
	for (let y = startY; y < r.y + r.h; y += th + gy, row++) {
		const off = stagger && row % 2 ? (tw + gx) / 2 : 0;
		let x = startX - off;
		while (x > r.x) x -= tw + gx;
		for (; x < r.x + r.w; x += tw + gx) {
			ctx.save();
			ctx.translate(x, y);
			ctx.scale(k, k);
			ctx.fill(path);
			ctx.restore();
		}
	}
	ctx.restore();
}

function drawLockup(ctx: Ctx, d: Design, u: number, ink: string, pics: Pictures, fonts: Fonts): Rect | null {
	if (!d.logo || (!d.logoMark && !d.logoWord)) return null;
	const L = LOCKUP();
	const { w: W, h: H } = frameOf(d);
	const k = (d.logoSize * u) / L.h;
	const color = ink;
	const ms = (d.logoMarkScale ?? 100) / 100;
	const markW = d.logoMark ? L.mark.w * k * ms : 0;
	const wordGap = d.logoMark && d.logoWord ? (L.word.x - L.mark.w) * k * (d.logoGap / 100) : 0;
	const wordW = d.logoWord ? L.word.w * k : 0;
	const lw = markW + wordGap + wordW;
	const lh = L.h * k;
	/* With a partner, the row is: lockup  ×  partner (a name; never another company's logo). */
	const pname = d.partnerName.trim();
	const hasPartner = !!pname;
	const gap = 26 * k;
	const times = 16 * k;
	let pw = 0;
	if (pname) {
		ctx.font = `600 ${lh * 0.72}px ${fonts.sans}`;
		ctx.letterSpacing = '0px';
		pw = ctx.measureText(pname).width;
	}
	const total = hasPartner ? lw + gap * 2 + times + pw : lw;
	const x = d.logoAnchor === 'left' ? d.logoX * W : d.logoAnchor === 'center' ? d.logoX * W - total / 2 : d.logoX * W - total;
	const y = d.logoY * H;
	const mark = pics.get('sit');
	const mh = L.mark.h * k * ms;
	const my = y + lh / 2 - mh / 2 - ((d.logoMarkLift ?? 0) / 100) * lh;
	if (d.logoMark && mark) ctx.drawImage(mark, x, my, markW, mh);
	if (d.logoWord) {
		ctx.save();
		ctx.translate(x + markW + wordGap, y + L.word.y * k);
		ctx.scale(k, k);
		ctx.fillStyle = color;
		ctx.fill(wordmarkPath());
		ctx.restore();
	}
	if (hasPartner) {
		let px = x + lw + gap;
		const cy = y + lh / 2;
		const cx = px + times / 2;
		ctx.strokeStyle = color;
		ctx.globalAlpha = 0.55;
		ctx.lineWidth = 2.2 * k;
		ctx.lineCap = 'round';
		ctx.beginPath();
		ctx.moveTo(cx - times / 2, cy - times / 2);
		ctx.lineTo(cx + times / 2, cy + times / 2);
		ctx.moveTo(cx + times / 2, cy - times / 2);
		ctx.lineTo(cx - times / 2, cy + times / 2);
		ctx.stroke();
		ctx.globalAlpha = 1;
		px = cx + times / 2 + gap;
		ctx.fillStyle = color;
		ctx.textBaseline = 'middle';
		ctx.textAlign = 'left';
		ctx.font = `600 ${lh * 0.72}px ${fonts.sans}`;
		ctx.fillText(pname, px, cy + lh * 0.03);
	}
	const top = d.logoMark ? Math.min(y, my) : y;
	const bottom = d.logoMark ? Math.max(y + lh, my + mh) : y + lh;
	return { x, y: top, w: total, h: bottom - top };
}

function drawBadge(ctx: Ctx, d: Design, x: number, y: number, size: number, ink: string, hi: string, dark: boolean, fonts: Fonts, measureOnly: boolean, bg: string) {
	if (d.badge === 'none' || !d.badgeText.trim()) return { w: 0, h: 0 };
	const fs = size;
	const sq = fs * 1.2857;
	const wordInk = d.badge === 'solid' ? bg : ink;
	const face = faceOf(fonts, d.badgeFont);
	const track = (d.badgeTracking / 1000) * fs;
	ctx.font = `${d.badgeWeight} ${fs}px ${face}`;
	ctx.letterSpacing = `${track}px`;
	/* Letter spacing trails the last letter too; it isn't part of the words. */
	const tw = ctx.measureText(d.badgeText).width - (track > 0 ? track : 0);
	ctx.letterSpacing = '0px';
	const words = (x: number, y: number) => {
		ctx.font = `${d.badgeWeight} ${fs}px ${face}`;
		ctx.letterSpacing = `${track}px`;
		ctx.fillStyle = wordInk;
		ctx.textBaseline = 'middle';
		ctx.textAlign = 'left';
		ctx.fillText(d.badgeText, x, y + fs * 0.04);
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
			ctx.fillStyle = dark ? brandColor('pillFillDark') : brandColor('pillFill');
			ctx.strokeStyle = dark ? brandColor('pillStrokeDark') : brandColor('pillStroke');
			ctx.lineWidth = Math.max(1, fs * 0.06);
			ctx.beginPath();
			ctx.roundRect(x, y, w, h, h / 2);
			ctx.fill();
			ctx.stroke();
			ctx.fillStyle = hi || brandColor('pink');
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
		ctx.fillStyle = hi || brandColor('pink');
		ctx.beginPath();
		ctx.arc(x + r, y + sq / 2, r, 0, Math.PI * 2);
		ctx.fill();
		words(x + r * 2 + fs * 0.55, y + sq / 2);
	}
	return { w, h: sq };
}

function drawWords(ctx: Ctx, d: Design, size: number, ink: string, hiColor: string, dark: boolean, fonts: Fonts, dry = false): Rect {
	const { w: W, h: H } = frameOf(d);
	const maxW = d.textWidth * W;
	const lh = d.leading;
	const ax = d.textX * W;
	let y = d.textY * H;
	const top = y;
	const xFor = (w: number) => (d.align === 'left' ? ax : d.align === 'center' ? ax - w / 2 : ax - w);

	/* The badge, then the headline, then the line under it. */
	const badgeSize = size * 0.3046 * (d.badgeScale / 100);
	const bg = colorsOf(d).bg;
	const b = d.badgeAt === 'corner' ? { w: 0, h: 0 } : drawBadge(ctx, d, 0, 0, badgeSize, ink, hiColor, dark, fonts, true, bg);
	let widest = b.w;
	if (b.w) {
		if (!dry) layer(ctx, 'badge', xFor(b.w) + b.w / 2, y + b.h / 2, () => drawBadge(ctx, d, xFor(b.w), y, badgeSize, ink, hiColor, dark, fonts, false, bg));
		y += b.h + size * (d.badgeGap / 100);
	}

	const headInk = ink;
	ctx.font = `${d.headWeight} ${size}px ${faceOf(fonts, d.headFont)}`;
	ctx.letterSpacing = `${(d.tracking / 1000) * size}px`;
	ctx.textAlign = 'left';
	ctx.textBaseline = 'alphabetic';
	const hi = hiColor || headInk;
	const lines = d.headline.split('\n').flatMap((l) => wrapWords(ctx, parseLine(l), maxW));
	const space = ctx.measureText(' ').width;
	lines.forEach((line, li) => {
		let x = xFor(line.w);
		widest = Math.max(widest, line.w);
		if (!dry) {
			const base = baselineIn(ctx, y, size, lh);
			layer(ctx, `line:${li}`, x + line.w / 2, y + (size * lh) / 2, () =>
				line.words.forEach((wd, i) => {
					const ww = ctx.measureText(wd.text).width;
					ctx.fillStyle = wd.hi ? hi : headInk;
					ctx.fillText(wd.text, x, base);
					x += ww + (i < line.words.length - 1 ? space : 0);
				}),
			);
		}
		y += size * lh;
	});
	ctx.letterSpacing = '0px';

	if (d.body.trim()) {
		const bs = size * 0.34 * (d.bodyScale / 100);
		const bw = d.bodyWidth > 0 ? d.bodyWidth * W : maxW;
		y += size * (d.bodyGap / 100);
		ctx.font = `${d.bodyWeight} ${bs}px ${faceOf(fonts, d.bodyFont)}`;
		ctx.fillStyle = ink;
		ctx.globalAlpha = d.bodyAlpha / 100;
		for (const l of plainLines(ctx, d.body, bw)) {
			widest = Math.max(widest, l.w);
			if (!dry) layer(ctx, 'body', xFor(l.w) + l.w / 2, y, () => ctx.fillText(l.text, xFor(l.w), baselineIn(ctx, y, bs, d.bodyLeading)));
			y += bs * d.bodyLeading;
		}
		ctx.globalAlpha = 1;
	}

	/* A credit, smaller than the line under the headline, so a name never competes with the post. */
	const credit = (d.credit ?? '').trim();
	const plainHead = d.headline.replace(/\*/g, '').replace(/\s+/g, ' ').trim();
	if (credit && credit.toLowerCase() !== plainHead.toLowerCase()) {
		const cs = Math.max(11, size * 0.2);
		y += size * (d.body.trim() ? 0.12 : 0.2);
		ctx.font = `500 ${cs}px ${faceOf(fonts, d.bodyFont)}`;
		ctx.fillStyle = ink;
		ctx.globalAlpha = 0.72;
		const cw = d.bodyWidth > 0 ? d.bodyWidth * W : maxW;
		for (const l of plainLines(ctx, credit, cw)) {
			widest = Math.max(widest, l.w);
			if (!dry) layer(ctx, 'credit', xFor(l.w) + l.w / 2, y, () => ctx.fillText(l.text, xFor(l.w), baselineIn(ctx, y, cs, 1.15)));
			y += cs * 1.15;
		}
		ctx.globalAlpha = 1;
	}
	return { x: xFor(widest), y: top, w: widest, h: y - top };
}

/* The text size that keeps the words above `textFit`, never below 40% of the size asked for. */
function fittedSize(ctx: Ctx, d: Design, u: number, fonts: Fonts) {
	const H = frameOf(d).h;
	let size = d.textSize * u;
	if (d.textFit <= 0) return size;
	const limit = d.textMiddle ? d.textFit * H : d.textFit * H - d.textY * H;
	if (limit <= 0) return size * 0.4;
	for (let i = 0; i < 6; i++) {
		const r = drawWords(ctx, d, size, '#000', '', false, fonts, true);
		if (r.h <= limit + 0.5) break;
		size = Math.max(d.textSize * u * 0.4, size * Math.max(0.6, Math.min(0.98, limit / r.h)));
	}
	return size;
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
function drawWindow(ctx: Ctx, d: Design, u: number, pics: Pictures, icons: Icons, fonts: Fonts, line: string, top: number): Rect | null {
	if (d.window === 'none') return null;
	const { w: W } = frameOf(d);
	const ww = d.winW * W;
	const pic = d.window === 'picture' ? pics.get('picture') : undefined;
	const ratio = d.winRatio > 0 ? d.winRatio : pic ? ih(pic) / iw(pic) : APP_H / APP_W;
	const chrome = d.winChrome ? 30 * (ww / 1040) : 0;
	const wh = ww * ratio + chrome;
	const x = d.winX * W - ww / 2;
	const y = top;
	const r = d.winRadius * u;
	const bg = brandColor('window');

	ctx.save();
	ctx.save();
	ctx.shadowColor = withAlpha(brandColor('shadow'), 0.16);
	ctx.shadowBlur = 40 * u;
	ctx.shadowOffsetY = 14 * u;
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
		const k = ww / 1040;
		ctx.fillStyle = brandColor('chrome');
		ctx.fillRect(x, y, ww, chrome);
		brandColors('chromeDots').forEach((c, i) => {
			ctx.fillStyle = c;
			ctx.beginPath();
			ctx.arc(x + (16 + i * 13) * k, y + chrome / 2, 4.2 * k, 0, Math.PI * 2);
			ctx.fill();
		});
		if (d.winUrl.trim()) {
			const bw = Math.min(300 * k, ww * 0.4);
			ctx.fillStyle = brandColor('chromeUrl');
			ctx.beginPath();
			ctx.roundRect(x + ww / 2 - bw / 2, y + chrome * 0.2, bw, chrome * 0.6, chrome * 0.3);
			ctx.fill();
			ctx.fillStyle = brandColor('chromeUrlInk');
			ctx.font = `400 ${8.4 * k}px ${fonts.sans}`;
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
	const zoom = Math.max(0.3, d.winZoom);
	if (d.window === 'app') {
		const s = (ww / APP_W) * zoom;
		const vw = ww / s;
		const vh = (wh - chrome) / s;
		const ox = (APP_W - vw) * d.winPanX * (vw < APP_W ? 1 : 0);
		const oy = Math.max(0, APP_H - vh) * d.winPanY;
		ctx.translate(x, y + chrome);
		ctx.scale(s, s);
		ctx.translate(-ox, -oy);
		drawApp(ctx, d.app, icons, fonts, (pics.get('sit') as Image | undefined) ?? null);
	} else if (pic) {
		const bw = ww;
		const bh = wh - chrome;
		const cover = Math.max(bw / iw(pic), bh / ih(pic)) * zoom;
		const dw = iw(pic) * cover;
		const dh = ih(pic) * cover;
		ctx.drawImage(pic, x - (dw - bw) * d.winPanX, y + chrome - (dh - bh) * d.winPanY, dw, dh);
	} else {
		ctx.fillStyle = brandColor('windowEmpty');
		ctx.fillRect(x, y + chrome, ww, wh - chrome);
	}
	ctx.restore();

	ctx.strokeStyle = line;
	ctx.lineWidth = Math.max(0.5, u);
	ctx.beginPath();
	ctx.roundRect(x + ctx.lineWidth / 2, y + ctx.lineWidth / 2, ww - ctx.lineWidth, wh - ctx.lineWidth, r);
	ctx.stroke();
	ctx.restore();
	return { x, y, w: ww, h: wh };
}

/* Where the window's top edge is: under the words, or where it was put. */
export function windowTop(d: Design, words: Rect, u: number) {
	return d.winFollow ? words.y + words.h + d.winGap * u : d.winY * frameOf(d).h;
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
			tileWords(ctx, { x: 0, y: 0, w: W, h: H }, Math.max(8, d.frameWidth * 0.7), u, true, 0, fw * 0.15);
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

/* The X and LinkedIn marks the footer's handle sits after, on a 24 by 24 box. */
const FOOT_ICONS = {
	x: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
	linkedin:
		'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0 4.125zM7.114 20.452H3.558V9h3.556v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
};

function drawFoot(ctx: Ctx, d: Design, u: number, W: number, H: number, ink: string, fonts: Fonts) {
	const fs = d.footSize * u;
	const inset = d.footInset * u;
	const mid = H - inset - fs * 0.5;
	ctx.save();
	ctx.fillStyle = ink;
	ctx.font = `${d.footWeight} ${fs}px ${fonts.mono}`;
	ctx.letterSpacing = '0px';
	ctx.textBaseline = 'middle';
	let x = inset;
	if (d.footIcon !== 'none' && d.footLeft.trim()) {
		const ih = fs * 0.98;
		ctx.save();
		ctx.translate(x, mid - ih / 2);
		ctx.scale(ih / 24, ih / 24);
		ctx.fill(new Path2D(FOOT_ICONS[d.footIcon]));
		ctx.restore();
		x += ih * 0.95 + fs * 0.42;
	}
	ctx.textAlign = 'left';
	if (d.footLeft.trim()) ctx.fillText(d.footLeft, x, mid);
	ctx.textAlign = 'right';
	if (d.footRight.trim()) ctx.fillText(d.footRight, W - inset, mid);
	ctx.restore();
}

export type Drawn = { text: Rect; logo: Rect | null; window: Rect | null; stickers: Rect[] };

/* The reef, faded into the ground on light themes, drawn through its own canvas so the fade only covers the art. */
function drawReef(ctx: Ctx, d: Design, reef: Image | Canvas, W: number, H: number, u: number, bg: string, px: number) {
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
	ctx.drawImage(off.canvas, W * 0.5 - rw / 2, H - rh, rw, rh);
	void u;
}

/*
 * Draws the design onto a context whose transform maps the design's frame onto the surface (`px` device pixels per
 * frame pixel, used for the off-screen reef; `svg` when the surface records SVG).
 */
export function drawDesign(ctx: Ctx, d: Design, pics: Pictures, icons: Icons, fonts: Fonts, px = 1, svg = false, move?: Motion): Drawn {
	motion = move;
	const { w: W, h: H } = frameOf(d);
	const u = unitOf(d);
	const S = Math.min(W, H);
	const C = colorsOf(d);
	ctx.globalAlpha = 1;
	ctx.globalCompositeOperation = 'source-over';
	ctx.letterSpacing = '0px';

	ctx.save();
	ctx.fillStyle = C.bg;
	if (!d.bare) ctx.fillRect(0, 0, W, H);

	const reef = pics.get('reef');
	if (d.reef && reef) drawReef(ctx, d, reef, W, H, u, C.bg, px);

	/* The wordmark tile. */
	if (d.pattern !== 'none') {
		const alpha = Math.min(1, C.tileAlpha * (d.tileStrength / 100));
		const th = d.tileSize * u;
		if (d.pattern === 'full') {
			ctx.fillStyle = C.tile;
			ctx.globalAlpha = alpha;
			tileWords(ctx, { x: 0, y: 0, w: W, h: H }, d.tileSize, u, d.tileStagger, 0, -th * 0.4);
		} else {
			let r: Rect;
			const m = 40 * u;
			if (d.panelSide === 'bottom') {
				const top = d.panelTop * H;
				r = { x: m, y: top, w: W - 2 * m, h: H - top + 2 - m };
			} else {
				const pw = panelWidth(d.panelCols, d.tileSize, u);
				r = { x: d.panelSide === 'right' ? W - m - pw : m, y: -22 * u, w: pw, h: H + 44 * u };
			}
			ctx.save();
			ctx.beginPath();
			ctx.rect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
			ctx.clip();
			ctx.fillStyle = C.tile;
			ctx.globalAlpha = alpha;
			tileWords(ctx, r, d.tileSize, u, d.tileStagger, r.x + 13 * u, r.y + 1 * u);
			ctx.restore();
			ctx.globalAlpha = 1;
			if (d.panelBorder) {
				ctx.strokeStyle = C.border;
				ctx.lineWidth = Math.max(1, u);
				ctx.beginPath();
				ctx.rect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
				ctx.stroke();
			}
		}
		ctx.globalAlpha = 1;
	}

	/* The outline band: the wordmark, huge and hollow, sitting on a rule. */
	if (d.outline) {
		const bh = d.outlineSize * u;
		const k = bh / WM().h;
		const bw = WM().w * k;
		const gap = bh * 0.12;
		const bottom = d.outlineY * H;
		const top = bottom - bh;
		const oc = C.line;
		if (d.outlineRule) {
			ctx.fillStyle = oc;
			ctx.fillRect(0, top + WM().xTop * k, W, Math.max(0.5, u));
		}
		let x0 = W / 2 - bw / 2 + d.outlineShift * (bw + gap);
		while (x0 > -bw) x0 -= bw + gap;
		for (let x = x0; x < W; x += bw + gap) {
			ctx.save();
			ctx.translate(x, top);
			ctx.scale(k, k);
			ctx.fillStyle = C.bg;
			ctx.fill(wordmarkPath());
			ctx.strokeStyle = oc;
			ctx.lineWidth = (1.3 * u) / k;
			ctx.stroke(wordmarkPath());
			ctx.restore();
		}
	}

	/* Hatching. */
	if (d.hatch !== 'none') {
		const g = d.hatchGap * u;
		const hc = C.line;
		const lw = Math.max(0.5, u);
		ctx.strokeStyle = hc;
		ctx.lineWidth = lw;
		if (d.hatch === 'floor' || d.hatch === 'both') {
			const hy = d.hatchY * H;
			ctx.fillStyle = C.bg;
			ctx.fillRect(0, hy, W, H - hy);
			hatchLines(ctx, { x: 0, y: hy, w: W, h: H - hy }, g, 45);
			ctx.fillStyle = hc;
			ctx.fillRect(0, hy, W, lw);
		}
		if (d.hatch === 'sides' || d.hatch === 'both') {
			const sw = d.sideWidth * u;
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
	}

	if (d.guides) {
		const gi = d.guideInset * u;
		const gw = Math.max(0.5, u);
		ctx.fillStyle = C.line;
		ctx.fillRect(gi, 0, gw, H);
		ctx.fillRect(W - gi - gw, 0, gw, H);
	}

	drawFrame(ctx, d, u, W, H, C.bg);

	/* The words are laid out first: the window can follow them, and the octopi on the window follow it. */
	const size = fittedSize(ctx, d, u, fonts);
	let laid = drawWords(ctx, d, size, C.ink, C.hi, C.dark, fonts, true);
	/* Centred words: Down is their middle, wherever they end. */
	const dw = d.textMiddle ? { ...d, textY: d.textY - laid.h / 2 / H } : d;
	if (d.textMiddle) laid = drawWords(ctx, dw, size, C.ink, C.hi, C.dark, fonts, true);
	const winTop = d.window === 'none' ? null : windowTop(d, laid, u);

	const boxes: Rect[] = new Array(d.stickers.length);
	const item = (s: Sticker, i: number) => {
		let box: Rect = { x: 0, y: 0, w: 0, h: 0 };
		const cy = s.y * H + (s.onWindow && winTop !== null ? winTop : 0);
		layer(ctx, `sticker:${i}`, s.x * W, cy, () => (box = drawItem(ctx, s, pics.get(s.src), S, W, H, winTop, svg)));
		return box;
	};
	d.stickers.forEach((s, i) => {
		if (s.behind && !s.hidden) boxes[i] = item(s, i);
	});

	let win: Rect | null = null;
	if (winTop !== null) layer(ctx, 'window', d.winX * W, winTop + (d.winW * W * (d.winRatio || APP_H / APP_W)) / 2, () => (win = drawWindow(ctx, dw, u, pics, icons, fonts, C.line, winTop)));
	const text = drawWords(ctx, dw, size, C.ink, C.hi, C.dark, fonts);
	let logo: Rect | null = null;
	layer(ctx, 'lockup', d.logoX * W, d.logoY * H, () => (logo = drawLockup(ctx, d, u, C.ink, pics, fonts)));

	/* The badge on its own, its right edge at badgeX and middle at badgeY. */
	if (d.badgeAt === 'corner') {
		const fs = 19 * u * (d.badgeScale / 100);
		const b = drawBadge(ctx, d, 0, 0, fs, C.ink, C.hi, C.dark, fonts, true, C.bg);
		if (b.w) layer(ctx, 'badge', d.badgeX * W - b.w / 2, d.badgeY * H, () => drawBadge(ctx, d, d.badgeX * W - b.w, d.badgeY * H - b.h / 2, fs, C.ink, C.hi, C.dark, fonts, false, C.bg));
	}
	if (d.foot) layer(ctx, 'foot', W / 2, H, () => drawFoot(ctx, d, u, W, H, C.ink, fonts));

	d.stickers.forEach((s, i) => {
		if (!s.behind && !s.hidden) boxes[i] = item(s, i);
	});
	ctx.restore();
	motion = undefined;
	return { text, logo, window: win, stickers: boxes };
}
