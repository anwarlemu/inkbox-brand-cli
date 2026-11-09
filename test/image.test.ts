import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { imageCatalog, SIZE_IDS, SIZES, TEMPLATE_IDS } from '../src/image/catalog.js';
import { renderImage } from '../src/image/render.js';
import { colorHex } from '../src/lib/brand.js';
import { imageSamples } from '../scripts/image-samples.js';

const ROOT = join(import.meta.dirname, '..');
const BIN = join(ROOT, 'bin.js');

function pngSize(buf: Buffer) {
	expect(buf.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
	return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
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
			const missing = execFileSync(process.execPath, [BIN, 'og', '--template', 'headline', '--json'], { encoding: 'utf8' });
			expect(missing).toBe('unreachable');
		} catch (error) {
			const failed = error as { status?: number; stdout?: string };
			if (failed.status === undefined) throw error;
			expect(failed.status).toBe(1);
			expect(JSON.parse(String(failed.stdout))).toMatchObject({ ok: false, error: expect.stringContaining('--headline') });
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});
});
