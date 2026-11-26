import { existsSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { checkDesign, errorsOf } from './check.js';
import { composeInfo, gridOf, COMPOSE } from './compose.js';
import { DesignError, infoFor } from './doc.js';
import { create } from './ops.js';
import { platformOf, PLATFORMS } from './platforms.js';
import type { Adapter, BlockInfo, ComposeBlock, DesignDoc, DrawnLayer, Finding, OptionValue } from './types.js';

// Ads from a brief, in any arrangement: the brief's parts (headline, supporting line, label, stat, quote, search
// prompt, plan card, features, pictures, button) laid out as the brand's own compose blocks on the grid. A Layout
// section says how in plain words, one row per line from the top, parts side by side split by commas ("stat left,
// quote right"); without one, every part the brief gives is laid out stacked, centered and in two columns. Nothing is
// a template: whatever is asked is arranged, drawn by the brand and checked by the same rules as every design. The
// brand adds its own ground (texture, pattern, light) through adapter.compose.ground.

export type AdBrief = {
	name?: string;
	goal?: string;
	platforms: string[];
	copy: Partial<Record<Field, string>>;
	tone?: 'dark' | 'light';
	layout: string[];
	images: { file: string; shows: string }[];
	dir: string;
};
type Field = 'headline' | 'supporting' | 'label' | 'cta' | 'stat' | 'quote' | 'name' | 'role' | 'search' | 'plan' | 'offer' | 'features' | 'chart';

const SECTIONS: Record<string, string[]> = {
	name: ['name', 'campaign'],
	goal: ['goal', 'objective', 'purpose'],
	audience: ['audience', 'who', 'target'],
	platforms: ['platforms', 'platform', 'sizes', 'size', 'where', 'channels'],
	headline: ['headline', 'title', 'heading'],
	supporting: ['supporting line', 'supporting', 'subhead', 'body', 'line'],
	label: ['label', 'eyebrow', 'kicker', 'badge', 'tag'],
	cta: ['cta', 'button', 'call to action'],
	stat: ['stat', 'figure', 'metric', 'number'],
	quote: ['quote', 'testimonial'],
	name_: ['quote name', 'quoted', 'person'],
	role: ['quote role', 'role', 'attribution'],
	search: ['search prompt', 'search', 'prompt', 'query'],
	plan: ['plan', 'plan name', 'tier'],
	offer: ['offer', 'price', 'pricing', 'deal'],
	features: ['features', 'included', 'points'],
	chart: ['chart', 'data', 'numbers'],
	look: ['look', 'tone', 'style', 'feel', 'theme'],
	layout: ['layout', 'arrangement', 'composition', 'structure'],
	images: ['images', 'image', 'pictures', 'photos', 'screenshots', 'assets'],
	must: ['must-haves', 'must haves', 'must', 'musts'],
	donts: ["don'ts", 'donts', 'avoid', 'never'],
};
const sectionOf = (raw: string) => {
	const k = raw.toLowerCase().replace(/[‘’]/g, "'").replace(/[:#*_]+/g, ' ').replace(/\s+/g, ' ').trim();
	return Object.entries(SECTIONS).find(([, names]) => names.includes(k))?.[0];
};

/** Reads a brief: Markdown headings (## Headline) or Key: value lines. Copy is kept exactly as written. */
export function parseAdBrief(text: string, dir: string, name = 'brief'): AdBrief {
	const b: AdBrief = { platforms: [], copy: {}, layout: [], images: [], dir };
	const found: [string, string[]][] = [];
	let cur: [string, string[]] | undefined;
	const body = text.replace(/<!--[\s\S]*?-->/g, '');
	for (const line of body.split(/\r?\n/)) {
		const h = /^#{2,6}\s+(.+?)\s*$/.exec(line);
		const t = /^#\s+(.+?)\s*$/.exec(line);
		const kv = /^([A-Za-z'’ -]{2,24}):\s*(.*)$/.exec(line);
		if (t && !cur) b.name = t[1];
		else if (h) {
			const id = sectionOf(h[1]!);
			if (!id) throw new DesignError(`${name}: "${h[1]}" is not a section. Sections: ${Object.keys(SECTIONS).map((s) => s.replace(/_$/, '')).join(', ')}.`);
			found.push((cur = [id, []]));
		} else if (kv && sectionOf(kv[1]!) && !cur) found.push([sectionOf(kv[1]!)!, [kv[2]!]]);
		else if (kv && sectionOf(kv[1]!) && cur && !line.startsWith(' ')) found.push((cur = [sectionOf(kv[1]!)!, [kv[2]!]]));
		else if (cur) cur[1].push(line);
		else if (line.trim()) throw new DesignError(`${name}: "${line.trim().slice(0, 60)}" is outside a section. Start each part with a heading (## Headline) or a key (Headline: ...).`);
	}
	const items = (lines: string[]) => lines.map((l) => l.replace(/^\s*[-*]\s+|^\s*\d+[.)]\s+/, '').trim()).filter(Boolean);
	const one = (lines: string[]) => items(lines).join(' ').replace(/^"(.*)"$/, '$1').replace(/^“(.*)”$/, '$1');
	for (const [id, lines] of found) {
		if (id === 'name') b.name = one(lines);
		else if (id === 'goal') b.goal = one(lines);
		else if (id === 'platforms') b.platforms.push(...items(lines).flatMap((l) => l.split(',')).map((s) => s.trim()).filter(Boolean));
		else if (id === 'look') {
			const l = one(lines).toLowerCase();
			b.tone = /\b(light theme|light mode|on white|white ground|light ground)\b/.test(l) ? 'light' : /\b(dark|black|dark theme|on black)\b/.test(l) ? 'dark' : undefined;
		} else if (id === 'layout') b.layout.push(...items(lines));
		else if (id === 'images') for (const l of items(lines)) {
			const m = /^(?:[\w-]+=)?(\S+\.(?:png|jpe?g|webp))\s*(?::\s*(.*))?$/i.exec(l);
			if (!m) throw new DesignError(`${name}: Images: "${l}" names no PNG, JPEG or WebP file. Write one per line as file.png: what it shows.`);
			b.images.push({ file: m[1]!, shows: m[2] ?? '' });
		}
		else if (id === 'features') b.copy.features = items(lines).length > 1 ? items(lines).join(' | ') : one(lines);
		else if (id === 'audience' || id === 'must' || id === 'donts') continue;
		else b.copy[(id === 'name_' ? 'name' : id) as Field] = one(lines);
	}
	return b;
}

/** The size ids a brief's platforms name, in order, each once: platform names, size ids or their other names. */
export function adSizes(adapter: Adapter, platforms: string[]): string[] {
	const can = composeInfo(adapter).sizes.filter((s) => s !== 'custom');
	const named: Record<string, string[]> = {
		x: ['landscape'], twitter: ['landscape'], linkedin: ['linkedin', 'square'], 'instagram feed': ['square'], instagram: ['square', 'portrait'],
		'instagram portrait': ['portrait'], 'instagram story': ['story'], story: ['story'], tiktok: ['story'], 'tiktok cover': ['story'], facebook: ['portrait', 'square'],
		'all social': ['square', 'portrait', 'story', 'landscape', 'linkedin'],
	};
	const out: string[] = [];
	for (const p of platforms) {
		const k = p.toLowerCase().trim();
		const ids = named[k] ?? [PLATFORMS.find((x) => x.id === k || x.aliases.includes(k.replace(/\s+/g, '-')) || x.label.toLowerCase() === k)?.id ?? k];
		const ok = ids.filter((id) => can.includes(id));
		if (!ok.length) throw new DesignError(`Platforms: "${p}" is not a size this brand draws ads at. Name a platform (X, LinkedIn, Instagram feed, Instagram portrait, Instagram story, Facebook, TikTok, all social) or a size: ${can.join(', ')}.`);
		for (const id of ok) if (!out.includes(id)) out.push(id);
	}
	if (!out.length) throw new DesignError('The brief names no platforms (## Platforms).');
	return out;
}

// ----- The arrangement -----

type At = ComposeBlock['at'];
type Kind = 'eyebrow' | 'headline' | 'body' | 'stat' | 'quote' | 'search' | 'card' | 'list' | 'pictures' | 'chart' | 'button' | 'logo';
type Part = { kind: Kind; count?: number; align?: 'left' | 'center' | 'right'; big?: boolean; small?: boolean; column?: boolean };
type Group = { parts: Part[]; pin?: 'top' | 'bottom' };
export type Arrangement = { id: string; name: string; asked: boolean; grid: { cols: number; rows: number }; blocks: ComposeBlock[]; copy: Record<string, string>; options: Record<string, OptionValue>; images: Record<string, number>; draws: Field[] };

const WORDS: [Kind, string[]][] = [
	['search', ['search bar', 'search', 'prompt', 'query', 'search box']],
	['card', ['pricing card', 'plan card', 'price card', 'card', 'pricing', 'plan', 'price', 'offer']],
	['pictures', ['photos', 'photo', 'images', 'image', 'pictures', 'picture', 'creatives', 'creative', 'screenshots', 'screenshot', 'photo grid', 'photo row']],
	['headline', ['headline', 'title', 'heading', 'head']],
	['body', ['supporting line', 'supporting', 'subhead', 'body', 'line', 'text', 'copy', 'description']],
	['eyebrow', ['label', 'eyebrow', 'kicker', 'badge', 'tag']],
	['stat', ['stat', 'figure', 'number', 'metric', 'result']],
	['quote', ['quote', 'testimonial', 'review']],
	['list', ['features', 'feature list', 'list', 'bullets', 'points']],
	['chart', ['chart', 'graph', 'bars']],
	['button', ['button', 'cta', 'call to action']],
	['logo', ['logo', 'lockup', 'wordmark']],
];
const COUNTS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, pair: 2 };

function partOf(text: string): Part {
	const t = ` ${text.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()} `;
	let kind: Kind | undefined;
	let at = Infinity;
	for (const [k, words] of WORDS) for (const w of words) {
		const i = t.indexOf(` ${w} `);
		if (i >= 0 && i < at) {
			kind = k;
			at = i;
		}
	}
	if (!kind) throw new DesignError(`Layout: "${text.trim()}" names no part. Name one of: headline, supporting line, label, stat, quote, search bar, pricing card, features, photos, chart, button, logo (with left, right, center, top, bottom, big or small).`);
	const n = /\b(\d)\b/.exec(t)?.[1];
	const word = Object.keys(COUNTS).find((w) => t.includes(` ${w} `));
	const align = / left /.test(t) ? 'left' : / right /.test(t) ? 'right' : / (center|centre|centered|middle) /.test(t) ? 'center' : undefined;
	return { kind, count: n ? Number(n) : word ? COUNTS[word] : / (row|grid) /.test(t) && kind === 'pictures' ? 3 : undefined, align, big: / (big|bigger|large|larger|huge|hero) /.test(t), small: / (small|smaller|little) /.test(t) };
}

/** A Layout section as rows from the top, parts side by side. */
export function parseAdLayout(lines: string[]): Group[] {
	return lines.map((l) => l.trim()).filter(Boolean).map((line) => {
		const parts = line.split(/,|;|\bnext to\b|\bbeside\b/i).map((s) => s.trim()).filter(Boolean).map(partOf);
		const p = line.toLowerCase();
		return { parts, pin: /\b(bottom|foot|footer)\b/.test(p) ? 'bottom' : /\b(top|header)\b/.test(p) ? 'top' : undefined } as Group;
	});
}

const has = (b: AdBrief, f: Field) => Boolean(b.copy[f]?.trim());
const TEXT: Kind[] = ['eyebrow', 'headline', 'body'];
const FLEX: Kind[] = ['pictures', 'chart'];

function partsOf(b: AdBrief): Part[] {
	const out: Part[] = [];
	if (has(b, 'label')) out.push({ kind: 'eyebrow' });
	if (has(b, 'headline')) out.push({ kind: 'headline' });
	if (has(b, 'supporting')) out.push({ kind: 'body' });
	if (has(b, 'stat')) out.push({ kind: 'stat' });
	if (has(b, 'quote')) out.push({ kind: 'quote' });
	if (has(b, 'search')) out.push({ kind: 'search' });
	const card = has(b, 'plan') || has(b, 'offer');
	if (card) out.push({ kind: 'card' });
	else if (has(b, 'features')) out.push({ kind: 'list' });
	if (has(b, 'chart')) out.push({ kind: 'chart' });
	if (b.images.length) out.push({ kind: 'pictures', count: Math.min(3, b.images.length) });
	if (has(b, 'cta')) out.push({ kind: 'button' });
	return out;
}

/** The block type this brand draws for a part, from its own compose blocks (null when it has none). */
function typeFor(blocks: BlockInfo[], kind: Kind): string | undefined {
	const pick: Record<Kind, string[]> = {
		eyebrow: ['eyebrow', 'badge'], headline: ['headline'], body: ['body'], stat: ['stat'], quote: ['quote'], search: ['search'], card: ['card'], list: ['list'],
		pictures: ['picture', 'screenshot', 'window'], chart: ['chart'], button: ['button'], logo: ['logo'],
	};
	return pick[kind].find((t) => blocks.some((x) => x.type === t));
}

/** Arrangements for one canvas: the brief's Layout (when it has one), else stacked, centered and two columns. */
export function arrangeAd(adapter: Adapter, b: AdBrief, size: string, W: number, H: number): Arrangement[] {
	const kinds = adapter.compose!.blocks();
	const R = Math.max(4, Math.min(24, Math.round((12 * H) / W)));
	const grid = { cols: 12, rows: R };
	const G = gridOf({ size: { id: size, width: W, height: H }, grid } as Parameters<typeof gridOf>[0]);
	const cell0 = G.cell({ col: 0, row: 0, cols: 1, rows: 1 });
	const rowPx = cell0.h + G.g;
	const u = W / H > 1.2 ? Math.min(W / 1200, H / 630) : W / 1080;
	const rowsPx = (px: number) => Math.max(1, Math.ceil((px - G.g) / rowPx));
	const rowsFor = (px: number) => rowsPx(px * u);
	// Small type is never under what reads where the platform shows the picture (a story is seen 390 px wide).
	const floorPx = (12 * W) / platformOf(size, W, H).shown;
	const small = (px: number) => Math.max(px * u, floorPx);
	const wide = W / H > 1.2;
	const out: Arrangement[] = [];
	if (b.layout.length) {
		const groups = parseAdLayout(b.layout);
		const named = new Set(groups.flatMap((x) => x.parts.map((p) => p.kind)));
		const rest = partsOf(b).filter((p) => !named.has(p.kind) && !(p.kind === 'button' && named.has('card')));
		const footLine = groups.find((x) => x.parts.length === 1 && x.parts[0]!.kind === 'button' && (x.pin === 'bottom' || x === groups[groups.length - 1]));
		const button = rest.find((p) => p.kind === 'button');
		const a = build('asked', "the brief's layout", [...groups.filter((x) => x !== footLine), ...rest.filter((p) => p.kind !== 'button').map((p) => ({ parts: [p] }))], footLine ?? (button && { parts: [button] }), 'left', true);
		if (a) out.push(a);
		return out;
	}
	const parts = partsOf(b);
	const button = parts.find((p) => p.kind === 'button');
	const body = parts.filter((p) => p.kind !== 'button');
	const stacked = build('stacked', 'stacked', body.map((p) => ({ parts: [p] })), button && { parts: [button] }, 'left', false);
	if (stacked) out.push(stacked);
	const centered = build('centered', 'centered', body.map((p) => ({ parts: [{ ...p, align: 'center' as const }] })), button && { parts: [{ ...button, align: 'center' as const }] }, 'center', false);
	if (centered) out.push(centered);
	const words = body.filter((p) => TEXT.includes(p.kind));
	const shows = body.filter((p) => !TEXT.includes(p.kind) && p.kind !== 'search');
	if (shows.length && words.length && W / H > 0.55) {
		const split = build('split', 'two columns', [{ parts: [{ kind: 'headline', column: true }, shows[0]!] }, ...shows.slice(1).map((p) => ({ parts: [p] })), ...body.filter((p) => p.kind === 'search').map((p) => ({ parts: [p] }))], button && { parts: [button] }, 'left', false, words);
		if (split) out.push(split);
	}
	return out;

	function build(id: string, name: string, groupsIn: Group[], foot: Group | undefined, align: 'left' | 'center', asked: boolean, column?: Part[]): Arrangement | undefined {
		const blocks: ComposeBlock[] = [];
		const copy: Record<string, string> = {};
		const options: Record<string, OptionValue> = {};
		const images: Record<string, number> = {};
		const draws = new Set<Field>();
		const ids = new Map<string, number>();
		const idFor = (base: string) => {
			const n = (ids.get(base) ?? 0) + 1;
			ids.set(base, n);
			return n === 1 ? base : `${base}-${n}`;
		};
		let nextImage = 0;
		const logoPart = groupsIn.flatMap((x) => x.parts).find((p) => p.kind === 'logo');
		const logoFoot = Boolean(logoPart && groupsIn.find((x) => x.parts.includes(logoPart))?.pin === 'bottom');
		const groups = groupsIn.map((x) => ({ ...x, parts: x.parts.filter((p) => p.kind !== 'logo') })).filter((x) => x.parts.length);
		// The top row (the logo) and the foot (the button) are as tall as a button, however short the grid's rows are.
		const fr = rowsPx(Math.max(96 * u, floorPx * 4));
		const top0 = logoFoot ? 0 : fr;
		const end = R - (foot || logoFoot ? fr : 0);
		const heightOf = (p: Part, cols: number): number => {
			const k = p.big ? 1.3 : p.small ? 0.8 : 1;
			const w = (cols / 12) * 950;
			const lines = (text: string | undefined, s: number) => Math.max(1, Math.ceil(((text?.length ?? 20) * s * 0.56) / w));
			const n = (b.copy.features ?? '').split('|').filter((s) => s.trim()).length;
			switch (p.kind) {
				case 'eyebrow': return rowsPx(small(20) * 1.5);
				case 'headline': { const s = (wide ? 48 : 56) * k; return rowsFor(lines(b.copy.headline, s) * (s + 4) + 24); }
				case 'body': return rowsPx(lines(b.copy.supporting, small(24) / u) * small(24) * 1.36 + 8 * u);
				case 'stat': return rowsPx(220 * k * u + small(20) * 1.4);
				case 'quote': return rowsPx(lines(b.copy.quote, 56 * k) * 64 * k * u + small(20) * 3.2);
				case 'search': return rowsPx(Math.max(88 * u, small(24) * 3));
				case 'card': return rowsFor(40 + 44 + 56 + (has(b, 'offer') ? 48 : 0) + n * 44 + (has(b, 'cta') ? 104 : 0) + 40);
				case 'list': return rowsPx(n * small(24) * 1.6);
				case 'pictures': return rowsFor((p.big ? 460 : 300) * (H / W > 1.6 ? 1.2 : 1));
				case 'chart': return rowsFor(300);
				default: return 1;
			}
		};
		const colHeight = column ? column.reduce((s, p) => s + heightOf(p, 6), 0) : 0;
		const rowsOf = (x: Group) => Math.max(...x.parts.map((p) => (p.column ? colHeight : heightOf(p, Math.floor(12 / x.parts.length)))));
		const need = groups.map(rowsOf);
		let room = end - top0;
		const air = logoFoot ? 0 : 1;
		let gap = 1;
		const total = () => need.reduce((s, n) => s + n, 0) + gap * Math.max(0, groups.length - 1);
		if (total() + air <= room) room -= air;
		if (total() > room) gap = 0;
		for (let i = groups.length - 1; i >= 0 && total() > room; i--) if (groups[i]!.parts.some((p) => FLEX.includes(p.kind))) need[i] = Math.max(2, need[i]! - (total() - room));
		if (total() > room) return undefined;
		let spare = room - total();
		const flex = need.findIndex((_, i) => groups[i]!.parts.some((p) => FLEX.includes(p.kind)));
		if (flex >= 0 && align === 'left' && !asked) {
			const grow = Math.min(spare, rowsFor(560) - need[flex]!);
			if (grow > 0) {
				need[flex]! += grow;
				spare -= grow;
			}
		}
		const firstBottom = groups.findIndex((x) => x.pin === 'bottom');
		let row = top0 + (air && room < end - top0 ? air : 0) + (align === 'center' && !asked ? Math.floor(spare / 2) : 0);
		const between = (asked || (align === 'left' && flex < 0)) && firstBottom < 0 && groups.length > 1 ? Math.floor(spare / groups.length) : 0;
		groups.forEach((x, i) => {
			if (i > 0) row += between;
			if (i === firstBottom || (firstBottom < 0 && !between && i === groups.length - 1 && align === 'left' && groups.length > 1 && x.parts.some((p) => FLEX.includes(p.kind) || p.kind === 'card'))) row += spare;
			const h = need[i]!;
			const n = x.parts.length;
			const span = Math.floor(12 / n);
			x.parts.forEach((p, j) => {
				if (n === 1) {
					const cols = widthOf(p);
					const c0 = p.align === 'center' || (align === 'center' && p.align !== 'left' && p.align !== 'right') ? Math.floor((12 - cols) / 2) : p.align === 'right' ? 12 - cols : 0;
					place(p, { col: c0, row, cols, rows: h }, p.align ?? align);
				} else place(p, { col: j * span, row, cols: j === n - 1 ? 12 - j * span : span, rows: h }, 'left');
			});
			row += h + gap;
		});
		// The brand's own ground under everything, then the logo and the foot.
		const ground = adapter.compose!.ground?.({ size, width: W, height: H, grid });
		if (ground) {
			blocks.unshift(...ground.blocks);
			Object.assign(options, ground.options ?? {});
		}
		const logo = typeFor(kinds, 'logo');
		if (logo) blocks.push({ id: 'logo', type: logo, at: { col: 0, row: logoFoot ? R - fr : 0, cols: Math.max(2, Math.round((230 * u) / (cell0.w + G.g))), rows: fr } });
		if (foot) {
			const p = foot.parts[0]!;
			const right = logoFoot || p.align === 'right';
			const center = !logoFoot && (p.align === 'center' || align === 'center');
			place(p, { col: right ? 7 : center ? 3 : 0, row: R - fr, cols: center ? 6 : 5, rows: fr }, right ? 'right' : center ? 'center' : 'left');
		}
		if (!blocks.some((x) => x.type !== logo && !(ground?.blocks ?? []).some((g) => g.id === x.id))) return undefined;
		return { id, name, asked, grid, blocks, copy, options, images, draws: [...draws] };

		function widthOf(p: Part): number {
			switch (p.kind) {
				case 'headline': return wide ? 8 : align === 'center' ? 11 : 10;
				case 'body': return wide ? 7 : align === 'center' ? 9 : 8;
				case 'eyebrow': return 6;
				case 'stat': return 6;
				case 'quote': return 11;
				case 'list': return 8;
				case 'card': return wide ? 6 : 8;
				case 'button': return 4;
				default: return 12;
			}
		}
		function place(p: Part, at: At, al: 'left' | 'center' | 'right') {
			if (p.column && column) {
				let r = at.row + Math.max(0, Math.floor((at.rows - colHeight) / 2));
				for (const c of column) {
					const h = heightOf(c, 6);
					place(c, { col: 0, row: r, cols: 6, rows: h }, 'left');
					r += h;
				}
				return;
			}
			const type = typeFor(kinds, p.kind);
			if (!type) return;
			const info = kinds.find((k) => k.type === type)!;
			const slot = (want: string) => (info.copy.some((c) => c.id === want) ? want : info.copy[0]?.id);
			const set = (id: string, want: string, field: Field, value?: string) => {
				const v = (value ?? b.copy[field])?.trim();
				const s = slot(want);
				if (!v || !s || copy[`${id}.${s}`] !== undefined) return false;
				copy[`${id}.${s}`] = v;
				draws.add(field);
				return true;
			};
			const aligned = (id: string) => {
				if (al !== 'left' && info.options?.some((o) => o.id === 'align')) options[`${id}.align`] = al;
			};
			const id = idFor(type);
			let ok = false;
			switch (p.kind) {
				case 'eyebrow': ok = set(id, 'text', 'label'); break;
				case 'headline': ok = set(id, 'text', 'headline'); if (ok && info.options?.some((o) => o.id === 'size')) options[`${id}.size`] = Math.round((wide ? 48 : 56) * (p.big ? 1.3 : p.small ? 0.8 : 1) * u); break;
				case 'body': ok = set(id, 'text', 'supporting'); break;
				case 'stat': {
					const [value, ...label] = (b.copy.stat ?? '').split('|');
					ok = set(id, 'value', 'stat', value);
					if (ok && label.join('|').trim() && info.copy.some((c) => c.id === 'label')) copy[`${id}.label`] = label.join('|').trim();
					break;
				}
				case 'quote': ok = set(id, 'text', 'quote'); if (ok) { if (info.copy.some((c) => c.id === 'name')) set(id, 'name', 'name'); if (info.copy.some((c) => c.id === 'role')) set(id, 'role', 'role'); } break;
				case 'search': ok = set(id, 'text', 'search'); if (ok) at = { col: 0, row: at.row + Math.floor((at.rows - rowsFor(88)) / 2), cols: 12, rows: Math.min(at.rows, rowsFor(88)) }; break;
				case 'card': {
					const feats = b.copy.features?.split('|').map((s) => s.trim()).filter(Boolean).join('|');
					for (const [want, field, v] of [['title', 'plan'], ['text', 'offer'], ['items', 'features', feats], ['cta', 'cta']] as [string, Field, string?][]) if (info.copy.some((c) => c.id === want)) ok = set(id, want, field, v) || ok;
					break;
				}
				case 'list': ok = set(id, 'items', 'features', b.copy.features?.split('|').map((s) => s.trim()).filter(Boolean).join('|')); break;
				case 'chart': ok = set(id, 'data', 'chart'); break;
				case 'button': ok = set(id, 'text', 'cta'); if (ok && at.row + at.rows === R && info.options?.some((o) => o.id === 'valign')) options[`${id}.valign`] = 'bottom'; break;
				case 'pictures': {
					const left = b.images.length - nextImage;
					const n = Math.max(1, Math.min(p.count ?? left, left, 4));
					if (left <= 0) return;
					const each = Math.floor(at.cols / n);
					for (let i = 0; i < n; i++) {
						const pid = i === 0 ? id : idFor(type);
						images[pid] = nextImage++;
						blocks.push({ id: pid, type, at: { col: at.col + i * each, row: at.row, cols: i === n - 1 ? at.cols - i * each : each, rows: at.rows } });
					}
					return;
				}
				default: break;
			}
			if (!ok) return;
			blocks.push({ id, type, at });
			aligned(id);
		}
	}
}

// ----- Drawing and writing -----

export type AdResult = { size: string; n: number; arrangement: string; doc: DesignDoc; files: Record<string, Uint8Array>; layers: DrawnLayer[]; findings: Finding[]; draws: string[] };

/** Every arrangement of the brief at each size, drawn and checked; only what passes is kept. */
export async function drawAds(adapter: Adapter, b: AdBrief, outDir: string, opts: { variants?: number; formats?: ('png' | 'svg' | 'jpg' | 'webp')[] } = {}): Promise<{ ads: AdResult[]; refused: { size: string; arrangement: string; reason: string }[] }> {
	if (!adapter.compose) throw new DesignError('This brand has no compose blocks to lay ads out with.');
	if (!has(b, 'headline') && !has(b, 'quote')) throw new DesignError('The brief is missing headline (## Headline).');
	for (const img of b.images) if (!existsSync(resolve(b.dir, img.file))) throw new DesignError(`Images: ${img.file} is not there (beside the brief).`);
	const info = composeInfo(adapter);
	const grounds = adapter.compose.grounds ?? {};
	const luma = (hex?: string) => (hex ? parseInt(hex.slice(1, 3), 16) * 0.3 + parseInt(hex.slice(3, 5), 16) * 0.59 + parseInt(hex.slice(5, 7), 16) * 0.11 : 0);
	const themes = adapter.compose.themes.filter((t) => !b.tone || (b.tone === 'light' ? luma(grounds[t]) > 128 : luma(grounds[t]) <= 128));
	// The brand's own first choice for a design from scratch, unless the brief asks for the other tone.
	const ads: AdResult[] = [];
	const refused: { size: string; arrangement: string; reason: string }[] = [];
	for (const size of adSizes(adapter, b.platforms)) {
		const base = create(adapter, COMPOSE, size, []).doc;
		// The brand's first choice, then its other themes: a theme that cannot carry the words (large text only) gives way.
		const order: (string | undefined)[] = [...new Set([...(base.theme && themes.includes(base.theme) ? [base.theme] : []), ...themes])];
		if (!order.length) order.push(base.theme);
		let n = 0;
		for (const a of arrangeAd(adapter, b, size, base.size.width, base.size.height)) {
			if (n >= (opts.variants ?? 3)) break;
			const imgs = Object.fromEntries(Object.entries(a.images).map(([id, i]) => [id, rel(outDir, resolve(b.dir, b.images[i]!.file))]));
			let last = '';
			for (const theme of order.slice(0, 3)) {
				const doc = { ...base, theme, blocks: a.blocks, grid: a.grid, copy: a.copy, images: { ...base.images, ...imgs }, options: { ...base.options, ...a.options } } as DesignDoc;
				try {
					const r = await adapter.render(doc, outDir, { formats: opts.formats ?? ['png'], scale: 1 });
					const findings = checkDesign({ doc, info: infoFor(adapter, doc), layers: r.layers, adapter, png: r.files.png });
					const errors = errorsOf(findings);
					if (errors.length) {
						last = errors.map((f) => f.message).join(' ');
						continue;
					}
					ads.push({ size, n: ++n, arrangement: a.id, doc, files: r.files, layers: r.layers, findings, draws: a.draws });
					last = '';
					break;
				} catch (err) {
					last = (err as Error).message.split('\n')[0]!;
				}
			}
			if (last) refused.push({ size, arrangement: a.id, reason: last });
		}
		if (!n) throw new DesignError(`No arrangement of the brief passes the brand check at ${size}, so nothing was written.\n${refused.filter((r) => r.size === size).map((r) => `  ${r.arrangement}: ${r.reason}`).join('\n')}\nShorten the copy, give fewer parts, or change the Layout.`);
	}
	void info;
	return { ads, refused };
}

const rel = (from: string, file: string) => relative(from, file).split(sep).join('/') || file;

/** Reads a brief file. */
export function readAdBrief(path: string): AdBrief {
	if (!existsSync(path)) throw new DesignError(`There is no brief at ${path}.`);
	return parseAdBrief(readFileSync(path, 'utf8'), dirname(path), path.split(/[\\/]/).pop());
}
