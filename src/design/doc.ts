import type { Adapter, DesignDoc, DesignState, LayerEdit, TemplateInfo } from './types.js';
import { PLATFORMS, sizeAlias } from './platforms.js';

// The design file: a small JSON document holding what the person asked for (template, size, theme, their copy, their
// pictures, edits to layers) and how it got there. No timestamps and a fixed key order, so the same edits always write
// the same bytes, and undo restores exactly what was there.

/** An error to show the person as it is. `hints` are things they can do instead. */
export class DesignError extends Error {
	constructor(message: string, readonly hints: string[] = []) {
		super(message);
	}
}

export const STATE_KEYS = ['template', 'size', 'theme', 'copy', 'images', 'seed', 'options', 'layers', 'allow'] as const;
type StateKey = (typeof STATE_KEYS)[number];
const DOC_KEYS = ['version', 'brand', 'kind', ...STATE_KEYS, 'history', 'future'] as const;
const KINDS = ['image', 'slide', 'merch', 'illustration', 'video'];
export const ANCHORS = ['top-left', 'top', 'top-right', 'left', 'center', 'right', 'bottom-left', 'bottom', 'bottom-right'] as const;

/* ---- Names ---- */

const plain = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

function distance(a: string, b: string): number {
	const row = Array.from({ length: b.length + 1 }, (_, i) => i);
	for (let i = 1; i <= a.length; i++) {
		let prev = i - 1;
		row[0] = i;
		for (let j = 1; j <= b.length; j++) {
			const cur = row[j]!;
			row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
			prev = cur;
		}
	}
	return row[b.length]!;
}

/** The closest names to what was typed, best first. */
export function nearest(typed: string, pool: string[], max = 3): string[] {
	const t = plain(typed);
	return [...new Set(pool)]
		.map((name) => {
			const n = plain(name);
			return { name, d: n && t && (n.includes(t) || t.includes(n)) ? Math.abs(n.length - t.length) * 0.3 : distance(t, n) };
		})
		.filter((s) => s.d <= Math.max(2, t.length * 0.45))
		.sort((a, b) => a.d - b.d || a.name.length - b.name.length || (a.name < b.name ? -1 : 1))
		.slice(0, max)
		.map((s) => s.name);
}

export function unknownName(what: string, typed: string, pool: string[]): DesignError {
	const near = nearest(typed, pool);
	return new DesignError(`There is no ${what} "${typed}".${near.length ? ` Did you mean ${near.join(' or ')}?` : ''}${pool.length ? ` It can be ${pool.join(', ')}.` : ''}`, near);
}

const aliasOf = (table: Record<string, string> | undefined, typed: string) => Object.entries(table ?? {}).find(([k]) => k.toLowerCase() === typed.trim().toLowerCase())?.[1];
const matching = (typed: string, pool: string[]) => pool.find((p) => p.toLowerCase() === typed.trim().toLowerCase()) ?? pool.find((p) => plain(p) !== '' && plain(p) === plain(typed));

export function templateOf(adapter: Adapter, typed: string): TemplateInfo {
	const all = adapter.templates();
	const id = matching(typed, all.map((t) => t.id)) ?? matching(aliasOf(adapter.aliases?.templates, typed) ?? '', all.map((t) => t.id));
	const hit = all.find((t) => t.id === id) ?? all.find((t) => t.layouts?.some((l) => plain(l) === plain(typed)));
	if (!hit) throw unknownName('template', typed, all.map((t) => t.id));
	return hit;
}

