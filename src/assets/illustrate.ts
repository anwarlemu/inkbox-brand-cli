import { readFileSync } from 'node:fs';
import type { Image } from '@napi-rs/canvas';
import { pkgPath } from '../lib/paths.js';
import { artBytes, logoDoc, themeNames, themes } from './brand-art.js';
import { brandColor } from './brand-art.js';
import { brandFonts, surface, toJpg, toPng, toSvg, toWebp, withAlpha, type Ctx } from './canvas.js';
import { designOf, designSvg, imageSizes, measureDesign, picturesFor, sizeId, svgPictures } from './image.js';
import { pick } from './io.js';
import { clampDim, drawDesign, inkBox, type Design, type DrawnLayer, type Pictures, type Template } from './share.js';
import { loadIcons } from './window.js';

// Illustrations (brand/assets/illustrate.json, rules in brand/illustration.md): the share images' layers without words,
// or the octopus alone, as scenes at any size. The PNG is drawn on the canvas; the SVG lays the ground and the reef's own
// vectors (art/reef.svg, inlined) under the canvas drawing (Skia's SVG backend: paths stay paths), so nothing that is
// drawn as a vector in the brand's files becomes pixels.

type Subject = { name: string; description: string; layout?: string; theme: string; picture: boolean };
type IllustrateDoc = { subjects: Record<string, Subject>; poses: Record<string, string>; sizes: string };

let doc: IllustrateDoc | undefined;
export const illustrateDoc = (): IllustrateDoc => (doc ??= JSON.parse(readFileSync(pkgPath('brand', 'assets', 'illustrate.json'), 'utf8')) as IllustrateDoc);
export const subjects = () => Object.keys(illustrateDoc().subjects);

export function illustrateCatalog() {
	const d = illustrateDoc();
	return {
		subjects: subjects().map((id) => ({ id, ...d.subjects[id] })),
		poses: Object.entries(d.poses).map(([id, label]) => ({ id, label })),
		themes: themeNames(),
		sizes: [...imageSizes().map((s) => ({ id: s.id, width: s.width, height: s.height })), { id: 'custom', width: 0, height: 0 }],
		defaultSize: 'square',
		formats: ['png', 'svg', 'jpg', 'webp'],
		rules: 'brand/illustration.md',
	};
}

export type IllustrateRequest = { subject: string; theme?: string; size?: string; width?: number; height?: number; pose?: string; picture?: Image | null; pictureUrl?: string; console?: string; seed?: number };

type Plan = { kind: 'scene'; design: Design } | { kind: 'octopus'; w: number; h: number; theme: string; pose: string };

/** What a request draws: a wordless share design, or the octopus alone. */
export function planOf(req: IllustrateRequest): Plan {
	const id = pick('subject', req.subject, subjects());
	const s = illustrateDoc().subjects[id]!;
	const theme = req.theme ? pick('theme', req.theme, themeNames()) : s.theme;
	if (req.picture && !s.picture) throw new Error(`The ${id} subject takes no picture; --image goes with ${subjects().filter((k) => illustrateDoc().subjects[k]!.picture).join(', ')}.`);
	if (req.pose && id !== 'octopus') throw new Error('--pose goes with the octopus subject.');
	const size = req.size ? sizeId(req.size) : 'square';
	if (size === 'custom' && (!req.width || !req.height)) throw new Error('A custom size needs --width and --height (160 to 4000).');
	if (id === 'octopus') {
		const known = imageSizes().find((x) => x.id === size);
		return { kind: 'octopus', w: known?.width ?? clampDim(req.width!), h: known?.height ?? clampDim(req.height!), theme, pose: req.pose ? pick('pose', req.pose, Object.keys(illustrateDoc().poses)) : 'sit' };
	}
	const d = designOf({ template: s.layout as Template, theme, size, width: size === 'custom' ? req.width : undefined, height: size === 'custom' ? req.height : undefined, emphasise: false, picture: !!req.picture, pictureUrl: req.pictureUrl, console: req.console, seed: req.seed });
	return { kind: 'scene', design: { ...d, logo: false, foot: false } };
}

/* The octopus's own box: whole on the canvas, its middle a little over the canvas's. */
function octopusBox(p: Extract<Plan, { kind: 'octopus' }>, pics: Pictures) {
	const im = pics.get(p.pose)!;
	const S = Math.min(p.w, p.h);
	const w = S * (p.pose === 'sit' ? 0.62 : 0.7);
	const h = (w * im.height) / im.width;
	return inkBox(p.pose, (p.w - w) / 2, (p.h - h) / 2 - S * 0.03, w);
}

