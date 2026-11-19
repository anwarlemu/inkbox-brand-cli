import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadImage, createCanvas } from '@napi-rs/canvas';
import { describe, expect, it } from 'vitest';
import { logoDoc } from '../src/assets/brand-art.js';
import { tokenColor } from '../src/assets/canvas.js';
import { renderSlide, slideTypes } from '../src/assets/deck.js';
import { designOf, imageSizes, picturesFor, renderDesign } from '../src/assets/image.js';
import { renderIllustration, subjects } from '../src/assets/illustrate.js';
import { findItem, merchItems, renderItem, PX_PER_IN } from '../src/assets/merch.js';
import { TEMPLATES } from '../src/assets/share.js';
import { stillFrame, videoDoc, videoTemplates } from '../src/assets/video.js';
import { figmaTokens, figmaTokenScripts } from '../src/figma/tokens.js';
import { tokens } from '../src/lib/brand.js';
import { helpRow } from '../src/lib/help-row.js';

const ROOT = join(import.meta.dirname, '..');
const BIN = join(ROOT, 'bin.js');
const sha = (b: Buffer | string) => createHash('sha256').update(b).digest('hex');
const SOCIAL = ['og', 'square', 'portrait', 'story', 'landscape', 'x-banner', 'linkedin-banner'];

function run(args: string[], cwd?: string) {
	return spawnSync(process.execPath, [BIN, ...args], { encoding: 'utf8', cwd });
}

