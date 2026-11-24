import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadImage, createCanvas } from '@napi-rs/canvas';
import { describe, expect, it } from 'vitest';
import { highlightColor, logoDoc, themes } from '../src/assets/brand-art.js';
import { tokenColor } from '../src/assets/canvas.js';
import { renderSlide, slideTypes } from '../src/assets/deck.js';
import { designOf, imageSizes, picturesFor, renderDesign } from '../src/assets/image.js';
import { renderIllustration, subjects } from '../src/assets/illustrate.js';
import { findItem, merchItems, renderItem, PX_PER_IN } from '../src/assets/merch.js';
import { contrast } from '../src/assets/place.js';
import { TEMPLATES } from '../src/assets/share.js';
import { stillFrame, videoDoc, videoTemplates } from '../src/assets/video.js';
import { mustPass } from '../src/design/adapter.js';
import { figmaTokens, figmaTokenScripts } from '../src/figma/tokens.js';
import { tokens } from '../src/lib/brand.js';
import { helpRow } from '../src/lib/help-row.js';

const ROOT = join(import.meta.dirname, '..');
const BIN = join(ROOT, 'bin.js');
const sha = (b: Buffer | string) => createHash('sha256').update(b).digest('hex');
const SOCIAL = ['og', 'square', 'portrait', 'story', 'landscape', 'x-banner', 'linkedin-banner', 'avatar'];
const LONG = 'Everything your agents need to search, buy and reply in one place';

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
			for (const template of size === 'avatar' ? (['mark'] as const) : TEMPLATES) {
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
			const req = { template, size: 'og', ...(template === 'mark' ? {} : { headline: LONG, badge: 'New' }) };
			const r = await renderDesign(designOf(req), pics, { png: false, svg: true });
			expect(r.svg).toMatch(/^<\?xml|^<svg/);
			expect(r.svg).not.toMatch(/<text/);
			const again = await renderDesign(designOf(req), pics, { png: false, svg: true });
			expect(sha(again.svg!)).toBe(sha(r.svg!));
			for (const c of svgColors(r.svg!)) if (c !== '#FFFFFF') expect(allowed.has(c), `${template}: ${c} is not a token`).toBe(true);
		}
	}, 60_000);

	it('rebuilds the same layout from the same seed, and another from another seed', async () => {
		const pics = await picturesFor(null);
		const one = await renderDesign(designOf({ template: 'tile', seed: 42 }), pics);
		const again = await renderDesign(designOf({ template: 'tile', seed: 42 }), pics);
		expect(sha(again.png!)).toBe(sha(one.png!));
		const shas = new Set(await Promise.all([1, 2, 3, 4, 5, 6].map(async (seed) => sha((await renderDesign(designOf({ template: 'tile', seed }), pics)).png!))));
		expect(shas.size).toBeGreaterThan(1);
		// A named template is kept; with none named, the seed picks one.
		expect(designOf({ template: 'tile', seed: 5 }).template).toBe('tile');
		expect(new Set([1, 2, 3, 4, 5, 6].map((seed) => designOf({ seed }).template)).size).toBeGreaterThan(1);
	});

	it('takes a picture only in a template with a window, and rejects unknown names', () => {
		expect(designOf({ template: 'app', picture: true }).window).toBe('picture');
		expect(() => designOf({ template: 'reef', picture: true })).toThrow(/no window/);
		expect(() => designOf({ template: 'tiles' })).toThrow(/Did you mean `tile`/);
		expect(() => designOf({ template: 'tile', size: 'sqare' })).toThrow(/Did you mean `square`/);
		expect(() => designOf({ template: 'tile', theme: 'lavendar' })).toThrow(/Did you mean `lavender`/);
		expect(() => designOf({ template: 'tile', badgeStyle: 'yc' })).toThrow(/Unknown badge style/);
		expect(designOf({ template: 'tile', badge: 'Beta' }).badgeText).toBe('Beta');
		expect(designOf({ template: 'tile', badge: 'dot', badgeText: 'Beta' })).toMatchObject({ badge: 'dot', badgeText: 'Beta' });
	});

	it('picks an occasion\'s look, and draws its words only as a sample', () => {
		const d = designOf({ template: 'hiring' });
		expect(d.template).toBe('announce');
		expect(d.theme).toBe('purple');
		expect([d.headline, d.body, d.badgeText, d.credit, d.partnerName]).toEqual(['', '', '', '', '']);
		expect(designOf({ template: 'hiring', sample: true }).headline).toMatch(/AI agents/);
	});

	it('draws every word whole on every template and size, or refuses and says what to shorten', async () => {
		const pics = await picturesFor(null);
		let drawn = 0;
		for (const s of imageSizes()) {
			for (const template of TEMPLATES) {
				if (template === 'mark' || s.id === 'avatar') continue;
				let r;
				try {
					const d = designOf({ template, size: s.id, headline: `${LONG}, with email, phone numbers and calendars`, badge: 'New', body: 'One line about it', credit: '@acme' });
					r = await renderDesign(d, pics);
					mustPass(d, r);
				} catch (err) {
					expect((err as Error).message, `${template} ${s.id}`).toMatch(/too long/);
					continue;
				}
				drawn++;
				const head = r.layers.find((l) => l.id === 'headline')!.text!;
				expect(head.drawn).toBe(head.asked);
				for (const id of ['badge', 'body', 'credit']) expect(r.layers.some((l) => l.id === id), `${template} ${s.id} ${id}`).toBe(true);
			}
		}
		expect(drawn).toBeGreaterThan(110);
	}, 240_000);

	it('invents nothing: without copy, the only words are the brand\'s own', async () => {
		const pics = await picturesFor(null);
		for (const template of TEMPLATES) {
			const r = await renderDesign(designOf({ template }), pics);
			for (const l of r.layers) if (l.text) expect(l.text.own, `${template} ${l.id}: ${l.text.drawn}`).toBe(true);
		}
	}, 60_000);

	it('refuses letters the brand\'s face does not have, and takes the ones it does', () => {
		expect(() => designOf({ template: 'tile', headline: 'Launch day 🚀' })).toThrow(/no character for "🚀"/);
		expect(() => designOf({ template: 'tile', headline: 'こんにちは' })).toThrow(/no character/);
		expect(designOf({ template: 'tile', headline: 'Почта “для” агентов & więcej' }).headline).toContain('&');
	});

	it('refuses a word wider than the room for words, and a template that draws no words', async () => {
		const pics = await picturesFor(null);
		const long = designOf({ template: 'tile', size: 'x-banner', headline: 'Donaudampfschifffahrtselektrizitätenhauptbetriebswerk' });
		await expect(renderDesign(long, pics)).rejects.toThrow(/is too long for tile/);
		expect(() => designOf({ template: 'mark', headline: 'Hello' })).toThrow(/draws no words/);
		expect(() => designOf({ template: 'tile', size: 'avatar' })).toThrow(/mark/);
	});

	it('fades a window that does not fit, in PNG and SVG', async () => {
		const pics = await picturesFor(null);
		for (const template of ['app', 'feature'] as const) {
			const r = await renderDesign(designOf({ template, headline: LONG }), pics, { png: true, svg: true });
			expect(r.drawn.fade, template).toBeTruthy();
			expect(r.svg).toMatch(/<mask id="window-fade"[\s\S]*linearGradient|linearGradient[\s\S]*<mask id="window-fade"/);
			const win = r.layers.find((l) => l.id === 'window')!.box;
			expect(win.y + win.h).toBeLessThanOrEqual(630);
		}
	});

	it('keeps the lockup\'s clear space from the words at every anchor, on every template', async () => {
		const pics = await picturesFor(null);
		const anchors = ['top-left', 'top', 'top-right', 'left', 'center', 'right', 'bottom-left', 'bottom', 'bottom-right'] as const;
		const problems: string[] = [];
		for (const template of TEMPLATES) {
			if (template === 'mark') continue;
			for (const anchor of anchors) {
				let r;
				try {
					r = await renderDesign(designOf({ template, headline: LONG, badge: 'New', body: 'One line about it', edits: { logo: { anchor } } }), pics);
				} catch (err) {
					expect((err as Error).message, `${template} ${anchor}`).toMatch(/too long/);
					continue;
				}
				const logo = r.layers.find((l) => l.id === 'logo')!;
				const clear = logo.logo!.clear;
				const zone = { x: logo.box.x - clear, y: logo.box.y - clear, w: logo.box.w + 2 * clear, h: logo.box.h + 2 * clear };
				for (const l of r.layers.filter((x) => x.kind === 'text' && x.id !== 'partner'))
					for (const q of l.ink ?? [l.box]) if (q.x < zone.x + zone.w - 0.5 && zone.x < q.x + q.w - 0.5 && q.y < zone.y + zone.h - 0.5 && zone.y < q.y + q.h - 0.5) problems.push(`${template} ${anchor}: ${l.id}`);
			}
		}
		expect(problems).toEqual([]);
	}, 240_000);

	it('keeps its highlighted words readable on every theme', () => {
		for (const [theme, t] of Object.entries(themes())) for (const h of ['pink', 'lilac', 'violet']) expect(contrast(highlightColor(h, theme), t.bg), `${h} on ${theme}`).toBeGreaterThanOrEqual(3);
		for (const t of Object.values(themes())) expect(contrast(t.muted, t.bg)).toBeGreaterThanOrEqual(4.5);
	});

	it('makes a numbered carousel with one headline size', () => {
		const dir = mkdtempSync(join(tmpdir(), 'ds-carousel-'));
		try {
			writeFileSync(join(dir, 'c.json'), JSON.stringify({ template: 'announce', slides: [{ headline: 'One' }, { headline: LONG }, { headline: 'Three', body: 'Last' }] }));
			const r = run(['image', '--carousel', 'c.json', '--size', 'portrait', '--format', 'png', '--out', 'out', '--json'], dir);
			expect(r.status, r.stdout).toBe(0);
			expect(JSON.parse(r.stdout).files.map((f: { path: string }) => f.path)).toEqual(['out/01-announce-portrait.png', 'out/02-announce-portrait.png', 'out/03-announce-portrait.png']);
			writeFileSync(join(dir, 'bad.json'), JSON.stringify({ slides: [{ headline: 'One', hedline: 'x' }, {}] }));
			expect(run(['image', '--carousel', 'bad.json', '--json'], dir).stdout).toMatch(/Did you mean `headline`/);
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	}, 30_000);

	it('writes every format, several sizes at once, and into a path with spaces', () => {
		const dir = mkdtempSync(join(tmpdir(), 'ds images '));
		try {
			const r = run(['image', 'tile', '--headline', 'Ship', '--size', 'og,x-banner', '--format', 'all', '--out', 'my images', '--json'], dir);
			expect(r.status, r.stdout).toBe(0);
			expect(JSON.parse(r.stdout).files.map((f: { format: string }) => f.format)).toEqual(['png', 'svg', 'jpg', 'webp', 'png', 'svg', 'jpg', 'webp']);
			expect(readFileSync(join(dir, 'my images', 'tile-paper-og.jpg')).subarray(0, 2).toString('hex')).toBe('ffd8');
			expect(readFileSync(join(dir, 'my images', 'tile-paper-og.webp')).subarray(8, 12).toString('latin1')).toBe('WEBP');
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	}, 60_000);

	it('keeps the lockup\'s own gap between the octopus and the wordmark (the brand publishes no clear space, so that gap is the clear space)', () => {
		const L = logoDoc().lockup;
		expect(L.word.x - L.mark.w).toBeCloseTo(14.95, 2);
		expect(L.mark.h).toBe(L.h);
		expect(logoDoc().clear.share).toBeCloseTo(14.95 / 46.08, 3);
	});
});

