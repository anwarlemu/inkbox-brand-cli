import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { crc32, deflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { brandFonts, brandLogos, brandTokens, brandVoice } from '../src/brand/system.js';
import { readImageContent } from '../src/lib/content.js';
import { emitComponent, inspectComponent, listComponents } from '../src/library/describe.js';
import { manifest } from '../src/manifest/build.js';
import { principles } from '../src/principles/read.js';
import { encodeApng } from '../src/video/apng.js';
import { frameProgress } from '../src/video/easing.js';
import { readVideoContent } from '../src/lib/content.js';
import { VIDEO_SIZE_IDS, VIDEO_TEMPLATE_IDS } from '../src/video/catalog.js';
import { renderVideo } from '../src/video/render.js';
import { renderImage } from '../src/image/render.js';
import { videoSamples } from '../scripts/video-samples.js';

const ROOT = join(import.meta.dirname, '..');
const BIN = join(ROOT, 'bin.js');

function png(width: number, height: number, pixel: [number, number, number, number]) {
	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(width, 0);
	ihdr.writeUInt32BE(height, 4);
	ihdr[8] = 8;
	ihdr[9] = 6;
	const raw = Buffer.alloc((width * 4 + 1) * height);
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const i = y * (width * 4 + 1) + 1 + x * 4;
			raw[i] = pixel[0];
			raw[i + 1] = pixel[1];
			raw[i + 2] = pixel[2];
			raw[i + 3] = pixel[3];
		}
	}
	const chunk = (type: string, data: Buffer) => {
		const body = Buffer.concat([Buffer.from(type), data]);
		const len = Buffer.alloc(4);
		len.writeUInt32BE(data.length);
		const sum = Buffer.alloc(4);
		sum.writeUInt32BE(crc32(body) >>> 0);
		return Buffer.concat([len, body, sum]);
	};
	return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

describe('manifest', () => {
	it('lists every capability, template, size, component and principle topic', () => {
		const data = manifest();
		expect(data.entry).toBe('manifest');
		expect(data.alias).toBe('describe');
		expect(data.images.templates.map((item) => item.id)).toEqual(['headline', 'statement', 'frame', 'quote', 'announcement']);
		expect(data.images.sizes.map((item) => item.id)).toEqual(['og', 'square', 'portrait', 'landscape']);
		expect(data.video.templates.map((item) => item.id)).toEqual([...VIDEO_TEMPLATE_IDS]);
		expect(data.video.sizes.map((item) => [item.id, item.width, item.height])).toEqual([
			['square', 1080, 1080],
			['vertical', 1080, 1920],
			['landscape', 1920, 1080],
		]);
		expect(data.video.renderer.id).toBe('resvg-apng');
		expect(data.components.items.map((item) => item.name)).toContain('button');
		expect(data.components.count).toBe(data.components.items.length);
		expect(data.principles.topics).toEqual(expect.arrayContaining(['product', 'website', 'voice', 'elements', 'always', 'refuse']));
		expect(data.principles.product.do.length).toBeGreaterThan(0);
		expect(data.principles.website.dont.length).toBeGreaterThan(0);
		expect(data.principles.product.look).toBe('site');
		expect(data.principles.website.look).toBe('site');
		expect(data.brand.logos).toEqual(['mark.png', 'octopus.png', 'wordmark.svg']);
	});
});