/** A size as typed, as one of the template's ids: the id, the brand's older name, or a shared name ("twitter header"). */
export function sizeOf(adapter: Adapter, info: TemplateInfo, typed: string): string {
	if (typed.trim().toLowerCase() === 'custom') return 'custom';
	const own = matching(typed, info.sizes);
	if (own) return own;
	const old = aliasOf(adapter.aliases?.sizes, typed);
	if (old && info.sizes.includes(old)) return old;
	const shared = sizeAlias(typed);
	if (shared && info.sizes.includes(shared)) return shared;
	if (shared || old) throw new DesignError(`The ${info.id} layout does not come in ${shared ?? old}. It comes in ${info.sizes.join(', ')}.`, info.sizes);
	throw unknownName('size', typed, info.sizes);
}

export function themeOf(adapter: Adapter, info: TemplateInfo, typed: string): string {
	const hit = matching(typed, info.themes) ?? matching(aliasOf(adapter.aliases?.themes, typed) ?? '', info.themes);
	if (!hit) throw unknownName('theme', typed, info.themes);
	return hit;
}

/** Names people use for the same slot or layer, in the order they are tried. */
export const SAME: string[][] = [
	['headline', 'title', 'heading', 'header'],
	['body', 'subtitle', 'subhead', 'subheadline', 'subheading', 'sub', 'description'],
	['badge', 'eyebrow', 'kicker', 'tag', 'label', 'pill', 'chip'],
	['cta', 'button', 'action'],
	['footer', 'url', 'address', 'domain', 'link'],
	['stat', 'number', 'figure', 'metric'],
	['picture', 'image', 'photo', 'screenshot', 'screen', 'window', 'art'],
	['art', 'artwork', 'graphic', 'illustration', 'drawing', 'scene', 'visual', 'object', 'objects', 'pattern', 'background', 'dots', 'picture'],
	['logo', 'mark', 'wordmark', 'logotype', 'brandmark'],
	['attribution', 'author', 'name', 'person'],
	['items', 'points', 'bullets', 'list', 'lists'],
];

/** The id of `pool` a word stands for: itself, the brand's older name, or another name for the same thing. */
export function sameAs(typed: string, pool: string[], table?: Record<string, string>): string | undefined {
	const t = typed.trim().toLowerCase().replace(/\s+/g, '-');
	const own = matching(t, pool);
	if (own) return own;
	const old = aliasOf(table, t);
	if (old && pool.includes(old)) return old;
	for (const set of SAME) if (set.includes(t.replace(/s$/, '')) || set.includes(t)) for (const name of set) if (pool.includes(name)) return name;
	return undefined;
}

export function slotOf(adapter: Adapter, info: TemplateInfo, typed: string): string {
	const pool = info.copy.map((c) => c.id);
	const hit = sameAs(typed, pool, adapter.aliases?.copy);
	if (!hit) throw new DesignError(`The ${info.id} layout does not draw "${typed}", so it cannot hold those words. ${pool.length ? `It draws ${pool.join(', ')}.` : 'It draws no copy.'}`, pool);
	return hit;
}

export function layerOf(adapter: Adapter, info: TemplateInfo, typed: string): string {
	const pool = info.layers.map((l) => l.id);
	const hit = sameAs(typed, pool, adapter.aliases?.layers);
	if (!hit) throw new DesignError(pool.length ? `The ${info.id} layout has no "${typed}". It has ${pool.join(', ')}.` : `The ${info.id} layout has no parts that move on their own. Change its copy, theme, options, size or seed.`, pool);
	return hit;
}

/* ---- The file ---- */

const sorted = <T>(o: Record<string, T>): Record<string, T> => Object.fromEntries(Object.entries(o).sort(([a], [b]) => (a < b ? -1 : 1)));
const LAYER_KEYS = ['anchor', 'dx', 'dy', 'scale', 'align', 'hidden'] as const;

function orderedLayer(e: LayerEdit): LayerEdit {
	const out: Record<string, unknown> = {};
	for (const k of LAYER_KEYS) if (e[k] !== undefined) out[k] = e[k];
	return out as LayerEdit;
}

