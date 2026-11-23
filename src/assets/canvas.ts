import { readFileSync } from 'node:fs';
import { createCanvas, GlobalFonts, SvgExportFlag, type Canvas, type SKRSContext2D, type SvgCanvas } from '@napi-rs/canvas';
import { colorHex } from '../lib/brand.js';
import { pkgPath } from '../lib/paths.js';
import { encodePng } from './png.js';

// The drawing surface every asset command uses: a 2D canvas (Skia, no browser) with the brand's faces registered,
// drawn in the frame's own pixels at any scale, written as PNG (deterministic bytes, optional dpi) or as SVG (the same
// drawing calls through Skia's SVG backend, text turned into outlines so the file needs no fonts).

export type Ctx = SKRSContext2D;
export type AnyCanvas = Canvas | SvgCanvas;
export type Surface = { canvas: AnyCanvas; ctx: Ctx; width: number; height: number; scale: number; svg: boolean };
/** The brand faces as canvas font families: the sans (every role, the display included) and the mono. */
export type Fonts = { sans: string; mono: string };

type FontDoc = { sans: { family: string; files: Record<string, string> }; mono: { family: string; files: Record<string, string> } };

let fonts: Fonts | undefined;
/** Registers the brand faces once (brand/fonts/fonts.json) and returns the CSS family strings to draw with. */
export function brandFonts(): Fonts {
	if (fonts) return fonts;
	const doc = JSON.parse(readFileSync(pkgPath('brand', 'fonts', 'fonts.json'), 'utf8')) as FontDoc;
	for (const face of [doc.sans, doc.mono]) for (const file of Object.values(face.files)) GlobalFonts.registerFromPath(pkgPath('brand', 'fonts', file), face.family);
	fonts = { sans: `"${doc.sans.family}"`, mono: `"${doc.mono.family}"` };
	return fonts;
}

/** A surface `width` by `height` frame pixels, drawn at `scale` (a PNG at 2 is twice the pixels). `svg` records the
 * drawing as SVG instead of pixels. */
export function surface(width: number, height: number, opts: { scale?: number; svg?: boolean } = {}): Surface {
	brandFonts();
	const scale = opts.scale ?? 1;
	const pw = Math.max(1, Math.round(width * scale));
	const ph = Math.max(1, Math.round(height * scale));
	const canvas: AnyCanvas = opts.svg ? createCanvas(pw, ph, SvgExportFlag.ConvertTextToPaths) : createCanvas(pw, ph);
	const ctx = canvas.getContext('2d');
	ctx.setTransform(scale, 0, 0, scale, 0, 0);
	return { canvas, ctx, width, height, scale, svg: !!opts.svg };
}

/** A plain raster canvas in device pixels (masks, samples, cut-outs). */
export function scratch(width: number, height: number): { canvas: Canvas; ctx: Ctx } {
	brandFonts();
	const canvas = createCanvas(Math.max(1, Math.round(width)), Math.max(1, Math.round(height)));
	return { canvas, ctx: canvas.getContext('2d') };
}

/** Straight RGBA pixels of a raster surface. */
export function pixelsOf(s: Pick<Surface, 'canvas'>): { data: Buffer; width: number; height: number } {
	const { width, height } = s.canvas;
	const img = s.canvas.getContext('2d').getImageData(0, 0, width, height);
	return { data: Buffer.from(img.data.buffer, img.data.byteOffset, img.data.byteLength), width, height };
}

/** The surface as PNG: the same pixels always give the same bytes. `opaque` drops the alpha channel. */
export function toPng(s: Surface, opts: { dpi?: number; opaque?: boolean } = {}): Buffer {
	if (s.svg) throw new Error('This surface records SVG; draw again on a raster surface for PNG.');
	const px = pixelsOf(s);
	if (!opts.opaque) return encodePng(px.data, px.width, px.height, 4, opts.dpi);
	const rgb = Buffer.alloc(px.width * px.height * 3);
	for (let i = 0, j = 0; i < px.data.length; i += 4, j += 3) {
		rgb[j] = px.data[i]!;
		rgb[j + 1] = px.data[i + 1]!;
		rgb[j + 2] = px.data[i + 2]!;
	}
	return encodePng(rgb, px.width, px.height, 3, opts.dpi);
}

