import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { applyEdits, checkDesign, create, errorsOf, parseDoc, parsePhrases, runDesign, stateOf, type Adapter, type DesignDoc, type DesignIO, type Edit, type Finding, type TemplateInfo } from '../../src/design/index.js';

// What every brand's adapter has to do, run by each repo against its own: `designConformance(adapter, opts)`.

export type ConformanceOptions = {
	paint: DesignIO['paint'];
	/** Copy for a template. Default: short words in every slot. */
	short?: (t: TemplateInfo) => Record<string, string>;
	long?: (t: TemplateInfo) => Record<string, string>;
	/** A picture file for a required picture slot. */
	picture?: string;
	/** The bytes the plain command (image, deck, ...) writes for the same request, to compare with a design that has no edits. */
	plain?: (doc: DesignDoc) => Promise<Uint8Array | undefined>;
	/** Sizes to try for every template (default: all it comes in). */
	sizes?: (t: TemplateInfo) => string[];
	/** Templates left out of the byte checks (slow ones, or ones that need a browser). */
	skip?: (t: TemplateInfo) => boolean;
	/** Milliseconds per test. */
	timeout?: number;
};

/** An engine that cannot draw the words whole says so; anything else it throws is a bug. */
export const TOO_LONG = /shorten|too long|does not fit|cannot fit|won't fit|no room|fewer|too many/i;
export const SHORT = 'Ship your next idea today';
export const LONG = 'Everything your agents need to search, buy and reply in one place';
export const WORD = 'Internationalization';

const list = (f: Finding[]) => f.map((x) => `${x.rule}: ${x.message}`).join('\n');
const shortCopy = (t: TemplateInfo) => Object.fromEntries(t.copy.map((c) => [c.id, /stat|number|figure/.test(c.id) ? '42%' : c.id === 'headline' || c.id === 'title' || c.id === 'quote' ? SHORT : 'One line about it']));
const longCopy = (t: TemplateInfo) => Object.fromEntries(t.copy.map((c) => [c.id, /stat|number|figure/.test(c.id) ? '1,000,000+' : c.id === 'headline' || c.id === 'title' || c.id === 'quote' ? LONG : 'A second line that says a little more about it']));

