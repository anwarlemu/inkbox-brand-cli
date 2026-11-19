import { hasProduct, tokens } from '../lib/brand.js';

// Checks the values a Figma node uses (what get_variable_defs and get_design_context return, saved to files) against
// the brand tokens: every color must be a brand color, every font a brand font, sizes and radii on the brand scale.
// A value that matches a token passes and is named; anything else is flagged with the nearest token.

export type FigmaFinding = { kind: 'color' | 'font' | 'size' | 'radius' | 'spacing'; value: string; where: string; ok: boolean; token?: string; nearest?: string; message: string };

type Rgb = [number, number, number, number];
function rgba(v: string): Rgb | null {
	const s = v.trim().toLowerCase();
	const hex = /^#([0-9a-f]{3,8})$/.exec(s);
	if (hex) {
		let h = hex[1]!;
		if (h.length <= 4) h = [...h].map((c) => c + c).join('');
		if (h.length !== 6 && h.length !== 8) return null;
		const n = (i: number) => Number.parseInt(h.slice(i, i + 2), 16);
		return [n(0), n(2), n(4), h.length === 8 ? n(6) / 255 : 1];
	}
	const m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[/,]\s*([\d.]+%?))?\s*\)$/.exec(s);
	if (m) return [Number(m[1]), Number(m[2]), Number(m[3]), m[4] === undefined ? 1 : m[4].endsWith('%') ? Number.parseFloat(m[4]) / 100 : Number(m[4])];
	return null;
}

const key = (c: Rgb) => `${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${Math.round(c[3] * 100)}`;

let index: { colors: Map<string, string>; list: [string, Rgb][]; fonts: Map<string, string>; scale: Record<'size' | 'radius' | 'spacing', [string, number][]> } | undefined;
function brandIndex() {
	if (index) return index;
	const t = tokens();
	const colors = new Map<string, string>();
	const list: [string, Rgb][] = [];
	const fonts = new Map<string, string>();
	const scale = { size: [] as [string, number][], radius: [] as [string, number][], spacing: [] as [string, number][] };
	const tables: [Record<string, string>, number][] = hasProduct() ? [[t.site, 16], [t.site, 14.4], [{ ...t.site, ...t.product }, 15], [{ ...t.site, ...t.product, ...t.dark }, 15]] : [[t.site, 16]];
	for (const [table, root] of tables) {
		for (const [name, raw] of Object.entries(table)) {
			const v = raw.replace(/var\((--[\w-]+)(?:,\s*([^)]*))?\)/g, (_, n: string, fallback?: string) => table[n] ?? fallback ?? '').trim();
			const c = rgba(v);
			if (c && name.startsWith('--ds-color-')) {
				if (!colors.has(key(c))) colors.set(key(c), name);
				list.push([name, c]);
				continue;
			}
			if (name.startsWith('--ds-font-') && !name.includes('weight')) for (const fam of v.match(/"([^"]+)"/g) ?? []) fonts.set(fam.slice(1, -1).toLowerCase(), name);
			const len = /^(-?[\d.]+)(px|rem)$/.exec(v);
			if (!len) continue;
			const px = Math.round(Number(len[1]) * (len[2] === 'rem' ? root : 1) * 100) / 100;
			const bucket = /^--ds-text-/.test(name) ? scale.size : /^--ds-radius-/.test(name) ? scale.radius : /^--ds-space-/.test(name) ? scale.spacing : null;
			bucket?.push([name, px]);
		}
	}
	index = { colors, list, fonts, scale };
	return index;
}

function nearestColor(c: Rgb): string {
	let best = '';
	let bd = Infinity;
	for (const [name, t] of brandIndex().list) {
		const d = (t[0] - c[0]) ** 2 + (t[1] - c[1]) ** 2 + (t[2] - c[2]) ** 2 + ((t[3] - c[3]) * 255) ** 2;
		if (d < bd) {
			bd = d;
			best = name;
		}
	}
	return best;
}

function checkColor(value: string, where: string): FigmaFinding | null {
	const c = rgba(value);
	if (!c) return null;
	const hit = brandIndex().colors.get(key(c));
	if (hit) return { kind: 'color', value, where, ok: true, token: hit, message: `${value} is ${hit}` };
	const near = nearestColor(c);
	return { kind: 'color', value, where, ok: false, nearest: near, message: `${value} is not a brand color; nearest ${near}` };
}

