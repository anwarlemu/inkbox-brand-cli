import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { groundById } from '../image/catalog.js';
import { rasterizeSvg } from '../image/render.js';
import { encodeApng } from './apng.js';
import { RENDERER, type VideoTemplateId, videoSizeById, videoTemplateById } from './catalog.js';
import { frameSvg, prepareClip } from './compose.js';
import { frameProgress } from './easing.js';

export type VideoRequest = {
	template: string;
	size: string;
	ground?: string;
	outDir: string;
	headline?: string;
	subtext?: string;
	eyebrow?: string;
};

function field(value: string | undefined) {
	const text = value?.replace(/\\n/g, '\n').trim();
	return text ? text : undefined;
}

function pngSize(buf: Buffer) {
	if (buf.length < 24 || buf.toString('ascii', 1, 4) !== 'PNG') throw new Error('The renderer did not produce a PNG frame.');
	return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function displayPath(path: string) {
	const rel = relative(process.cwd(), path);
	if (!rel || rel.startsWith('..')) return path;
	return rel.split('\\').join('/');
}

export async function renderVideo(request: VideoRequest) {
	const template = videoTemplateById(request.template);
	const size = videoSizeById(request.size);
	const ground = groundById(request.ground ?? 'white');
	const content = {
		headline: field(request.headline),
		subtext: field(request.subtext),
		eyebrow: field(request.eyebrow),
	};
	const supplied = content;
	const allowed = new Set<string>([...template.requires, ...template.optional]);
	for (const [key, value] of Object.entries(supplied)) {
		if (!value || allowed.has(key)) continue;
		throw new Error(`The ${template.id} template does not take --${key}. It takes ${[...allowed].map((name) => `--${name}`).join(', ')}.`);
	}
	for (const key of template.requires) {
		if (!content[key as keyof typeof content]) throw new Error(`The ${template.id} template needs --${key}.`);
	}
	if (/\.apng$/i.test(request.outDir)) throw new Error('--out is a directory. The file name follows the template and size.');
	const outDir = resolve(request.outDir);
	if (existsSync(outDir) && !statSync(outDir).isDirectory()) throw new Error('--out is a directory. The file name follows the template and size.');
	const clip = prepareClip({ template: template.id as VideoTemplateId, size, ground, ...content });
	const frames: Buffer[] = [];
	for (let index = 0; index < RENDERER.frames; index++) {
		const drawn = frameSvg(clip, frameProgress(index, RENDERER.frames));
		const png = await rasterizeSvg(drawn.svg, drawn.background);
		const actual = pngSize(png);
		if (actual.width !== size.width || actual.height !== size.height) throw new Error(`Frame ${index + 1} rendered ${actual.width}x${actual.height}, expected ${size.width}x${size.height}.`);
		frames.push(png);
	}
	const apng = encodeApng(frames, RENDERER.fps);
	mkdirSync(outDir, { recursive: true });
	const filename = `${template.id}-${size.id}.apng`;
	const abs = join(outDir, filename);
	writeFileSync(abs, apng);
	return {
		ok: true as const,
		template: template.id,
		size: size.id,
		width: size.width,
		height: size.height,
		ground,
		renderer: RENDERER.id,
		fps: RENDERER.fps,
		frames: RENDERER.frames,
		durationMs: RENDERER.durationMs,
		files: [{ path: displayPath(abs), format: 'apng' as const, width: size.width, height: size.height, bytes: apng.length }],
	};
}