describe('brand system', () => {
	it('returns a token group and rejects an unknown name', () => {
		const color = brandTokens('color');
		expect(color.kind).toBe('group');
		if (color.kind !== 'group') return;
		expect(color.tokens['--ds-color-ink']).toMatch(/^#/);
		expect(brandTokens('colour')).toMatchObject({ kind: 'group', group: 'color' });
		const one = brandTokens('ds-color-ink');
		expect(one).toMatchObject({ kind: 'token', token: '--ds-color-ink' });
		expect(() => brandTokens('glow')).toThrow(/Unknown token or group "glow"/);
		expect(() => brandTokens('ds-color-nope')).toThrow(/Unknown token or group/);
	});

	it('lists the font files on disk and the weights that have no file', () => {
		const fonts = brandFonts();
		expect(fonts.faces.map((face) => face.file)).toEqual(['fonts/Inter-Regular.ttf', 'fonts/Inter-Medium.ttf', 'fonts/IBMPlexMono-Regular.ttf']);
		for (const face of fonts.faces) expect(face.bytes).toBeGreaterThan(1000);
		expect(fonts.faces.find((face) => face.role === 'sans')?.license).toBe('fonts/Inter-LICENSE.txt');
		expect(fonts.faces.find((face) => face.role === 'mono')?.license).toBe('fonts/IBM-Plex-OFL.txt');
		expect(fonts.missingWeights.map((item) => item.weight)).toContain(600);
		expect(fonts.unshipped).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ family: 'IBM Plex Mono', weight: 500 }),
				expect.objectContaining({ family: 'Inter', weight: 600 }),
				expect.objectContaining({ family: 'Inter', weight: 700 }),
			]),
		);
		expect(fonts.unshipped.some((item) => item.family === 'Inter' && item.weight === 500)).toBe(false);
	});

	it('lists logo files and does not invent a clear-space rule', () => {
		const logos = brandLogos();
		expect(logos.files.map((file) => file.file)).toEqual(['mark.png', 'octopus.png', 'wordmark.svg']);
		for (const file of logos.files) {
			expect(file.width).toBeGreaterThan(0);
			expect(file.height).toBeGreaterThan(0);
		}
		expect(logos.clearSpace).toBeNull();
		expect(logos.usage.some((line) => /octopus/i.test(line.text))).toBe(true);
		expect(logos.files.find((file) => file.file === 'wordmark.svg')?.referencedBy.some((path) => path.includes('svg.ts'))).toBe(true);
	});

	it('reads voice from the principles file', () => {
		const voice = brandVoice();
		expect(voice.source).toBe('brand/principles.md#voice');
		expect(voice.avoid).toEqual(expect.arrayContaining(['seamless', 'leverage', 'elevate']));
		expect(voice.text).toMatch(/Sentence case/);
	});
});

describe('principles', () => {
	it('gives product and website the same documented rules', () => {
		const doc = principles();
		expect(doc.surfaces).toEqual(['site']);
		expect(doc.product.do.map((rule) => rule.text)).toEqual(doc.website.do.map((rule) => rule.text));
		expect(doc.product.dont.map((rule) => rule.text).join('\n')).toMatch(/gradient/i);
		expect(doc.product.do.map((rule) => rule.text).join('\n')).toMatch(/focus/i);
		expect(doc.elements.length).toBeGreaterThan(10);
		expect(principles('voice')).toMatchObject({ avoid: expect.arrayContaining(['seamless']) });
		expect(() => principles('print')).toThrow(/Unknown principles topic "print"/);
	});
});

describe('components', () => {
	it('inspects real props and states and emits only those', () => {
		const listed = listComponents();
		expect(listed.items.map((item) => item.name)).toContain('button');
		expect(listed.items.map((item) => item.name)).toContain('card');
		const button = inspectComponent('Button');
		expect(button.name).toBe('button');
		const variant = button.components.find((item) => item.exportName === 'Button')?.props.find((prop) => prop.name === 'variant');
		expect(variant?.values).toEqual(expect.arrayContaining(['default', 'secondary', 'outline', 'soft', 'ghost', 'link']));
		expect(button.states.map((state) => state.name)).toEqual(expect.arrayContaining(['Preview', 'Variants', 'States']));
		const emitted = emitComponent('button', { state: 'States' });
		expect(emitted.code).toContain('function States');
		expect(emitted.code).toContain('disabled');
		const usage = emitComponent('button', { set: { variant: 'soft', size: 'sm' } });
		expect(usage.usage?.jsx).toBe('<Button variant="soft" size="sm" />');
		expect(() => emitComponent('button', { state: 'Hovering' })).toThrow(/Unknown state "Hovering"/);
		expect(() => emitComponent('button', { set: { variant: 'nope' } })).toThrow(/Unknown variant "nope"/);
		expect(() => inspectComponent('not-a-widget')).toThrow(/Unknown component "not-a-widget"/);
	});

	it('reads string unions that are not cva variants', () => {
		const separator = inspectComponent('separator');
		const orientation = separator.components.find((item) => item.exportName === 'Separator')?.props.find((prop) => prop.name === 'orientation');
		expect(orientation?.values).toEqual(['horizontal', 'vertical']);
		expect(orientation?.default).toBe('horizontal');
		expect(() => emitComponent('separator', { set: { orientation: 'diagonal' } })).toThrow(/Unknown orientation "diagonal"/);
		const dialog = inspectComponent('alert-dialog');
		const action = dialog.components.find((item) => item.exportName === 'AlertDialogAction')?.props.find((prop) => prop.name === 'variant');
		expect(action?.values).toEqual(['default', 'destructive']);
		const card = inspectComponent('card');
		const cardProps = card.components.find((item) => item.exportName === 'Card')?.props;
		expect(cardProps?.find((prop) => prop.name === 'variant')?.values).toEqual(expect.arrayContaining(['default', 'raised', 'muted']));
		expect(cardProps?.find((prop) => prop.name === 'size')?.values).toEqual(['default', 'sm']);
	});
});

