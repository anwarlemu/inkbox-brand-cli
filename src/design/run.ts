import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { checkDesign, checkText, errorsOf, NEVER_ALLOWED, RULES } from './check.js';
import { blockInfo, COMPOSE, parseAt, validateOutline, type ComposeEdit } from './compose.js';
import { allTemplates, canSay, DesignError, differences, docText, infoFor, nearest, parseDoc, redo, sameAs, sizeLabel, sizeOf, stateOf, templateOf, undo, unknownName } from './doc.js';
import { applyEdits, create, layerFlag, type Applied, type Edit } from './ops.js';
import { examples, parsePhrases, variety } from './phrases.js';
import { PLATFORMS } from './platforms.js';

import { comparison, contactSheet, type Painter } from './sheet.js';
import type { Adapter, DesignDoc, DrawnLayer, Finding, Format, TemplateInfo } from './types.js';

// `design`: make a design, revise it in plain words or exact edits, check it, undo it. One function any CLI can mount,
// whatever parses its other arguments. Everything is drawn and checked in memory first, so a command that fails
// changes nothing on disk.

export const CORE_VERSION = 1;

export type DesignIO = {
	/** Where paths are read from (process.cwd()). */
	cwd: string;
	/** How the person runs the CLI ("npx acme"), for help. */
	bin: string;
	out(text: string): void;
	err(text: string): void;
	/** Draws a contact sheet (sheetSvg or sheetCanvas). */
	paint: Painter;
};

type Args = { _: string[]; flags: Map<string, string[]>; json: boolean };

const BOOLEAN = new Set(['json', 'force', 'help', 'dry-run', 'sample', 'front', 'back']);
const FLAGS = ['template', 'size', 'theme', 'width', 'height', 'seed', 'set', 'option', 'image', 'layer', 'hide', 'show', 'reset', 'allow', 'out', 'format', 'scale', 'by', 'count', 'to', 'steps', 'replace', 'at', 'place', 'id', 'grid', 'flavor', ...BOOLEAN];
const SHORT: Record<string, string> = { o: 'out', s: 'size', t: 'theme', f: 'format', i: 'image', h: 'help' };

function parseArgs(argv: string[], slots: string[]): Args {
	const out: Args = { _: [], flags: new Map(), json: false };
	const known = [...FLAGS, ...slots];
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i]!;
		if (a === '--') {
			out._.push(...argv.slice(i + 1));
			break;
		}
		const m = /^--([^=]+)(?:=([\s\S]*))?$/.exec(a) ?? (/^-([a-z])$/.test(a) ? ([a, SHORT[a[1]!] ?? a[1]!, undefined] as unknown as RegExpExecArray) : null);
		if (!m) {
			out._.push(a);
			continue;
		}
		let name = m[1]!;
		if (name === 'palette') name = 'theme';
		if (name === 'output') name = 'out';
		if (!known.includes(name)) {
			const near = nearest(name, known);
			throw new DesignError(`\`design\` does not take --${name}.${near.length ? ` Did you mean ${near.map((n) => `--${n}`).join(' or ')}?` : ''} Colors, fonts and effects come from the brand.`);
		}
		if (BOOLEAN.has(name)) {
			out.flags.set(name, ['true']);
			continue;
		}
		const value = m[2] ?? argv[++i];
		if (value === undefined) throw new DesignError(`--${name} needs a value.`);
		out.flags.set(name, [...(out.flags.get(name) ?? []), value]);
	}
	out.json = out.flags.has('json');
	return out;
}

const one = (a: Args, name: string) => a.flags.get(name)?.at(-1);
const all = (a: Args, name: string) => a.flags.get(name) ?? [];
function whole(a: Args, name: string, min: number, max: number): number | undefined {
	const v = one(a, name);
	if (v === undefined) return undefined;
	const n = Number(v);
	if (!Number.isInteger(n) || n < min || n > max) throw new DesignError(`--${name} takes a whole number from ${min} to ${max}, not ${v}.`);
	return n;
}
const pair = (text: string, flag: string): [string, string] => {
	const at = text.indexOf('=');
	if (at < 1) throw new DesignError(`--${flag} takes name=value, not "${text}".`);
	return [text.slice(0, at).trim(), text.slice(at + 1)];
};
const unescape = (s: string) => s.replace(/\\n/g, '\n');

/** Every copy slot of every template, for flags like --headline. */
const slotNames = (adapter: Adapter) => [...new Set([...allTemplates(adapter).flatMap((t) => t.copy.map((c) => c.id)), ...Object.keys(adapter.aliases?.copy ?? {}), 'headline', 'title', 'body', 'subtitle', 'badge', 'eyebrow', 'cta'])].filter((n) => !FLAGS.includes(n));

