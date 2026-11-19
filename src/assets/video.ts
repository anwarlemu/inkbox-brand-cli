import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { tokens } from '../lib/brand.js';
import { pkgPath } from '../lib/paths.js';
import { themeNames } from './brand-art.js';
import { brandFonts, pixelsOf, surface, toPng } from './canvas.js';
import { designOf, type ImageRequest } from './image.js';
import { pick } from './io.js';
import { drawDesign, TEMPLATES, type Design, type LayerState, type Pictures } from './share.js';
import { loadIcons, type Icons } from './window.js';

// Video: a share design whose layers come in on the brand's ease-out (brand/assets/video.json), drawn frame by frame on
// the canvas. Every frame is a pure function of its time, so the same inputs give the same frames. ffmpeg encodes MP4
// (H.264) and WebM (VP9) when it is on the PATH; without it, the frames are written as PNG.

type Enter = { seconds: number; stagger: number; gap: number; rise: number; windowRise: number; stickerRise: number; scaleFrom: number };
type TemplateDef = { name: string; description: string; layout: string; theme: string; seconds: number; rows?: { start: number; every: number }; marquee?: boolean; order?: string[] };
type VideoDoc = { fps: number; enter: Enter; sizes: Record<string, [number, number]>; order: string[]; templates: Record<string, TemplateDef> };

let doc: VideoDoc | undefined;
export const videoDoc = (): VideoDoc => (doc ??= JSON.parse(readFileSync(pkgPath('brand', 'assets', 'video.json'), 'utf8')) as VideoDoc);
export const videoTemplates = () => Object.keys(videoDoc().templates);

export function hasFfmpeg(): boolean {
	if (process.env.DS_NO_FFMPEG) return false;
	return spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0;
}

export function videoCatalog() {
	const d = videoDoc();
	return {
		templates: videoTemplates().map((id) => ({ id, ...d.templates[id] })),
		sizes: Object.entries(d.sizes).map(([id, [width, height]]) => ({ id, width, height })),
		fps: d.fps,
		easing: { token: '--ds-easing-out', value: tokens().site['--ds-easing-out'] },
		enter: d.enter,
		formats: ['mp4', 'webm', 'frames', 'all'],
		encoder: 'ffmpeg (H.264 MP4, VP9 WebM) when installed; otherwise PNG frames.',
		reducedMotion: '--reduced-motion keeps the fades and drops every movement; --still writes one PNG frame (the finished design at the end).',
	};
}

function bezier(x1: number, y1: number, x2: number, y2: number) {
	const cx = 3 * x1;
	const bx = 3 * (x2 - x1) - cx;
	const ax = 1 - cx - bx;
	const cy = 3 * y1;
	const by = 3 * (y2 - y1) - cy;
	const ay = 1 - cy - by;
	const sample = (u: number, a: number, b: number, c: number) => ((a * u + b) * u + c) * u;
	return (t: number) => {
		if (t <= 0) return 0;
		if (t >= 1) return 1;
		let lo = 0;
		let hi = 1;
		let u = t;
		for (let i = 0; i < 40; i++) {
			const x = sample(u, ax, bx, cx);
			if (Math.abs(x - t) < 1e-7) break;
			if (x < t) lo = u;
			else hi = u;
			u = (lo + hi) / 2;
		}
		return sample(u, ay, by, cy);
	};
}

let ease: ((t: number) => number) | undefined;
/** The brand's `--ds-easing-out`; a token that is not a cubic-bezier() is an error, so timing is fixed. */
export function easeOut(t: number) {
	if (!ease) {
		const raw = tokens().site['--ds-easing-out'] ?? '';
		const m = raw.match(/^cubic-bezier\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)$/);
		if (!m) throw new Error(`--ds-easing-out must be a cubic-bezier() so video timing is fixed. It is "${raw}".`);
		ease = bezier(Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4]));
	}
	return ease(t);
}

export type VideoOptions = { template: string; size: string; width: number; height: number; seconds: number; fps: number; reduced?: boolean } & Omit<ImageRequest, 'size' | 'width' | 'height' | 'template'> & { layout?: string };

/** The design a video draws, and its timing. */
export function videoDesign(o: VideoOptions): { design: Design; def: TemplateDef } {
	const def = videoDoc().templates[pick('video template', o.template, videoTemplates())]!;
	const layout = o.layout ? pick('layout', o.layout, TEMPLATES) : def.layout;
	if (o.layout && o.template !== 'reveal') throw new Error('--layout goes with the reveal template; the others have their own.');
	const design = designOf({ ...o, template: layout, theme: o.theme ? pick('theme', o.theme, themeNames()) : def.theme, size: 'custom', width: o.width, height: o.height });
	return { design, def };
}

