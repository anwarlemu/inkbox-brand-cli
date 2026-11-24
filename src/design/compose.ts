import { DesignError, nearest, unknownName } from './doc.js';
import { PLATFORMS, platformOf, zonePx } from './platforms.js';
import type { Adapter, Anchor, BlockInfo, ComposeBlock, DesignDoc, DesignState, DrawnLayer, Rect, SectionInfo, TemplateInfo } from './types.js';

// Open composition: a design built from the brand's blocks placed on a grid of the canvas, for the graphic no template
// anticipated, and pages built from the brand's sections. The grid, placement, order, the file format, their phrases
// and checks are shared; each brand only says which blocks and sections it has and draws them (adapter.compose,
// adapter.page).

export const COMPOSE = 'compose';
export const GRID = { cols: 12, rows: 12 };
const ANCHORS: Anchor[] = ['top-left', 'top', 'top-right', 'left', 'center', 'right', 'bottom-left', 'bottom', 'bottom-right'];

export const isCompose = (d: Pick<DesignState, 'template'>) => d.template === COMPOSE;

export function blockInfo(adapter: Adapter, type: string): BlockInfo {
	const all = adapter.compose?.blocks() ?? [];
	const hit = all.find((b) => b.type === type.toLowerCase()) ?? all.find((b) => b.names?.includes(type.toLowerCase()));
	if (!hit) throw unknownName('block', type, all.map((b) => b.type));
	return hit;
}

/** What a compose design takes: its blocks' words, pictures and parts. */
export function composeInfo(adapter: Adapter, s?: Pick<DesignState, 'blocks'>): TemplateInfo {
	if (!adapter.compose) throw new DesignError('This command line has no blocks to compose with.');
	const c = adapter.compose;
	const blocks = s?.blocks ?? [];
	const of = (b: ComposeBlock) => blockInfo(adapter, b.type);
	return {
		id: COMPOSE,
		kind: 'image',
		description: 'Your own layout: the brand\'s blocks placed on a grid of the canvas.',
		sizes: c.sizes ?? [...PLATFORMS.map((p) => p.id), 'custom'],
		themes: c.themes,
		copy: blocks.flatMap((b) => of(b).copy.map((k) => ({ id: `${b.id}.${k.id}`, ...(k.required ? { required: true } : {}) }))),
		images: blocks.flatMap((b) => (of(b).image ? [{ id: b.id, ...(of(b).image!.required ? { required: true } : {}), ...(of(b).image!.values ? { values: of(b).image!.values } : {}) }] : [])),
		options: blocks.flatMap((b) => (of(b).options ?? []).map((o) => ({ ...o, id: `${b.id}.${o.id}` }))),
		layers: blocks.map((b) => ({ id: b.id, can: { scale: [0.5, 1.6] as [number, number], hide: true, align: of(b).kind === 'text' } })),
		...(c.grounds ? { grounds: c.grounds } : {}),
		formats: c.formats ?? ['png', 'svg'],
		layouts: ['composition', 'custom layout', 'free layout'],
	};
}

/** The cells of the canvas: a margin all round, then cols x rows with a gutter between. */
export function gridOf(doc: Pick<DesignDoc, 'size' | 'grid'>, margin?: number): { cell: (at: ComposeBlock['at']) => Rect; m: number; g: number } {
	const { width: W, height: H } = doc.size;
	const grid = doc.grid ?? GRID;
	// The grid covers what the platform shows: its safe area, or the canvas less the strips it crops.
	const pf = platformOf(doc.size.id, W, H);
	let S: Rect = pf.safe ? zonePx(pf.safe, W, H) : { x: 0, y: 0, w: W, h: H };
	for (const z of pf.avoid) {
		const r = zonePx(z, W, H);
		if (r.w > W - 1) S = r.y < 1 ? { ...S, y: r.y + r.h, h: S.y + S.h - r.y - r.h } : { ...S, h: r.y - S.y };
		else if (r.h > H - 1) S = r.x < 1 ? { ...S, x: r.x + r.w, w: S.x + S.w - r.x - r.w } : { ...S, w: r.x - S.x };
	}
	const m = margin ?? Math.round(Math.min(S.w, S.h) * 0.06);
	const g = Math.round(Math.min(S.w, S.h) * 0.02);
	const cw = (S.w - m * 2 - g * (grid.cols - 1)) / grid.cols;
	const ch = (S.h - m * 2 - g * (grid.rows - 1)) / grid.rows;
	return {
		m,
		g,
		cell: (at) => ({ x: S.x + m + at.col * (cw + g), y: S.y + m + at.row * (ch + g), w: at.cols * cw + (at.cols - 1) * g, h: at.rows * ch + (at.rows - 1) * g }),
	};
}