/** The state with a fixed key order and no empty layer edits. */
export function tidy(s: DesignState): DesignState {
	const layers = Object.fromEntries(Object.entries(s.layers).map(([k, v]) => [k, orderedLayer(v)]).filter(([, v]) => Object.keys(v as object).length));
	return {
		template: s.template,
		size: { id: s.size.id, width: s.size.width, height: s.size.height },
		...(s.theme !== undefined && s.theme !== null ? { theme: s.theme } : {}),
		copy: sorted(Object.fromEntries(Object.entries(s.copy).filter(([, v]) => v.trim() !== ''))),
		images: sorted(s.images),
		...(s.seed !== undefined && s.seed !== null ? { seed: s.seed } : {}),
		options: sorted(s.options),
		layers: sorted(layers),
		...(s.allow?.length ? { allow: [...new Set(s.allow)].sort() } : {}),
	};
}

export const stateOf = (d: DesignDoc): DesignState => tidy(structuredClone({ template: d.template, size: d.size, theme: d.theme, copy: d.copy, images: d.images, seed: d.seed, options: d.options, layers: d.layers, allow: d.allow }));

/** The document as written to disk. */
export function docText(d: DesignDoc): string {
	const s = tidy(d);
	const out: Record<string, unknown> = { version: 1, brand: d.brand, kind: d.kind, ...s, history: d.history, future: d.future };
	return `${JSON.stringify(out, null, '\t')}\n`;
}

/** Reads a document, saying what is wrong with it. Another brand's file is an error. */
export function parseDoc(text: string, adapter: Adapter, name = 'The file'): DesignDoc {
	let d: Record<string, unknown>;
	try {
		d = JSON.parse(text) as Record<string, unknown>;
	} catch (err) {
		throw new DesignError(`${name} is not JSON (${(err as Error).message}).`);
	}
	if (!d || typeof d !== 'object' || Array.isArray(d) || d.version !== 1) throw new DesignError(`${name} is not a design file (it needs "version": 1). Make one with \`design new\`.`);
	if (d.brand !== adapter.brand) throw new DesignError(`${name} is a ${String(d.brand)} design; this is ${adapter.brand}. Open it with its own command line.`);
	if (!KINDS.includes(d.kind as string)) throw new DesignError(`${name} has an unknown kind "${String(d.kind)}".`);
	const extra = Object.keys(d).filter((k) => !(DOC_KEYS as readonly string[]).includes(k));
	if (extra.length) throw new DesignError(`${name} holds ${extra.map((k) => `"${k}"`).join(', ')}, which is not part of a design. Colors, fonts and styles come from the brand.`);
	const obj = (k: string) => {
		const v = d[k] ?? {};
		if (typeof v !== 'object' || Array.isArray(v)) throw new DesignError(`${name}: "${k}" must be an object.`);
		return v as Record<string, never>;
	};
	const size = d.size as DesignState['size'] | undefined;
	if (!size || typeof size.id !== 'string' || !Number.isInteger(size.width) || !Number.isInteger(size.height)) throw new DesignError(`${name}: "size" needs an id, a width and a height.`);
	for (const k of ['copy', 'images']) for (const [s, v] of Object.entries(obj(k))) if (typeof v !== 'string') throw new DesignError(`${name}: ${k}.${s} must be text.`);
	if (d.seed !== undefined && !Number.isInteger(d.seed)) throw new DesignError(`${name}: "seed" must be a whole number.`);
	for (const [id, e] of Object.entries(obj('layers') as Record<string, object>)) {
		if (!e || typeof e !== 'object') throw new DesignError(`${name}: layers.${id} must be an object.`);
		const bad = Object.keys(e).find((k) => !(LAYER_KEYS as readonly string[]).includes(k));
		if (bad) throw new DesignError(`${name}: a layer does not take "${bad}". It takes ${LAYER_KEYS.join(', ')}. Colors, fonts and shapes come from the brand.`);
	}
	for (const [k, want] of [['history', 'before'], ['future', 'after']] as const) {
		const v = d[k] ?? [];
		if (!Array.isArray(v) || v.some((h) => !h || typeof h.change !== 'string' || typeof h[want] !== 'object')) throw new DesignError(`${name}: "${k}" is damaged.`);
	}
	if (d.allow !== undefined && (!Array.isArray(d.allow) || d.allow.some((a) => typeof a !== 'string'))) throw new DesignError(`${name}: "allow" must be a list of rule names.`);
	const doc = { ...tidy({ template: String(d.template), size, theme: d.theme as string | undefined, copy: obj('copy'), images: obj('images'), seed: d.seed as number | undefined, options: obj('options'), layers: obj('layers'), allow: d.allow as string[] | undefined }), version: 1, brand: adapter.brand, kind: d.kind, history: d.history ?? [], future: d.future ?? [] } as DesignDoc;
	validate(doc, adapter);
	return doc;
}