/** The edits a command's flags ask for, in the order they apply. */
function editsFrom(a: Args, adapter: Adapter, base: string, cwd: string, info?: TemplateInfo): Edit[] {
	const out: Edit[] = [];
	const template = one(a, 'template');
	if (template !== undefined && info) out.push({ op: 'template', value: template });
	const size = one(a, 'size');
	const width = whole(a, 'width', 1, 100000);
	const height = whole(a, 'height', 1, 100000);
	if (info && (size !== undefined || width || height)) out.push({ op: 'size', value: size ?? 'custom', width, height });
	const theme = one(a, 'theme');
	if (theme !== undefined) out.push({ op: 'theme', value: theme });
	for (const name of slotNames(adapter)) for (const v of all(a, name)) out.push({ op: 'copy', slot: name, value: v === '' ? null : unescape(v) });
	for (const s of all(a, 'set')) {
		const [k, v] = pair(s, 'set');
		out.push({ op: 'copy', slot: k, value: v === '' ? null : unescape(v) });
	}
	for (const s of all(a, 'replace')) {
		const [k, v] = pair(s, 'replace');
		out.push({ op: 'replace', from: k, to: v });
	}
	for (const s of all(a, 'image')) {
		const m = /^([\w-]+)=(.+)$/.exec(s);
		const path = m ? m[2]! : s;
		out.push({ op: 'image', slot: m?.[1], value: path === '' || s.endsWith('=') ? null : imagePath(path, base, cwd) });
	}
	for (const s of all(a, 'option')) {
		const [k, v] = pair(s, 'option');
		out.push({ op: 'option', id: k, value: v });
	}
	for (const s of all(a, 'reset')) out.push({ op: 'reset', layer: s === 'all' ? undefined : s });
	for (const s of all(a, 'layer')) out.push(layerFlag(s));
	for (const s of all(a, 'hide')) out.push({ op: 'layer', layer: s, set: { hidden: true } });
	for (const s of all(a, 'show')) out.push({ op: 'layer', layer: s, set: { hidden: false } });
	const seed = one(a, 'seed');
	if (seed !== undefined) out.push({ op: 'seed', value: Number(seed) });
	for (const s of all(a, 'allow')) out.push({ op: 'allow', rule: s });
	return out;
}

/** A picture as the document keeps it: relative to the document. Names of built-in pictures pass through. */
function imagePath(typed: string, base: string, cwd: string): string {
	if (typed === 'none' || /^[a-z]+:[^/\\]/i.test(typed)) return typed;
	const abs = isAbsolute(typed) ? typed : resolve(cwd, typed);
	if (!existsSync(abs)) throw new DesignError(`There is no picture at ${typed}.`);
	return relative(base, abs).split(sep).join('/') || typed;
}

const stem = (path: string) => path.replace(/\.design\.json$|\.json$/i, '');
const shown = (cwd: string, path: string) => {
	const rel = relative(cwd, path);
	return !rel || rel.startsWith('..') || isAbsolute(rel) ? path : rel;
};

type Opened = { path: string; doc: DesignDoc };
function open(adapter: Adapter, io: DesignIO, typed: string | undefined, command: string): Opened {
	if (!typed) throw new DesignError(`Name the design file: ${io.bin} design ${command} banner.design.json`);
	let path = resolve(io.cwd, typed);
	if (!existsSync(path) && existsSync(`${path}.design.json`)) path = `${path}.design.json`;
	if (!existsSync(path)) throw new DesignError(`There is no file at ${typed}. Make one with ${io.bin} design new <template>.`);
	return { path, doc: parseDoc(readFileSync(path, 'utf8'), adapter, basename(path)) };
}

const FORMATS: Format[] = ['png', 'svg', 'jpg', 'webp', 'pdf', 'mp4', 'gif'];
function formatsOf(a: Args, info: TemplateInfo, fallback: Format[] = ['png']): Format[] {
	const can = info.formats ?? ['png', 'svg'];
	const raw = one(a, 'format');
	if (!raw) return fallback.filter((f) => can.includes(f)).length ? fallback.filter((f) => can.includes(f)) : [can[0]!];
	return [...new Set(raw.split(',').map((s) => {
		const f = s.trim().toLowerCase().replace(/^jpeg$/, 'jpg') as Format;
		if (!FORMATS.includes(f) || !can.includes(f)) throw unknownName('format', s, can);
		return f;
	}))];
}

type Drawn = { files: Record<string, Uint8Array>; layers: DrawnLayer[]; findings: Finding[]; notes: string[] };
async function draw(adapter: Adapter, doc: DesignDoc, dir: string, formats: Format[], scale = 1): Promise<Drawn> {
	const info = infoFor(adapter, doc);
	const r = await adapter.render(doc, dir, { formats, scale });
	const findings = checkDesign({ doc, info, layers: r.layers, adapter, png: r.files.png });
	return { files: r.files, layers: r.layers, findings, notes: r.notes ?? [] };
}

/** A failed check: the findings are the message, and nothing was written. */
class CheckFailed extends DesignError {
	constructor(readonly findings: Finding[], what: string) {
		super(`${what}\n${checkText(findings)}`);
	}
}

function save(path: string, data: Uint8Array | string) {
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, data);
}

