import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { crc32, deflateSync, inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { imageCatalog, SIZE_IDS, SIZES, TEMPLATE_IDS } from '../src/image/catalog.js';
import { measure } from '../src/image/fonts.js';
import { parseExports, renderImage } from '../src/image/render.js';
import { colorHex } from '../src/lib/brand.js';
import { imageSamples } from '../scripts/image-samples.js';

const ROOT = join(import.meta.dirname, '..');
const BIN = join(ROOT, 'bin.js');

function pngSize(buf: Buffer) {
	expect(buf.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
	return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function pngChunk(type: string, data: Buffer) {
	const body = Buffer.concat([Buffer.from(type), data]);
	const len = Buffer.alloc(4);
	len.writeUInt32BE(data.length);
	const sum = Buffer.alloc(4);
	sum.writeUInt32BE(crc32(body) >>> 0);
	return Buffer.concat([len, body, sum]);
}

function solidPng(width: number, height: number, pixel: (x: number, y: number) => [number, number, number, number]) {
	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(width, 0);
	ihdr.writeUInt32BE(height, 4);
	ihdr[8] = 8;
	ihdr[9] = 6;
	const raw = Buffer.alloc((width * 4 + 1) * height);
	for (let y = 0; y < height; y++) {
		const row = y * (width * 4 + 1);
		for (let x = 0; x < width; x++) {
			const [r, g, b, a] = pixel(x, y);
			const i = row + 1 + x * 4;
			raw[i] = r;
			raw[i + 1] = g;
			raw[i + 2] = b;
			raw[i + 3] = a;
		}
	}
	return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), pngChunk('IHDR', ihdr), pngChunk('IDAT', deflateSync(raw)), pngChunk('IEND', Buffer.alloc(0))]);
}

function paeth(left: number, up: number, upLeft: number) {
	const p = left + up - upLeft;
	const pa = Math.abs(p - left);
	const pb = Math.abs(p - up);
	const pc = Math.abs(p - upLeft);
	if (pa <= pb && pa <= pc) return left;
	if (pb <= pc) return up;
	return upLeft;
}

function pngPixels(buf: Buffer) {
	let offset = 8;
	let width = 0;
	let height = 0;
	const idat: Buffer[] = [];
	while (offset + 8 <= buf.length) {
		const len = buf.readUInt32BE(offset);
		const type = buf.toString('ascii', offset + 4, offset + 8);
		const data = buf.subarray(offset + 8, offset + 8 + len);
		if (type === 'IHDR') {
			width = data.readUInt32BE(0);
			height = data.readUInt32BE(4);
		}
		if (type === 'IDAT') idat.push(data);
		if (type === 'IEND') break;
		offset += 12 + len;
	}
	const raw = inflateSync(Buffer.concat(idat));
	const stride = width * 4;
	const out = Buffer.alloc(width * height * 4);
	let prev = Buffer.alloc(stride);
	let pos = 0;
	for (let y = 0; y < height; y++) {
		const filter = raw[pos++];
		const row = raw.subarray(pos, pos + stride);
		pos += stride;
		const recon = Buffer.alloc(stride);
		for (let i = 0; i < stride; i++) {
			const left = i >= 4 ? recon[i - 4] : 0;
			const up = prev[i];
			const upLeft = i >= 4 ? prev[i - 4] : 0;
			const value = row[i];
			if (filter === 0) recon[i] = value;
			else if (filter === 1) recon[i] = (value + left) & 255;
			else if (filter === 2) recon[i] = (value + up) & 255;
			else if (filter === 3) recon[i] = (value + Math.floor((left + up) / 2)) & 255;
			else if (filter === 4) recon[i] = (value + paeth(left, up, upLeft)) & 255;
			else throw new Error(`Unknown PNG filter ${filter}.`);
		}
		recon.copy(out, y * stride);
		prev = recon;
	}
	return { width, height, data: out };
}

function svgTexts(svg: string) {
	return [...svg.matchAll(/<text\b([^>]*)>([^<]*)<\/text>/g)].map((match) => ({
		x: Number(match[1].match(/\bx="([^"]+)"/)?.[1]),
		y: Number(match[1].match(/\by="([^"]+)"/)?.[1]),
		size: Number(match[1].match(/font-size="([^"]+)"/)?.[1]),
		weight: Number(match[1].match(/font-weight="([^"]+)"/)?.[1]),
		family: match[1].match(/font-family="([^"]+)"/)?.[1] ?? '',
		text: match[2].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'"),
	}));
}

const copy: Record<(typeof TEMPLATE_IDS)[number], Record<string, string>> = {
	headline: { headline: 'A mailbox for your agents' },
	statement: { headline: 'Every agent gets an inbox', subtext: 'Email, phone and iMessage.' },
	frame: { headline: 'The console' },
	quote: { quote: 'Give every agent an inbox of its own.' },
	announcement: { eyebrow: 'New', headline: 'Phone lines for agents' },
};