/** Checks every value against what the template takes. Throws the first thing that is not allowed. */
export function validate(d: DesignDoc, adapter: Adapter): TemplateInfo {
	const info = adapter.templates().find((t) => t.id === d.template);
	if (!info) throw unknownName('template', d.template, adapter.templates().map((t) => t.id));
	if (info.kind !== d.kind) throw new DesignError(`${d.template} is ${article(info.kind)}, not ${article(d.kind)}.`);
	if (d.size.id !== 'custom' && !info.sizes.includes(d.size.id)) throw new DesignError(`The ${info.id} layout does not come in ${d.size.id}. It comes in ${info.sizes.join(', ')}.`, info.sizes);
	if (d.size.id === 'custom' && !info.sizes.includes('custom')) throw new DesignError(`The ${info.id} layout does not take a custom size. It comes in ${info.sizes.join(', ')}.`, info.sizes);
	if (d.size.id === 'custom') {
		if (d.size.width < 200 || d.size.width > 4000 || d.size.height < 200 || d.size.height > 4000) throw new DesignError('A custom size takes 200 to 4000 pixels each way.');
	} else {
		const want = adapter.defaults(d.template, d.size.id).size;
		if (want.width !== d.size.width || want.height !== d.size.height) throw new DesignError(`${d.size.id} is ${want.width} by ${want.height} pixels, not ${d.size.width} by ${d.size.height}. Use --size custom with --width and --height for another shape.`);
	}
	if (d.theme !== undefined && !info.themes.includes(d.theme)) throw unknownName('theme', d.theme, info.themes);
	for (const s of Object.keys(d.copy)) if (!info.copy.some((c) => c.id === s)) throw new DesignError(`The ${info.id} layout does not draw "${s}", so it cannot hold those words. ${info.copy.length ? `It draws ${info.copy.map((c) => c.id).join(', ')}.` : 'It draws no copy.'}`);
	for (const c of info.copy) if (c.required && !d.copy[c.id]?.trim()) throw new DesignError(`The ${info.id} layout needs ${c.id}. Pass --set ${c.id}="..." (nothing is made up for it).`);
	for (const s of Object.keys(d.images)) if (!info.images.some((i) => i.id === s)) throw unknownName('picture slot', s, info.images.map((i) => i.id));
	for (const i of info.images) if (i.required && !d.images[i.id]) throw new DesignError(`The ${info.id} layout needs a picture: --image ${i.id}=file.png.`);
	for (const [k, v] of Object.entries(d.options)) checkOption(info, k, v);
	for (const [id, e] of Object.entries(d.layers)) checkLayer(info, id, e);
	return info;
}

const article = (s: string) => (/^[aeiou]/.test(s) ? `an ${s}` : `a ${s}`);