/** Draws, checks, and only then writes the document and its pictures. */
async function write(adapter: Adapter, io: DesignIO, a: Args, path: string, r: Applied, command: string) {
	const info = infoFor(adapter, r.doc);
	const d = await draw(adapter, r.doc, dirname(path), formatsOf(a, info));
	const absent = (r.touched ?? []).filter((id) => !d.layers.some((l) => l.id === id));
	if (absent.length) throw new DesignError(`There is no ${absent.join(' or ')} in this design to change. It draws ${d.layers.map((l) => l.id).join(', ')}.${absent.some((id) => info.copy.some((c) => c.id === id)) ? ` Add words for it first: --set ${absent[0]}="...".` : ''}`);
	if (errorsOf(d.findings).length) throw new CheckFailed(d.findings, `${command === 'new' ? 'The design breaks a rule, so nothing was written.' : 'That breaks a rule, so nothing was changed.'}`);
	// What the drawing did differently from what was asked is said beside the change, never hidden.
	r = { ...r, notes: [...r.notes, ...d.notes] };
	const files: string[] = [];
	if (!a.flags.has('dry-run')) {
		save(path, docText(r.doc));
		for (const [ext, data] of Object.entries(d.files)) {
			const f = `${stem(path)}.${ext}`;
			save(f, data);
			files.push(shown(io.cwd, f));
		}
	}
	report(io, a, {
		ok: true, command, file: shown(io.cwd, path), ...(a.flags.has('dry-run') ? { dryRun: true } : {}), design: summary(r.doc), changes: r.changes, notes: r.notes, files,
		check: { errors: 0, warnings: d.findings.length, findings: d.findings }, layers: d.layers.map(layerOut),
	}, () => [
		`${shown(io.cwd, path)}  ${oneLine(r.doc)}${a.flags.has('dry-run') ? '  (dry run, nothing written)' : ''}`,
		...r.changes.map((c) => `  ${c}`),
		...r.notes.map((n) => `  note: ${n}`),
		...(files.length ? [files.join('  ')] : []),
		checkText(d.findings),
	].join('\n'));
}

const oneLine = (d: DesignDoc) => `${d.template}, ${sizeLabel(d)}${d.theme ? `, ${d.theme}` : ''}`;
const summary = (d: DesignDoc) => ({ kind: d.kind, ...stateOf(d), edits: d.history.length });
const rect = (r: { x: number; y: number; w: number; h: number }) => ({ x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w), h: Math.round(r.h) });
const layerOut = (l: DrawnLayer) => ({ id: l.id, kind: l.kind, box: rect(l.box), can: l.can, ...(l.text ? { text: l.text.drawn, textSize: Math.round(l.text.size * 10) / 10 } : {}) });

function report(io: DesignIO, a: Args, data: unknown, text: () => string) {
	io.out(a.json ? JSON.stringify(data) : text());
}

/** Runs `design <argv...>` and returns the exit code. */
export async function runDesign(argv: string[], adapter: Adapter, io: DesignIO): Promise<number> {
	const json = argv.includes('--json');
	try {
		const [command, ...rest] = argv[0]?.startsWith('-') ? ['help', ...argv] : argv;
		const a = parseArgs(rest, slotNames(adapter));
		if (!command || command === 'help' || a.flags.has('help')) {
			if (a.json) io.out(JSON.stringify(designManifest(adapter, io.bin)));
			else io.out(designHelp(adapter, io.bin));
			return 0;
		}
		const run = COMMANDS[command];
		if (!run) throw unknownName('design command', command, Object.keys(COMMANDS));
		return (await run(a, adapter, io)) ?? 0;
	} catch (err) {
		const e = err as Error;
		if (json) io.out(JSON.stringify({ ok: false, error: { message: e.message, ...(e instanceof DesignError && e.hints.length ? { hints: e.hints } : {}), ...(e instanceof CheckFailed ? { findings: e.findings } : {}) } }));
		else io.err(e.message);
		return 1;
	}
}

type Command = (a: Args, adapter: Adapter, io: DesignIO) => Promise<number | void>;

