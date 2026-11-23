import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { crc32, deflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { brandFonts, brandLogos, brandTokens, brandVoice } from '../src/brand/system.js';
import { readContent } from '../src/lib/content.js';
import { emitComponent, inspectComponent, listComponents } from '../src/library/describe.js';
import { principles } from '../src/principles/read.js';

const ROOT = join(import.meta.dirname, '..');
const BIN = join(ROOT, 'bin.js');

describe('manifest', () => {
	it('lists every capability, template, size, component and principle topic', () => {
		const data = JSON.parse(execFileSync(process.execPath, [BIN, 'manifest', '--json'], { encoding: 'utf8' }));
		expect(data.entry).toBe('manifest');
		expect(data.alias).toBe('describe');
		expect(data.assets.image.templates.map((item: { id: string }) => item.id)).toEqual(['tile', 'app', 'outline', 'hatch', 'reef', 'feature', 'partner', 'funding', 'announce', 'card', 'mark']);
		expect(data.assets.image.sizes.map((item: { id: string }) => item.id)).toEqual(expect.arrayContaining(['og', 'square', 'portrait', 'story', 'landscape', 'x-banner', 'linkedin-banner', 'linkedin-page', 'youtube', 'youtube-thumbnail', 'email', 'avatar']));
		expect(data.assets.design.templates.length).toBeGreaterThan(30);
		expect(data.assets.video.templates.map((item: { id: string }) => item.id)).toEqual(['reveal', 'inbox', 'band', 'announce', 'card']);
		expect(data.assets.deck.slides.map((item: { id: string }) => item.id)).toEqual(['cover', 'section', 'statement', 'bullets', 'stat', 'quote', 'image', 'end']);
		expect(data.assets.illustrate.subjects.length).toBeGreaterThan(4);
		expect(data.assets.lockups.map((l: { id: string }) => l.id)).toEqual(['full', 'wordmark', 'mark']);
		for (const name of ['image', 'og', 'social', 'deck', 'video', 'merch', 'illustrate', 'design', 'figma', 'manifest']) expect(data.commands.map((c: { name: string }) => c.name)).toContain(name);
		expect(data.components.items.map((item: { name: string }) => item.name)).toContain('button');
		expect(data.components.count).toBe(data.components.items.length);
		expect(data.principles.topics).toEqual(expect.arrayContaining(['product', 'website', 'voice', 'elements', 'always', 'refuse']));
		expect(data.principles.product.look).toBe('site');
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
		expect(fonts.faces.map((face) => face.file)).toEqual(['fonts/Inter-Regular.ttf', 'fonts/Inter-Medium.ttf', 'fonts/Inter-SemiBold.ttf', 'fonts/IBMPlexMono-Regular.ttf', 'fonts/IBMPlexMono-Medium.ttf', 'fonts/IBMPlexMono-SemiBold.ttf']);
		for (const face of fonts.faces) expect(face.bytes).toBeGreaterThan(1000);
		expect(fonts.faces.find((face) => face.role === 'sans')?.license).toBe('fonts/Inter-LICENSE.txt');
		expect(fonts.faces.find((face) => face.role === 'mono')?.license).toBe('fonts/IBM-Plex-OFL.txt');
		expect(fonts.missingWeights).toEqual([]);
		expect(fonts.unshipped).toEqual(expect.arrayContaining([expect.objectContaining({ family: 'Inter', weight: 700 })]));
		expect(fonts.unshipped.some((item) => item.family === 'Inter' && item.weight === 600)).toBe(false);
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

describe('content files', () => {
	it('rejects unknown fields and values that are not text, numbers or true/false', () => {
		const dir = mkdtempSync(join(tmpdir(), 'ds-content-'));
		try {
			const file = join(dir, 'content.json');
			writeFileSync(file, JSON.stringify({ headline: 'Hi', mood: 'loud' }));
			expect(() => readContent(file, ['headline', 'body'])).toThrow(/unknown field "mood"/);
			writeFileSync(file, JSON.stringify({ headlin: 'Hi' }));
			expect(() => readContent(file, ['headline', 'body'])).toThrow(/Did you mean "headline"/);
			writeFileSync(file, JSON.stringify({ headline: ['Hi'] }));
			expect(() => readContent(file, ['headline'])).toThrow(/headline/);
			writeFileSync(file, JSON.stringify({ 'badge-text': 'New' }));
			expect(readContent(file, ['badgeText'])).toEqual({ badgeText: 'New' });
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});
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
		const templates = JSON.parse(execFileSync(process.execPath, [BIN, 'video', '--list', '--json'], { encoding: 'utf8' }));
		expect(templates.sizes.map((item: { id: string }) => item.id)).toEqual(['square', 'portrait', 'vertical', 'landscape']);

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
		const option = fail(['og', '--template', 'tile', '--mood', 'loud', '--json']);
		expect(option?.status).toBe(1);
		expect(JSON.parse(String(option?.stdout)).error).toMatch(/unknown option/i);
		const missingTemplate = fail(['image', '--json']);
		expect(missingTemplate?.status).toBe(1);
		expect(JSON.parse(String(missingTemplate?.stdout)).error).toMatch(/Name a template/);
		const missingComponent = fail(['components', 'inspect', 'not-a-widget', '--json']);
		expect(missingComponent?.status).toBe(1);
		expect(JSON.parse(String(missingComponent?.stdout)).error).toMatch(/Unknown component/);
	});
});
