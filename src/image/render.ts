import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initWasm, Resvg } from '@resvg/resvg-wasm';
import { PKG_ROOT } from '../lib/paths.js';
import { type GroundId, type TemplateId, groundById, sizeById, templateById } from './catalog.js';
import { cssOf, fontBuffers } from './fonts.js';
import { compose, embedFonts, type Artwork } from './svg.js';

export type ExportFormat = 'png' | 'svg';

export type ImageRequest = {
	template: string;
	size: string;
	ground?: string;
	outDir: string;
	exports: ExportFormat[];
	headline?: string;
	subtext?: string;
	eyebrow?: string;
	quote?: string;
	attribution?: string;
	image?: string;
};

export type WrittenImage = { path: string; format: ExportFormat; width: number; height: number; bytes: number };

export type RenderResult = {
	ok: true;
	template: TemplateId;
	size: string;
	width: number;
	height: number;
	ground: GroundId;
	files: WrittenImage[];
};

let wasmReady: Promise<void> | undefined;

function wasmBytes(): Buffer {
	// Release builds copy the wasm next to the bundled CLI. A checkout resolves it from the package.
	const beside = join(dirname(fileURLToPath(import.meta.url)), 'resvg.wasm');
	if (existsSync(beside)) return readFileSync(beside);
	const nodeRequire = createRequire(join(PKG_ROOT, 'package.json'));
	return readFileSync(nodeRequire.resolve('@resvg/resvg-wasm/index_bg.wasm'));
}

function ensureWasm(): Promise<void> {
	wasmReady ??= initWasm(wasmBytes()).catch((error) => {
		wasmReady = undefined;
		throw error;
	});
	return wasmReady;
}

function field(value: string | undefined): string | undefined {
	const text = value?.replace(/\\n/g, '\n').trim();
	return text ? text : undefined;
}

function imageHref(path: string | undefined): string | undefined {
	if (!path) return undefined;
	const abs = resolve(path);
	if (!existsSync(abs)) throw new Error(`No image at ${path}.`);
	const ext = extname(abs).toLowerCase();
	const mime = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : undefined;
	if (!mime) throw new Error('The frame image must be a PNG or JPEG.');
	return `data:${mime};base64,${readFileSync(abs).toString('base64')}`;
}

function pngSize(buf: Buffer): { width: number; height: number } {
	if (buf.length < 24 || buf.toString('ascii', 1, 4) !== 'PNG') throw new Error('The renderer did not produce a PNG.');
	return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function displayPath(path: string): string {
	const rel = relative(process.cwd(), path);
	if (!rel || rel.startsWith('..')) return path;
	return rel.split('\\').join('/');
}

export function parseExports(value: string | undefined): ExportFormat[] {
	const items = (value ?? 'png,svg').split(',').map((item) => item.trim()).filter(Boolean);
	if (!items.length) throw new Error('--export needs png, svg, or png,svg.');
	const formats: ExportFormat[] = [];
	for (const item of items) {
		if (item !== 'png' && item !== 'svg') throw new Error(`Unknown export "${item}". Use png, svg, or png,svg.`);
		if (!formats.includes(item)) formats.push(item);
	}
	return formats;
}

export async function renderImage(request: ImageRequest): Promise<RenderResult> {
	const template = templateById(request.template);
	const size = sizeById(request.size);
	const ground = groundById(request.ground ?? 'white');
	const content = {
		headline: field(request.headline),
		subtext: field(request.subtext),
		eyebrow: field(request.eyebrow),
		quote: field(request.quote),
		attribution: field(request.attribution),
	};
	for (const key of template.requires) {
		if (!content[key as keyof typeof content]) throw new Error(`The ${template.id} template needs --${key}.`);
	}
	if (/\.(png|svg)$/i.test(request.outDir)) throw new Error('--out is a directory. The file name follows the template and size.');
	const art: Artwork = { template: template.id, size, ground, ...content, imageHref: imageHref(request.image) };
	const drawn = compose(art);
	await ensureWasm();
	const outDir = resolve(request.outDir);
	mkdirSync(outDir, { recursive: true });
	const stem = `${template.id}-${size.id}`;
	const files: WrittenImage[] = [];
	for (const format of request.exports) {
		const filename = `${stem}.${format}`;
		const abs = join(outDir, filename);
		if (format === 'svg') {
			const withFonts = embedFonts(drawn.svg, drawn.roles);
			writeFileSync(abs, withFonts);
			files.push({ path: displayPath(abs), format, width: size.width, height: size.height, bytes: Buffer.byteLength(withFonts) });
			continue;
		}
		const sans = cssOf('sans');
		const mono = cssOf('mono');
		const resvg = new Resvg(drawn.svg, {
			font: { fontBuffers: fontBuffers(), defaultFontFamily: sans.family, sansSerifFamily: sans.family, monospaceFamily: mono.family },
			textRendering: 2,
			shapeRendering: 2,
			imageRendering: 0,
			background: drawn.background,
		});
		try {
			const rendered = resvg.render();
			try {
				const png = Buffer.from(rendered.asPng());
				const actual = pngSize(png);
				if (actual.width !== size.width || actual.height !== size.height) throw new Error(`Rendered ${actual.width}x${actual.height}, expected ${size.width}x${size.height}.`);
				writeFileSync(abs, png);
				files.push({ path: displayPath(abs), format, width: actual.width, height: actual.height, bytes: png.length });
			} finally {
				rendered.free();
			}
		} finally {
			resvg.free();
		}
	}
	return { ok: true, template: template.id, size: size.id, width: size.width, height: size.height, ground, files };
}