describe('images', () => {
	it('lists templates, sizes and exports', () => {
		const catalog = imageCatalog();
		expect(catalog.templates.map((item) => item.id)).toEqual([...TEMPLATE_IDS]);
		expect(catalog.sizes.map((item) => item.id)).toEqual([...SIZE_IDS]);
		expect(catalog.sizes.map((item) => [item.width, item.height])).toEqual([
			[1200, 630],
			[1080, 1080],
			[1080, 1350],
			[1200, 675],
		]);
		expect(catalog.exports).toEqual(['png', 'svg']);
	});

	it('renders every template at every size as a PNG of that size', async () => {
		const dir = mkdtempSync(join(tmpdir(), 'ds-image-'));
		try {
			for (const template of TEMPLATE_IDS) {
				for (const size of SIZE_IDS) {
					const result = await renderImage({ template, size, outDir: dir, exports: ['png'], ...copy[template] });
					expect(result.ok).toBe(true);
					expect(result.width).toBe(SIZES[size].width);
					expect(result.height).toBe(SIZES[size].height);
					expect(result.files).toHaveLength(1);
					const buf = readFileSync(join(dir, `${template}-${size}.png`));
					expect(pngSize(buf)).toEqual({ width: SIZES[size].width, height: SIZES[size].height });
				}
			}
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	}, 60000);

	it('writes an SVG with the brand ink, the wordmark and embedded fonts, and repeats a PNG exactly', async () => {
		const dir = mkdtempSync(join(tmpdir(), 'ds-image-'));
		try {
			const first = await renderImage({
				template: 'statement',
				size: 'og',
				outDir: dir,
				exports: ['svg', 'png'],
				headline: 'A & B <tag>',
				subtext: 'Line one\\nLine two',
			});
			const svg = readFileSync(join(dir, 'statement-og.svg'), 'utf8');
			expect(svg).toContain('width="1200"');
			expect(svg).toContain('height="630"');
			expect(svg).toContain(colorHex('text-default'));
			expect(svg).toContain('@font-face');
			expect(svg).toContain('M41.5693');
			expect(svg).toContain('A &amp; B &lt;tag&gt;');
			expect(svg).toContain('Line one');
			expect(svg).toContain('Line two');
			expect(svg).not.toContain('Line one\\nLine two');
			const png = readFileSync(join(dir, 'statement-og.png'));
			expect(pngSize(png)).toEqual({ width: 1200, height: 630 });
			const again = await renderImage({ template: 'statement', size: 'og', outDir: dir, exports: ['png'], headline: 'A & B <tag>', subtext: 'Line one\\nLine two' });
			expect(readFileSync(join(dir, 'statement-og.png'))).toEqual(png);
			expect(again.files[0].bytes).toBe(png.length);
			expect(first.files.map((file) => file.format)).toEqual(['svg', 'png']);
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});

	it('places a PNG or JPEG in the frame and refuses anything else', async () => {
		const dir = mkdtempSync(join(tmpdir(), 'ds-image-'));
		try {
			const result = await renderImage({ template: 'frame', size: 'landscape', outDir: dir, exports: ['png'], headline: 'Shot', image: join(ROOT, 'brand', 'logo', 'mark.png') });
			expect(pngSize(readFileSync(join(dir, 'frame-landscape.png')))).toEqual({ width: 1200, height: 675 });
			expect(result.files[0].width).toBe(1200);
			writeFileSync(join(dir, 'nope.webp'), 'nope');
			await expect(renderImage({ template: 'frame', size: 'og', outDir: dir, exports: ['png'], headline: 'Shot', image: join(dir, 'nope.webp') })).rejects.toThrow(/PNG or JPEG/);
			await expect(renderImage({ template: 'quote', size: 'og', outDir: dir, exports: ['png'] })).rejects.toThrow(/--quote/);
			await expect(renderImage({ template: 'poster', size: 'og', outDir: dir, exports: ['png'], headline: 'Hi' })).rejects.toThrow(/Unknown template/);
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});

	it('keeps long copy inside the canvas and accepts jpeg, lilac and any case', async () => {
		const dir = mkdtempSync(join(tmpdir(), 'ds-image-'));
		try {
			expect(parseExports('PNG, SVG')).toEqual(['png', 'svg']);
			const word = `${'M'.repeat(400)} end`;
			await renderImage({ template: 'headline', size: 'og', outDir: dir, exports: ['svg'], headline: word });
			const wide = SIZES.og.width - SIZES.og.pad;
			const roleOf = (line: { family: string; weight: number }) => (line.family.includes('Mono') ? 'mono' : line.weight >= 500 ? 'medium' : 'sans');
			for (const line of svgTexts(readFileSync(join(dir, 'headline-og.svg'), 'utf8'))) {
				expect(line.x + measure(roleOf(line), line.text, line.size)).toBeLessThanOrEqual(wide + 1);
			}
			expect(svgTexts(readFileSync(join(dir, 'headline-og.svg'), 'utf8')).some((line) => line.text.includes('…'))).toBe(true);

			const eyebrow = 'Now shipping '.repeat(30);
			await renderImage({ template: 'announcement', size: 'og', outDir: dir, exports: ['svg'], eyebrow, headline: 'Phone lines' });
			for (const line of svgTexts(readFileSync(join(dir, 'announcement-og.svg'), 'utf8'))) {
				expect(line.x + measure(roleOf(line), line.text, line.size)).toBeLessThanOrEqual(wide + 1);
			}

			const many = Array.from({ length: 40 }, () => 'mailbox').join(' ');
			await renderImage({ template: 'statement', size: 'og', outDir: dir, exports: ['svg'], headline: many, subtext: many });
			const lines = svgTexts(readFileSync(join(dir, 'statement-og.svg'), 'utf8'));
			const host = lines.find((line) => line.text === 'inkbox.ai');
			expect(host).toBeTruthy();
			for (const line of lines) {
				if (line === host) continue;
				expect(line.y + line.size * 0.3).toBeLessThan(host!.y);
			}

			const shot = join(dir, 'shot.png');
			writeFileSync(shot, solidPng(100, 100, (_x, y) => (y < 20 ? [220, 0, 0, 255] : [0, 0, 220, 255])));
			await renderImage({ template: 'Frame', size: 'OG', ground: 'Lilac', outDir: dir, exports: ['png', 'svg'], headline: 'Shot', image: shot });
			const framed = pngPixels(readFileSync(join(dir, 'frame-og.png')));
			let red = 0;
			for (let i = 0; i < framed.data.length; i += 4) {
				if (framed.data[i] > 180 && framed.data[i + 2] < 40) red += 1;
			}
			expect(red).toBeGreaterThan(100);
			expect(readFileSync(join(dir, 'frame-og.svg'), 'utf8')).toContain(colorHex('bg-subtle'));
			await renderImage({ template: 'frame', size: 'landscape', outDir: dir, exports: ['png'], headline: 'Shot', image: join(ROOT, 'brand', 'reference', 'site-home-desktop.jpg') });
			expect(pngSize(readFileSync(join(dir, 'frame-landscape.png')))).toEqual({ width: 1200, height: 675 });
			writeFileSync(join(dir, 'notes.txt'), 'not a directory');
			await expect(renderImage({ template: 'headline', size: 'og', outDir: join(dir, 'notes.txt'), exports: ['png'], headline: 'Hi' })).rejects.toThrow(/directory/);
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	}, 30000);

	it('matches the committed sample pictures', async () => {
		const dir = mkdtempSync(join(tmpdir(), 'ds-image-'));
		try {
			for (const sample of imageSamples) {
				await renderImage({ ...sample, outDir: dir, exports: ['png'] });
				const name = `${sample.template}-${sample.size}.png`;
				expect(readFileSync(join(dir, name))).toEqual(readFileSync(join(ROOT, 'brand', 'imagery', 'samples', name)));
			}
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	}, 30000);
});

describe('image command', () => {
	it('answers with JSON a command can read', () => {
		const dir = mkdtempSync(join(tmpdir(), 'ds-image-cli-'));
		try {
			const listed = JSON.parse(execFileSync(process.execPath, [BIN, 'image', 'templates', '--json'], { encoding: 'utf8' }));
			expect(listed.templates.map((item: { id: string }) => item.id)).toEqual([...TEMPLATE_IDS]);
			const content = join(dir, 'content.json');
			writeFileSync(content, JSON.stringify({ template: 'announcement', headline: 'Phone lines', eyebrow: 'New', subtext: 'A number of their own.' }));
			const rendered = JSON.parse(execFileSync(process.execPath, [BIN, 'social', '--size', 'square', '--content', content, '--export', 'png', '--out', dir, '--json'], { encoding: 'utf8' }));
			expect(rendered.ok).toBe(true);
			expect(rendered.width).toBe(1080);
			expect(rendered.height).toBe(1080);
			expect(pngSize(readFileSync(join(dir, 'announcement-square.png')))).toEqual({ width: 1080, height: 1080 });
			let failed: { status?: number; stdout?: string } | undefined;
			try {
				execFileSync(process.execPath, [BIN, 'og', '--template', 'headline', '--json'], { encoding: 'utf8' });
			} catch (error) {
				failed = error as { status?: number; stdout?: string };
			}
			expect(failed?.status).toBe(1);
			expect(JSON.parse(String(failed?.stdout))).toMatchObject({ ok: false, error: expect.stringContaining('--headline') });
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});
});