/** Where each block is drawn, in canvas pixels, in drawing order (first is underneath). */
export function blockRects(doc: Pick<DesignDoc, 'size' | 'grid' | 'blocks'>, margin?: number): { block: ComposeBlock; rect: Rect }[] {
	const g = gridOf(doc, margin);
	return (doc.blocks ?? []).map((block) => ({ block, rect: g.cell(block.at) }));
}

/** Moves a block's cells clear of what the platform covers in a corner (X's profile picture), when it can. */
export function clearOfCuts(doc: Pick<DesignDoc, 'size' | 'grid'>, at: ComposeBlock['at']): ComposeBlock['at'] {
	const { width: W, height: H } = doc.size;
	const grid = doc.grid ?? GRID;
	const cuts = platformOf(doc.size.id, W, H).avoid.map((z) => zonePx(z, W, H)).filter((r) => r.w < W - 1 && r.h < H - 1);
	if (!cuts.length) return at;
	const g = gridOf(doc);
	const hits = (a: ComposeBlock['at']) => {
		const r = g.cell(a);
		return cuts.some((c) => r.x < c.x + c.w && r.x + r.w > c.x && r.y < c.y + c.h && r.y + r.h > c.y);
	};
	if (!hits(at)) return at;
	for (let d = 1; d < grid.cols; d++) for (const col of [at.col + d, at.col - d]) {
		const next = { ...at, col };
		if (col >= 0 && col + at.cols <= grid.cols && !hits(next)) return next;
	}
	for (let d = 1; d < grid.rows; d++) for (const row of [at.row - d, at.row + d]) {
		const next = { ...at, row };
		if (row >= 0 && row + at.rows <= grid.rows && !hits(next)) return next;
	}
	return at;
}

/** A place in words as cells for a block of a span. */
export function placeAt(place: Anchor, span: { cols: number; rows: number }, grid = GRID): ComposeBlock['at'] {
	const cols = Math.min(span.cols, grid.cols);
	const rows = Math.min(span.rows, grid.rows);
	const col = place.endsWith('left') ? 0 : place.endsWith('right') ? grid.cols - cols : Math.floor((grid.cols - cols) / 2);
	const row = place.startsWith('top') ? 0 : place.startsWith('bottom') ? grid.rows - rows : Math.floor((grid.rows - rows) / 2);
	return { col, row, cols, rows };
}

export function checkAt(at: ComposeBlock['at'], grid = GRID, id = 'block') {
	const ok = (n: unknown) => Number.isInteger(n) && (n as number) >= 0;
	if (!at || !ok(at.col) || !ok(at.row) || !ok(at.cols) || !ok(at.rows) || at.cols < 1 || at.rows < 1) throw new DesignError(`The ${id} needs a place on the grid: col, row, cols and rows, whole numbers.`);
	if (at.col + at.cols > grid.cols || at.row + at.rows > grid.rows) throw new DesignError(`The ${id} runs off the grid (${grid.cols} columns by ${grid.rows} rows): col ${at.col} + ${at.cols} and row ${at.row} + ${at.rows}.`);
}

/** `col,row,cols,rows` as typed. */
export function parseAt(text: string): ComposeBlock['at'] {
	const n = text.split(',').map((x) => Number(x.trim()));
	if (n.length !== 4 || n.some((x) => !Number.isInteger(x))) throw new DesignError(`--at takes col,row,cols,rows (0,0,6,3 is the top-left half, three rows tall), not "${text}".`);
	return { col: n[0]!, row: n[1]!, cols: n[2]!, rows: n[3]! };
}