describe('image validation', () => {
	it('rejects unknown content fields and fields the template does not take', async () => {
		const dir = mkdtempSync(join(tmpdir(), 'ds-content-'));
		try {
			const file = join(dir, 'content.json');
			writeFileSync(file, JSON.stringify({ headline: 'Hi', mood: 'loud' }));
			expect(() => readImageContent(file)).toThrow(/unknown field "mood"/);
			writeFileSync(file, JSON.stringify({ headline: 1 }));
			expect(() => readImageContent(file)).toThrow(/headline/);
			await expect(renderImage({ template: 'headline', size: 'og', outDir: dir, exports: ['svg'], headline: 'Hi', quote: 'No' })).rejects.toThrow(/does not take --quote/);
			await expect(renderImage({ template: 'billboard', size: 'og', outDir: dir, exports: ['png'], headline: 'Hi' })).rejects.toThrow(/Unknown template/);
			await expect(renderImage({ template: 'headline', size: 'story', outDir: dir, exports: ['png'], headline: 'Hi' })).rejects.toThrow(/Unknown size/);
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});
});

describe('video', () => {
	it('packs frames into a byte-stable APNG', () => {
		const frames = [png(2, 2, [255, 255, 255, 255]), png(2, 2, [10, 20, 30, 255])];
		const once = encodeApng(frames, 10);
		const twice = encodeApng(frames, 10);
		expect(twice).toEqual(once);
		expect(once.readUInt32BE(16)).toBe(2);
		expect(once.readUInt32BE(20)).toBe(2);
		expect(once.toString('latin1').split('acTL').length - 1).toBe(1);
		expect(once.toString('latin1').split('fcTL').length - 1).toBe(2);
		expect(() => encodeApng([png(2, 2, [0, 0, 0, 255]), png(3, 2, [0, 0, 0, 255])], 10)).toThrow(/not 2x2/);
	});

	it('rejects unknown templates, sizes and fields', async () => {
		const dir = mkdtempSync(join(tmpdir(), 'ds-video-bad-'));
		try {
			await expect(renderVideo({ template: 'poster', size: 'square', outDir: dir, headline: 'Hi' })).rejects.toThrow(/Unknown video template/);
			await expect(renderVideo({ template: 'social', size: 'og', outDir: dir, headline: 'Hi' })).rejects.toThrow(/Unknown video size/);
			await expect(renderVideo({ template: 'social', size: 'square', outDir: dir })).rejects.toThrow(/needs --headline/);
			await expect(renderVideo({ template: 'social', size: 'square', outDir: dir, headline: 'Hi', ground: 'navy' })).rejects.toThrow(/Unknown ground/);
			await expect(renderVideo({ template: 'announce', size: 'square', outDir: dir, headline: 'Hi' })).rejects.toThrow(/needs --eyebrow/);
			await expect(renderVideo({ template: 'product', size: 'square', outDir: dir, headline: 'Hi' })).rejects.toThrow(/needs --subtext/);
			const file = join(dir, 'content.json');
			writeFileSync(file, JSON.stringify({ headline: 'Hi', mood: 'loud' }));
			expect(() => readVideoContent(file)).toThrow(/unknown field "mood"/);
			expect(frameProgress(0, 10)).toBe(0);
			expect(frameProgress(8, 10)).toBe(1);
			expect(frameProgress(9, 10)).toBe(1);
			expect(frameProgress(7, 10)).toBeLessThan(1);
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});

	it('renders a square clip twice as the same bytes', async () => {
		const dir = mkdtempSync(join(tmpdir(), 'ds-video-'));
		try {
			const first = await renderVideo({ template: 'social', size: 'square', outDir: dir, headline: 'A mailbox for your agents' });
			const file = readFileSync(join(dir, 'social-square.apng'));
			expect(first.files[0]).toMatchObject({ format: 'apng', width: 1080, height: 1080 });
			expect(file.readUInt32BE(16)).toBe(1080);
			expect(file.readUInt32BE(20)).toBe(1080);
			expect(file.toString('latin1').split('fcTL').length - 1).toBe(10);
			const again = await renderVideo({ template: 'social', size: 'square', outDir: join(dir, 'again'), headline: 'A mailbox for your agents' });
			expect(readFileSync(join(dir, 'again', 'social-square.apng'))).toEqual(file);
			expect(again.files[0].bytes).toBe(file.length);
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	}, 180000);

	it('matches the committed sample videos', async () => {
		const dir = mkdtempSync(join(tmpdir(), 'ds-video-samples-'));
		try {
			for (const sample of videoSamples) {
				await renderVideo({ ...sample, outDir: dir });
				const name = `${sample.template}-${sample.size}.apng`;
				expect(readFileSync(join(dir, name))).toEqual(readFileSync(join(ROOT, 'brand', 'video', 'samples', name)));
			}
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	}, 180000);
});

describe('agent commands', () => {
	it('answers manifest, brand, principles and components as JSON and rejects unknown input', () => {
		const listed = JSON.parse(execFileSync(process.execPath, [BIN, 'manifest', '--json'], { encoding: 'utf8' }));
		expect(listed.entry).toBe('manifest');
		const described = JSON.parse(execFileSync(process.execPath, [BIN, 'describe', '--json'], { encoding: 'utf8' }));
		expect(described.components.count).toBe(listed.components.count);
		const color = JSON.parse(execFileSync(process.execPath, [BIN, 'brand', 'tokens', 'color', '--json'], { encoding: 'utf8' }));
		expect(color.tokens['--ds-color-ink']).toMatch(/^#/);
		const rules = JSON.parse(execFileSync(process.execPath, [BIN, 'principles', 'product', '--json'], { encoding: 'utf8' }));
		expect(rules.look).toBe('site');
		const button = JSON.parse(execFileSync(process.execPath, [BIN, 'components', 'inspect', 'button', '--json'], { encoding: 'utf8' }));
		expect(button.primary).toBe('Button');
		const emitted = JSON.parse(execFileSync(process.execPath, [BIN, 'components', 'emit', 'button', '--state', 'States', '--set', 'variant=soft', '--json'], { encoding: 'utf8' }));
		expect(emitted.usage.jsx).toBe('<Button variant="soft" />');
		expect(emitted.code).toContain('function States');
		const templates = JSON.parse(execFileSync(process.execPath, [BIN, 'video', 'templates', '--json'], { encoding: 'utf8' }));
		expect(templates.templates.map((item: { id: string }) => item.id)).toEqual([...VIDEO_TEMPLATE_IDS]);
		expect(templates.sizes.map((item: { id: string }) => item.id)).toEqual([...VIDEO_SIZE_IDS]);

		const fail = (args: string[]) => {
			try {
				execFileSync(process.execPath, [BIN, ...args], { encoding: 'utf8' });
			} catch (error) {
				return error as { status?: number; stdout?: string };
			}
			return undefined;
		};
		const unknown = fail(['brand', 'glow', '--json']);
		expect(unknown?.status).toBe(1);
		expect(JSON.parse(String(unknown?.stdout)).error).toMatch(/Unknown brand section/);
		const option = fail(['og', '--template', 'headline', '--headline', 'Hi', '--size', 'square', '--json']);
		expect(option?.status).toBe(1);
		expect(JSON.parse(String(option?.stdout)).error).toMatch(/unknown option/i);
		const missingTemplate = fail(['video', 'render', '--json']);
		expect(missingTemplate?.status).toBe(1);
		expect(JSON.parse(String(missingTemplate?.stdout)).error).toMatch(/--template/);
		const missingComponent = fail(['components', 'inspect', 'not-a-widget', '--json']);
		expect(missingComponent?.status).toBe(1);
		expect(JSON.parse(String(missingComponent?.stdout)).error).toMatch(/Unknown component/);
	});
});
