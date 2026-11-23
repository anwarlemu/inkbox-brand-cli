import { ANCHORS, checkLayer, checkOption, commit, DesignError, layerOf, sameAs, sizeOf, slotOf, stateOf, templateOf, themeOf, tidy, unknownName, validate } from './doc.js';
import { NEVER_ALLOWED, RULES } from './check.js';
import type { Adapter, Anchor, DesignDoc, DesignState, LayerEdit, OptionValue, TemplateInfo } from './types.js';

// The edits: what `design edit` flags and `design revise` phrases both become. Each is checked against what the
// template takes before anything is drawn, so an edit the brand does not allow never reaches the file.

export type Edit =
	| { op: 'copy'; slot: string; value: string | null }
	| { op: 'replace'; from: string; to: string }
	| { op: 'image'; slot?: string; value: string | null }
	| { op: 'template'; value: string }
	| { op: 'size'; value: string; width?: number; height?: number }
	| { op: 'theme'; value: string }
	| { op: 'seed'; value: number }
	| { op: 'option'; id: string; value: OptionValue | string }
	| { op: 'layer'; layer: string; set: LayerEdit; by?: boolean }   // by: scale multiplies, dx and dy add to what is there
	| { op: 'reset'; layer?: string }
	| { op: 'allow'; rule: string };

/** `touched` names the layers an edit changed, which then have to be drawn. */
export type Applied = { doc: DesignDoc; changes: string[]; notes: string[]; touched?: string[] };

const round = (n: number) => Math.round(n * 1000) / 1000;
const pct = (n: number) => `${round(Math.abs(n) * 100)}%`;
const quote = (s: string) => `"${s.replace(/\n/g, ' / ')}"`;

/** A new document at a template's opening settings, then `edits`. */
export function create(adapter: Adapter, template: string, size: string | undefined, edits: Edit[], dims: { width?: number; height?: number } = {}): Applied {
	const info = templateOf(adapter, template);
	const id = size ? sizeOf(adapter, info, size) : info.sizes[0]!;
	const s = opening(adapter, info, id, dims);
	const blank = { version: 1, brand: adapter.brand, kind: info.kind, ...tidy({ ...s, template: info.id, copy: {}, images: {}, layers: {} }), history: [], future: [] } as DesignDoc;
	const r = applyEdits(blank, edits, adapter, 'new');
	return { ...r, doc: { ...r.doc, history: [], future: [] } };
}

function opening(adapter: Adapter, info: TemplateInfo, size: string, dims: { width?: number; height?: number }) {
	if (size === 'custom') {
		if (!info.sizes.includes('custom')) throw new DesignError(`The ${info.id} layout does not take a custom size. It comes in ${info.sizes.join(', ')}.`, info.sizes);
		if (!dims.width || !dims.height) throw new DesignError('A custom size needs --width and --height (200 to 4000).');
		return { ...adapter.defaults(info.id, 'custom'), size: { id: 'custom', width: Math.round(dims.width), height: Math.round(dims.height) } };
	}
	if (dims.width || dims.height) throw new DesignError(`--width and --height go with --size custom, not ${size}.`);
	return adapter.defaults(info.id, size);
}

