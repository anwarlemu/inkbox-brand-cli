import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { applyEdits, checkDesign, contactSheet, contrast, create, decodePng, docText, encodePng, errorsOf, examples, parseDoc, parsePhrases, PLATFORMS, redo, runDesign, sheetSvg, sizeAlias, stateOf, undo, zonePx, type Adapter, type Anchor, type DesignDoc, type DesignIO, type DrawnLayer, type Rect } from '../../src/design/index.js';
import { designConformance } from './conformance.js';

// The core on its own, against a brand made up for the test: plain boxes for words, so nothing but Node is needed.

const THEMES: Record<string, { bg: string; ink: string }> = { Paper: { bg: '#ffffff', ink: '#1a1a1a' }, Mid: { bg: '#4a4a4a', ink: '#ffffff' }, Ink: { bg: '#101010', ink: '#ffffff' } };
const ANCHORS: Anchor[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
const CAN = {
	logo: { anchors: ANCHORS, scale: [0.8, 1.5] as [number, number] },
	headline: { move: true, align: true, scale: [0.6, 1.4] as [number, number] },
	body: { move: true, scale: [0.8, 1.2] as [number, number] },
	badge: { hide: true },
	art: { move: true, scale: [0.5, 1.5] as [number, number], hide: true },
};
const dims = (id: string) => PLATFORMS.find((p) => p.id === id)!;

function fake(over: Partial<{ extra: DrawnLayer[]; tamper: (l: DrawnLayer[]) => void }> = {}): Adapter {
	return {
		brand: 'acme',
		templates: () => [
			{ id: 'plain', kind: 'image', description: 'A headline and a line.', sizes: ['og', 'square', 'custom'], themes: Object.keys(THEMES), copy: [{ id: 'headline', required: true }, { id: 'body' }, { id: 'badge' }], images: [{ id: 'picture', values: ['none', 'sample:one'] }], options: [{ id: 'density', range: [0, 10] }, { id: 'field', values: ['none', 'rings'] }], layers: Object.entries(CAN).map(([id, can]) => ({ id, can })), grounds: Object.fromEntries(Object.entries(THEMES).map(([k, v]) => [k, v.bg])) },
			{ id: 'bare', kind: 'image', description: 'A headline alone.', sizes: ['og', 'story'], themes: ['Paper', 'Ink'], copy: [{ id: 'headline', required: true }], images: [], options: [], layers: [{ id: 'logo', can: CAN.logo }, { id: 'headline', can: CAN.headline }] },
			{ id: 'cap', kind: 'merch', description: 'A cap.', sizes: ['og'], themes: ['Ink'], copy: [{ id: 'title' }], images: [], options: [], layers: [] },
		],
		defaults: (t, s) => ({ size: s === 'custom' ? { id: 'custom', width: 1200, height: 800 } : { id: s, width: dims(s).width, height: dims(s).height }, theme: t === 'cap' ? 'Ink' : 'Paper', ...(t === 'plain' ? { seed: 1, options: { density: s === 'square' ? 6 : 4, field: 'none' } } : { options: {} }) }) as never,
		colors: () => Object.values(THEMES).flatMap((t) => [t.bg, t.ink]),
		aliases: { sizes: { big: 'square' }, copy: { tagline: 'body' } },
		sample: () => ({ headline: 'Sample headline' }),
		async render(doc, _dir, out) {
			const { width: W, height: H } = doc.size;
			const th = THEMES[doc.theme!]!;
			const layers: DrawnLayer[] = [];
			const e = (id: string) => doc.layers[id] ?? {};
			const pad = 60;
			const top = doc.size.id === 'story' ? 260 : pad;
			const foot = doc.size.id === 'story' ? 360 : pad;
			const lh = 40 * (e('logo').scale ?? 1);
			const a = e('logo').anchor ?? 'top-left';
			const logo: Rect = { x: a.includes('right') ? W - pad - lh * 4 : pad, y: a.includes('bottom') ? H - foot - lh : top, w: lh * 4, h: lh };
			if (doc.template !== 'cap') layers.push({ id: 'logo', kind: 'logo', box: logo, logo: { clear: 20, min: 30 }, can: CAN.logo });
			let y = top + 120 + (e('headline').dy ?? 0) * H;
			const text = (id: 'headline' | 'body' | 'badge', size: number) => {
				const v = doc.copy[id === 'headline' && doc.template === 'cap' ? 'title' : id];
				if (!v || e(id).hidden) return;
				const s = size * (e(id).scale ?? 1);
				const max = W - pad * 2;
				const per = Math.max(1, Math.floor(max / (s * 0.5)));
				const lines: string[] = [];
				let line = '';
				for (const w of v.split(/\s+/)) {
					if (w.length > per) throw new Error(`The ${id} is too long for this layout. Shorten it.`);
					if (line && line.length + 1 + w.length > per) {
						lines.push(line);
						line = w;
					} else line = line ? `${line} ${w}` : w;
				}
				lines.push(line);
				const ink = lines.map((l, i) => {
					const w = l.length * s * 0.5;
					const x = e(id).align === 'right' ? W - pad - w : e(id).align === 'center' ? (W - w) / 2 : pad;
					return { x: x + (e(id).dx ?? 0) * W, y: y + i * s * 1.2, w, h: s };
				});
				const box = { x: Math.min(...ink.map((r) => r.x)), y, w: Math.max(...ink.map((r) => r.w)), h: lines.length * s * 1.2 };
				y += box.h + 20;
				layers.push({ id, kind: 'text', box, ink, text: { asked: v, drawn: lines.join('\n'), size: s, color: th.ink, ground: [th.bg] }, can: CAN[id] });
			};
			text('headline', 64);
			if (doc.template === 'plain') {
				text('body', 32);
				text('badge', 24);
				if (!e('art').hidden && doc.images.picture !== 'none') {
					const s = 60 * (e('art').scale ?? 1);
					layers.push({ id: 'art', kind: 'art', box: { x: W - 300 + (e('art').dx ?? 0) * W + (60 - s) / 2, y: H - 160, w: s, h: s }, can: CAN.art });
				}
			}
			layers.push(...(over.extra ?? []));
			over.tamper?.(layers);
			const data = new Uint8Array(W * H * 4);
			const fill = (r: Rect, hex: string) => {
				const c = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
				for (let py = Math.max(0, Math.round(r.y)); py < Math.min(H, r.y + r.h); py++) for (let px = Math.max(0, Math.round(r.x)); px < Math.min(W, r.x + r.w); px++) data.set([...c, 255], (py * W + px) * 4);
			};
			if (out.formats.includes('png')) {
				fill({ x: 0, y: 0, w: W, h: H }, th.bg);
				for (const l of layers) for (const r of l.ink ?? [l.box]) fill(r, th.ink);
			}
			return { files: out.formats.includes('png') ? { png: encodePng({ width: W, height: H, data }) } : {}, layers };
		},
	};
}

const paint: DesignIO['paint'] = async (s) => encodePng({ width: s.width, height: 2, data: new Uint8Array(s.width * 8).fill(255) });
const adapter = fake();
const doc = (more: Record<string, string> = {}) => create(adapter, 'plain', 'og', Object.entries({ headline: 'Ship your next idea', ...more }).map(([slot, value]) => ({ op: 'copy', slot, value }))).doc;
const say = (text: string, d: DesignDoc = doc()) => {
	const info = adapter.templates().find((t) => t.id === d.template)!;
	return applyEdits(d, parsePhrases(text, { adapter, doc: d, info }).edits, adapter, text).doc;
};
const refused = (text: string, d: DesignDoc = doc()) => {
	try {
		say(text, d);
	} catch (err) {
		return (err as Error).message;
	}
	throw new Error(`"${text}" was understood`);
};

designConformance(adapter, { paint, timeout: 60_000 });

describe('design phrases', () => {
	it('reads sizes, places, themes and copy', () => {
		const d = say('bigger headline, logo top right, darker theme', doc());
		expect(d.layers).toEqual({ headline: { scale: 1.2 }, logo: { anchor: 'top-right' } });
		expect(d.theme).toBe('Mid');
		expect(d.history).toHaveLength(1);
		expect(d.history[0]!.change).toBe('bigger headline, logo top right, darker theme');
	});
	for (const [text, want] of [
		['make the headline a bit bigger', { layers: { headline: { scale: 1.08 } } }],
		['Please make the title much larger.', { layers: { headline: { scale: 1.4 } } }],
		['headline 10% smaller', { layers: { headline: { scale: 0.9 } } }],
		['scale the headline to 130%', { layers: { headline: { scale: 1.3 } } }],
		['shrink the headline by 20%', { layers: { headline: { scale: 0.8 } } }],
		['headline and logo bigger', { layers: { headline: { scale: 1.2 }, logo: { scale: 1.2 } } }],
		['move the logo to the bottom left corner and make it smaller', { layers: { logo: { anchor: 'bottom-left', scale: 0.833 } } }],
		['put the logo on the right', { layers: { logo: { anchor: 'top-right' } } }],
		['logo bottom', { layers: { logo: { anchor: 'bottom-left' } } }],
		['center the headline', { layers: { headline: { align: 'center' } } }],
		['right-align the headline', { layers: { headline: { align: 'right' } } }],
		['headline left aligned', { layers: { headline: { align: 'left' } } }],
		['move the headline up', { layers: { headline: { dy: -0.04 } } }],
		['nudge the headline right 2%', { layers: { headline: { dx: 0.02 } } }],
		['move the headline down a bit', { layers: { headline: { dy: 0.015 } } }],
		['move the headline up 63px', { layers: { headline: { dy: -0.1 } } }],
		['hide the art', { layers: { art: { hidden: true } } }],
		['no graphic', { layers: { art: { hidden: true } } }],
		['headline "Hello, world, and more"', { copy: { headline: 'Hello, world, and more' } }],
		['change the headline to “Smart quotes”', { copy: { headline: 'Smart quotes' } }],
		['the title should say "It\'s here"', { copy: { headline: "It's here" } }],
		['add a badge "New"', { copy: { badge: 'New', headline: 'Ship your next idea' } }],
		['subtitle "One line"', { copy: { body: 'One line', headline: 'Ship your next idea' } }],
		['tagline "One line"', { copy: { body: 'One line', headline: 'Ship your next idea' } }],
		['replace "next idea" with "best work"', { copy: { headline: 'Ship your best work' } }],
		['dark theme', { theme: 'Mid' }],
		['use the Ink theme', { theme: 'Ink' }],
		['in Ink', { theme: 'Ink' }],
		['darkest theme', { theme: 'Ink' }],
		['make it square', { size: { id: 'square', width: 1080, height: 1080 } }],
		['as an instagram post', { size: { id: 'square', width: 1080, height: 1080 } }],
		['1600x900', { size: { id: 'custom', width: 1600, height: 900 } }],
		['another version', { seed: 2 }],
		['seed 9', { seed: 9 }],
		['field rings', { options: { density: 4, field: 'rings' } }],
		['more density', { options: { density: 5.2, field: 'none' } }],
		['picture "sample:one"', { images: { picture: 'sample:one' } }],
		['bigger headline and darker theme', { theme: 'Mid', layers: { headline: { scale: 1.2 } } }],
	] as [string, object][]) it(text, () => {
		expect(say(text)).toMatchObject(want);
	});
	it('removes copy that can go, and keeps what is needed', () => {
		expect(say('remove the body', doc({ body: 'One line' })).copy).toEqual({ headline: 'Ship your next idea' });
		expect(refused('remove the headline')).toMatch(/headline/);
	});
	it('resets a layer, and everything', () => {
		const d = say('bigger headline, logo top right');
		expect(say('reset the headline', d).layers).toEqual({ logo: { anchor: 'top-right' } });
		expect(say('reset everything', d).layers).toEqual({});
	});
	it('fails whole, with the closest things it can do', () => {
		const m = refused('bigger headline, do a barrel roll');
		expect(m).toMatch(/Nothing was changed/);
		expect(m).toMatch(/barrel roll/);
		expect(refused('bigger headlin')).toMatch(/bigger headline/);
		expect(refused('headline: Ship faster')).toMatch(/quotes/);
	});
	it('refuses what no brand allows, with the reason', () => {
		expect(refused('make the headline red')).toMatch(/Colors come only from the brand's themes: Paper, Mid, Ink/);
		expect(refused('#ff0000 background')).toMatch(/themes/);
		expect(refused('use Comic Sans')).toMatch(/Type comes from the brand/);
		expect(refused('make the headline bold')).toMatch(/Type comes from the brand/);
		expect(refused('stretch the logo')).toMatch(/stretched/);
		expect(refused('add a drop shadow')).toMatch(/Effects/);
		expect(refused('bigger button')).toMatch(/has no "button"/);
		expect(refused('logo in the center')).toMatch(/top-left/);
		expect(refused('hide the logo')).toMatch(/cannot be hidden/);
		expect(refused('lighter theme')).toMatch(/already the lightest/);
		expect(refused('as a story')).toMatch(/does not come in story/);
	});
	it('every phrase it offers is understood', () => {
		for (const t of adapter.templates().filter((x) => x.kind === 'image')) {
			const d = create(adapter, t.id, 'og', [{ op: 'copy', slot: 'headline', value: 'old words' }, ...(t.id === 'plain' ? [{ op: 'copy' as const, slot: 'body', value: 'x' }, { op: 'copy' as const, slot: 'badge', value: 'x' }, { op: 'theme' as const, value: 'Mid' }] : [])]).doc;
			for (const e of examples({ adapter, info: t, doc: d })) {
				const r = parsePhrases(e, { adapter, doc: d, info: t });
				expect(r.edits.length, e).toBeGreaterThan(0);
			}
		}
	});
	it('knows what is not there, and what undo is for', () => {
		expect(refused('hide the badge')).toMatch(/no badge to take out/);
		expect(refused('go back')).toMatch(/design undo/);
		expect(say('text bigger').layers).toEqual({ headline: { scale: 1.2 } });
		expect(say('swap the art for one').images).toEqual({ picture: 'sample:one' });
		expect(say('back to Paper', say('Ink theme')).theme).toBe('Paper');
	});
	it('a step stops at the range, then says so', () => {
		let d = say('much bigger headline');
		expect(d.layers.headline!.scale).toBe(1.4);
		expect(refused('bigger headline', d)).toMatch(/already at its largest.*0.6 to 1.4/);
		d = say('headline 99% smaller');
		expect(d.layers.headline!.scale).toBe(0.6);
	});
});

describe('design documents', () => {
	it('undo and redo restore exact state through any number of edits', () => {
		const steps = ['bigger headline', 'logo top right', 'Ink theme', 'headline "Two"', 'make it square', 'another version', 'field rings', 'bare layout'];
		const states: DesignDoc[] = [doc()];
		for (const s of steps) states.push(say(s, states.at(-1)!));
		let d = states.at(-1)!;
		for (let i = steps.length - 1; i >= 0; i--) {
			d = undo(d).doc;
			expect(stateOf(d), steps[i]).toEqual(stateOf(states[i]!));
		}
		expect(() => undo(d)).toThrow(/nothing to undo/);
		d = redo(d, 100).doc;
		expect(docText(d)).toBe(docText(states.at(-1)!));
		const branched = say('Mid theme', undo(say('Ink theme')).doc);
		expect(branched.future).toEqual([]);
	});
	it('writes the same bytes whatever order the edits came in, and reads them back', () => {
		const a = create(adapter, 'plain', 'og', [{ op: 'copy', slot: 'headline', value: 'A' }, { op: 'copy', slot: 'body', value: 'B' }]).doc;
		const b = create(adapter, 'plain', 'og', [{ op: 'copy', slot: 'body', value: 'B' }, { op: 'copy', slot: 'headline', value: 'A' }]).doc;
		expect(docText(a)).toBe(docText(b));
		expect(docText(parseDoc(docText(a), adapter))).toBe(docText(a));
		expect(docText(a)).not.toMatch(/\d{4}-\d\d-\d\dT/);
	});
	it('a new size takes the size\'s own settings but keeps what the person set', () => {
		expect(say('make it square').options.density).toBe(6);
		expect(say('make it square', say('density 9')).options.density).toBe(9);
	});
	it('never drops copy when the layout changes', () => {
		expect(() => say('bare layout', doc({ body: 'One line' }))).toThrow(/"One line" would be lost.*--set body=/s);
		const r = applyEdits(doc({ body: 'One line' }), [{ op: 'template', value: 'bare' }, { op: 'copy', slot: 'body', value: null }], adapter);
		expect(r.doc.copy).toEqual({ headline: 'Ship your next idea' });
	});
	it('refuses damaged, foreign and off-brand files', () => {
		const t = docText(doc());
		const bad = (from: string | RegExp, to: string) => () => parseDoc(t.replace(from, to), adapter);
		expect(bad('"acme"', '"other"')).toThrow(/other design/);
		expect(bad('"theme": "Paper"', '"theme": "Pink"')).toThrow(/no theme "Pink"/);
		expect(bad('"copy": {', '"color": "#f00",\n\t"copy": {')).toThrow(/"color"/);
		expect(bad('"width": 1200', '"width": 1300')).toThrow(/1200 by 630/);
		expect(bad('"layers": {}', '"layers": { "logo": { "color": "#f00" } }')).toThrow(/does not take "color"/);
		expect(bad('"layers": {}', '"layers": { "logo": { "scale": 9 } }')).toThrow(/0.8 to 1.5/);
		expect(bad('"density": 4', '"density": 400')).toThrow(/0 to 10/);
		expect(() => parseDoc('{', adapter)).toThrow(/not JSON/);
		expect(() => create(adapter, 'plain', 'og', [])).toThrow(/needs headline/);
		expect(() => create(adapter, 'plian', 'og', [])).toThrow(/Did you mean plain/);
		expect(() => create(adapter, 'plain', 'og', [{ op: 'copy', slot: 'headline', value: 'A' }, { op: 'allow', rule: 'color' }])).toThrow(/brand rule/);
	});
});

describe('design check', () => {
	const found = async (a: Adapter, d: DesignDoc) => {
		const r = await a.render(d, '.', { formats: ['png'], scale: 1 });
		return errorsOf(checkDesign({ doc: d, info: a.templates().find((t) => t.id === d.template)!, layers: r.layers, adapter: a, png: r.files.png })).map((f) => f.rule);
	};
	const with_ = (tamper: (l: DrawnLayer[]) => void) => found(fake({ tamper }), doc({ body: 'One line about it' }));
	const layer = (l: DrawnLayer[], id: string) => l.find((x) => x.id === id)!;
	it('passes a clean design', async () => expect(await with_(() => {})).toEqual([]));
	it('finds each broken rule', async () => {
		expect(await with_((l) => (layer(l, 'body').text!.drawn = 'One line about'))).toEqual(['words']);
		expect(await with_((l) => l.splice(l.indexOf(layer(l, 'body')), 1))).toEqual(['words']);
		expect(await with_((l) => Object.assign(layer(l, 'body').text!, { asked: 'One line about it', drawn: 'One line about it 20M+' }))).toContain('invented');
		expect(await with_((l) => (layer(l, 'body').text!.color = '#ff00ff'))).toContain('color');
		expect(await with_((l) => Object.assign(layer(l, 'body').text!, { color: '#4a4a4a', ground: ['#101010'] }))).toEqual(['contrast']);
		expect(await with_((l) => (layer(l, 'body').text!.size = 14))).toEqual(['small-text']);
		expect(await with_((l) => (layer(l, 'logo').box.h = 20))).toEqual(['logo-size']);
		expect(await with_((l) => (layer(l, 'logo').box.x = -20))).toContain('logo-whole');
		expect(await with_((l) => (layer(l, 'art').box = { x: 80, y: 105, w: 40, h: 40 }))).toEqual(['logo-clear']);
		expect(await with_((l) => (layer(l, 'art').box = { ...layer(l, 'headline').ink![0]! }))).toEqual(['overlap']);
		expect(await with_((l) => (layer(l, 'art').box = { x: 1000, y: 600, w: 300, h: 300 }))).toEqual(['cut']);
		expect(await with_((l) => Object.assign(layer(l, 'art'), { box: { x: 1000, y: 500, w: 300, h: 300 }, bleeds: true }))).toEqual([]);
		expect(await with_((l) => Object.assign(layer(l, 'art'), { box: { x: 1000, y: 500, w: 100, h: 300 }, fades: true })), 'says it fades, but is still drawn at the edge').toEqual(['cut']);
		const panel: DrawnLayer = { id: 'panel', kind: 'panel', box: { x: 50, y: 170, w: 500, h: 60 }, can: {} };
		expect(await with_((l) => (l.push(panel), (layer(l, 'headline').over = ['panel']), undefined)), 'words past a panel edge').toContain('overlap');
	});
	it('a fade on a grained ground, crossed by a thin rule, still passes; a hard edge does not', () => {
		const W = 400;
		const H = 200;
		const make = (hard: boolean) => {
			const data = new Uint8Array(W * H * 4);
			for (let i = 0; i < W * H; i++) {
				const g = 240 + ((i * 2654435761) >>> 28);   // grain, 240 to 255
				const x = i % W;
				const y = Math.floor(i / W);
				const art = hard && x >= 100 && x < 300 && y > 120;
				const rule = x === 200;
				const v = rule ? 20 : art ? 40 : g;
				data.set([v, v, v, 255], i * 4);
			}
			return encodePng({ width: W, height: H, data });
		};
		const d = create(fake(), 'plain', 'custom', [{ op: 'copy', slot: 'headline', value: 'x' }], { width: W, height: H }).doc;
		const layers: DrawnLayer[] = [
			{ id: 'art', kind: 'art', box: { x: 100, y: 120, w: 200, h: 120 }, fades: true, can: {} },
			{ id: 'field', kind: 'art', box: { x: 0, y: 0, w: W, h: H }, ink: [{ x: 200, y: 0, w: 1, h: H }], bleeds: true, can: {} },
		];
		const cut = (png: Uint8Array) => checkDesign({ doc: d, info: fake().templates()[0]!, layers, adapter: {}, png }).filter((f) => f.rule === 'cut');
		expect(cut(make(false))).toEqual([]);
		expect(cut(make(true)).map((f) => f.message)).toEqual(['The art should fade out before the bottom edge, but it is still drawn there.']);
	});
	it('compares words without the brand\'s markup when the adapter says how', () => {
		const d = doc({ body: 'One *accent* word' });
		const layers: DrawnLayer[] = [{ id: 'headline', kind: 'text', box: { x: 60, y: 200, w: 300, h: 70 }, text: { asked: 'Ship your next idea', drawn: 'Ship your next idea', size: 64, color: '#1a1a1a', ground: ['#ffffff'] }, can: {} }, { id: 'body', kind: 'text', box: { x: 60, y: 300, w: 300, h: 40 }, text: { asked: 'One *accent* word', drawn: 'One accent word', size: 32, color: '#1a1a1a', ground: ['#ffffff'] }, can: {} }];
		const rules = (a: Partial<Adapter>) => errorsOf(checkDesign({ doc: d, info: adapter.templates()[0]!, layers, adapter: a })).map((f) => f.rule);
		expect(rules({})).toContain('words');
		expect(rules({ words: (t) => t.replace(/\*/g, '') })).toEqual([]);
	});
	it('keeps to the platform\'s safe area', async () => {
		const d = create(adapter, 'bare', 'story', [{ op: 'copy', slot: 'headline', value: 'Ship your next idea' }]).doc;
		expect(await found(adapter, d)).toEqual([]);
		expect(await found(fake({ tamper: (l) => (l.find((x) => x.id === 'headline')!.ink = [{ x: 60, y: 100, w: 400, h: 60 }]) }), d)).toEqual(['safe-area']);
	});
	it('an accepted composition rule becomes a warning; a brand rule never does', async () => {
		const a = fake({ tamper: (l) => (l.find((x) => x.id === 'art')!.box = { ...l.find((x) => x.id === 'headline')!.ink![0]! }) });
		const d = applyEdits(doc(), [{ op: 'allow', rule: 'overlap' }], a).doc;
		expect(await found(a, d)).toEqual([]);
	});
	it('measures contrast as WCAG does', () => {
		expect(contrast('#000000', '#ffffff')).toBeCloseTo(21);
		expect(contrast('#767676', '#fff')).toBeCloseTo(4.54, 1);
	});
	it('PNG round trip', () => {
		const p = { width: 3, height: 2, data: Uint8Array.from({ length: 24 }, (_, i) => i * 10) };
		expect(decodePng(encodePng(p))).toEqual(p);
	});
	it('names sizes the way people do', () => {
		expect(sizeAlias('Twitter header')).toBe('x-banner');
		expect(sizeAlias('instagram story')).toBe('story');
		expect(sizeAlias('YouTube channel art')).toBe('youtube');
		const ids = PLATFORMS.flatMap((p) => [p.id, ...p.aliases]);
		expect(new Set(ids).size, 'no name means two sizes').toBe(ids.length);
		for (const p of PLATFORMS) for (const z of p.avoid) {
			const r = zonePx(z, p.width, p.height);
			expect(r.x >= 0 && r.y >= 0 && r.x + r.w <= p.width + 0.01 && r.y + r.h <= p.height + 0.01, `${p.id} ${z.name}`).toBe(true);
		}
	});
	it('sheets hold every picture and label', () => {
		const png = encodePng({ width: 300, height: 100, data: new Uint8Array(120000) });
		const s = contactSheet(Array.from({ length: 5 }, (_, i) => ({ label: `A & B ${i}`, png })), { notes: ['Not made: x.'] });
		expect(s.pictures).toHaveLength(5);
		for (const p of s.pictures) expect(p.x + p.w <= s.width && p.y + p.h <= s.height).toBe(true);
		expect(sheetSvg(s)).toContain('A &amp; B 4');
	});
});

describe('design command', () => {
	const session = () => {
		const cwd = mkdtempSync(join(tmpdir(), 'design-core-'));
		return {
			cwd,
			run: async (...argv: string[]) => {
				const out: string[] = [];
				const code = await runDesign(argv, adapter, { cwd, bin: 'acme', out: (s) => out.push(s), err: (s) => out.push(s), paint });
				return { code, text: out.join('\n') };
			},
		};
	};
	it('explains itself, and rejects names it does not know', async () => {
		const { run } = session();
		expect((await run('--help')).text).toMatch(/design revise/);
		expect((await run('help', '--json')).code).toBe(0);
		expect((await run('revize')).text).toMatch(/Did you mean revise/);
		expect((await run('new', 'plain', '--colour', 'red')).text).toMatch(/does not take --colour/);
		expect((await run('new')).code).toBe(1);
		expect((await run('check', 'nothing.design.json')).text).toMatch(/no file/);
	});
	it('refuses to change a part that is not drawn', async () => {
		const { run } = session();
		await run('new', 'plain', '--headline', 'Ship it', '-o', 'a.design.json');
		expect((await run('revise', 'a.design.json', 'bigger body')).text).toMatch(/no body in this design/);
		expect((await run('edit', 'a.design.json', '--layer', 'body.scale=1.1')).code).toBe(1);
		expect((await run('edit', 'a.design.json', '--layer', 'body.scale=1.1', '--body', 'More')).code).toBe(0);
	});
	it('a failing write leaves the file and its picture as they were', async () => {
		const { cwd, run } = session();
		expect((await run('new', 'plain', '--headline', 'Ship it', '-o', 'a.design.json')).code).toBe(0);
		const was = readFileSync(join(cwd, 'a.design.json'), 'utf8');
		const r = await run('edit', 'a.design.json', '--layer', 'headline.dx=0.4');
		expect(r.code, r.text).toBe(0);
		const r2 = await run('edit', 'a.design.json', '--layer', 'headline.dx=0.5', '--set', 'headline=Ship your next big idea');
		expect(r2.code, r2.text).toBe(1);
		expect(r2.text).toMatch(/breaks a rule|runs off/);
		expect((await run('undo', 'a.design.json')).code).toBe(0);
		expect(JSON.parse(readFileSync(join(cwd, 'a.design.json'), 'utf8')).layers).toEqual(JSON.parse(was).layers);
	});
	it('pictures are kept relative to the document; missing ones are refused', async () => {
		const { cwd, run } = session();
		writeFileSync(join(cwd, 'my photo.png'), 'x');
		expect((await run('new', 'plain', '--headline', 'Hi there', '--image', 'my photo.png', '-o', 'sub/a.design.json')).code).toBe(0);
		expect(JSON.parse(readFileSync(join(cwd, 'sub/a.design.json'), 'utf8')).images).toEqual({ picture: '../my photo.png' });
		expect((await run('edit', 'sub/a.design.json', '--image', 'gone.png')).text).toMatch(/no picture at gone.png/);
	});
	it('--sample fills copy on purpose; -o and --dry-run', async () => {
		const { cwd, run } = session();
		expect((await run('new', 'plain', '--sample', '-o', 'a.design.json')).code).toBe(0);
		expect(JSON.parse(readFileSync(join(cwd, 'a.design.json'), 'utf8')).copy).toEqual({ headline: 'Sample headline' });
		expect((await run('revise', 'a.design.json', 'Ink theme', '--dry-run')).text).toMatch(/dry run/);
		expect(readFileSync(join(cwd, 'a.design.json'), 'utf8')).toContain('"Paper"');
		expect((await run('revise', 'a.design.json', 'Ink theme', '-o', 'b.design.json')).code).toBe(0);
		expect(existsSync(join(cwd, 'b.png'))).toBe(true);
	});
	it('sizes fails when one of them cannot be made, and says which', async () => {
		const { run } = session();
		await run('new', 'plain', '--headline', 'Ship it', '-o', 'a.design.json');
		expect((await run('sizes', 'a.design.json', '--to', 'og,square')).code).toBe(0);
		expect((await run('sizes', 'a.design.json', '--to', 'story')).text).toMatch(/does not come in story/);
	});
});