/** The surface as JPEG (quality 92) or WebP (quality 92), for the web. */
export function toJpg(s: Surface): Buffer {
	return (s.canvas as Canvas).toBuffer('image/jpeg', 92);
}
export function toWebp(s: Surface): Buffer {
	return (s.canvas as Canvas).toBuffer('image/webp', 92);
}

/** The surface as an SVG document. `physical` sets the root size in inches (print files). */
export function toSvg(s: Surface, physical?: { widthIn: number; heightIn: number }): string {
	if (!s.svg) throw new Error('This surface holds pixels; draw again with { svg: true } for SVG.');
	let svg = stableIds(compactSvg((s.canvas as SvgCanvas).getContent().toString('utf8')));
	if (physical) svg = svg.replace(/(<svg [^>]*?)width="[\d.]+" height="[\d.]+"/, `$1width="${physical.widthIn}in" height="${physical.heightIn}in" viewBox="0 0 ${s.canvas.width} ${s.canvas.height}"`);
	return svg;
}

/** A color as brand/assets files write it: a token name, or a token with an alpha on top of its own. */
export type ColorRef = string | { token: string; alpha: number };

/** A brand color by token name (`brand`, `white`, `ink`, `border-subtle`) as a canvas color, or `{ token, alpha }` for
 * the token at that opacity. Hex and rgb() pass through, so callers may hand a resolved value back in. An empty name
 * stays empty (a theme's "no color"). Unknown names throw. */
export function tokenColor(ref: ColorRef): string {
	if (typeof ref === 'object') return withAlpha(tokenColor(ref.token), ref.alpha);
	const name = ref;
	if (!name) return '';
	if (/^#[0-9a-f]{3,8}$/i.test(name) || /^rgba?\(/.test(name)) return name;
	const hex = colorHex(name.replace(/^--ds-color-/, ''));
	if (!hex) throw new Error(`Unknown color token \`${name}\`.`);
	if (hex.length === 9) {
		const n = (i: number) => Number.parseInt(hex.slice(i, i + 2), 16);
		return `rgba(${n(1)}, ${n(3)}, ${n(5)}, ${Math.round((n(7) / 255) * 1000) / 1000})`;
	}
	return hex;
}

/** A canvas color (hex or rgb[a]) at `alpha` times its own opacity. */
export function withAlpha(color: string, alpha: number): string {
	const rgba = color.match(/rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:\s*[,/]\s*([\d.]+))?/);
	if (rgba) return `rgba(${rgba[1]}, ${rgba[2]}, ${rgba[3]}, ${Math.round(Number(rgba[4] ?? 1) * alpha * 1000) / 1000})`;
	const h = color.replace('#', '');
	const full = h.length === 3 ? h.replace(/./g, '$&$&') : h;
	const n = (i: number) => Number.parseInt(full.slice(i, i + 2), 16);
	const a = full.length === 8 ? n(6) / 255 : 1;
	return `rgba(${n(0)}, ${n(2)}, ${n(4)}, ${Math.round(a * alpha * 1000) / 1000})`;
}

/** Perceived lightness of a hex color (0 black, 1 white), as the shader reads it. */
export function lightnessOf(hex: string): number {
	const n = Number.parseInt(hex.replace('#', '').slice(0, 6), 16);
	const lin = (c: number) => {
		const v = c / 255;
		return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
	};
	return Math.cbrt(0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255));
}

/** Skia numbers clip paths and images with hex counters that run across drawings in one process, so the same drawing
 * can carry different ids. This renumbers its own ids (cl_N, img_N, ...) in order of appearance, so the same drawing
 * always writes the same file. */
export function stableIds(svg: string): string {
	const map = new Map<string, string>();
	for (const m of svg.matchAll(/\sid="([a-z]+)_([0-9a-f]+)"/g)) {
		const id = `${m[1]}_${m[2]}`;
		if (!map.has(id)) map.set(id, `${m[1]}_${map.size}`);
	}
	if (!map.size) return svg;
	return svg.replace(/(id="|#)([a-z]+_[0-9a-f]+)(?=[")])/g, (whole, pre: string, id: string) => (map.has(id) ? `${pre}${map.get(id)}` : whole));
}