/** Moves a state to another template or size: settings still at the old opening value take the new one. */
function move(s: DesignState, adapter: Adapter, info: TemplateInfo, size: string, dims: { width?: number; height?: number }, notes: string[]): DesignState {
	const from = adapter.defaults(s.template, s.size.id);
	const to = opening(adapter, info, size, dims);
	const kept = <T>(now: T, was: T, next: T) => (JSON.stringify(now) === JSON.stringify(was) ? next : now);
	const options: Record<string, OptionValue> = { ...to.options };
	for (const [k, v] of Object.entries(s.options)) {
		if (JSON.stringify(v) === JSON.stringify(from.options[k])) continue;
		try {
			checkOption(info, k, v);
			options[k] = v;
		} catch {
			notes.push(`${k} ${String(v)} does not apply to ${info.id}, so it was left out`);
		}
	}
	const layers: DesignState['layers'] = {};
	for (const [id, e] of Object.entries(s.layers)) {
		const keep: LayerEdit = {};
		for (const [k, v] of Object.entries(e)) {
			try {
				checkLayer(info, id, { [k]: v });
				Object.assign(keep, { [k]: v });
			} catch {
				notes.push(`${id}.${k} does not apply to ${info.id}, so it was left out`);
			}
		}
		if (Object.keys(keep).length) layers[id] = keep;
	}
	let theme = kept(s.theme, from.theme, to.theme);
	if (theme !== undefined && !info.themes.includes(theme)) {
		notes.push(`${theme} is not a theme of ${info.id}, so it opens in ${String(to.theme)}`);
		theme = to.theme;
	}
	const images = Object.fromEntries(Object.entries(s.images).filter(([k]) => info.images.some((i) => i.id === k) || (notes.push(`${info.id} has no picture slot "${k}", so it was left out`), false)));
	// Copy moves as it is: words are only ever removed when the person says so. A slot known by another name is renamed.
	const copy: Record<string, string> = {};
	for (const [k, v] of Object.entries(s.copy)) copy[info.copy.some((c) => c.id === k) ? k : (sameAs(k, info.copy.map((c) => c.id), adapter.aliases?.copy) ?? k)] = v;
	return { ...s, template: info.id, size: to.size, theme, seed: kept(s.seed, from.seed, to.seed), options, layers, images, copy };
}

