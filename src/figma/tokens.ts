import { brand, hasProduct, tokens } from '../lib/brand.js';

// The brand tokens as Figma variables: one collection, each variable typed (COLOR, FLOAT, STRING), scoped to the
// properties it belongs to and linked to its CSS variable. Shadows become effect styles. A brand with a product surface
// gets three modes (site, product light, product dark); a single-look brand gets one. A Starter or free Figma plan
// allows one mode per collection; the script then makes one collection per mode instead.

export type FigmaVar = { name: string; css: string; type: 'COLOR' | 'FLOAT' | 'STRING'; scopes: string[]; unit?: string; values: [site: unknown, productLight: unknown, productDark: unknown] };
export type FigmaEffect = { name: string; css: string; effects: { type: 'DROP_SHADOW' | 'INNER_SHADOW'; x: number; y: number; blur: number; spread: number; color: [number, number, number, number] }[] };
export type FigmaTokens = { collection: string; modes: string[]; roots: number[]; variables: FigmaVar[]; effects: FigmaEffect[]; skipped: { css: string; value: string; reason: string }[] };

export const MODES = hasProduct() ? ['Site', 'Product light', 'Product dark'] : ['Site'];
/** The root font size each mode resolves rem against: the site's 16px and, with a product, the product's 15px. */
const ROOTS = hasProduct() ? [16, 15, 15] : [16, 16, 16];

type Rgba = [number, number, number, number];
function parseColor(v: string): Rgba | null {
	const s = v.trim();
	if (s === 'transparent') return [0, 0, 0, 0];
	const hex = /^#([0-9a-f]{3,8})$/i.exec(s);
	if (hex) {
		let h = hex[1]!;
		if (h.length <= 4) h = [...h].map((c) => c + c).join('');
		const n = (i: number) => Number.parseInt(h.slice(i, i + 2), 16) / 255;
		return [n(0), n(2), n(4), h.length === 8 ? n(6) : 1];
	}
	const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[/,]\s*([\d.]+%?))?\s*\)$/.exec(s);
	if (rgb) {
		const a = rgb[4] === undefined ? 1 : rgb[4].endsWith('%') ? Number.parseFloat(rgb[4]) / 100 : Number(rgb[4]);
		return [Number(rgb[1]) / 255, Number(rgb[2]) / 255, Number(rgb[3]) / 255, a];
	}
	return null;
}

const round = (n: number, d = 4) => Math.round(n * 10 ** d) / 10 ** d;

/** A length in px at a root size, or null. */
function px(v: string, root: number): number | null {
	const s = v.trim();
	const m = /^(-?[\d.]+)(px|rem)$/.exec(s);
	if (m) return round(Number(m[1]) * (m[2] === 'rem' ? root : 1));
	const max = /^max\((.+),(.+)\)$/.exec(s);
	if (max) {
		const a = px(max[1]!, root);
		const b = px(max[2]!, root);
		return a === null || b === null ? null : Math.max(a, b);
	}
	return null;
}

function resolveVar(v: string, table: Record<string, string>, depth = 0): string {
	if (depth > 8) return v;
	return v.replace(/var\((--[\w-]+)(?:,\s*([^()]*(?:\([^()]*\))?[^()]*))?\)/g, (_, name: string, fallback?: string) => {
		const hit = table[name];
		return hit !== undefined ? resolveVar(hit, table, depth + 1) : (fallback ?? '').trim();
	});
}

function colorScopes(name: string): string[] {
	if (/^color-(bg|wash|status-[\w-]*soft|skeleton)/.test(name)) return ['FRAME_FILL', 'SHAPE_FILL'];
	if (/^color-text|^color-code/.test(name)) return ['TEXT_FILL'];
	if (/^color-(border|ring|focus)/.test(name)) return ['STROKE_COLOR', 'EFFECT_COLOR'];
	return ['ALL_FILLS', 'STROKE_COLOR'];
}

function lengthScopes(group: string, name: string): string[] {
	if (group === 'space') return ['GAP', 'WIDTH_HEIGHT'];
	if (group === 'radius') return ['CORNER_RADIUS'];
	if (group === 'layout') return ['WIDTH_HEIGHT'];
	if (group === 'text') return ['FONT_SIZE'];
	if (group === 'leading') return ['LINE_HEIGHT'];
	if (group === 'tracking') return ['LETTER_SPACING'];
	if (name.startsWith('font-weight')) return ['FONT_WEIGHT'];
	return [];
}

function parseShadow(v: string): FigmaEffect['effects'] | null {
	const parts = v.split(/,(?![^()]*\))/).map((p) => p.trim());
	const out: FigmaEffect['effects'] = [];
	for (const p of parts) {
		const inset = /\binset\b/.test(p);
		const color = /(rgba?\([^)]*\)|#[0-9a-f]{3,8}\b)/i.exec(p);
		const rgba = color ? parseColor(color[1]!) : [0, 0, 0, 1] as Rgba;
		const nums = p.replace(/\binset\b/, '').replace(color?.[1] ?? '', '').trim().split(/\s+/).filter(Boolean).map((n) => px(n, 16) ?? (n === '0' ? 0 : Number.NaN));
		if (!rgba || nums.length < 2 || nums.some((n) => Number.isNaN(n))) return null;
		out.push({ type: inset ? 'INNER_SHADOW' : 'DROP_SHADOW', x: nums[0]!, y: nums[1]!, blur: nums[2] ?? 0, spread: nums[3] ?? 0, color: rgba.map((c) => round(c)) as Rgba });
	}
	return out;
}