export function checkOption(info: TemplateInfo, id: string, v: unknown) {
	const o = info.options.find((x) => x.id === id);
	if (!o) throw unknownName('option', id, info.options.map((x) => x.id));
	if (o.range) {
		if (typeof v !== 'number' || !Number.isFinite(v) || v < o.range[0] || v > o.range[1]) throw new DesignError(`${id} takes ${o.range[0]} to ${o.range[1]}, not ${String(v)}.`);
	} else if (o.values && !o.values.includes(String(v))) throw unknownName(`value for ${id}`, String(v), o.values);
}

/** How far a layer may be moved, as a share of the canvas. */
export const MOVE = 0.5;

export function checkLayer(info: TemplateInfo, id: string, e: LayerEdit) {
	const l = info.layers.find((x) => x.id === id);
	if (!l) throw new DesignError(info.layers.length ? `The ${info.id} layout has no "${id}". It has ${info.layers.map((x) => x.id).join(', ')}.` : `The ${info.id} layout has no parts that move on their own.`);
	const can = l.can;
	const extra = Object.keys(e).filter((k) => !(LAYER_KEYS as readonly string[]).includes(k));
	if (extra.length) throw new DesignError(`A layer does not take "${extra[0]}". ${canSay(id, can)} Colors, fonts and shapes come from the brand.`);
	for (const k of ['dx', 'dy'] as const) {
		const v = e[k];
		if (v === undefined) continue;
		if (!can.move) throw new DesignError(`The ${id} cannot be nudged in the ${info.id} layout. ${canSay(id, can)}`);
		if (typeof v !== 'number' || !Number.isFinite(v) || Math.abs(v) > MOVE) throw new DesignError(`${id}.${k} takes -${MOVE} to ${MOVE} (a share of the canvas), not ${String(v)}.`);
	}
	if (e.scale !== undefined) {
		if (!can.scale) throw new DesignError(`The ${id} keeps its size in the ${info.id} layout. ${canSay(id, can)}`);
		if (typeof e.scale !== 'number' || !Number.isFinite(e.scale) || e.scale < can.scale[0] - 1e-9 || e.scale > can.scale[1] + 1e-9) throw new DesignError(`${id}.scale takes ${can.scale[0]} to ${can.scale[1]}, not ${String(e.scale)}.`);
	}
	if (e.anchor !== undefined) {
		if (!can.anchors?.length) throw new DesignError(`The ${id} cannot be put somewhere else in the ${info.id} layout. ${canSay(id, can)}`);
		if (!can.anchors.includes(e.anchor)) throw new DesignError(`The ${id} goes ${can.anchors.join(', ')} in the ${info.id} layout, not ${String(e.anchor)}.`);
	}
	if (e.align !== undefined) {
		if (!can.align) throw new DesignError(`The ${id} cannot be aligned in the ${info.id} layout. ${canSay(id, can)}`);
		if (!['left', 'center', 'right'].includes(e.align)) throw new DesignError(`${id}.align takes left, center or right, not ${String(e.align)}.`);
	}
	if (e.hidden !== undefined) {
		if (typeof e.hidden !== 'boolean') throw new DesignError(`${id}.hidden takes true or false.`);
		if (e.hidden && !can.hide) throw new DesignError(`The ${id} cannot be hidden in the ${info.id} layout. ${canSay(id, can)}`);
	}
}

/** What a layer can do, in a sentence. */
export function canSay(id: string, can: TemplateInfo['layers'][number]['can']): string {
	const parts: string[] = [];
	if (can.scale) parts.push(`scaled ${can.scale[0]} to ${can.scale[1]}`);
	if (can.move) parts.push('nudged');
	if (can.anchors?.length) parts.push(`put ${can.anchors.join(', ')}`);
	if (can.align) parts.push('aligned left, center or right');
	if (can.hide) parts.push('hidden');
	return parts.length ? `The ${id} can be ${parts.length > 1 ? `${parts.slice(0, -1).join(', ')} or ${parts.at(-1)}` : parts[0]}.` : `The ${id} is fixed.`;
}