/** Applies every edit, or throws and changes nothing. `change` is how the history names the step. */
export function applyEdits(doc: DesignDoc, edits: Edit[], adapter: Adapter, change?: string): Applied {
	let s = stateOf(doc);
	const changes: string[] = [];
	const notes: string[] = [];
	const touched: string[] = [];
	const infoOf = () => templateOf(adapter, s.template);
	const order = (e: Edit) => (e.op === 'template' ? 0 : e.op === 'size' ? 1 : e.op === 'theme' ? 2 : 3);
	for (const e of [...edits].sort((a, b) => order(a) - order(b))) {
		const info = infoOf();
		switch (e.op) {
			case 'template': {
				const next = templateOf(adapter, e.value);
				if (next.kind !== doc.kind) throw new DesignError(`${next.id} makes ${next.kind}s; this design is ${doc.kind === 'image' || doc.kind === 'illustration' ? 'an' : 'a'} ${doc.kind}. Start it with \`design new ${next.id}\`.`);
				const size = s.size.id === 'custom' && next.sizes.includes('custom') ? 'custom' : next.sizes.includes(s.size.id) ? s.size.id : next.sizes[0]!;
				if (size !== s.size.id) notes.push(`${next.id} does not come in ${s.size.id}, so it opens at ${size}`);
				s = move(s, adapter, next, size, size === 'custom' ? s.size : {}, notes);
				changes.push(`${next.id} layout`);
				break;
			}
			case 'size': {
				const id = sizeOf(adapter, info, e.value);
				s = move(s, adapter, info, id, { width: e.width, height: e.height }, notes);
				changes.push(`size ${s.size.id} ${s.size.width}x${s.size.height}`);
				break;
			}
			case 'theme':
				s.theme = themeOf(adapter, info, e.value);
				changes.push(`theme ${s.theme}`);
				break;
			case 'seed':
				if (adapter.defaults(s.template, s.size.id).seed === undefined) throw new DesignError(`Nothing in the ${info.id} layout is random, so it has no other versions. Try another theme, template or option.`);
				if (!Number.isInteger(e.value) || e.value < 0) throw new DesignError(`A seed is a whole number, 0 or more, not ${String(e.value)}.`);
				s.seed = e.value;
				changes.push(`seed ${e.value}`);
				break;
			case 'copy': {
				// A slot the document holds can always be emptied, even one the layout does not draw.
				const slot = e.value === null && s.copy[e.slot] !== undefined ? e.slot : slotOf(adapter, info, e.slot);
				if (e.value === null || !e.value.trim()) {
					delete s.copy[slot];
					changes.push(`no ${slot}`);
				} else {
					s.copy[slot] = e.value;
					changes.push(`${slot} ${quote(e.value)}`);
				}
				break;
			}
			case 'replace': {
				const hits = Object.entries(s.copy).filter(([, v]) => v.includes(e.from));
				if (!e.from || !hits.length) throw new DesignError(`None of the copy says ${quote(e.from)}. It says ${Object.entries(s.copy).map(([k, v]) => `${k}: ${quote(v)}`).join('; ') || 'nothing yet'}.`);
				for (const [k, v] of hits) s.copy[k] = v.split(e.from).join(e.to);
				changes.push(`${quote(e.from)} became ${quote(e.to)}`);
				break;
			}
			case 'image': {
				const pool = info.images.map((i) => i.id);
				if (!pool.length) throw new DesignError(`The ${info.id} layout takes no picture.`);
				const slot = e.slot === undefined ? pool[0]! : sameAs(e.slot, pool);
				if (!slot) throw unknownName('picture slot', e.slot!, pool);
				if (e.value === null) delete s.images[slot];
				else s.images[slot] = e.value;
				changes.push(e.value === null ? `no ${slot} of its own` : `${slot} ${e.value}`);
				break;
			}
			case 'option': {
				const id = matchOption(info, e.id);
				const o = info.options.find((x) => x.id === id)!;
				let v: OptionValue = e.value;
				if (typeof v === 'string') {
					if (o.range) v = Number(v);
					else if (o.values) v = o.values.find((x) => x.toLowerCase() === String(e.value).toLowerCase()) ?? v;
					if (!o.range && (v === 'true' || v === 'false')) v = v === 'true';
				}
				checkOption(info, id, v);
				s.options[id] = v;
				changes.push(`${id} ${String(v)}`);
				break;
			}
			case 'layer': {
				const id = layerOf(adapter, info, e.layer);
				const can = info.layers.find((l) => l.id === id)!.can;
				const now = s.layers[id] ?? {};
				const set: LayerEdit = { ...e.set };
				if (e.by) {
					if (set.dx !== undefined) set.dx = round((now.dx ?? 0) + set.dx);
					if (set.dy !== undefined) set.dy = round((now.dy ?? 0) + set.dy);
					if (set.scale !== undefined) {
						const at = now.scale ?? 1;
						const want = at * set.scale;
						const r = can.scale;
						if (r && set.scale > 1 && at >= r[1] - 1e-6) throw new DesignError(`The ${id} is already at its largest in the ${info.id} layout (${r[0]} to ${r[1]} times).`);
						if (r && set.scale < 1 && at <= r[0] + 1e-6) throw new DesignError(`The ${id} is already at its smallest in the ${info.id} layout (${r[0]} to ${r[1]} times).`);
						set.scale = round(r ? Math.min(r[1], Math.max(r[0], want)) : want);
						if (r && (want > r[1] + 1e-6 || want < r[0] - 1e-6)) notes.push(`the ${id} went as far as it can (${set.scale} of ${r[0]} to ${r[1]})`);
					}
				}
				checkLayer(info, id, set);
				const next: LayerEdit = { ...now };
				// A new place makes an old nudge meaningless.
				if (set.anchor !== undefined && set.dx === undefined && set.dy === undefined) {
					delete next.dx;
					delete next.dy;
				}
				Object.assign(next, set);
				if (next.scale === 1) delete next.scale;
				if (next.dx === 0) delete next.dx;
				if (next.dy === 0) delete next.dy;
				s.layers[id] = next;
				if (!next.hidden) touched.push(id);
				changes.push(sayLayer(id, e));
				break;
			}
			case 'reset':
				if (e.layer === undefined) {
					s.layers = {};
					changes.push('every layer back where the layout puts it');
				} else {
					const id = layerOf(adapter, info, e.layer);
					delete s.layers[id];
					changes.push(`${id} back where the layout puts it`);
				}
				break;
			case 'allow': {
				const rule = RULES.find((r) => r.id === e.rule);
				if (!rule) throw unknownName('rule', e.rule, RULES.map((r) => r.id));
				if (NEVER_ALLOWED.has(rule.id)) throw new DesignError(`"${rule.id}" is a brand rule and can never be allowed. ${rule.says} These can: ${RULES.filter((r) => !NEVER_ALLOWED.has(r.id)).map((r) => r.id).join(', ')}.`);
				s.allow = [...(s.allow ?? []), rule.id];
				changes.push(`allows ${rule.id}`);
				break;
			}
		}
	}
	const info = infoOf();
	const lost = Object.keys(s.copy).filter((k) => !info.copy.some((c) => c.id === k));
	if (lost.length) throw new DesignError(`The ${info.id} layout does not draw ${lost.join(' or ')}, so ${lost.map((k) => quote(s.copy[k]!)).join(' and ')} would be lost. Take ${lost.length > 1 ? 'them' : 'it'} out on purpose with ${lost.map((k) => `--set ${k}=`).join(' ')}, or choose a layout that draws ${lost.length > 1 ? 'them' : 'it'}${holders(adapter, doc.kind, Object.keys(s.copy))}.`);
	const next = commit(doc, s, change ?? changes.join('; '));
	validate(next, adapter);
	return { doc: next, changes, notes, touched };
}