/** Every hex color an SVG paints with (outside embedded pictures), as #RRGGBB. */
function svgColors(svg: string): Set<string> {
	const body = svg.replace(/href="data:[^"]*"/g, '');
	const out = new Set<string>();
	for (const m of body.matchAll(/(?:fill|stroke|stop-color|flood-color)="(#[0-9a-fA-F]{6})"/g)) out.add(m[1]!.toUpperCase());
	return out;
}
const tokenHexes = () => new Set(Object.values(tokens().site).filter((v) => /^#[0-9a-f]{6}$/i.test(v)).map((v) => v.toUpperCase()));

describe('image', () => {
	it('draws every template at every size of the social set, the same bytes every time', async () => {
		const pics = await picturesFor(null);
		for (const size of SOCIAL) {
			const want = imageSizes().find((s) => s.id === size)!;
			for (const template of TEMPLATES) {
				const a = await renderDesign(designOf({ template, size }), pics);
				const im = await loadImage(a.png!);
				expect([im.width, im.height]).toEqual([want.width, want.height]);
				if (size === 'og') {
					const b = await renderDesign(designOf({ template, size }), pics);
					expect(sha(b.png!)).toBe(sha(a.png!));
				}
			}
		}
	}, 120_000);

	it('writes SVG with text as paths and only brand token colors', async () => {
		const pics = await picturesFor(null);
		const allowed = tokenHexes();
		for (const template of TEMPLATES) {
			const r = await renderDesign(designOf({ template, size: 'og' }), pics, { png: false, svg: true });
			expect(r.svg).toMatch(/^<\?xml|^<svg/);
			expect(r.svg).not.toMatch(/<text/);
			const again = await renderDesign(designOf({ template, size: 'og' }), pics, { png: false, svg: true });
			expect(sha(again.svg!)).toBe(sha(r.svg!));
			for (const c of svgColors(r.svg!)) expect(allowed.has(c), `${template}: ${c} is not a token`).toBe(true);
		}
	}, 60_000);

	it('rebuilds the same layout from the same seed, and another from another seed', async () => {
		const pics = await picturesFor(null);
		const one = await renderDesign(designOf({ template: 'tile', seed: 42 }), pics);
		const again = await renderDesign(designOf({ template: 'tile', seed: 42 }), pics);
		expect(sha(again.png!)).toBe(sha(one.png!));
		const seeds = new Set(await Promise.all([1, 2, 3, 4, 5, 6].map(async (seed) => designOf({ template: 'tile', seed }).template)));
		expect(seeds.size).toBeGreaterThan(1);
	});

	it('takes a picture only in a template with a window, and rejects unknown names', () => {
		expect(designOf({ template: 'app', picture: true }).window).toBe('picture');
		expect(() => designOf({ template: 'reef', picture: true })).toThrow(/no window/);
		expect(() => designOf({ template: 'tiles' })).toThrow(/Did you mean `tile`/);
		expect(() => designOf({ template: 'tile', size: 'sqare' })).toThrow(/Did you mean `square`/);
		expect(() => designOf({ template: 'tile', theme: 'lavendar' })).toThrow(/Did you mean `lavender`/);
		expect(() => designOf({ template: 'tile', badge: 'yc' })).toThrow(/Unknown badge/);
	});

	it('picks an occasion\'s look and words', () => {
		const d = designOf({ template: 'hiring' });
		expect(d.template).toBe('announce');
		expect(d.theme).toBe('purple');
		expect(d.headline).toMatch(/AI agents/);
	});

	it('keeps the lockup\'s own gap between the octopus and the wordmark (the brand defines no clear space)', () => {
		const L = logoDoc().lockup;
		expect(L.word.x - L.mark.w).toBeCloseTo(14.95, 2);
		expect(L.mark.h).toBe(L.h);
	});
});

describe('deck', () => {
	it('renders every slide type at 1920 by 1080, the same bytes every time', async () => {
		for (const type of slideTypes()) {
			const a = await renderSlide({ type });
			const b = await renderSlide({ type });
			const im = await loadImage(a.png!);
			expect([im.width, im.height]).toEqual([1920, 1080]);
			expect(sha(b.png!)).toBe(sha(a.png!));
		}
	}, 60_000);

	it('writes one PDF with a page per slide and rejects unknown slots', () => {
		const dir = mkdtempSync(join(tmpdir(), 'ds-deck-'));
		try {
			const r = run(['deck', 'cover', '--out', dir, '--json']);
			expect(r.status).toBe(0);
			const pdf = readFileSync(join(dir, 'deck.pdf'), 'latin1');
			expect(pdf.startsWith('%PDF-')).toBe(true);
			expect(pdf.match(/\/Type \/Page\b/g)?.length).toBe(1);
			const bad = run(['deck', 'covr', '--json']);
			expect(bad.status).toBe(1);
			expect(JSON.parse(bad.stdout).error).toMatch(/Did you mean `cover`/);
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});
});

describe('video', () => {
	it('draws the same still for the same time, and ends on the finished design', async () => {
		const pics = await picturesFor(null);
		const o = { template: 'reveal', size: 'square', width: 1080, height: 1080, seconds: 4, fps: 30 };
		const a = await stillFrame(o, pics, 0.3);
		expect(sha(await stillFrame(o, pics, 0.3))).toBe(sha(a));
		const end = await stillFrame(o, pics, 4);
		const image = await renderDesign({ ...designOf({ template: 'tile', size: 'custom', width: 1080, height: 1080 }) }, pics);
		const px = async (b: Buffer) => {
			const im = await loadImage(b);
			const c = createCanvas(im.width, im.height);
			c.getContext('2d').drawImage(im, 0, 0);
			return c.getContext('2d').getImageData(0, 0, im.width, im.height).data;
		};
		const [e, i] = [await px(end), await px(image.png!)];
		let diff = 0;
		for (let k = 0; k < e.length; k += 4) if (Math.abs(e[k]! - i[k]!) > 2) diff++;
		expect(diff / (e.length / 4)).toBeLessThan(0.001);
		expect(sha(a)).not.toBe(sha(end));
	}, 60_000);

	it('rejects unknown templates and sizes', () => {
		expect(videoTemplates()).toEqual(['reveal', 'inbox', 'band', 'announce', 'card']);
		expect(Object.keys(videoDoc().sizes)).toEqual(['square', 'portrait', 'vertical', 'landscape']);
		const bad = run(['video', 'revel', '--still', '--json']);
		expect(bad.status).toBe(1);
		expect(JSON.parse(bad.stdout).error).toMatch(/Did you mean `reveal`/);
	});

	it.skipIf(spawnSync('ffmpeg', ['-version']).status !== 0)('encodes MP4 that repeats byte for byte', () => {
		const dir = mkdtempSync(join(tmpdir(), 'ds-video-'));
		try {
			for (const out of ['a', 'b']) expect(run(['video', 'card', '--seconds', '2', '--fps', '12', '--format', 'mp4', '--out', join(dir, out)]).status).toBe(0);
			expect(sha(readFileSync(join(dir, 'a', 'card-square.mp4')))).toBe(sha(readFileSync(join(dir, 'b', 'card-square.mp4'))));
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	}, 120_000);
});

describe('merch', () => {
	it('writes each item at its real size with bleed, and the sticker\'s die line in the SVG only', async () => {
		for (const item of merchItems()) {
			const r = await renderItem(item, { dpi: 72, png: true, svg: item.id === 'sticker' });
			expect(r.widthIn).toBeCloseTo(item.size[0] + 2 * item.bleed, 5);
			const im = await loadImage(r.png!);
			expect(im.width).toBe(Math.round((item.size[0] + 2 * item.bleed) * 72));
			if (r.svg) {
				expect(r.svg).toMatch(/id="CutContour"/);
				expect(r.svg).toMatch(/width="3.25in"/);
			}
		}
		expect(PX_PER_IN).toBe(300);
	}, 60_000);

	it('never prints the full-color octopus on a one-color file', async () => {
		const r = await renderItem(findItem('tee-front'), { variant: 'one-ink', dpi: 72 });
		const im = await loadImage(r.png!);
		const c = createCanvas(im.width, im.height);
		c.getContext('2d').drawImage(im, 0, 0);
		const data = c.getContext('2d').getImageData(0, 0, im.width, im.height).data;
		const ink = tokenColor('ink');
		const [R, G, B] = [1, 3, 5].map((i) => Number.parseInt(ink.slice(i, i + 2), 16));
		let off = 0;
		for (let k = 0; k < data.length; k += 4) if (data[k + 3] === 255 && (Math.abs(data[k]! - R!) > 1 || Math.abs(data[k + 1]! - G!) > 1 || Math.abs(data[k + 2]! - B!) > 1)) off++;
		expect(off).toBe(0);
	});

	it('rejects a variant the item does not offer', () => {
		const bad = run(['merch', 'cap-front', '--variant', 'paper', '--json']);
		expect(bad.status).toBe(1);
		expect(JSON.parse(bad.stdout).error).toMatch(/Unknown variant for cap-front/);
	});
});

describe('illustrate', () => {
	it('draws every subject the same every time, with the reef as its own vectors in SVG', async () => {
		for (const subject of subjects()) {
			const a = await renderIllustration({ subject, size: 'og' }, { png: true, svg: true });
			const b = await renderIllustration({ subject, size: 'og' }, { png: true, svg: true });
			expect(sha(b.png!)).toBe(sha(a.png!));
			expect(sha(b.svg!)).toBe(sha(a.svg!));
			expect(a.svg).not.toMatch(/<text/);
		}
		const reef = await renderIllustration({ subject: 'reef' }, { png: false, svg: true });
		expect(reef.svg).toMatch(/viewBox="0 0 1200 289"/);
		expect((reef.svg!.match(/<path/g) ?? []).length).toBeGreaterThan(50);
	}, 120_000);

	it('takes a picture only in the window, and rejects unknown subjects', async () => {
		await expect(renderIllustration({ subject: 'reef', picture: {} as never })).rejects.toThrow(/takes no picture/);
		await expect(renderIllustration({ subject: 'octopuss' })).rejects.toThrow(/Did you mean `octopus`/);
	});
});

describe('figma', () => {
	it('writes the tokens as variables and checks values against them', () => {
		const doc = figmaTokens();
		expect(doc.modes).toEqual(['Site']);
		expect(doc.variables.find((v) => v.css === '--ds-color-ink')).toBeTruthy();
		expect(figmaTokenScripts(doc).every((s) => s.length < 45000)).toBe(true);
		const dir = mkdtempSync(join(tmpdir(), 'ds-figma-'));
		try {
			const pull = run(['figma', 'pull', 'https://www.figma.com/design/abcdefghijklmnop/x?node-id=1-2', '--out', dir, '--json']);
			expect(pull.status).toBe(0);
			expect(JSON.parse(pull.stdout).nodeId).toBe('1:2');
			const bad = run(['figma', 'pusj', '--json']);
			expect(bad.status).toBe(1);
			expect(JSON.parse(bad.stdout).error).toMatch(/Did you mean `push`/);
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});
});

describe('commands', () => {
	it('names an unknown command with the closest one and exits 1', () => {
		const bad = run(['illustrat']);
		expect(bad.status).toBe(1);
		expect(bad.stderr).toMatch(/Did you mean `illustrate`/);
	});

	it('keeps help rows from running into their descriptions', () => {
		expect(helpRow('short', 'what it does', 10)).toBe('  short     what it does');
		expect(helpRow('a command far longer than the column', 'what it does', 10)).toBe(`  a command far longer than the column\n  ${' '.repeat(10)}what it does`);
		for (const c of ['image', 'deck', 'video', 'merch', 'illustrate', 'figma']) {
			const help = execFileSync(process.execPath, [BIN, c, '--help'], { encoding: 'utf8' });
			for (const line of help.split('\n')) if (/^\s+-/.test(line) && line.length > 40) expect(line).toMatch(/\S\s{2,}\S/);
		}
	});
});