/** Where each layer is at time `t` (seconds). */
function motionAt(def: TemplateDef, t: number, reduced: boolean) {
	const e = videoDoc().enter;
	const order = def.order ?? videoDoc().order;
	return (name: string): LayerState | undefined => {
		const [kind, n] = name.split(':');
		const i = order.findIndex((p) => p === name || p === `${kind}:*`);
		if (i < 0) return undefined;
		const start = i * e.gap + (n ? Number(n) * e.stagger : 0);
		const p = easeOut((t - start) / e.seconds);
		if (p >= 1) return undefined;
		const rise = kind === 'window' ? e.windowRise : kind === 'sticker' ? e.stickerRise : e.rise;
		const scaled = kind === 'window' || kind === 'sticker';
		return reduced ? { a: p } : { a: p, y: (1 - p) * rise, s: scaled ? e.scaleFrom + (1 - e.scaleFrom) * p : 1 };
	};
}

/** One frame at time `t`. */
export function drawFrame(ctx: Parameters<typeof drawDesign>[0], design: Design, def: TemplateDef, t: number, seconds: number, pics: Pictures, icons: Icons, reduced = false) {
	const d: Design = { ...design };
	if (def.marquee) d.outlineShift = design.outlineShift + (reduced ? 0 : t / seconds);
	if (def.rows) {
		const total = (d.app.mails ?? '').split('\n').filter(Boolean).length;
		const rows = Math.min(total, Math.max(0, (t - def.rows.start) / def.rows.every));
		// Each row eases in over its own slot.
		const whole = Math.floor(rows);
		d.app = { ...d.app, rows: whole + easeOut(rows - whole) };
	}
	drawDesign(ctx, d, pics, icons, brandFonts(), 1, false, motionAt(def, t, reduced));
}

/** Frames as straight RGBA buffers, one at a time. */
export async function* videoFrames(o: VideoOptions, pics: Pictures): AsyncGenerator<{ index: number; rgba: Buffer; png: () => Buffer }> {
	const { design, def } = videoDesign(o);
	const icons = await loadIcons();
	const count = Math.round(o.seconds * o.fps);
	for (let i = 0; i < count; i++) {
		const s = surface(o.width, o.height);
		drawFrame(s.ctx, design, def, i / o.fps, o.seconds, pics, icons, o.reduced);
		yield { index: i, rgba: pixelsOf(s).data, png: () => toPng(s, { opaque: true }) };
	}
}

/** One PNG frame at `at` seconds. */
export async function stillFrame(o: VideoOptions, pics: Pictures, at: number): Promise<Buffer> {
	const { design, def } = videoDesign(o);
	const s = surface(o.width, o.height);
	drawFrame(s.ctx, design, def, at, o.seconds, pics, await loadIcons(), o.reduced);
	return toPng(s, { opaque: true });
}

/** Pipes raw RGBA frames into one ffmpeg run that writes each asked format, with bit-exact flags. */
export async function encode(frames: AsyncIterable<Buffer>, o: { width: number; height: number; fps: number; outputs: { path: string; format: 'mp4' | 'webm' }[] }) {
	for (const out of o.outputs) mkdirSync(dirname(out.path), { recursive: true });
	const args = ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${o.width}x${o.height}`, '-r', String(o.fps), '-i', '-'];
	for (const out of o.outputs) {
		args.push('-map_metadata', '-1', '-fflags', '+bitexact', '-flags:v', '+bitexact');
		if (out.format === 'mp4') args.push('-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-threads', '1', '-movflags', '+faststart', out.path);
		else args.push('-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '28', '-pix_fmt', 'yuv420p', '-row-mt', '0', '-threads', '1', out.path);
	}
	const ff = spawn('ffmpeg', args, { stdio: ['pipe', 'ignore', 'pipe'] });
	let err = '';
	ff.stderr.on('data', (d) => (err += d));
	const done = new Promise<number>((res) => ff.on('close', (code) => res(code ?? 1)));
	let closed = false;
	ff.stdin.on('error', () => (closed = true));
	ff.on('close', () => (closed = true));
	for await (const f of frames) {
		if (closed) break;
		if (!ff.stdin.write(f)) await Promise.race([new Promise((r) => ff.stdin.once('drain', r)), done]);
	}
	ff.stdin.end();
	const code = await done;
	if (code !== 0) throw new Error(`ffmpeg failed: ${err.trim() || `exit ${code}`}`);
}