const COMMANDS: Record<string, Command> = {
	async new(a, adapter, io) {
		const named = a._[0] ?? one(a, 'template');
		if (!named) throw new DesignError(`Name a template: ${io.bin} design new <${allTemplates(adapter).map((t) => t.id).join('|')}>`);
		if (a._.length > 1) throw new DesignError(`One template at a time (got ${a._.join(', ')}). Copy goes in flags: --headline "...".`);
		const info = templateOf(adapter, named);
		const size = one(a, 'size') ? sizeOf(adapter, info, one(a, 'size')!) : one(a, 'width') ? 'custom' : undefined;
		if (size?.includes(',')) throw new DesignError('One size for a new design; `design sizes` makes the others.');
		const out = one(a, 'out');
		let path: string;
		if (!out) path = resolve(io.cwd, `${info.id}-${size ?? info.sizes[0]}.design.json`);
		else if (/\.json$/i.test(out)) path = resolve(io.cwd, out);
		else if (/[\\/]$/.test(out) || (existsSync(resolve(io.cwd, out)) && statSync(resolve(io.cwd, out)).isDirectory())) path = resolve(io.cwd, out, `${info.id}-${size ?? info.sizes[0]}.design.json`);
		else if (/\.(png|svg|jpe?g|webp|pdf)$/i.test(out)) throw new DesignError(`-o names the design file (${out.replace(/\.\w+$/, '.design.json')}); its pictures go beside it.`);
		else path = resolve(io.cwd, `${out}.design.json`);
		if (existsSync(path) && !a.flags.has('force')) throw new DesignError(`${shown(io.cwd, path)} already exists. Revise it, pass another -o, or --force to start over.`);
		const edits = editsFrom(a, adapter, dirname(path), io.cwd);
		if (a.flags.has('sample')) {
			if (!adapter.sample) throw new DesignError('There is no sample copy here. Pass your own words.');
			const own = new Set(edits.flatMap((e) => (e.op === 'copy' ? [sameAs(e.slot, info.copy.map((c) => c.id), adapter.aliases?.copy)] : [])));
			for (const [slot, value] of Object.entries(adapter.sample(info.id))) if (!own.has(slot)) edits.push({ op: 'copy', slot, value });
		}
		const r = create(adapter, info.id, size, edits, { width: whole(a, 'width', 200, 4000), height: whole(a, 'height', 200, 4000) });
		await write(adapter, io, a, path, { ...r, changes: [] }, 'new');
	},

	async revise(a, adapter, io) {
		const { path, doc } = open(adapter, io, a._[0], 'revise');
		const text = a._.slice(1).join(' ').trim();
		if (!text) throw new DesignError(`Say what to change: ${io.bin} design revise ${shown(io.cwd, path)} "bigger headline, logo top right"`);
		const info = infoFor(adapter, doc);
		const now = await adapter.render(doc, dirname(path), { formats: [], scale: 1 });
		const parsed = parsePhrases(text, { adapter, doc, info, drawn: now.layers });
		const edits = parsed.edits.map((e) => (e.op === 'image' && e.value !== null ? { ...e, value: imagePath(e.value, dirname(path), io.cwd) } : e));
		const r = applyEdits(doc, edits, adapter, text.replace(/\s+/g, ' '));
		if (r.doc === doc) throw new DesignError('The design is already like that, so nothing was changed.');
		await write(adapter, io, a, target(a, io, path), r, 'revise');
	},

	async edit(a, adapter, io) {
		const { path, doc } = open(adapter, io, a._[0], 'edit');
		if (a._.length > 1) throw new DesignError(`\`design edit\` takes flags (--set headline="..."), not "${a._[1]}". For plain words use \`design revise\`.`);
		const edits = editsFrom(a, adapter, dirname(path), io.cwd, infoFor(adapter, doc));
		if (!edits.length) throw new DesignError(`Say what to change: --set headline="..." --theme ... --size ... --layer logo.anchor=top-right --hide badge --seed 5 --template ...`);
		const r = applyEdits(doc, edits, adapter);
		if (r.doc === doc) throw new DesignError('The design is already like that, so nothing was changed.');
		await write(adapter, io, a, target(a, io, path), r, 'edit');
	},

	async undo(a, adapter, io) {
		const { path, doc } = open(adapter, io, a._[0], 'undo');
		const r = undo(doc, whole(a, 'steps', 1, 1000) ?? 1);
		await write(adapter, io, a, path, { doc: r.doc, changes: r.undone.map((c) => `undid: ${c}`), notes: [] }, 'undo');
	},

	async redo(a, adapter, io) {
		const { path, doc } = open(adapter, io, a._[0], 'redo');
		const r = redo(doc, whole(a, 'steps', 1, 1000) ?? 1);
		await write(adapter, io, a, path, { doc: r.doc, changes: r.redone.map((c) => `redid: ${c}`), notes: [] }, 'redo');
	},

	async history(a, adapter, io) {
		const { path, doc } = open(adapter, io, a._[0], 'history');
		const data = { ok: true, file: shown(io.cwd, path), history: doc.history.map((h, i) => ({ step: i + 1, change: h.change })), undone: [...doc.future].reverse().map((f) => f.change) };
		report(io, a, data, () => [
			...(doc.history.length ? data.history.map((h) => `${String(h.step).padStart(3)}  ${h.change}`) : ['No changes yet.']),
			...data.undone.map((c) => `  -  ${c} (undone; design redo brings it back)`),
		].join('\n'));
	},

	async show(a, adapter, io) {
		const { path, doc } = open(adapter, io, a._[0], 'show');
		const info = infoFor(adapter, doc);
		const d = await draw(adapter, doc, dirname(path), ['png']);
		const data = { ok: true, file: shown(io.cwd, path), design: summary(doc), layers: d.layers.map(layerOut), takes: takes(info), phrases: examples({ adapter, info, doc }), check: { errors: errorsOf(d.findings).length, findings: d.findings } };
		report(io, a, data, () => [
			`${shown(io.cwd, path)}  ${oneLine(doc)}`,
			...Object.entries(doc.copy).map(([k, v]) => `  ${k}: "${v.replace(/\n/g, ' / ')}"`),
			...Object.entries(doc.images).map(([k, v]) => `  ${k}: ${v}`),
			...(doc.seed !== undefined ? [`  seed: ${doc.seed}`] : []),
			'Drawn:',
			...d.layers.map((l) => `  ${l.id.padEnd(12)} at ${rect(l.box).x},${rect(l.box).y} ${rect(l.box).w}x${rect(l.box).h}${doc.layers[l.id] ? `  edited: ${Object.entries(doc.layers[l.id]!).map(([k, v]) => `${k} ${String(v)}`).join(', ')}` : ''}`),
			'You can:',
			...info.layers.map((l) => `  ${canSay(l.id, l.can)}`),
			`  themes: ${info.themes.join(', ')}; sizes: ${info.sizes.join(', ')}`,
			...(info.options.length ? [`  options: ${info.options.map((o) => `${o.id} ${o.range ? `${o.range[0]} to ${o.range[1]}` : (o.values ?? []).join('|')}`).join('; ')}`] : []),
			checkText(d.findings),
		].join('\n'));
	},

	async check(a, adapter, io) {
		const { path, doc } = open(adapter, io, a._[0], 'check');
		const d = await draw(adapter, doc, dirname(path), ['png']);
		const e = errorsOf(d.findings);
		report(io, a, { ok: !e.length, file: shown(io.cwd, path), errors: e.length, warnings: d.findings.length - e.length, findings: d.findings }, () => checkText(d.findings));
		return e.length ? 1 : 0;
	},

	async render(a, adapter, io) {
		const { path, doc } = open(adapter, io, a._[0], 'render');
		const info = infoFor(adapter, doc);
		const raw = one(a, 'scale');
		const scale = raw === undefined ? 1 : Number(raw);
		if (!Number.isFinite(scale) || scale < 0.25 || scale > 4) throw new DesignError(`--scale takes 0.25 to 4, not ${raw}.`);
		const out = one(a, 'out');
		const ext = out && /\.(png|svg|jpe?g|webp|pdf|mp4|gif)$/i.exec(out)?.[1]?.toLowerCase().replace('jpeg', 'jpg');
		const formats = formatsOf(a, info, ext ? [ext as Format] : ['png']);
		if (ext && (formats.length > 1 || formats[0] !== ext)) throw new DesignError(`-o ends in .${ext}, but the format is ${formats.join(', ')}.`);
		const d = await draw(adapter, doc, dirname(path), formats, scale);
		if (errorsOf(d.findings).length) throw new CheckFailed(d.findings, 'The design breaks a rule, so nothing was rendered.');
		const base = ext ? resolve(io.cwd, out!).replace(/\.\w+$/, '') : out ? join(resolve(io.cwd, out), basename(stem(path))) : stem(path);
		const files = Object.entries(d.files).map(([x, data]) => {
			const f = `${base}.${x}`;
			save(f, data);
			return shown(io.cwd, f);
		});
		report(io, a, { ok: true, files, check: { errors: 0, warnings: d.findings.length, findings: d.findings } }, () => [...files, checkText(d.findings)].join('\n'));
	},

	async variants(a, adapter, io) {
		const { path, doc } = open(adapter, io, a._[0], 'variants');
		const by = one(a, 'by') ?? 'theme';
		if (!['theme', 'seed', 'template'].includes(by)) throw unknownName('way to vary', by, ['theme', 'seed', 'template']);
		const info = infoFor(adapter, doc);
		const count = whole(a, 'count', 1, 24);
		const picks: { name: string; edit: Edit }[] = [];
		if (by === 'template' && doc.template === COMPOSE) throw new DesignError('A compose design has no other templates; vary it by theme or seed.');
		if (by === 'theme') for (const t of info.themes) picks.push({ name: t, edit: { op: 'theme', value: t } });
		else if (by === 'template') for (const t of adapter.templates().filter((x) => x.kind === doc.kind)) picks.push({ name: t.id, edit: { op: 'template', value: t.id } });
		else for (let i = 1; i <= (count ?? 4); i++) picks.push({ name: `seed-${(doc.seed ?? 0) + i}`, edit: { op: 'seed', value: (doc.seed ?? 0) + i } });
		// The layout the design is in comes first, so the rest read against it.
		picks.sort((x, y) => Number(isNow(y, doc)) - Number(isNow(x, doc)));
		return many(a, adapter, io, path, doc, count ? picks.slice(0, count) : picks, by);
	},

	async sizes(a, adapter, io) {
		const { path, doc } = open(adapter, io, a._[0], 'sizes');
		const info = infoFor(adapter, doc);
		const to = one(a, 'to');
		if (!to) throw new DesignError(`Say which sizes: --to ${info.sizes.filter((s) => s !== 'custom').slice(0, 4).join(',')} (or --to all).`);
		const ids = to.trim().toLowerCase() === 'all' ? info.sizes.filter((s) => s !== 'custom') : to.split(',').map((s) => sizeOf(adapter, info, s));
		return many(a, adapter, io, path, doc, [...new Set(ids)].map((id) => ({ name: id, edit: { op: 'size', value: id } as Edit })), 'size');
	},

	async compare(a, adapter, io) {
		const x = open(adapter, io, a._[0], 'compare');
		const y = open(adapter, io, a._[1], 'compare a.design.json');
		const [p, q] = [await draw(adapter, x.doc, dirname(x.path), ['png']), await draw(adapter, y.doc, dirname(y.path), ['png'])];
		const diff = differences(x.doc, y.doc);
		const moved = layerChanges(p.layers, q.layers);
		const out = resolve(io.cwd, one(a, 'out') ?? `${stem(x.path)}-vs-${basename(stem(y.path))}.png`);
		save(out, await io.paint(comparison({ label: `${basename(x.path)}: ${oneLine(x.doc)}`, png: p.files.png! }, { label: `${basename(y.path)}: ${oneLine(y.doc)}`, png: q.files.png! }, [...diff, ...moved])));
		report(io, a, { ok: true, files: [shown(io.cwd, out)], differences: diff, drawn: moved }, () => [shown(io.cwd, out), ...(diff.length || moved.length ? [...diff, ...moved].map((d) => `  ${d}`) : ['  No differences.'])].join('\n'));
	},

	async compose(a, adapter, io) {
		const [sub, file, ...rest] = a._;
		const SUBS = ['add', 'move', 'remove', 'order', 'span', 'grid'];
		if (!sub || !SUBS.includes(sub)) throw unknownName('compose command', sub ?? '', SUBS);
		const { path, doc } = open(adapter, io, file, `compose ${sub}`);
		if (doc.template !== COMPOSE) throw new DesignError(`${basename(path)} is a ${doc.template} design; blocks go in a compose design (design new compose).`);
		const where = () => ({ ...(one(a, 'at') ? { at: parseAt(one(a, 'at')!) } : {}), ...(one(a, 'place') ? { place: placeName(one(a, 'place')!) } : {}) });
		let e: ComposeEdit;
		if (sub === 'add') {
			if (!rest[0]) throw new DesignError(`Name a block: ${(adapter.compose?.blocks() ?? []).map((b) => b.type).join(', ')}.`);
			const info = blockInfo(adapter, rest[0]);
			const copy: Record<string, string> = {};
			for (const s of all(a, 'set')) {
				const [k, v] = pair(s, 'set');
				copy[k] = unescape(v);
			}
			if (rest[1] !== undefined) copy[''] = rest[1];
			e = { op: 'block-add', type: info.type, ...(one(a, 'id') ? { id: one(a, 'id') } : {}), ...where(), copy };
		} else if (sub === 'move') e = { op: 'block-move', id: need(rest[0]), ...where() };
		else if (sub === 'remove') e = { op: 'block-remove', id: need(rest[0]) };
		else if (sub === 'order') e = { op: 'block-order', id: need(rest[0]), to: a.flags.has('back') ? 'back' : a.flags.has('front') ? 'front' : (rest[1] as 'forward' | 'backward' | undefined) ?? 'front' };
		else if (sub === 'span') {
			const [c, r] = (rest[1] ?? '').split(',').map(Number);
			if (!Number.isInteger(c) || !Number.isInteger(r)) throw new DesignError('span takes the block and cols,rows to add, such as 1,0 or -1,2.');
			e = { op: 'block-span', id: need(rest[0]), cols: c, rows: r };
		} else {
			const [c, r] = (rest[0] ?? one(a, 'grid') ?? '').split(/[x,]/).map(Number);
			if (!Number.isInteger(c) || !Number.isInteger(r)) throw new DesignError('grid takes cols x rows, such as 12x8.');
			e = { op: 'grid', cols: c!, rows: r! };
		}
		if ((sub === 'move') && !one(a, 'at') && !one(a, 'place')) throw new DesignError('Say where: --place top-right or --at col,row,cols,rows.');
		const r = applyEdits(doc, [e], adapter, `compose ${sub} ${[...rest].join(' ')}`.trim());
		await write(adapter, io, a, target(a, io, path), r, `compose ${sub}`);
	},

	async page(a, adapter, io) {
		if (a._[0] !== 'compose') throw new DesignError(`Build a page: ${io.bin} design page compose outline.json [--flavor ${adapter.page?.flavors.join('|') ?? 'react'}] [-o dir]`);
		if (!adapter.page) throw new DesignError('This command line has no sections to build pages from.');
		const file = a._[1];
		if (!file) throw new DesignError('Name the outline: design page compose outline.json');
		let raw: unknown;
		try {
			raw = JSON.parse(readFileSync(resolve(io.cwd, file), 'utf8'));
		} catch (err) {
			throw new DesignError(`Could not read ${file} as JSON (${(err as Error).message}).`);
		}
		const outline = validateOutline(adapter, raw);
		const flavors = one(a, 'flavor') ? one(a, 'flavor')!.split(',').map((f) => f.trim()) : adapter.page.flavors;
		for (const f of flavors) if (!adapter.page.flavors.includes(f)) throw unknownName('flavor', f, adapter.page.flavors);
		const dir = resolve(io.cwd, one(a, 'out') ?? basename(file).replace(/\.json$/i, ''));
		const files: string[] = [];
		const out: Record<string, string> = {};
		for (const f of flavors) for (const [name, text] of Object.entries(await adapter.page.write(outline, f))) out[name] = text;
		for (const [name, text] of Object.entries(out)) {
			save(join(dir, name), text);
			files.push(shown(io.cwd, join(dir, name)));
		}
		report(io, a, { ok: true, files, sections: outline.sections.map((s) => s.type) }, () => files.join('\n'));
	},

	async templates(a, adapter, io) {
		const m = designManifest(adapter, io.bin);
		report(io, a, { ok: true, templates: m.templates }, () => m.templates.map((t) => `${t.id.padEnd(14)} ${t.kind.padEnd(12)} ${t.description}\n${' '.repeat(28)}copy: ${t.copy.map((c) => `${c.id}${c.required ? ' (needed)' : ''}`).join(', ') || 'none'}; sizes: ${t.sizes.join(', ')}; themes: ${t.themes.join(', ') || 'one'}`).join('\n'));
	},
};