/** The token file as Figma variables and effect styles. */
export function figmaTokens(): FigmaTokens {
	const t = tokens();
	const tables = [t.site, { ...t.site, ...t.product }, { ...t.site, ...t.product, ...t.dark }];
	const names = [...new Set([...Object.keys(t.site), ...Object.keys(t.product)])];
	const variables: FigmaVar[] = [];
	const effects: FigmaEffect[] = [];
	const skipped: FigmaTokens['skipped'] = [];
	for (const css of names) {
		const name = css.replace(/^--ds-/, '');
		const group = name.split('-')[0]!;
		const raw = tables.map((tb) => resolveVar(tb[css] ?? t.site[css] ?? '', tb).trim());
		const figmaName = `${group}/${name.slice(group.length + 1) || group}`;
		if (group === 'shadow') {
			const fx = parseShadow(raw[0]!);
			if (fx) effects.push({ name: figmaName, css, effects: fx });
			else skipped.push({ css, value: raw[0]!, reason: 'shadow not parsed' });
			continue;
		}
		const colors = raw.map(parseColor);
		if (colors.every(Boolean)) {
			variables.push({ name: figmaName, css, type: 'COLOR', scopes: colorScopes(name), values: colors.map((c) => c!.map((n) => round(n))) as FigmaVar['values'] });
			continue;
		}
		const lengths = raw.map((v, i) => px(v, ROOTS[i]!));
		if (lengths.every((n) => n !== null)) {
			variables.push({ name: figmaName, css, type: 'FLOAT', scopes: lengthScopes(group, name), unit: 'px', values: lengths as FigmaVar['values'] });
			continue;
		}
		const unit = /^-?[\d.]+(ms|s|em|%)?$/;
		if (raw.every((v) => unit.test(v))) {
			const u = unit.exec(raw[0]!)![1] ?? '';
			// Unitless line heights, em tracking and durations have no Figma unit to bind to: kept, hidden from pickers.
			variables.push({ name: figmaName, css, type: 'FLOAT', scopes: !u && name.startsWith('font-weight') ? ['FONT_WEIGHT'] : [], unit: u || 'number', values: raw.map((v) => Number.parseFloat(v)) as FigmaVar['values'] });
			continue;
		}
		if (group === 'font') {
			const fam = raw.map((v) => /"([^"]+)"/.exec(v)?.[1] ?? v.split(',')[0]!.trim());
			variables.push({ name: figmaName, css, type: 'STRING', scopes: ['FONT_FAMILY'], values: fam as FigmaVar['values'] });
			continue;
		}
		if (group === 'easing') {
			variables.push({ name: figmaName, css, type: 'STRING', scopes: [], values: raw as FigmaVar['values'] });
			continue;
		}
		skipped.push({ css, value: raw[0]!, reason: 'no Figma variable type (a relative or computed value)' });
	}
	return { collection: `${brand().name} tokens`, modes: MODES, roots: ROOTS, variables, effects, skipped };
}

const SCRIPT_LIMIT = 45000;

/**
 * use_figma scripts that apply the variables. Each is complete and safe to rerun: it finds or creates the collection
 * and modes, then creates or updates its share of the variables by name. Split so each stays under the tool's limit.
 */