function checkLength(kind: 'size' | 'radius' | 'spacing', px: number, value: string, where: string): FigmaFinding {
	const list = brandIndex().scale[kind];
	const hit = list.find(([, v]) => Math.abs(v - px) < 0.05);
	if (hit || px === 0) return { kind, value, where, ok: true, token: hit?.[0], message: `${value} is ${hit?.[0] ?? 'zero'}` };
	const near = list.reduce((a, b) => (Math.abs(b[1] - px) < Math.abs(a[1] - px) ? b : a), list[0]!);
	return { kind, value, where, ok: false, nearest: near?.[0], message: `${value} is off the brand ${kind} scale; nearest ${near?.[0]} (${near?.[1]}px)` };
}

function checkFont(family: string, where: string): FigmaFinding {
	const f = family.replace(/^['"]|['"]$/g, '').trim();
	const hit = brandIndex().fonts.get(f.toLowerCase());
	return hit ? { kind: 'font', value: f, where, ok: true, token: hit, message: `${f} is ${hit}` } : { kind: 'font', value: f, where, ok: false, message: `${f} is not a brand font (${[...new Set(brandIndex().fonts.keys())].join(', ')})` };
}

/** get_variable_defs output: a map of variable name to value. */
function fromVariables(defs: Record<string, unknown>): FigmaFinding[] {
	const out: FigmaFinding[] = [];
	for (const [name, raw] of Object.entries(defs)) {
		const v = String(raw);
		const where = `variable ${name}`;
		const color = checkColor(v, where);
		if (color) out.push(color);
		else if (/font\s*family|^font\//i.test(name) || /Font\(family:/.test(v)) {
			const fam = /family:\s*"?([^",)]+)/.exec(v)?.[1] ?? v;
			out.push(checkFont(fam, where));
		}
	}
	return out;
}

/** get_design_context output: reference code (React and Tailwind, or CSS) with literal values. */
function fromCode(code: string): FigmaFinding[] {
	const out: FigmaFinding[] = [];
	const lineOf = (i: number) => `line ${code.slice(0, i).split('\n').length}`;
	for (const m of code.matchAll(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g)) {
		const f = checkColor(m[0], lineOf(m.index!));
		if (f) out.push(f);
	}
	for (const m of code.matchAll(/font-\[['"]?([^'"\]:]+?)(?::[^'"\]]*)?['"]?\]|font-family:\s*['"]?([^;'",]+)/g)) out.push(checkFont((m[1] ?? m[2])!.replace(/_/g, ' '), lineOf(m.index!)));
	for (const m of code.matchAll(/fontFamily:\s*['"]([^'",]+)/g)) out.push(checkFont(m[1]!, lineOf(m.index!)));
	const lengths: [RegExp, 'size' | 'radius' | 'spacing'][] = [
		[/\btext-\[(\d+(?:\.\d+)?)px\]|font-size:\s*(\d+(?:\.\d+)?)px|fontSize:\s*['"]?(\d+(?:\.\d+)?)/g, 'size'],
		[/\brounded(?:-[trbl]{1,2})?-\[(\d+(?:\.\d+)?)px\]|border-radius:\s*(\d+(?:\.\d+)?)px|borderRadius:\s*['"]?(\d+(?:\.\d+)?)/g, 'radius'],
		[/\b(?:gap|p[xytrbl]?|m[xytrbl]?|space-[xy])-\[(\d+(?:\.\d+)?)px\]|\b(?:gap|padding|margin)(?:-\w+)?:\s*(\d+(?:\.\d+)?)px/g, 'spacing'],
	];
	for (const [re, kind] of lengths) for (const m of code.matchAll(re)) {
		const n = Number(m[1] ?? m[2] ?? m[3]);
		out.push(checkLength(kind, n, `${n}px`, lineOf(m.index!)));
	}
	return out;
}

/** Checks one saved MCP response: JSON variable definitions, JSON with a code field, or plain code. */
export function checkFigmaValues(text: string): FigmaFinding[] {
	const trimmed = text.trim();
	if (trimmed.startsWith('{')) {
		try {
			const doc = JSON.parse(trimmed) as Record<string, unknown>;
			const code = typeof doc.code === 'string' ? doc.code : undefined;
			if (code) return fromCode(code);
			return fromVariables(doc);
		} catch {}
	}
	return fromCode(text);
}

/** One finding per distinct value and verdict, so a color used fifty times is reported once. */
export function dedupe(findings: FigmaFinding[]): (FigmaFinding & { count: number })[] {
	const map = new Map<string, FigmaFinding & { count: number }>();
	for (const f of findings) {
		const k = `${f.kind}|${f.value.toLowerCase()}`;
		const hit = map.get(k);
		if (hit) hit.count++;
		else map.set(k, { ...f, count: 1 });
	}
	return [...map.values()];
}