const need = (id: string | undefined) => {
	if (!id) throw new DesignError('Name the block.');
	return id;
};
const placeName = (p: string) => {
	const a = p.trim().toLowerCase().replace(/\s+/g, '-').replace('centre', 'center').replace('middle', 'center');
	const all = ['top-left', 'top', 'top-right', 'left', 'center', 'right', 'bottom-left', 'bottom', 'bottom-right'];
	if (!all.includes(a)) throw unknownName('place', p, all);
	return a as 'center';
};

const isNow = (p: { edit: Edit }, d: DesignDoc) => (p.edit.op === 'theme' && p.edit.value === d.theme) || (p.edit.op === 'template' && p.edit.value === d.template);

function target(a: Args, io: DesignIO, path: string): string {
	const out = one(a, 'out');
	if (!out) return path;
	if (!/\.json$/i.test(out)) throw new DesignError(`-o names the design file to write (${basename(stem(path))}-2.design.json).`);
	return resolve(io.cwd, out);
}

/** The same design several ways: a file and a picture each, and one labeled sheet. Ones that break a rule are named and not written. */
async function many(a: Args, adapter: Adapter, io: DesignIO, path: string, doc: DesignDoc, picks: { name: string; edit: Edit }[], by: string): Promise<number> {
	if (!picks.length) throw new DesignError(`There is nothing to vary by ${by} here.`);
	const base = one(a, 'out') ? join(resolve(io.cwd, one(a, 'out')!), basename(stem(path))) : stem(path);
	const made: { name: string; file: string; png: string; design: ReturnType<typeof summary>; notes: string[]; findings: Finding[] }[] = [];
	const blocked: { name: string; reason: string }[] = [];
	const sheet: { label: string; png: Uint8Array }[] = [];
	for (const p of picks) {
		const name = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
		try {
			const r = applyEdits(doc, [p.edit], adapter);
			// Same state as the original: still part of the sheet, as itself.
			const next: DesignDoc = { ...r.doc, history: [], future: [] };
			const file = `${base}-${name}.design.json`;
			const placed = relocate(next, dirname(path), dirname(file));
			const d = await draw(adapter, placed, dirname(file), ['png']);
			if (errorsOf(d.findings).length) {
				blocked.push({ name: p.name, reason: errorsOf(d.findings).map((f) => `${f.rule}: ${f.message}`).join(' ') });
				continue;
			}
			save(file, docText(placed));
			save(`${base}-${name}.png`, d.files.png!);
			made.push({ name: p.name, file: shown(io.cwd, file), png: shown(io.cwd, `${base}-${name}.png`), design: summary(placed), notes: [...r.notes, ...d.notes], findings: d.findings });
			sheet.push({ label: `${p.name}${by === 'size' ? ` ${placed.size.width}x${placed.size.height}` : ''}${by !== 'size' && isNow(p, doc) ? ' (as it is)' : ''}`, png: d.files.png! });
		} catch (err) {
			blocked.push({ name: p.name, reason: (err as Error).message });
		}
	}
	const out = `${base}-${by === 'size' ? 'sizes' : `by-${by}`}.png`;
	if (sheet.length) save(out, await io.paint(contactSheet(sheet, { notes: blocked.map((b) => `Not made: ${b.name}. ${b.reason}`) })));
	report(io, a, { ok: blocked.length === 0, sheet: sheet.length ? shown(io.cwd, out) : undefined, made, blocked }, () => [
		...made.map((m) => `${m.png}  ${m.design.size.width}x${m.design.size.height}${m.notes.length ? `  (${m.notes.join('; ')})` : ''}`),
		...blocked.map((b) => `not made: ${b.name}. ${b.reason}`),
		...(sheet.length ? [`${shown(io.cwd, out)}  all of them on one sheet`] : []),
	].join('\n'));
	// Every asked size has to be made; with variants, some failing is an answer.
	return by === 'size' ? (blocked.length ? 1 : 0) : made.length ? 0 : 1;
}