export const sizeLabel = (d: Pick<DesignDoc, 'size'>) => {
	const p = PLATFORMS.find((x) => x.id === d.size.id);
	return `${d.size.id} ${d.size.width}x${d.size.height}${p ? ` (${p.label})` : ''}`;
};

/* ---- History ---- */

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** The parts of `from` that `to` changes (null where `from` had none). */
function delta(from: DesignState, to: DesignState): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const k of STATE_KEYS) if (!same(from[k], to[k])) out[k] = from[k] ?? null;
	return out;
}

function restore(doc: DesignDoc, part: Record<string, unknown>): DesignState {
	const s: Record<string, unknown> = { ...stateOf(doc) };
	for (const [k, v] of Object.entries(part)) if ((STATE_KEYS as readonly string[]).includes(k)) s[k as StateKey] = v === null ? undefined : v;
	return tidy(s as unknown as DesignState);
}

/** `doc` moved to `next`, with what it was recorded under `change`. Unchanged states record nothing. */
export function commit(doc: DesignDoc, next: DesignState, change: string): DesignDoc {
	const from = stateOf(doc);
	const to = tidy(next);
	if (same(from, to)) return doc;
	return { version: 1, brand: doc.brand, kind: doc.kind, ...to, history: [...doc.history, { change, before: delta(from, to) }], future: [] };
}

export function undo(doc: DesignDoc, steps = 1): { doc: DesignDoc; undone: string[] } {
	if (!doc.history.length) throw new DesignError('There is nothing to undo.');
	let d = doc;
	const undone: string[] = [];
	for (let i = 0; i < steps && d.history.length; i++) {
		const h = d.history.at(-1)!;
		const from = stateOf(d);
		const to = restore(d, h.before as Record<string, unknown>);
		d = { version: 1, brand: d.brand, kind: d.kind, ...to, history: d.history.slice(0, -1), future: [...d.future, { change: h.change, after: delta(from, to) }] };
		undone.push(h.change);
	}
	return { doc: d, undone };
}

export function redo(doc: DesignDoc, steps = 1): { doc: DesignDoc; redone: string[] } {
	if (!doc.future.length) throw new DesignError('There is nothing to redo.');
	let d = doc;
	const redone: string[] = [];
	for (let i = 0; i < steps && d.future.length; i++) {
		const f = d.future.at(-1)!;
		const from = stateOf(d);
		const to = restore(d, f.after as Record<string, unknown>);
		d = { version: 1, brand: d.brand, kind: d.kind, ...to, history: [...d.history, { change: f.change, before: delta(from, to) }], future: d.future.slice(0, -1) };
		redone.push(f.change);
	}
	return { doc: d, redone };
}

/** The differences between two designs, one line each. */
export function differences(a: DesignDoc, b: DesignDoc): string[] {
	const out: string[] = [];
	const say = (v: unknown) => (v === undefined ? 'none' : typeof v === 'string' ? `"${v}"` : typeof v === 'object' ? JSON.stringify(v) : String(v));
	const line = (name: string, x: unknown, y: unknown) => {
		if (!same(x, y)) out.push(`${name}: ${say(x)} -> ${say(y)}`);
	};
	line('template', a.template, b.template);
	if (!same(a.size, b.size)) out.push(`size: ${sizeLabel(a)} -> ${sizeLabel(b)}`);
	line('theme', a.theme, b.theme);
	line('seed', a.seed, b.seed);
	for (const k of ['copy', 'images', 'options'] as const) for (const id of [...new Set([...Object.keys(a[k]), ...Object.keys(b[k])])].sort()) line(`${k}.${id}`, a[k][id], b[k][id]);
	for (const id of [...new Set([...Object.keys(a.layers), ...Object.keys(b.layers)])].sort()) for (const p of LAYER_KEYS) line(`${id}.${p}`, a.layers[id]?.[p], b.layers[id]?.[p]);
	line('allow', a.allow, b.allow);
	return out;
}