/** Every block valid, ids unique, on the grid. */
export function validateBlocks(adapter: Adapter, s: Pick<DesignState, 'blocks' | 'grid'>) {
	const grid = s.grid ?? GRID;
	if (!Number.isInteger(grid.cols) || !Number.isInteger(grid.rows) || grid.cols < 1 || grid.rows < 1 || grid.cols > 48 || grid.rows > 48) throw new DesignError('The grid takes 1 to 48 columns and rows.');
	const seen = new Set<string>();
	for (const b of s.blocks ?? []) {
		if (!b || typeof b.id !== 'string' || !/^[a-z][a-z0-9-]*$/.test(b.id)) throw new DesignError(`A block id is lowercase letters, numbers and dashes, starting with a letter (got "${String(b?.id)}").`);
		if (seen.has(b.id)) throw new DesignError(`Two blocks are called "${b.id}".`);
		seen.add(b.id);
		blockInfo(adapter, b.type);
		checkAt(b.at, grid, b.id);
		const extra = Object.keys(b).filter((k) => !['id', 'type', 'at'].includes(k));
		if (extra.length) throw new DesignError(`A block holds id, type and at; its words are copy ("${b.id}.text"), not "${extra[0]}".`);
	}
}

/** A fresh id for a block of a type: the type, then type-2, type-3. */
export function newId(blocks: ComposeBlock[], type: string): string {
	if (!blocks.some((b) => b.id === type)) return type;
	for (let i = 2; ; i++) if (!blocks.some((b) => b.id === `${type}-${i}`)) return `${type}-${i}`;
}

/** The block a word names: its id, or its type when one block has it. */
export function blockOf(s: Pick<DesignState, 'blocks'>, typed: string, adapter?: Adapter): ComposeBlock {
	const blocks = s.blocks ?? [];
	const t = typed.toLowerCase().trim().replace(/\s+/g, '-');
	const byId = blocks.find((b) => b.id === t);
	if (byId) return byId;
	const type = adapter ? (adapter.compose?.blocks().find((x) => x.type === t || x.names?.includes(t))?.type ?? t) : t;
	const byType = blocks.filter((b) => b.type === type);
	if (byType.length === 1) return byType[0]!;
	if (byType.length > 1) throw new DesignError(`There are ${byType.length} ${type} blocks: say which (${byType.map((b) => b.id).join(', ')}).`);
	const near = nearest(t, blocks.map((b) => b.id));
	throw new DesignError(`There is no block "${typed}".${blocks.length ? ` The blocks are ${blocks.map((b) => b.id).join(', ')}.` : ' The design has no blocks yet: add one.'}${near.length ? ` Did you mean ${near.join(' or ')}?` : ''}`);
}

export type ComposeEdit =
	| { op: 'block-add'; type: string; id?: string; at?: ComposeBlock['at']; place?: Anchor; copy?: Record<string, string> }
	| { op: 'block-move'; id: string; at?: ComposeBlock['at']; place?: Anchor }
	| { op: 'block-span'; id: string; cols?: number; rows?: number }
	| { op: 'block-remove'; id: string }
	| { op: 'block-order'; id: string; to: 'front' | 'back' | 'forward' | 'backward' }
	| { op: 'grid'; cols: number; rows: number };