/** The document's picture paths for another folder. */
function relocate(doc: DesignDoc, from: string, to: string): DesignDoc {
	if (from === to) return doc;
	return { ...doc, images: Object.fromEntries(Object.entries(doc.images).map(([k, v]) => [k, v === 'none' || /^[a-z]+:[^/\\]/i.test(v) ? v : relative(to, resolve(from, v)).split(sep).join('/')])) };
}

function layerChanges(a: DrawnLayer[], b: DrawnLayer[]): string[] {
	const out: string[] = [];
	for (const id of [...new Set([...a, ...b].map((l) => l.id))]) {
		const x = a.find((l) => l.id === id);
		const y = b.find((l) => l.id === id);
		if (!x || !y) out.push(`${id}: ${x ? 'drawn' : 'not drawn'} -> ${y ? 'drawn' : 'not drawn'}`);
		else {
			const [p, q] = [rect(x.box), rect(y.box)];
			if (JSON.stringify(p) !== JSON.stringify(q)) out.push(`${id}: ${p.w}x${p.h} at ${p.x},${p.y} -> ${q.w}x${q.h} at ${q.x},${q.y}`);
		}
	}
	return out;
}

const takes = (t: TemplateInfo) => ({ copy: t.copy, images: t.images, options: t.options, layers: t.layers, themes: t.themes, sizes: t.sizes, formats: t.formats ?? ['png', 'svg'] });