/** Skia writes every circle as 32 quadratic curves and every number with six decimals. This keeps the drawing and
 * writes each circle as two arcs and each number to 0.01 px, which makes a dot field about forty times smaller. */
export function compactSvg(svg: string): string {
	return svg.replace(/ d="([^"]*)"/g, (_m, d: string) => ` d="${compactPath(d)}"`);
}

const r2 = (n: number) => {
	const v = Math.round(n * 100) / 100;
	return Object.is(v, -0) ? '0' : String(v);
};

function compactPath(d: string): string {
	const tokens = d.match(/[A-Za-z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g);
	if (!tokens || tokens.some((t) => /^[A-Za-z]$/.test(t) && !'MLQCZ'.includes(t))) return d;
	type Seg = { cmd: string; nums: number[] };
	const subpaths: Seg[][] = [];
	let cur: Seg[] = [];
	let seg: Seg | undefined;
	for (const t of tokens) {
		if (/^[A-Z]$/.test(t)) {
			if (t === 'M' && cur.length) {
				subpaths.push(cur);
				cur = [];
			}
			seg = { cmd: t, nums: [] };
			cur.push(seg);
		} else seg?.nums.push(Number(t));
	}
	if (cur.length) subpaths.push(cur);
	return subpaths.map((sp) => circleOf(sp) ?? sp.map((s) => s.cmd + s.nums.map(r2).join(' ')).join('')).join('');
}

/** A subpath that is a circle (Skia's 8-plus quadratic segments around a center) as two arcs, else undefined. */
function circleOf(sp: { cmd: string; nums: number[] }[]): string | undefined {
	if (sp.length < 9 || sp[0]!.cmd !== 'M' || sp[0]!.nums.length !== 2) return undefined;
	const pts: [number, number][] = [];
	for (const s of sp) {
		if (s.cmd === 'Z') continue;
		if (s.cmd !== 'M' && s.cmd !== 'Q') return undefined;
		for (let i = 0; i + 1 < s.nums.length; i += 2) pts.push([s.nums[i]!, s.nums[i + 1]!]);
	}
	const xs = pts.map((p) => p[0]);
	const ys = pts.map((p) => p[1]);
	const x0 = Math.min(...xs);
	const x1 = Math.max(...xs);
	const y0 = Math.min(...ys);
	const y1 = Math.max(...ys);
	const r = (x1 - x0) / 2;
	if (r <= 0 || Math.abs(x1 - x0 - (y1 - y0)) > r * 0.03) return undefined;
	const cx = (x0 + x1) / 2;
	const cy = (y0 + y1) / 2;
	// Endpoints lie on the circle; control points lie just outside it.
	for (const s of sp) {
		if (s.cmd === 'Z') continue;
		const n = s.nums;
		const ex = n[n.length - 2]!;
		const ey = n[n.length - 1]!;
		if (Math.abs(Math.hypot(ex - cx, ey - cy) - r) > Math.max(0.01, r * 0.02)) return undefined;
	}
	const [sx, sy] = pts[0]!;
	const last = pts[pts.length - 1]!;
	if (Math.hypot(last[0] - sx, last[1] - sy) > Math.max(0.01, r * 0.02)) return undefined;
	// Keep the winding (a letter's counter winds against its outline): positive area is clockwise with y down.
	let area = 0;
	for (let i = 0; i < pts.length; i++) {
		const [ax, ay] = pts[i]!;
		const [bx, by] = pts[(i + 1) % pts.length]!;
		area += ax * by - bx * ay;
	}
	const sweep = area > 0 ? 1 : 0;
	return `M${r2(cx + r)} ${r2(cy)}A${r2(r)} ${r2(r)} 0 1 ${sweep} ${r2(cx - r)} ${r2(cy)}A${r2(r)} ${r2(r)} 0 1 ${sweep} ${r2(cx + r)} ${r2(cy)}Z`;
}