/** Applies a compose edit to a state; returns what changed, in words. */
export function applyCompose(adapter: Adapter, s: DesignState, e: ComposeEdit): string {
	if (!isCompose(s)) throw new DesignError(`Blocks go in a compose design (design new compose); ${s.template} is a template.`);
	const grid = s.grid ?? GRID;
	const blocks = [...(s.blocks ?? [])];
	switch (e.op) {
		case 'block-add': {
			const info = blockInfo(adapter, e.type);
			const id = e.id ?? newId(blocks, info.type);
			if (blocks.some((b) => b.id === id)) throw new DesignError(`There is already a block "${id}".`);
			const at = e.at ?? clearOfCuts(s, placeAt(e.place ?? info.place ?? 'center', info.span, grid));
			checkAt(at, grid, id);
			blocks.push({ id, type: info.type, at });
			for (const [k, v] of Object.entries(e.copy ?? {})) {
				const slot = k === '' ? info.copy[0]?.id : info.copy.find((c) => c.id === k)?.id;
				if (!slot) throw new DesignError(`A ${info.type} block takes ${info.copy.map((c) => c.id).join(', ') || 'no words'}, not "${k}".`);
				s.copy[`${id}.${slot}`] = v;
			}
			s.blocks = blocks;
			return `${id} added (${info.type})`;
		}
		case 'block-move': {
			const b = blockOf(s, e.id, adapter);
			const at = e.at ?? clearOfCuts(s, placeAt(e.place!, { cols: b.at.cols, rows: b.at.rows }, grid));
			checkAt(at, grid, b.id);
			s.blocks = blocks.map((x) => (x.id === b.id ? { ...x, at } : x));
			return `${b.id} ${e.place ? `to the ${e.place.replace('-', ' ')}` : `at ${at.col},${at.row}`}`;
		}
		case 'block-span': {
			const b = blockOf(s, e.id, adapter);
			const at = { ...b.at, cols: b.at.cols + (e.cols ?? 0), rows: b.at.rows + (e.rows ?? 0) };
			// Growing past the edge moves it in rather than refusing.
			at.col = Math.max(0, Math.min(at.col, grid.cols - at.cols));
			at.row = Math.max(0, Math.min(at.row, grid.rows - at.rows));
			checkAt(at, grid, b.id);
			s.blocks = blocks.map((x) => (x.id === b.id ? { ...x, at } : x));
			return `${b.id} ${at.cols} by ${at.rows} cells`;
		}
		case 'block-remove': {
			const b = blockOf(s, e.id, adapter);
			s.blocks = blocks.filter((x) => x.id !== b.id);
			for (const k of Object.keys(s.copy)) if (k.startsWith(`${b.id}.`)) delete s.copy[k];
			for (const k of Object.keys(s.options)) if (k.startsWith(`${b.id}.`)) delete s.options[k];
			delete s.images[b.id];
			delete s.layers[b.id];
			return `${b.id} removed`;
		}
		case 'block-order': {
			const b = blockOf(s, e.id, adapter);
			const i = blocks.findIndex((x) => x.id === b.id);
			blocks.splice(i, 1);
			const to = e.to === 'front' ? blocks.length : e.to === 'back' ? 0 : e.to === 'forward' ? Math.min(blocks.length, i + 1) : Math.max(0, i - 1);
			blocks.splice(to, 0, b);
			s.blocks = blocks;
			return `${b.id} ${e.to === 'front' ? 'in front' : e.to === 'back' ? 'at the back' : e.to}`;
		}
		case 'grid': {
			const next = { cols: e.cols, rows: e.rows };
			// Blocks keep their share of the canvas on the new grid.
			s.blocks = blocks.map((b) => {
				const at = {
					col: Math.round((b.at.col * next.cols) / grid.cols),
					row: Math.round((b.at.row * next.rows) / grid.rows),
					cols: Math.max(1, Math.round((b.at.cols * next.cols) / grid.cols)),
					rows: Math.max(1, Math.round((b.at.rows * next.rows) / grid.rows)),
				};
				at.cols = Math.min(at.cols, next.cols - at.col);
				at.rows = Math.min(at.rows, next.rows - at.row);
				return { ...b, at };
			});
			s.grid = next;
			return `grid ${next.cols} by ${next.rows}`;
		}
	}
}