export function figmaTokenScripts(doc: FigmaTokens): string[] {
	// Rows are compact, since an agent sends every character as the script: [name, type, scope set, value or
	// [site, product light, product dark] when the modes differ, CSS name when it is not --ds- plus the name].
	// Colors are hex (#rrggbb or #rrggbbaa).
	const scopeSets = [...new Set(doc.variables.map((v) => JSON.stringify(v.scopes)))];
	const head = (rows: unknown[], fx: unknown[]) => `// Applies ${rows.length} brand variables${fx.length ? ` and ${fx.length} effect styles` : ''} to this file. Generated; safe to rerun.
const NAME = ${JSON.stringify(doc.collection)};
const MODES = ${JSON.stringify(doc.modes)};
const SCOPES = [${scopeSets.join(',')}];
const TYPES = ['COLOR', 'FLOAT', 'STRING'];
const ROWS = ${JSON.stringify(rows)};
const EFFECTS = ${JSON.stringify(fx)};
const all = await figma.variables.getLocalVariableCollectionsAsync();
let layout = 'modes';
const targets = [];
let main = all.find((c) => c.name === NAME);
if (!main) { main = figma.variables.createVariableCollection(NAME); main.renameMode(main.modes[0].modeId, MODES[0]); }
const modeIds = [main.modes[0].modeId];
for (const m of MODES.slice(1)) {
  const have = main.modes.find((x) => x.name === m);
  if (have) { modeIds.push(have.modeId); continue; }
  try { modeIds.push(main.addMode(m)); } catch (e) { layout = 'collections'; break; }
}
if (layout === 'modes') targets.push(...MODES.map((m, i) => ({ c: main, mode: modeIds[i], i })));
else {
  // One mode per collection on this plan: the site values stay in the main collection, the product themes get their own.
  targets.push({ c: main, mode: main.modes[0].modeId, i: 0 });
  for (const [i, m] of MODES.entries()) {
    if (!i) continue;
    let c = all.find((x) => x.name === NAME + ' / ' + m);
    if (!c) { c = figma.variables.createVariableCollection(NAME + ' / ' + m); c.renameMode(c.modes[0].modeId, m); }
    targets.push({ c, mode: c.modes[0].modeId, i });
  }
}
const existing = await figma.variables.getLocalVariablesAsync();
const byKey = new Map(existing.map((v) => [v.variableCollectionId + '|' + v.name, v]));
const hex = (h) => { const n = (i) => parseInt(h.slice(i, i + 2), 16) / 255; return { r: n(1), g: n(3), b: n(5), a: h.length > 7 ? n(7) : 1 }; };
const value = (type, v) => type === 'COLOR' ? hex(v) : v;
let created = 0, updated = 0;
const ids = [];
for (const [name, t, s, val, cssName] of ROWS) {
  const type = TYPES[t];
  const vals = Array.isArray(val) ? val : [val, val, val];
  const css = cssName || '--ds-' + name.replace('/', '-');
  for (const tg of targets) {
    if (layout === 'modes' && tg.i > 0) continue;
    let v = byKey.get(tg.c.id + '|' + name);
    if (v && v.resolvedType !== type) { v.remove(); v = undefined; }
    if (!v) { v = figma.variables.createVariable(name, tg.c, type); byKey.set(tg.c.id + '|' + name, v); created++; } else updated++;
    v.scopes = SCOPES[s];
    v.setVariableCodeSyntax('WEB', 'var(' + css + ')');
    if (layout === 'modes') targets.forEach((m) => v.setValueForMode(m.mode, value(type, vals[m.i])));
    else v.setValueForMode(tg.mode, value(type, vals[tg.i]));
    ids.push(v.id);
  }
}
const styles = await figma.getLocalEffectStylesAsync();
const effectIds = [];
for (const e of EFFECTS) {
  let st = styles.find((x) => x.name === e.name);
  if (!st) st = figma.createEffectStyle();
  st.name = e.name;
  st.description = 'var(' + e.css + ')';
  st.effects = e.effects.map((f) => ({ type: f.type, color: { r: f.color[0], g: f.color[1], b: f.color[2], a: f.color[3] }, offset: { x: f.x, y: f.y }, radius: f.blur, spread: f.spread, visible: true, blendMode: 'NORMAL' }));
  effectIds.push(st.id);
}
return { layout, collections: targets.map((t) => ({ id: t.c.id, name: t.c.name })).filter((x, i, a) => a.findIndex((y) => y.id === x.id) === i), created, updated, variables: ids.length, effectStyles: effectIds.length, createdNodeIds: [], mutatedNodeIds: [] };
`;
	const hexOf = (c: number[]) => `#${c.slice(0, 3).map((n) => Math.round(n * 255).toString(16).padStart(2, '0')).join('')}${c[3]! < 1 ? Math.round(c[3]! * 255).toString(16).padStart(2, '0') : ''}`;
	const rows = doc.variables.map((v) => {
		const vals = v.type === 'COLOR' ? v.values.map((c) => hexOf(c as number[])) : v.values;
		const one = vals.every((x) => JSON.stringify(x) === JSON.stringify(vals[0]));
		const derived = `--ds-${v.name.replace('/', '-')}`;
		const row: unknown[] = [v.name, ['COLOR', 'FLOAT', 'STRING'].indexOf(v.type), scopeSets.indexOf(JSON.stringify(v.scopes)), one ? vals[0] : vals];
		if (derived !== v.css) row.push(v.css);
		return row;
	});
	const scripts: string[] = [];
	let batch: unknown[] = [];
	const flush = (fx: unknown[]) => {
		scripts.push(head(batch, fx));
		batch = [];
	};
	for (const row of rows) {
		batch.push(row);
		if (head(batch, []).length > SCRIPT_LIMIT - 4000) flush([]);
	}
	if (batch.length || !scripts.length) flush([]);
	// Effect styles ride on the last script, or their own if it is full.
	const last = scripts.pop()!;
	const lastRows = JSON.parse(/const ROWS = (.*);\n/.exec(last)![1]!) as unknown[];
	batch = lastRows;
	const withFx = head(batch, doc.effects);
	if (withFx.length <= SCRIPT_LIMIT) scripts.push(withFx);
	else {
		scripts.push(last);
		batch = [];
		flush(doc.effects);
	}
	return scripts;
}