describe('deck', () => {
	it('renders every slide type at 1920 by 1080, the same bytes every time', async () => {
		for (const type of slideTypes().filter((t) => t !== 'images')) {
			const a = await renderSlide({ type, sample: true });
			const b = await renderSlide({ type, sample: true });
			const im = await loadImage(a.png!);
			expect([im.width, im.height]).toEqual([1920, 1080]);
			expect(sha(b.png!)).toBe(sha(a.png!));
		}
	}, 60_000);

	it('writes one PDF with a page per slide and rejects unknown slots', () => {
		const dir = mkdtempSync(join(tmpdir(), 'ds-deck-'));
		try {
			const r = run(['deck', 'cover', '--title', 'Agents', '--out', dir, '--json']);
			expect(r.status).toBe(0);
			const pdf = readFileSync(join(dir, 'deck.pdf'), 'latin1');
			expect(pdf.startsWith('%PDF-')).toBe(true);
			expect(pdf.match(/\/Type \/Page\b/g)?.length).toBe(1);
			const none = run(['deck', 'cover', '--out', dir, '--json']);
			expect(none.status).toBe(1);
			expect(JSON.parse(none.stdout).error).toMatch(/needs "title"/);
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
		const image = await renderDesign({ ...designOf({ template: 'tile', size: 'square' }) }, pics);
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
		expect(videoTemplates()).toEqual(['reveal', 'inbox', 'band', 'announce', 'card', 'logo']);
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

	it('prints only the words that were passed, whole, with room round the lockup', async () => {
		for (const item of merchItems()) {
			const bare = await renderItem(item, { dpi: 72 });
			expect(bare.layers.filter((l) => l.text)).toEqual([]);
		}
		const r = await renderItem(findItem('poster'), { dpi: 72, slots: { headline: LONG, url: 'acme.com' } });
		expect(r.layers.find((l) => l.id === 'headline')!.text!.drawn).toBe(LONG);
		await expect(renderItem(findItem('poster'), { dpi: 72, slots: { headline: `${LONG} ${LONG} ${LONG} ${LONG}` } })).rejects.toThrow(/too long/);
	}, 60_000);

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

describe('icons, email and stationery', () => {
	it('writes the favicon set with an ico holding 16, 32 and 48, and leaves another company\'s mark out of the glyphs', async () => {
		const { iconSet, glyphs } = await import('../src/assets/icons.js');
		const set = await iconSet();
		const icoFile = set.files.find((f) => f.name === 'favicon.ico')!;
		expect(icoFile.data.readUInt16LE(4)).toBe(3);
		for (const f of set.files.filter((x) => x.name.endsWith('.png'))) expect((await loadImage(f.data)).width).toBe(f.width);
		expect(glyphs().map((g) => g.name)).not.toContain('apple-logo');
	});

	it('writes emails from the words passed, and refuses one without what it needs', async () => {
		const { email } = await import('../src/assets/email.js');
		const r = await email('announcement', { headline: 'Agent Cards are here', button: 'Read', url: 'https://acme.com' });
		expect(r.html).toContain('Agent Cards are here');
		expect(r.html).not.toMatch(/Lorem|Inkbox/);
		await expect(email('receipt', { headline: 'Receipt' })).rejects.toThrow(/needs --items/);
		await expect(email('signature', { name: 'A', items: 'x' })).rejects.toThrow(/does not take --items/);
	});

	it('prints stationery with only the words passed', async () => {
		for (const id of ['business-card', 'letterhead-letter', 'certificate-letter', 'event-badge', 'name-tag', 'report-cover-letter']) {
			const bare = await renderItem(findItem(id), { dpi: 72 });
			expect(bare.layers.filter((l) => l.text), id).toEqual([]);
		}
		const card = await renderItem(findItem('business-card'), { dpi: 72, slots: { name: 'Your name', role: 'Your role' } });
		expect(card.layers.filter((l) => l.text).map((l) => l.text!.drawn)).toEqual(['Your name', 'Your role']);
	});

	it('draws the agenda, timeline and questions slides', async () => {
		for (const type of ['agenda', 'timeline', 'qa']) {
			const r = await renderSlide({ type, sample: true });
			expect((await loadImage(r.png!)).width).toBe(1920);
		}
	});
});