/** Plain words for compose designs, tried before the template phrases. Undefined when it is not about blocks. */
export function composePhrase(t: string, quotes: string[], adapter: Adapter, s: DesignState): (ComposeEdit | { op: 'copy'; slot: string; value: string })[] | undefined {
	if (!isCompose(s) || !adapter.compose) return undefined;
	const types = adapter.compose.blocks().flatMap((b) => [b.type, ...(b.names ?? [])]).sort((a, b) => b.length - a.length);
	const ids = (s.blocks ?? []).map((b) => b.id).sort((a, b) => b.length - a.length);
	const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/-/g, '[ -]');
	const T = `(${types.map(esc).join('|')})`;
	const B = `(${[...ids, ...types].map(esc).join('|')})`;
	const P = '((?:top|bottom|upper|lower)(?:[ -]?(?:left|right))?|left|right|center|centre|middle)';
	const place = (w: string): Anchor => {
		const x = w.replace(/upper/, 'top').replace(/lower/, 'bottom').replace(/centre|middle/, 'center').replace(/\s+/, '-');
		const a = ANCHORS.find((p) => p === x) ?? (x === 'top' || x === 'bottom' || x === 'left' || x === 'right' ? x : undefined);
		if (!a) throw new DesignError(`"${w}" is not a place: say top left, top, top right, left, center, right, bottom left, bottom or bottom right.`);
		return a as Anchor;
	};
	const quote = (x?: string) => (x ? quotes[Number(/<(\d+)>/.exec(x)![1])] : undefined);
	let m: RegExpExecArray | null;
	if ((m = new RegExp(`^(?:add|put|place|insert|drop in)(?: another| one more| new)? ${T}(?: block)?(?: (?:with|saying|that says|reading))?(?: (<\\d+>))?(?: (?:at |in |on |to )?${P}(?: corner| side)?)?(?: (<\\d+>))?$`).exec(t))) {
		const words = quote(m[2] ?? m[4]);
		return [{ op: 'block-add', type: m[1]!.replace(/ /g, '-'), ...(m[3] ? { place: place(m[3]) } : {}), ...(words !== undefined ? { copy: { '': words } } : {}) }];
	}
	if ((m = new RegExp(`^(?:move|put|place|shift) ${B}(?: block)? (?:to |in |into |at |on )*${P}(?: corner| side)?$`).exec(t))) return [{ op: 'block-move', id: m[1]!, place: place(m[2]!) }];
	if ((m = new RegExp(`^(?:remove|delete|drop|take out|get rid of) ${B}(?: block)?$`).exec(t))) return [{ op: 'block-remove', id: m[1]! }];
	if ((m = new RegExp(`^(?:bring|move|put) ${B}(?: block)? (?:to (?:the )?)?(front|forward|top layer)$`).exec(t))) return [{ op: 'block-order', id: m[1]!, to: m[2] === 'forward' ? 'forward' : 'front' }];
	if ((m = new RegExp(`^(?:send|move|put) ${B}(?: block)? (?:to (?:the )?)?(back|backward|behind|bottom layer)$`).exec(t))) return [{ op: 'block-order', id: m[1]!, to: m[2] === 'backward' ? 'backward' : 'back' }];
	if ((m = new RegExp(`^(?:make )?${B}(?: block)? (wider|narrower|taller|shorter)$`).exec(t))) return [{ op: 'block-span', id: m[1]!, ...(m[2] === 'wider' ? { cols: 1 } : m[2] === 'narrower' ? { cols: -1 } : m[2] === 'taller' ? { rows: 1 } : { rows: -1 }) }];
	if ((m = new RegExp(`^(?:(?:change|set|make|rewrite|update) )?${B}(?: block)?(?: text| copy| words)?(?: (?:to|says?|saying|reads?|as|:))? (<\\d+>)$`).exec(t))) {
		const b = blockOf(s, m[1]!, adapter);
		const slot = blockInfo(adapter, b.type).copy[0];
		if (!slot) throw new DesignError(`A ${b.type} block holds no words.`);
		return [{ op: 'copy', slot: `${b.id}.${slot.id}`, value: quote(m[2])! }];
	}
	if ((m = /^(?:use )?(?:a )?(\d+)(?: columns?)? (?:by|x) (\d+)(?: rows?)? grid$/.exec(t))) return [{ op: 'grid', cols: Number(m[1]), rows: Number(m[2]) }];
	return undefined;
}

/** Phrases a compose design understands, for help and errors. */
export function composeExamples(adapter: Adapter, s?: Pick<DesignState, 'blocks'>): string[] {
	const types = adapter.compose?.blocks().map((b) => b.type) ?? [];
	const one = s?.blocks?.[0]?.id ?? types[0] ?? 'headline';
	return [...types.slice(0, 4).map((t) => `add a ${t} top left`), `move the ${one} to the bottom right`, `make the ${one} wider`, `bring the ${one} to the front`, `remove the ${one}`, '12 by 8 grid'];
}