function drawOctopus(ctx: Ctx, p: Extract<Plan, { kind: 'octopus' }>, pics: Pictures, svg: boolean, bare = false) {
	const t = themes()[p.theme]!;
	if (!bare) {
		ctx.fillStyle = t.bg;
		ctx.fillRect(0, 0, p.w, p.h);
	}
	const im = pics.get(p.pose)!;
	const S = Math.min(p.w, p.h);
	const w = S * (p.pose === 'sit' ? 0.62 : 0.7);
	const h = (w * im.height) / im.width;
	ctx.save();
	if (p.pose === 'sit' && !svg) {
		const k = Math.max(w, 60) / 281.7;
		const c = (a: number) => withAlpha(brandColor('shadow'), a);
		ctx.filter = `drop-shadow(0 ${8 * k}px ${8.5 * k}px ${c(0.12)}) drop-shadow(0 ${31 * k}px ${15 * k}px ${c(0.1)}) drop-shadow(0 ${70 * k}px ${21 * k}px ${c(0.05)})`;
	}
	ctx.drawImage(im, (p.w - w) / 2, (p.h - h) / 2 - S * 0.03, w, h);
	ctx.restore();
}

/** The reef's own vectors, placed as the scene places the reef: along the bottom, faded into the ground. */
function reefSvg(d: Design, W: number, H: number): string {
	if (!d.reef) return '';
	const R = logoDoc().reef;
	const rw = W * (d.reefScale / 100);
	const rh = (rw * R.h) / R.w;
	const inner = artBytes('reef').toString('utf8').replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
	const opacity = Math.round((1 - d.reefFade) * 1000) / 1000;
	return `<svg x="${r2(W * 0.5 - rw / 2)}" y="${r2(H - rh * (1 - d.reefDrop))}" width="${r2(rw)}" height="${r2(rh)}" viewBox="0 0 ${R.w} ${R.h}" overflow="visible"><g opacity="${opacity}">${inner}</g></svg>`;
}
const r2 = (n: number) => String(Math.round(n * 100) / 100);

export type Illustration = { png?: Buffer; svg?: string; jpg?: Buffer; webp?: Buffer; layers: DrawnLayer[]; width: number; height: number; subject: string; theme: string };

export async function renderIllustration(req: IllustrateRequest, opts: { png?: boolean; svg?: boolean; jpg?: boolean; webp?: boolean; scale?: number } = { png: true }): Promise<Illustration> {
	const plan = planOf(req);
	const W = plan.kind === 'scene' ? (plan.design.size === 'custom' ? plan.design.w : imageSizes().find((s) => s.id === plan.design.size)!.width) : plan.w;
	const H = plan.kind === 'scene' ? (plan.design.size === 'custom' ? plan.design.h : imageSizes().find((s) => s.id === plan.design.size)!.height) : plan.h;
	const theme = plan.kind === 'scene' ? plan.design.theme : plan.theme;
	const pics = await picturesFor(req.picture ?? null);
	const icons = await loadIcons();
	const scale = opts.scale ?? 1;
	const out: Illustration = { width: Math.round(W * scale), height: Math.round(H * scale), subject: req.subject, theme, layers: [] };
	if (plan.kind === 'scene') out.layers = (await measureDesign(plan.design, pics)).layers;
	else out.layers = [{ id: 'art', kind: 'art', box: octopusBox(plan, pics), can: {} }];
	if (opts.png !== false || opts.jpg || opts.webp) {
		const s = surface(W, H, { scale });
		if (plan.kind === 'scene') drawDesign(s.ctx, plan.design, pics, icons, brandFonts(), scale);
		else drawOctopus(s.ctx, plan, pics, false);
		if (opts.png !== false) out.png = toPng(s);
		if (opts.jpg) out.jpg = toJpg(s);
		if (opts.webp) out.webp = toWebp(s);
	}
	if (opts.svg) {
		const bg = `<rect width="${W}" height="${H}" fill="${themes()[theme]!.bg}"/>`;
		if (plan.kind === 'scene') out.svg = (await designSvg({ ...plan.design, reef: false }, pics, reefSvg(plan.design, W, H))).replace(/<\?xml[^>]*>\s*/, '');
		else {
			const s = surface(W, H, { svg: true });
			drawOctopus(s.ctx, plan, await svgPictures(pics, Math.max(W, H)), true, true);
			out.svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${bg}${toSvg(s).replace(/^[\s\S]*?<svg/, '<svg x="0" y="0"')}</svg>\n`;
		}
	}
	return out;
}