function holders(adapter: Adapter, kind: string, slots: string[]): string {
	const fit = adapter.templates().filter((t) => t.kind === kind && slots.every((s) => sameAs(s, t.copy.map((c) => c.id), adapter.aliases?.copy)));
	return fit.length ? ` (${fit.map((t) => t.id).join(', ')})` : '';
}

function matchOption(info: TemplateInfo, typed: string): string {
	const k = typed.toLowerCase().replace(/[^a-z0-9]/g, '');
	const hit = info.options.find((o) => o.id.toLowerCase().replace(/[^a-z0-9]/g, '') === k);
	if (!hit) throw unknownName('option', typed, info.options.map((o) => o.id));
	return hit.id;
}

function sayLayer(id: string, e: Extract<Edit, { op: 'layer' }>): string {
	const s = e.set;
	const parts: string[] = [];
	if (s.anchor) parts.push(s.anchor.replace('-', ' '));
	if (s.align) parts.push(`aligned ${s.align}`);
	if (s.scale !== undefined) parts.push(e.by ? `${pct(s.scale - 1)} ${s.scale >= 1 ? 'bigger' : 'smaller'}` : `at ${round(s.scale * 100)}%`);
	if (s.dx !== undefined) parts.push(e.by ? `${s.dx >= 0 ? 'right' : 'left'} ${pct(s.dx)}` : `dx ${s.dx}`);
	if (s.dy !== undefined) parts.push(e.by ? `${s.dy >= 0 ? 'down' : 'up'} ${pct(s.dy)}` : `dy ${s.dy}`);
	if (s.hidden !== undefined) parts.push(s.hidden ? 'hidden' : 'shown');
	return `${id} ${parts.join(', ')}`;
}

/** `logo.anchor=top-right` as an edit. */
export function layerFlag(text: string): Edit {
	const m = /^([\w-]+)\.(\w+)=(.*)$/.exec(text.trim());
	if (!m) throw new DesignError(`--layer takes layer.property=value (logo.anchor=top-right, headline.dx=0.03), not "${text}".`);
	const [, layer, prop, raw] = m as unknown as [string, string, string, string];
	const number = () => {
		const n = Number(raw);
		if (raw.trim() === '' || !Number.isFinite(n)) throw new DesignError(`${layer}.${prop} takes a number, not "${raw}".`);
		return n;
	};
	switch (prop) {
		case 'dx':
		case 'dy':
		case 'scale':
			return { op: 'layer', layer, set: { [prop]: number() } };
		case 'anchor': {
			const a = raw.trim().toLowerCase().replace(/[\s_]+/g, '-');
			if (!(ANCHORS as readonly string[]).includes(a)) throw unknownName('place', raw, [...ANCHORS]);
			return { op: 'layer', layer, set: { anchor: a as Anchor } };
		}
		case 'align': {
			const a = raw.trim().toLowerCase();
			if (a !== 'left' && a !== 'center' && a !== 'right') throw unknownName('alignment', raw, ['left', 'center', 'right']);
			return { op: 'layer', layer, set: { align: a } };
		}
		case 'hidden': {
			if (raw !== 'true' && raw !== 'false') throw new DesignError(`${layer}.hidden takes true or false.`);
			return { op: 'layer', layer, set: { hidden: raw === 'true' } };
		}
		default:
			throw new DesignError(`A layer does not take "${prop}". It takes anchor, dx, dy, scale, align and hidden. Colors, fonts and shapes come from the brand.`);
	}
}