const SUBCOMMANDS: [string, string][] = [
	['new <template> [--size] [--theme] [--headline "..."] [--image slot=file] [-o banner.design.json]', 'Write a design file and draw it'],
	['revise <file> "bigger headline, logo top right, darker theme"', 'Change it in plain words; a part that is not understood changes nothing and lists what you can say'],
	['edit <file> --set headline="..." --theme --size --layer logo.anchor=top-right --hide badge --seed 5 --template', 'Change it exactly'],
	['undo <file> [--steps n]', 'Take back the last change'],
	['redo <file> [--steps n]', 'Bring back what undo took'],
	['history <file>', 'Every change, oldest first'],
	['show <file>', 'What it holds, what was drawn where, and what can change'],
	['variants <file> --by theme|seed|template [--count n]', 'The same design other ways, with one labeled sheet'],
	['sizes <file> --to og,square,story,x-banner', 'The same design at other sizes, laid out again'],
	['compare <a> <b> [-o compare.png]', 'Side by side, with what differs'],
	['render <file> [--format png,svg,jpg,webp,pdf] [--scale 2] [-o out.png]', 'Draw it again in any format'],
	['check <file>', 'Every brand and layout rule; exit 1 on errors'],
	['compose add|move|remove|order|span|grid <file> ...', 'Blocks on a grid, for a layout no template has (design new compose first)'],
	['page compose <outline.json> [--flavor ...] [-o dir]', 'A whole page from the brand\'s sections, in every flavor the library ships'],
	['templates', 'What a design can start from'],
];