/** Two blocks whose cells overlap, unless one may sit on the other. */
export function blockOverlaps(adapter: Adapter, doc: Pick<DesignDoc, 'blocks'>): string[] {
	const out: string[] = [];
	const bs = doc.blocks ?? [];
	for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {
		const [a, b] = [bs[i]!, bs[j]!];
		const hit = a.at.col < b.at.col + b.at.cols && b.at.col < a.at.col + a.at.cols && a.at.row < b.at.row + b.at.rows && b.at.row < a.at.row + a.at.rows;
		if (!hit) continue;
		const under = (x: ComposeBlock) => blockInfo(adapter, x.type).under;
		if (under(a) || under(b)) continue;
		out.push(`${a.id} and ${b.id}`);
	}
	return out;
}

/* ---- Pages ---- */

export type Outline = { title?: string; sections: { type: string; copy?: Record<string, string>; items?: Record<string, string>[] }[] };

/** Checks an outline against the sections the brand has: known types, known words, needed words present, item counts. */
export function validateOutline(adapter: Adapter, o: unknown): Outline {
	if (!adapter.page) throw new DesignError('This command line has no sections to build pages from.');
	const all = adapter.page.sections();
	const doc = o as Outline;
	if (!doc || typeof doc !== 'object' || !Array.isArray(doc.sections) || !doc.sections.length) throw new DesignError('An outline is { "title": "...", "sections": [ { "type": "hero", "copy": { ... } }, ... ] }.');
	const extra = Object.keys(doc).filter((k) => !['title', 'sections', '$comment'].includes(k));
	if (extra.length) throw new DesignError(`An outline holds title and sections, not "${extra[0]}".`);
	doc.sections.forEach((s, i) => {
		const where = `Section ${i + 1}`;
		if (!s || typeof s.type !== 'string') throw new DesignError(`${where} needs a "type": ${all.map((x) => x.type).join(', ')}.`);
		const info: SectionInfo | undefined = all.find((x) => x.type === s.type);
		if (!info) throw unknownName('section', s.type, all.map((x) => x.type));
		const bad = Object.keys(s).filter((k) => !['type', 'copy', 'items'].includes(k));
		if (bad.length) throw new DesignError(`${where} (${s.type}) holds type, copy and items, not "${bad[0]}".`);
		for (const [k, v] of Object.entries(s.copy ?? {})) {
			if (!info.copy.some((c) => c.id === k)) throw new DesignError(`${where} (${s.type}) does not take "${k}". It takes ${info.copy.map((c) => c.id).join(', ') || 'no copy'}.`);
			if (typeof v !== 'string') throw new DesignError(`${where} (${s.type}): "${k}" takes text.`);
		}
		for (const c of info.copy) if (c.required && !s.copy?.[c.id]?.trim()) throw new DesignError(`${where} (${s.type}) needs "${c.id}". Nothing is made up for it.`);
		const items = s.items ?? [];
		if (!info.items && items.length) throw new DesignError(`${where} (${s.type}) takes no items.`);
		if (info.items) {
			const [lo, hi] = info.items.count;
			if (items.length < lo || items.length > hi) throw new DesignError(`${where} (${s.type}) takes ${lo} to ${hi} items, not ${items.length}.`);
			items.forEach((it, n) => {
				for (const [k, v] of Object.entries(it)) if (!info.items!.copy.some((c) => c.id === k) || typeof v !== 'string') throw new DesignError(`${where} (${s.type}) item ${n + 1}: "${k}" is not one of ${info.items!.copy.map((c) => c.id).join(', ')}.`);
				for (const c of info.items!.copy) if (c.required && !it[c.id]?.trim()) throw new DesignError(`${where} (${s.type}) item ${n + 1} needs "${c.id}".`);
			});
		}
	});
	return doc;
}

/** Layers of a compose design that left their cells (words never do: the block's renderer wraps or refuses). */
export function outsideCells(doc: Pick<DesignDoc, 'size' | 'grid' | 'blocks'>, layers: DrawnLayer[], margin?: number): string[] {
	const rects = new Map(blockRects(doc, margin).map((r) => [r.block.id, r.rect]));
	return layers.filter((l) => l.kind === 'text' && rects.has(l.id)).filter((l) => {
		const r = rects.get(l.id)!;
		return (l.ink ?? [l.box]).some((i) => i.x < r.x - 1 || i.y < r.y - 1 || i.x + i.w > r.x + r.w + 1 || i.y + i.h > r.y + r.h + 1);
	}).map((l) => l.id);
}