export function designConformance(adapter: Adapter, opts: ConformanceOptions) {
	const timeout = opts.timeout ?? 120_000;
	const templates = adapter.templates();
	const laidOut = templates.filter((t) => t.kind === 'image' || t.kind === 'slide');
	const dir = mkdtempSync(join(tmpdir(), 'design-'));
	const make = (t: TemplateInfo, size: string, copy: Record<string, string>, more: Edit[] = []): DesignDoc => {
		const pics: Edit[] = t.images.filter((i) => i.required).map((i) => ({ op: 'image', slot: i.id, value: i.values?.find((v) => v !== 'none') ?? opts.picture! }));
		return create(adapter, t.id, size, [...Object.entries(copy).map(([slot, value]) => ({ op: 'copy', slot, value }) as Edit), ...pics, ...more], size === 'custom' ? { width: 1200, height: 800 } : {}).doc;
	};
	const draw = async (doc: DesignDoc) => {
		const r = await adapter.render(doc, dir, { formats: ['png'], scale: 1 });
		const info = templates.find((t) => t.id === doc.template)!;
		return { png: r.files.png!, layers: r.layers, findings: checkDesign({ doc, info, layers: r.layers, adapter, png: r.files.png }) };
	};
	/** Drawn, or refused for being too long. Undefined when refused. */
	const tryDraw = async (doc: DesignDoc) => {
		try {
			return await draw(doc);
		} catch (err) {
			expect((err as Error).message, `${doc.template} ${doc.size.id}`).toMatch(TOO_LONG);
			return undefined;
		}
	};
	const sizesOf = (t: TemplateInfo) => (opts.sizes ? opts.sizes(t) : t.sizes.filter((s) => s !== 'custom'));
	const io = (cwd: string) => {
		const lines: string[] = [];
		const errors: string[] = [];
		return { lines, errors, io: { cwd, bin: adapter.brand, out: (s: string) => lines.push(s), err: (s: string) => errors.push(s), paint: opts.paint } satisfies DesignIO };
	};

	describe(`design: ${adapter.brand}`, () => {
		it('describes its templates', () => {
			expect(templates.length).toBeGreaterThan(0);
			expect(new Set(templates.map((t) => t.id)).size).toBe(templates.length);
			expect(adapter.colors?.().length, 'colors() lists what words may be drawn in and on').toBeGreaterThan(0);
			for (const c of adapter.colors!()) expect(c).toMatch(/^#[0-9a-f]{6}$/i);
			for (const t of templates) {
				for (const pool of [t.copy, t.images, t.options, t.layers]) expect(new Set(pool.map((x) => x.id)).size, t.id).toBe(pool.length);
				for (const s of t.sizes) {
					const d = adapter.defaults(t.id, s);
					expect(d.size.width, `${t.id} ${s}`).toBeGreaterThan(0);
					if (d.theme !== undefined) expect(t.themes).toContain(d.theme);
				}
				for (const th of Object.keys(t.grounds ?? {})) expect(t.themes).toContain(th);
				for (const l of t.layers) if (l.can.scale) expect(l.can.scale[0] <= 1 && l.can.scale[1] >= 1, `${t.id} ${l.id}`).toBe(true);
			}
		});

		for (const t of laidOut) {
			it(`${t.id}: short and long copy at every size is whole, legible and clear, or refused`, { timeout }, async () => {
				const problems: string[] = [];
				let drawn = 0;
				for (const s of sizesOf(t)) for (const [name, copy] of [['short', (opts.short ?? shortCopy)(t)], ['long', (opts.long ?? longCopy)(t)]] as const) {
					const r = await tryDraw(make(t, s, copy));
					if (!r) continue;
					drawn++;
					for (const l of r.layers) expect(t.layers.map((x) => x.id), `${t.id} draws ${l.id}, which templates() does not list`).toContain(l.id);
					if (errorsOf(r.findings).length) problems.push(`${t.id} ${s} ${name}\n${list(errorsOf(r.findings))}`);
				}
				expect(problems.join('\n\n')).toBe('');
				expect(drawn, `${t.id} refuses everything`).toBeGreaterThan(0);
			});

			it(`${t.id}: the logo keeps its clear space at every place it can go`, { timeout }, async () => {
				const logo = t.layers.find((l) => l.id === 'logo');
				const problems: string[] = [];
				for (const s of sizesOf(t)) for (const anchor of logo?.can.anchors ?? []) {
					const r = await tryDraw(make(t, s, (opts.short ?? shortCopy)(t), [{ op: 'layer', layer: 'logo', set: { anchor } }]));
					if (r) problems.push(...r.findings.filter((f) => f.rule.startsWith('logo') && f.severity === 'error').map((f) => `${t.id} ${s} ${anchor}: ${f.message}`));
				}
				expect(problems.join('\n')).toBe('');
			});

			it(`${t.id}: every theme passes`, { timeout }, async () => {
				const problems: string[] = [];
				for (const theme of t.themes) {
					const r = await draw(make(t, t.sizes[0]!, (opts.short ?? shortCopy)(t), [{ op: 'theme', value: theme }]));
					if (errorsOf(r.findings).length) problems.push(`${t.id} ${theme}\n${list(errorsOf(r.findings))}`);
				}
				expect(problems.join('\n\n')).toBe('');
			});

			it(`${t.id}: draws nothing that was not passed`, { timeout }, async () => {
				const need = Object.fromEntries(t.copy.filter((c) => c.required).map((c) => [c.id, (opts.short ?? shortCopy)(t)[c.id]!]));
				const r = await draw(make(t, t.sizes[0]!, need));
				expect(list(r.findings.filter((f) => f.rule === 'invented'))).toBe('');
				expect(r.layers.filter((l) => l.text?.sample).map((l) => l.id)).toEqual([]);
			});

			it(`${t.id}: common phrases move only what they name`, { timeout }, async () => {
				const size = t.sizes[0]!;
				const copy = (opts.short ?? shortCopy)(t);
				const base = make(t, size, copy);
				const before = await tryDraw(base);
				if (!before) return;
				const { width: W, height: H } = base.size;
				const head = t.layers.find((l) => l.id === 'headline' || l.id === 'title');
				const logo = t.layers.find((l) => l.id === 'logo');
				const hide = t.layers.find((l) => l.can.hide && l.id !== 'logo' && before.layers.some((x) => x.id === l.id));
				const theme = t.themes.find((x) => x !== base.theme);
				const anchor = logo?.can.anchors?.find((a) => a !== logo.can.anchors![0]);
				const slot = t.copy.find((c) => c.id === 'headline' || c.id === 'title');
				const phrases: [string, string[]][] = [
					...(head?.can.scale ? [[`bigger ${head.id}`, [head.id]], [`smaller ${head.id}`, [head.id]]] as [string, string[]][] : []),
					...(theme ? [[`${theme} theme`, []]] as [string, string[]][] : []),
					...(anchor ? [[`logo ${anchor.replace('-', ' ')}`, ['logo']]] as [string, string[]][] : []),
					...(hide ? [[`hide the ${hide.id}`, [hide.id]]] as [string, string[]][] : []),
					...(slot && copy[slot.id] ? [[`${slot.id} "${copy[slot.id]!.split('').reverse().join('').replace(/^./, (c) => c.toUpperCase())}"`, [slot.id]]] as [string, string[]][] : []),
				];
				const problems: string[] = [];
				for (const [phrase, named] of phrases) {
					const edits = parsePhrases(phrase, { adapter, doc: base, info: t, drawn: before.layers }).edits;
					const after = await tryDraw(applyEdits(base, edits, adapter).doc);
					if (!after) continue;
					const may = new Set([...named, ...named.flatMap((n) => t.reflows?.[n] ?? [])]);
					for (const a of after.layers) {
						const b = before.layers.find((x) => x.id === a.id);
						if (!b || may.has(a.id) || a.bleeds || b.bleeds) continue;
						const dx = Math.max(Math.abs(a.box.x - b.box.x), Math.abs(a.box.x + a.box.w - b.box.x - b.box.w)) / W;
						const dy = Math.max(Math.abs(a.box.y - b.box.y), Math.abs(a.box.y + a.box.h - b.box.y - b.box.h)) / H;
						if (dx > 0.02 || dy > 0.02) problems.push(`"${phrase}" moved the ${a.id} by ${(dx * 100).toFixed(1)}% across, ${(dy * 100).toFixed(1)}% down (declare it in reflows if it gives way on purpose)`);
					}
					// Bigger type that re-wraps in its column: larger, never a longer line than the column holds.
					if (phrase.startsWith('bigger') && head) {
						const [a, b] = [after.layers.find((x) => x.id === head.id), before.layers.find((x) => x.id === head.id)];
						if (a?.text && b?.text) {
							expect(a.text.size / b.text.size, `${t.id}: "${phrase}" makes the type larger`).toBeGreaterThan(1.05);
							expect(a.text.drawn.split('\n').length, `${t.id}: "${phrase}" re-wraps rather than losing lines`).toBeGreaterThanOrEqual(b.text.drawn.split('\n').length);
						}
					}
				}
				expect(problems.join('\n')).toBe('');
			});

			it(`${t.id}: a layer edit changes what is drawn, or is refused`, { timeout }, async () => {
				const size = t.sizes[0]!;
				const copy = (opts.short ?? shortCopy)(t);
				const base = await draw(make(t, size, copy));
				const W = adapter.defaults(t.id, size).size.width;
				for (const l of t.layers) {
					const was = base.layers.find((x) => x.id === l.id);
					if (!was) continue;
					const edit = async (set: object) => {
						try {
							return await draw(make(t, size, copy, [{ op: 'layer', layer: l.id, set }]));
						} catch (err) {
							expect((err as Error).message, `${t.id} ${l.id}`).toMatch(TOO_LONG);
							return undefined;
						}
					};
					if (l.can.hide) {
						const r = await edit({ hidden: true });
						expect(r?.layers.some((x) => x.id === l.id), `${t.id}: hidden ${l.id} is still reported`).toBe(false);
					}
					if (l.can.move) {
						const r = await edit({ dx: 0.02 });
						const now = r?.layers.find((x) => x.id === l.id);
						if (now) expect(Math.abs(now.box.x - was.box.x - 0.02 * W), `${t.id} ${l.id}.dx moved ${now.box.x - was.box.x} px, not ${0.02 * W}`).toBeLessThan(Math.max(2, 0.004 * W) + Math.abs(now.box.w - was.box.w));
					}
					if (l.can.scale) {
						const to = l.can.scale[0] < 0.95 ? Math.max(l.can.scale[0], 0.85) : Math.min(l.can.scale[1], 1.15);
						const r = await edit({ scale: to });
						const now = r?.layers.find((x) => x.id === l.id);
						if (now) {
							const size = (x: typeof was) => x.text?.size ?? Math.sqrt(x.box.w * x.box.h);
							expect(Math.abs(size(now) / size(was) - to), `${t.id} ${l.id}.scale ${to} gave ${(size(now) / size(was)).toFixed(3)}`).toBeLessThan(0.08);
						}
					}
					for (const anchor of l.can.anchors ?? []) {
						const r = await edit({ anchor });
						const b = r?.layers.find((x) => x.id === l.id)?.box;
						if (!b) continue;
						const H = adapter.defaults(t.id, size).size.height;
						const cx = (b.x + b.w / 2) / W;
						const cy = (b.y + b.h / 2) / H;
						if (/left/.test(anchor)) expect(cx, `${t.id} ${l.id} ${anchor}`).toBeLessThan(0.5);
						if (/right/.test(anchor)) expect(cx, `${t.id} ${l.id} ${anchor}`).toBeGreaterThan(0.5);
						if (/top/.test(anchor)) expect(cy, `${t.id} ${l.id} ${anchor}`).toBeLessThan(0.5);
						if (/bottom/.test(anchor)) expect(cy, `${t.id} ${l.id} ${anchor}`).toBeGreaterThan(0.5);
					}
				}
			});
		}

		it('draws the same bytes twice, and the plain command\'s bytes when nothing is edited', { timeout }, async () => {
			for (const t of templates.filter((x) => !opts.skip?.(x))) {
				const doc = make(t, t.sizes[0]!, (opts.short ?? shortCopy)(t));
				const a = (await draw(doc)).png;
				const b = (await draw(doc)).png;
				expect(Buffer.compare(Buffer.from(a), Buffer.from(b)), t.id).toBe(0);
				const plain = await opts.plain?.(doc);
				if (plain) expect(Buffer.compare(Buffer.from(a), Buffer.from(plain)), `${t.id} differs from the plain command`).toBe(0);
			}
		});

		it('a whole session: new, revise, edit, undo, redo, variants, sizes, compare, refusals', { timeout: timeout * 2 }, async () => {
			const cwd = mkdtempSync(join(tmpdir(), 'design-session-'));
			const t = laidOut.find((x) => x.layers.some((l) => l.can.scale) && x.themes.length > 1) ?? laidOut[0]!;
			const run = async (...argv: string[]) => {
				const x = io(cwd);
				const code = await runDesign([...argv, '--json'], adapter, x.io);
				return { code, data: JSON.parse(x.lines.join('')) as Record<string, any> };
			};
			const copy = Object.entries((opts.short ?? shortCopy)(t)).flatMap(([k, v]) => ['--set', `${k}=${v}`]);
			const pics = t.images.filter((i) => i.required).flatMap((i) => ['--image', `${i.id}=${i.values?.find((v) => v !== 'none') ?? opts.picture}`]);
			const made = await run('new', t.id, ...copy, ...pics, '-o', 'one.design.json');
			expect(made.code, JSON.stringify(made.data)).toBe(0);
			const file = join(cwd, 'one.design.json');
			const first = readFileSync(file, 'utf8');
			const firstPng = readFileSync(join(cwd, 'one.png'));
			expect((await run('new', t.id, ...copy, ...pics, '-o', 'one.design.json')).code, 'new never overwrites').toBe(1);

			const other = t.themes.find((x) => x !== adapter.defaults(t.id, t.sizes[0]!).theme);
			if (other) {
				const r = await run('revise', 'one.design.json', `${other} theme`);
				expect(r.code, JSON.stringify(r.data)).toBe(0);
				expect(parseDoc(readFileSync(file, 'utf8'), adapter).theme).toBe(other);
				const after = readFileSync(file, 'utf8');
				expect((await run('undo', 'one.design.json')).code).toBe(0);
				expect(stateOf(parseDoc(readFileSync(file, 'utf8'), adapter))).toEqual(stateOf(parseDoc(first, adapter)));
				expect(Buffer.compare(readFileSync(join(cwd, 'one.png')), firstPng), 'undo draws the first picture again').toBe(0);
				expect((await run('redo', 'one.design.json')).code).toBe(0);
				expect(readFileSync(file, 'utf8'), 'redo writes the same bytes').toBe(after);
			}

			// Anything not understood or not on brand changes nothing.
			const before = readFileSync(file, 'utf8');
			const refuse = async (...argv: string[]) => {
				const r = await run(...argv);
				expect(r.code, argv.join(' ')).toBe(1);
				expect(r.data.error?.message, argv.join(' ')).toBeTruthy();
				expect(readFileSync(file, 'utf8'), argv.join(' ')).toBe(before);
				return r.data.error.message as string;
			};
			expect(await refuse('revise', 'one.design.json', 'flibber the wotsit')).toMatch(/Nothing was changed/);
			await refuse('revise', 'one.design.json', `${t.themes[0]} theme, flibber the wotsit`);
			expect(await refuse('revise', 'one.design.json', 'make the logo neon green')).toMatch(/Colors outside the brand palette are refused. The palette: #/);
			await refuse('revise', 'one.design.json', 'use comic sans');
			await refuse('revise', 'one.design.json', 'rotate the logo');
			await refuse('edit', 'one.design.json', '--set', 'nonsense-slot=hello');
			await refuse('edit', 'one.design.json', '--theme', 'not-a-theme');
			await refuse('edit', 'one.design.json', '--layer', 'logo.color=#00ff00');
			await refuse('edit', 'one.design.json', '--allow', 'contrast');
			await refuse('edit', 'one.design.json', '--allow', 'logo-clear');
			const scalable = t.layers.find((l) => l.can.scale);
			if (scalable) expect(await refuse('edit', 'one.design.json', '--layer', `${scalable.id}.scale=${scalable.can.scale![1] + 1}`)).toContain(String(scalable.can.scale![1]));
			writeFileSync(join(cwd, 'theirs.design.json'), before.replace(`"brand": "${adapter.brand}"`, '"brand": "another-brand"'));
			expect((await run('check', 'theirs.design.json')).code, 'another brand\'s file').toBe(1);

			const v = await run('variants', 'one.design.json', '--by', other ? 'theme' : 'template', '--count', '3');
			expect(v.data.made?.length, JSON.stringify(v.data)).toBeGreaterThan(0);
			expect(readdirSync(cwd).some((f) => /one-by-/.test(f)), 'the contact sheet').toBe(true);
			const s = await run('sizes', 'one.design.json', '--to', sizesOf(t).slice(0, 3).join(','));
			expect(s.data.sheet, JSON.stringify(s.data)).toBeTruthy();
			const c = await run('compare', 'one.design.json', v.data.made.at(-1).file);
			expect(c.code, JSON.stringify(c.data)).toBe(0);
			const k = await run('check', 'one.design.json');
			expect(k.code, JSON.stringify(k.data)).toBe(0);
			expect((await run('show', 'one.design.json')).code).toBe(0);
			expect((await run('history', 'one.design.json')).code).toBe(0);
			expect((await run('render', 'one.design.json', '--scale', '2', '-o', 'two.png')).code).toBe(0);
		});
	});
}