/** Help text for `design --help`. */
export function designHelp(adapter: Adapter, bin: string): string {
	const first = adapter.templates()[0]!;
	const blocks = adapter.compose?.blocks().map((b) => b.type) ?? [];
	return [
		`${bin} design: make a design, revise it until it is right, and keep it on brand.`,
		'',
		...SUBCOMMANDS.map(([u, d]) => `  design ${u}\n      ${d}`),
		'',
		'Every command takes --json. new, revise and edit take --dry-run. --allow <rule> accepts a composition rule for this design',
		`(${RULES.filter((r) => !NEVER_ALLOWED.has(r.id)).map((r) => r.id).join(', ')}); brand rules (${[...NEVER_ALLOWED].join(', ')}) can never be allowed.`,
		'',
		`Templates: ${allTemplates(adapter).map((t) => t.id).join(', ')}`,
		...(blocks.length ? [`Blocks for compose: ${blocks.join(', ')}`] : []),
		`Things you can say to a ${first.id}: ${variety(examples({ adapter, info: first }), 10).join('; ')}.`,
		'',
		`  ${bin} design new ${first.id} --${(first.copy.find((c) => c.required) ?? first.copy[0])?.id ?? 'headline'} "Ship faster" -o ${first.id}.design.json`,
		`  ${bin} design revise ${first.id}.design.json "${variety(examples({ adapter, info: first }), 4).slice(0, 2).join(', ')}"`,
		`  ${bin} design undo ${first.id}.design.json`,
	].join('\n');
}

/** The `design` entry for a CLI's manifest: templates, layers, what each can do, phrases and rules. */
export function designManifest(adapter: Adapter, bin: string) {
	return {
		name: 'design',
		core: CORE_VERSION,
		usage: `${bin} design <command>`,
		summary: 'Make a design, revise it in plain words or exact edits, check it, undo it. Works on a small JSON file; every write is checked against the brand and errors change nothing.',
		commands: SUBCOMMANDS.map(([u, d]) => ({ name: u.split(' ')[0]!, usage: `${bin} design ${u}`, summary: d })),
		flags: FLAGS,
		templates: allTemplates(adapter).map((t) => ({ ...t, formats: t.formats ?? ['png', 'svg'], phrases: examples({ adapter, info: t }) })),
		...(adapter.compose ? { blocks: adapter.compose.blocks(), grid: { cols: 12, rows: 12, note: 'a block sits at col,row,cols,rows cells; words are copy "<block>.<slot>"' } } : {}),
		...(adapter.page ? { page: { flavors: adapter.page.flavors, sections: adapter.page.sections(), outline: '{ "title": "...", "sections": [ { "type": "hero", "copy": { ... }, "items": [ { ... } ] } ] }' } } : {}),
		layerEdits: { anchor: 'a place from can.anchors', dx: 'share of the width, -0.5 to 0.5', dy: 'share of the height, -0.5 to 0.5', scale: 'times the size the layout gives it, within can.scale', align: 'left, center or right', hidden: 'true or false' },
		rules: RULES.map((r) => ({ ...r, allowable: !NEVER_ALLOWED.has(r.id) })),
		sizes: PLATFORMS.map((p) => ({ id: p.id, label: p.label, width: p.width, height: p.height, aliases: p.aliases, ...(p.avoid.length || p.safe ? { zones: [...p.avoid, ...(p.safe ? [p.safe] : [])].map((z) => ({ name: z.name, official: z.official, rect: z.rect })) } : {}), ...(p.limit ? { limitBytes: p.limit.bytes } : {}), ...(p.source ? { source: p.source } : {}), ...(p.note ? { note: p.note } : {}) })),
	};
}


