import { luminance } from './check.js';
import { canSay, DesignError, layerOf, nearest, SAME, sameAs, templateOf } from './doc.js';
import type { Edit } from './ops.js';
import { PLATFORMS, sizeAlias } from './platforms.js';
import type { Adapter, Anchor, DesignDoc, DrawnLayer, LayerEdit, TemplateInfo } from './types.js';

// Plain words into edits, by rules alone: no model, no guessing. Every part of the sentence has to be understood;
// one that is not fails the whole command, and the error lists the closest things this design can do. Copy is always
// in quotes, so words to draw are never mistaken for instructions.

export type PhraseContext = { adapter: Adapter; doc: DesignDoc; info: TemplateInfo; drawn?: DrawnLayer[] };
export type Understood = { phrase: string; edits: Edit[] };

const SMALL = /\b(?:a (?:little|tiny|touch|hair|smidge)(?: bit)?|a bit|a tad|slightly|somewhat|marginally)\b/g;
const LARGE = /\b(?:a lot|lots|much|way|far|significantly|considerably|really|very|a ton|massively)\b/g;
const FILLER = /\b(?:please|can you|could you|would you|i(?:'|’)?d like(?: to)?|i want(?: to)?|we want(?: to)?|let(?:'|’)?s|maybe|just|also|the|a|an|my|our|your|its|this|that|should be|needs to be|to be|should|kindly)\b/g;
const STEP = { small: 1.08, normal: 1.2, large: 1.45 };
const NUDGE = { small: 0.015, normal: 0.04, large: 0.1 };
const BIG = '(?:bigger|larger|big|large|huge|taller)';
const LESS = '(?:smaller|tinier|small|tiny)';
const VERB = '(?:make|set|put|move|place|have|get|give|turn|change|switch|use|try|keep|go|want|render|do)';

const PLACES: [RegExp, Anchor][] = [
	[/^(?:top|upper)[ -]?left$|^left[ -]?top$/, 'top-left'],
	[/^(?:top|upper)[ -]?right$|^right[ -]?top$/, 'top-right'],
	[/^(?:bottom|lower)[ -]?left$|^left[ -]?bottom$/, 'bottom-left'],
	[/^(?:bottom|lower)[ -]?right$|^right[ -]?bottom$/, 'bottom-right'],
	[/^(?:top|top[ -]?(?:center|centre|middle))$/, 'top'],
	[/^(?:bottom|bottom[ -]?(?:center|centre|middle)|foot)$/, 'bottom'],
	[/^(?:left|(?:center|centre|middle)[ -]?left|left[ -]?(?:center|centre|middle))$/, 'left'],
	[/^(?:right|(?:center|centre|middle)[ -]?right|right[ -]?(?:center|centre|middle))$/, 'right'],
	[/^(?:center|centre|middle|centered|centred)$/, 'center'],
];
const PLACE = '((?:top|bottom|upper|lower|left|right|center|centre|middle|centered|centred|foot)(?:[ -](?:left|right|center|centre|middle|top|bottom))?)';

// What people ask for that a brand design cannot do, with why.
const REFUSALS: [RegExp, (c: PhraseContext) => string][] = [
	[/\b(?:rotate|rotated|tilt|tilted|stretch|stretched|skew|squash|squish|distort|warp|flip|mirror)\b/, () => 'Nothing in a design is rotated, stretched or distorted.'],
	[/\b(?:shadow|glow|outline|stroke|bevel|emboss|3d|neon|gradient|blur|glitter|underline|italic)\b/, () => 'Effects are not part of the brand.'],
	[/\b(?:font|typeface|helvetica|arial|comic sans|times|inter|serif|sans|handwriting|cursive|bold|bolder|thin|thinner|weight|uppercase|all caps)\b/, () => 'Type comes from the brand: its faces, weights and case are fixed.'],
	[/#[0-9a-f]{3,8}\b|\b(?:recolou?r|colou?rs?|red|green|blue|yellow|purple|violet|pink|orange|teal|cyan|magenta|brown|gold|silver|gr[ae]y|black|white|beige|navy|lime|rgb|hsl)\b/, (c) => `Colors come only from the brand's themes${c.info.themes.length ? `: ${c.info.themes.join(', ')}` : ''}.`],
];

type Vocabulary = { layers: Map<string, string>; names: string };

/** Every word a layer answers to, mapped to its id. */
function layerWords(c: PhraseContext): Map<string, string> {
	const words = new Map<string, string>();
	const ids = c.info.layers.map((l) => l.id);
	for (const set of SAME) for (const name of set) {
		const hit = sameAs(name, ids, c.adapter.aliases?.layers);
		if (hit && !words.has(name)) words.set(name, hit);
	}
	for (const [old, id] of Object.entries(c.adapter.aliases?.layers ?? {})) if (ids.includes(id)) words.set(old.toLowerCase().replace(/[-_]/g, ' '), id);
	for (const id of ids) words.set(id.toLowerCase().replace(/[-_]/g, ' '), id);
	// "text" and "words" are the headline when there is one.
	const head = ids.find((i) => i === 'headline' || i === 'title');
	if (head) for (const w of ['text', 'main text', 'words', 'copy', 'type', 'lettering']) if (!words.has(w)) words.set(w, head);
	const art = words.get('art') ?? words.get('picture');
	if (art) for (const w of ['dots', 'globe', 'graphics', 'artwork']) if (!words.has(w)) words.set(w, art);
	return words;
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function vocabulary(c: PhraseContext): Vocabulary {
	const layers = layerWords(c);
	// Words for parts other layouts have, so "bigger badge" is refused as "no badge" and not as gibberish.
	const others = SAME.flat().filter((w) => !layers.has(w));
	const names = [...layers.keys(), ...others, 'it', 'them', 'everything'].sort((a, b) => b.length - a.length).map(esc).join('|');
	return { layers, names: `(?:${names})s?` };
}

/** The whole sentence as edits. Throws a DesignError naming each part that was not understood. */
export function parsePhrases(text: string, c: PhraseContext): { edits: Edit[]; understood: Understood[] } {
	const quotes: string[] = [];
	// Quoted copy first, so commas and words inside it are left alone.
	const safe = text.replace(/"((?:[^"\\]|\\.)*)"|“([^”]*)”|«([^»]*)»|(?<![\w])'((?:[^'\\]|\\.)*)'(?![\w])/g, (_m, a?: string, b?: string, d?: string, e?: string) => {
		quotes.push((a ?? b ?? d ?? e ?? '').replace(/\\(["'\\])/g, '$1').replace(/\\n/g, '\n'));
		return ` <${quotes.length - 1}> `;
	});
	const vocab = vocabulary(c);
	const state = { last: undefined as string[] | undefined };
	const understood: Understood[] = [];
	const failed: { phrase: string; why?: string }[] = [];
	const show = (s: string) => s.replace(/<(\d+)>/g, (_m, i: string) => `"${quotes[Number(i)]}"`).replace(/\s+/g, ' ').trim();
	const attempt = (part: string): { edits?: Edit[]; why?: string } => {
		const before = state.last;
		try {
			const edits = clause(part, quotes, c, vocab, state);
			if (edits) return { edits };
			state.last = before;
			return { why: refusal(part, c, vocab) };
		} catch (err) {
			state.last = before;
			if (err instanceof DesignError) return { why: err.message };
			throw err;
		}
	};
	const segments = safe.split(/[,;\n]|\.(?:\s|$)|!(?:\s|$)|\bthen\b/i).map((s) => s.trim()).filter(Boolean);
	if (!segments.length) throw new DesignError('Say what to change, for example "bigger headline, logo top right".', variety(examples(c), 6));
	for (const seg of segments) {
		const whole = attempt(seg);
		if (whole.edits) {
			understood.push({ phrase: show(seg), edits: whole.edits });
			continue;
		}
		const parts = seg.split(/\b(?:and|but|while|plus)\b|&/i).map((s) => s.trim()).filter(Boolean);
		if (parts.length < 2) {
			failed.push({ phrase: show(seg), why: whole.why });
			continue;
		}
		for (const p of parts) {
			const r = attempt(p);
			if (r.edits) understood.push({ phrase: show(p), edits: r.edits });
			else failed.push({ phrase: show(p), why: r.why });
		}
	}
	if (failed.length) {
		const all = examples(c);
		const hints = [...new Set(failed.flatMap((f) => close(f.phrase, all)))].slice(0, 6);
		const lines = failed.map((f) => (f.why ? `"${f.phrase}": ${f.why}` : `"${f.phrase}" is not something this design understands.`));
		throw new DesignError(`Nothing was changed.\n${lines.join('\n')}\nThings you can say here: ${(hints.length ? hints : variety(all, 6)).join('; ')}. Copy goes in quotes. For exact edits use \`design edit\`.`, hints);
	}
	return { edits: understood.flatMap((u) => u.edits), understood };
}

function refusal(part: string, c: PhraseContext, v: Vocabulary): string | undefined {
	const t = part.toLowerCase().replace(/<\d+>/g, ' ');
	for (const [re, why] of REFUSALS) if (re.test(t)) return why(c);
	// A part this layout does not have.
	const named = new RegExp(`\\b(${SAME.flat().map(esc).join('|')})\\b`).exec(t)?.[1];
	if (named && !v.layers.has(named) && !c.info.copy.some((s) => sameAs(named, [s.id])) && !c.info.images.some((s) => sameAs(named, [s.id]))) return `The ${c.info.id} layout has no ${named}${c.info.layers.length ? `. It has ${c.info.layers.map((l) => l.id).join(', ')}` : ''}.`;
	return undefined;
}

function clause(raw: string, quotes: string[], c: PhraseContext, v: Vocabulary, state: { last?: string[] }): Edit[] | undefined {
	let t = ` ${raw.toLowerCase()} `;
	const degree = SMALL.test(t) ? 'small' : LARGE.test(t) ? 'large' : 'normal';
	SMALL.lastIndex = LARGE.lastIndex = 0;
	t = t.replace(SMALL, ' ').replace(LARGE, ' ').replace(FILLER, ' ').replace(/(\d)\s*(?:percent|per cent)\b/g, '$1%').replace(/[:=]/g, ' ').replace(/\s+/g, ' ').trim();
	const q = (s: string) => quotes[Number(/<(\d+)>/.exec(s)![1])]!;
	const N = v.names;
	const list = `(${N}(?: (?:and|&) ${N})*)`;
	const amount = '(?: (?:by )?(\\d+(?:\\.\\d+)?) ?(%|px|pixels?|x))?';
	let m: RegExpExecArray | null;

	const targets = (text: string): string[] => {
		const out: string[] = [];
		for (const w of text.split(/ (?:and|&) /)) {
			const k = w.trim();
			if (k === 'it' || k === 'them') {
				if (!state.last) throw new DesignError(`Say which part "${k}" is: ${c.info.layers.map((l) => l.id).join(', ')}.`);
				out.push(...state.last);
			} else if (k === 'everything' || k === 'everythings') throw new DesignError('Say which part, or ask for another size.');
			else out.push(v.layers.get(k) ?? v.layers.get(k.replace(/s$/, '')) ?? layerOf(c.adapter, c.info, k.replace(/s$/, '')));
		}
		state.last = out;
		return out;
	};
	const each = (text: string, make: (id: string) => LayerEdit, by = false): Edit[] => targets(text).map((layer) => ({ op: 'layer', layer, set: make(layer), ...(by ? { by: true } : {}) }));
	const canOf = (id: string) => c.info.layers.find((l) => l.id === id)!.can;

	/* Copy: always quoted. */
	const slots = [...new Set([...c.info.copy.map((s) => s.id.toLowerCase().replace(/[-_]/g, ' ')), ...SAME.flat().filter((w) => sameAs(w, c.info.copy.map((s) => s.id), c.adapter.aliases?.copy)), ...Object.keys(c.adapter.aliases?.copy ?? {})])].sort((a, b) => b.length - a.length);
	const pics = [...new Set([...c.info.images.map((s) => s.id.toLowerCase().replace(/[-_]/g, ' ')), ...SAME.flat().filter((w) => sameAs(w, c.info.images.map((s) => s.id)))])].sort((a, b) => b.length - a.length);
	const S = slots.length ? `(${slots.map(esc).join('|')})` : '(\\b\\B)';
	const P = pics.length ? `(${pics.map(esc).join('|')})` : '(\\b\\B)';
	const slot = (w: string) => sameAs(w, c.info.copy.map((s) => s.id), c.adapter.aliases?.copy)!;
	const pic = (w: string) => sameAs(w, c.info.images.map((s) => s.id))!;
	if (/<\d+>/.test(t)) {
		if ((m = /^(?:replace|change|swap|turn) (<\d+>) (?:with|by|to|for|into) (<\d+>)$/.exec(t))) return [{ op: 'replace', from: q(m[1]!), to: q(m[2]!) }];
		if ((m = new RegExp(`^(?:(?:${VERB}|add|write|rewrite|update|replace|edit) )?(?:new )?${S}(?: copy| text| line)?(?: (?:to|as|says?|saying|reads?|reading|is|with|that says))*? (<\\d+>)$`).exec(t))) return [{ op: 'copy', slot: slot(m[1]!), value: q(m[2]!) }];
		if ((m = new RegExp(`^(?:${VERB} |add )?(<\\d+>) (?:as|in|for) ${S}$`).exec(t))) return [{ op: 'copy', slot: slot(m[2]!), value: q(m[1]!) }];
		if ((m = new RegExp(`^(?:(?:${VERB}|add|swap|replace|update) )?(?:new )?${P}(?: file)?(?: (?:to|with|for|as|is))? (<\\d+>)$`).exec(t))) return [{ op: 'image', slot: pic(m[1]!), value: q(m[2]!) }];
		if ((m = new RegExp(`^(?:${VERB} |add )?(<\\d+>) (?:as|for|in) ${P}$`).exec(t))) return [{ op: 'image', slot: pic(m[2]!), value: q(m[1]!) }];
		if ((m = new RegExp(`^(?:${VERB} )?(?:with )?theme (<\\d+>)$`).exec(t))) return [{ op: 'theme', value: q(m[1]!) }];
		const named = /^(?:\w+ )?([a-z][a-z-]*)(?: to| says?| reads?)? <\d+>$/.exec(t)?.[1];
		if (named && !['to', 'as', 'with'].includes(named)) throw new DesignError(`The ${c.info.id} layout does not draw "${named}". It draws ${[...c.info.copy, ...c.info.images].map((s) => s.id).join(', ')}.`);
		return undefined;
	}

	/* A built-in picture by name. */
	for (const i of c.info.images) for (const value of i.values ?? []) {
		const name = value.replace(/^[a-z]+:/i, '').toLowerCase();
		if (name !== 'none' && new RegExp(`^(?:(?:${VERB}|swap|replace|show) )?(?:(?:${N}) )?(?:with |for |to |by )?${esc(name)}(?: (?:picture|art|image|graphic))?$`).test(t) && t !== 'show') return [{ op: 'image', slot: i.id, value }];
	}

	/* Theme. */
	const themes = c.info.themes.map((x) => x.toLowerCase());
	const T = themes.length ? `(${[...themes, ...Object.keys(c.adapter.aliases?.themes ?? {}).map((x) => x.toLowerCase())].sort((a, b) => b.length - a.length).map(esc).join('|')})` : '(\\b\\B)';
	if ((m = new RegExp(`^(?:${VERB} )?(?:it )?(?:back )?(?:to |in |on |with )?(?:theme |palette )?${T}(?: theme| palette| version| background| ground| colou?rs)?$`).exec(t)) && (/(theme|palette|version|background|ground|colou?rs)/.test(t) || /^(?:make|switch|use|try|go|change|in|turn|set|back)\b/.test(t) || t === m[1])) return [{ op: 'theme', value: m[1]! }];
	if ((m = /^(?:(?:make|set|use|switch|go|try|have|change|turn|want) )?(?:it )?(?:to |in )?(darker|lighter|brighter|dark|light|darkest|lightest)(?: (?:theme|palette|background|ground|version|mode|one|colou?rs))?$/.exec(t))) return [{ op: 'theme', value: shadeOf(m[1]!, c) }];
	if (/^(?:(?:make|use|try|switch|show) )?(?:(?:to )?(?:next|another|different|other|new) (?:theme|palette|colou?rs))$/.test(t)) {
		if (c.info.themes.length < 2) throw new DesignError(`The ${c.info.id} layout has one theme.`);
		return [{ op: 'theme', value: c.info.themes[(c.info.themes.indexOf(c.doc.theme ?? '') + 1) % c.info.themes.length]! }];
	}

	/* Seed: another arrangement of what is random. */
	if ((m = /^(?:(?:use|set|try) )?seed (?:to )?(\d+)$/.exec(t))) return [{ op: 'seed', value: Number(m[1]) }];
	if (/^(?:(?:try|show|give|make|give me|show me) )?(?:me )?(?:(?:another|different|new|next) (?:version|arrangement|variation|variant|art|picture|graphic|image|pattern|seed|one|take)|shuffle(?: it| art)?|reroll(?: it)?|re-roll|mix it up|surprise me)$/.test(t)) return [{ op: 'seed', value: (c.doc.seed ?? 0) + 1 }];

	/* Reset. */
	if (/^(?:undo|go back|revert|back|undo that|undo last change|take it back)$/.test(t)) throw new DesignError('To take back the last change, run `design undo <file>`.');
	if (/^(?:reset|clear)(?: (?:everything|all|all edits|layout|it all|layers|all layers|positions))?$/.test(t)) return [{ op: 'reset' }];
	if ((m = new RegExp(`^reset ${list}(?: position| size| place)?$`).exec(t)) || (m = new RegExp(`^(?:put|move) ${list} back(?: where it was| to where it was| to normal| to default)?$`).exec(t))) return targets(m[1]!).map((layer) => ({ op: 'reset', layer }));

	/* Hide and show. */
	if ((m = new RegExp(`^(?:hide|remove|drop|delete|lose|no|without|take out|take away|take off|get rid of|turn off|cut) ${list}$`).exec(t)) || (m = new RegExp(`^(?:turn |take )?${list} (?:off|hidden|gone|away|out)$`).exec(t))) {
		const words = m[1]!;
		return words.split(/ (?:and|&) /).flatMap((w): Edit[] => {
			const known = v.layers.get(w) ?? v.layers.get(w.replace(/s$/, ''));
			const own = known && c.info.copy.some((x) => x.id === known) && c.doc.copy[known] === undefined;
			if (own && (!c.drawn || !drawnOf(known, c))) throw new DesignError(`There is no ${known} to take out.`);
			if (known && canOf(known).hide) {
				state.last = [known];
				return [{ op: 'layer', layer: known, set: { hidden: true } }];
			}
			const s = sameAs(w.replace(/s$/, ''), c.info.copy.map((x) => x.id), c.adapter.aliases?.copy);
			const p = sameAs(w.replace(/s$/, ''), c.info.images.map((x) => x.id));
			if (s && !c.info.copy.find((x) => x.id === s)!.required && c.doc.copy[s] !== undefined) return [{ op: 'copy', slot: s, value: null }];
			if (p && c.info.images.find((x) => x.id === p)!.values?.includes('none')) return [{ op: 'image', slot: p, value: 'none' }];
			if (s && !known) throw new DesignError(c.doc.copy[s] === undefined ? `There is no ${s} to take out.` : `The ${c.info.id} layout needs its ${s}.`);
			if (s && known && c.doc.copy[s] === undefined && !drawnOf(known, c)) throw new DesignError(`There is no ${s} to take out.`);
			return each(w, () => ({ hidden: true }));
		});
	}
	if ((m = new RegExp(`^(?:show|bring back|unhide|restore|turn on|add back|put back|with) ${list}$`).exec(t)) || (m = new RegExp(`^(?:turn |bring |put )?${list} (?:on|back|visible)$`).exec(t))) return each(m[1]!, () => ({ hidden: false }));

	/* Bigger and smaller. */
	const grow = (text: string, up: boolean, n?: string, unit?: string): Edit[] => {
		if (unit && unit.startsWith('px')) throw new DesignError('Sizes change by a share: say "20% bigger" or "bigger".');
		const step = n ? (unit === 'x' ? Number(n) : 1 + Number(n) / 100) : STEP[degree];
		return each(text, () => ({ scale: Math.round((up ? step : unit === '%' && n ? Math.max(0.05, 1 - Number(n) / 100) : 1 / step) * 1000) / 1000 }), true);
	};
	if ((m = new RegExp(`^(?:${VERB} )?(${BIG}|${LESS}) ${list}(?: size| text)?$`).exec(t))) return grow(m[2]!, new RegExp(`^${BIG}$`).test(m[1]!));
	if ((m = new RegExp(`^(?:${VERB} )?${list}(?: size| text)?${amount} (${BIG}|${LESS})$`).exec(t))) return grow(m[1]!, new RegExp(`^${BIG}$`).test(m[4]!), m[2], m[3]);
	if ((m = new RegExp(`^(?:${VERB} )?${list} (${BIG}|${LESS})${amount}$`).exec(t))) return grow(m[1]!, new RegExp(`^${BIG}$`).test(m[2]!), m[3], m[4]);
	if ((m = new RegExp(`^(?:increase|enlarge|grow|scale up|size up|blow up|bump up) ${list}(?: size| text)?${amount}$`).exec(t))) return grow(m[1]!, true, m[2], m[3]);
	if ((m = new RegExp(`^(?:decrease|reduce|shrink|scale down|size down|tone down) ${list}(?: size| text)?${amount}$`).exec(t))) return grow(m[1]!, false, m[2], m[3]);
	if ((m = new RegExp(`^(?:increase|decrease|reduce) size of ${list}${amount}$`).exec(t))) return grow(m[1]!, t.startsWith('increase'), m[2], m[3]);
	if ((m = new RegExp(`^(double|halve|half) ${list}(?: size)?$`).exec(t))) return each(m[2]!, () => ({ scale: m![1] === 'double' ? 2 : 0.5 }), true);
	if ((m = new RegExp(`^(?:(?:scale|set|make|size) )?${list}(?: size)? (?:to|at) (\\d+(?:\\.\\d+)?) ?%(?: size)?$`).exec(t))) return each(m[1]!, () => ({ scale: Number(m![2]) / 100 }));

	/* Alignment. */
	const side = (s: string) => (s.startsWith('cent') || s === 'middle' ? 'center' : s) as 'left' | 'center' | 'right';
	const aligned = (text: string, s: string): Edit[] => targets(text).map((layer): Edit => {
		const can = canOf(layer);
		const to = side(s);
		if (can.align) return { op: 'layer', layer, set: { align: to } };
		return { op: 'layer', layer, set: { anchor: anchorFor(layer, to, c) } };
	});
	if ((m = new RegExp(`^(left|right|center|centre|centered|centred)[ -]?(?:align(?:ed)?|justified|justify)? ${list}$`).exec(t)) && /align|justif|^cent/.test(t)) return aligned(m[2]!, m[1]!);
	if ((m = new RegExp(`^(?:align|justify) ${list} (?:to |on )?(left|right|center|centre|middle)$`).exec(t))) return aligned(m[1]!, m[2]!);
	if ((m = new RegExp(`^(?:${VERB} )?${list} (left|right|center|centre)[ -]?(?:aligned|align|justified)$`).exec(t))) return aligned(m[1]!, m[2]!);

	/* Nudges. */
	const DIR: Record<string, [number, number]> = { up: [0, -1], higher: [0, -1], down: [0, 1], lower: [0, 1], left: [-1, 0], right: [1, 0] };
	const nudge = (text: string, dir: string, n?: string, unit?: string): Edit[] => {
		const [ux, uy] = DIR[dir]!;
		const by = n ? (unit === '%' ? Number(n) / 100 : unit === 'x' ? Number.NaN : Number(n) / (ux ? c.doc.size.width : c.doc.size.height)) : NUDGE[degree];
		if (!Number.isFinite(by)) throw new DesignError('Say how far as a share or in pixels: "up 3%" or "up 20px".');
		const d = Math.round(by * 1000) / 1000;
		return each(text, () => (ux ? { dx: ux * d } : { dy: uy * d }), true);
	};
	if ((m = new RegExp(`^(?:move|nudge|shift|push|pull|bring|slide|drag|bump|raise|lower) ${list} (?:further |more |over )?(?:to )?(up|down|higher|lower|left|right)(?: more)?${amount}$`).exec(t)) && (m[3] || !/^(?:left|right)$/.test(m[2]!) || /^(?:nudge|shift|push|slide|bump)\b|further|more|over/.test(t) || degree !== 'normal' || !canOf(targets(m[1]!)[0]!).anchors?.length)) return nudge(m[1]!, m[2]!, m[3], m[4]);
	if ((m = new RegExp(`^(?:${VERB} )?${list} (?:further |more )?(up|down|higher|lower)(?: more)?${amount}$`).exec(t))) return nudge(m[1]!, m[2]!, m[3], m[4]);
	if ((m = new RegExp(`^${list} (?:further|more) (?:to )?(left|right)${amount}$`).exec(t))) return nudge(m[1]!, m[2]!, m[3], m[4]);
	if ((m = new RegExp(`^raise ${list}${amount}$`).exec(t))) return nudge(m[1]!, 'up', m[2], m[3]);
	if ((m = new RegExp(`^lower ${list}${amount}$`).exec(t))) return nudge(m[1]!, 'down', m[2], m[3]);

	/* Places. */
	if ((m = new RegExp(`^(?:(?:${VERB}|bring|pin|anchor|stick) )?${list} (?:to |in |on |at |into |over to |go )*${PLACE}(?: (?:corner|side|edge|of (?:it|page|picture|image|canvas|banner)))*$`).exec(t)) || (m = new RegExp(`^${PLACE} ${list}$`).exec(t))) {
		const first = new RegExp(`^${N}`).test(m[1]!) && !PLACES.some(([re]) => re.test(m![1]!));
		const [text, where] = first ? [m[1]!, m[2]!] : [m[2]!, m[1]!];
		const place = PLACES.find(([re]) => re.test(where))?.[1];
		if (place) return targets(text).map((layer): Edit => {
			const can = canOf(layer);
			const sideways = place === 'left' || place === 'right' || place === 'center';
			if (!can.anchors?.length && can.align && sideways) return { op: 'layer', layer, set: { align: place as 'left' } };
			if (!can.anchors?.length) throw new DesignError(`The ${layer} cannot be put somewhere else in the ${c.info.id} layout. ${canSay(layer, can)}`);
			return { op: 'layer', layer, set: { anchor: anchorFor(layer, place, c) } };
		});
	}
	if ((m = new RegExp(`^(?:center|centre) ${list}$`).exec(t))) return aligned(m[1]!, 'center');

	/* Size. */
	if ((m = /^(?:(?:make|size|set|change|switch|render|use|resize|turn|try|do|want|get) )?(?:it )?(?:in )?(?:to |into |for |as |at |size )*(.+?)(?: (?:size|format|shape|version|dimensions|crop))?$/.exec(t))) {
		const w = m[1]!.replace(/ /g, '-');
		const id = c.info.sizes.find((s) => s.toLowerCase() === w) ?? Object.entries(c.adapter.aliases?.sizes ?? {}).find(([k]) => k.toLowerCase() === w)?.[1] ?? sizeAlias(m[1]!);
		if (id) {
			if (!c.info.sizes.includes(id)) throw new DesignError(`The ${c.info.id} layout does not come in ${id}. It comes in ${c.info.sizes.join(', ')}.`);
			return [{ op: 'size', value: id }];
		}
		const px = /^(\d{3,4}) ?(?:x|by) ?(\d{3,4})$/.exec(m[1]!);
		if (px) return [{ op: 'size', value: 'custom', width: Number(px[1]), height: Number(px[2]) }];
	}

	/* Template. */
	if ((m = new RegExp(`^(?:${VERB} )?(?:to |it )*(?:(?:template|layout|design) )?([a-z0-9][\\w -]*?)(?: (?:template|layout|design|composition))?$`).exec(t)) && /template|layout|design|composition/.test(t)) {
		const name = m[1]!;
		const all = c.adapter.templates().filter((x) => x.kind === c.doc.kind);
		const hit = all.find((x) => x.id.toLowerCase() === name.replace(/ /g, '-') || x.layouts?.some((l) => l.toLowerCase() === name));
		if (hit) return [{ op: 'template', value: hit.id }];
		if (/template|layout/.test(t)) {
			try {
				return [{ op: 'template', value: templateOf(c.adapter, name).id }];
			} catch {
				throw new DesignError(`There is no "${name}" layout. The layouts are ${all.map((x) => x.id).join(', ')}.`);
			}
		}
	}

	/* Options. */
	for (const o of c.info.options) {
		const name = esc(o.id.toLowerCase()).replace(/[-_]/g, '[ -]?');
		if ((m = new RegExp(`^(?:${VERB} )?${name} (?:to |at |is )*([\\w.%-]+)$`).exec(t)) || (o.values && (m = new RegExp(`^(?:${VERB} )?(?:with )?(${o.values.map((x) => esc(x.toLowerCase())).join('|')}) ${name}$`).exec(t)))) return [{ op: 'option', id: o.id, value: m![1]!.replace(/%$/, '') }];
		if (o.range && (m = new RegExp(`^(?:${VERB} )?(more|less|fewer|higher|lower|bigger|smaller) ${name}$`).exec(t))) {
			const now = Number(c.doc.options[o.id] ?? c.adapter.defaults(c.info.id, c.doc.size.id).options[o.id] ?? (o.range[0] + o.range[1]) / 2);
			const span = (o.range[1] - o.range[0]) * { small: 0.05, normal: 0.12, large: 0.25 }[degree];
			const up = /more|higher|bigger/.test(m[1]!);
			const next = Math.min(o.range[1], Math.max(o.range[0], now + (up ? span : -span)));
			if (next === now) throw new DesignError(`${o.id} is already as ${up ? 'high' : 'low'} as it goes (${o.range[0]} to ${o.range[1]}).`);
			return [{ op: 'option', id: o.id, value: Math.round(next * 100) / 100 }];
		}
	}
	return undefined;
}

/** The allowed anchor for "left", "top" and so on, keeping the other side where it is. */
function anchorFor(layer: string, place: Anchor, c: PhraseContext): Anchor {
	const anchors = c.info.layers.find((l) => l.id === layer)!.can.anchors ?? [];
	if (anchors.includes(place)) return place;
	const now = c.doc.layers[layer]?.anchor ?? drawnAt(layer, c);
	const [vert, horiz] = split(now);
	const want = place === 'left' || place === 'right' ? join(vert, place) : place === 'top' || place === 'bottom' ? join(place, horiz) : place === 'center' ? join(vert, '') : place;
	if (anchors.includes(want)) return want;
	// Nothing says where it is now: the first place on that side.
	const near = now === undefined ? anchors.find((a) => a.split('-').includes(place)) : undefined;
	if (near) return near;
	throw new DesignError(anchors.length ? `The ${layer} goes ${anchors.join(', ')} in the ${c.info.id} layout, not ${place}.` : `The ${layer} cannot be put somewhere else in the ${c.info.id} layout.`);
}

const split = (a?: Anchor): [string, string] => [/top/.test(a ?? '') ? 'top' : /bottom/.test(a ?? '') ? 'bottom' : '', /left/.test(a ?? '') ? 'left' : /right/.test(a ?? '') ? 'right' : ''];
const join = (v: string, h: string): Anchor => ((v && h ? `${v}-${h}` : v || h || 'center') as Anchor);

/** Whether a layer is on the canvas now (unknown counts as yes). */
const drawnOf = (layer: string, c: PhraseContext) => !c.drawn || c.drawn.some((l) => l.id === layer);

function drawnAt(layer: string, c: PhraseContext): Anchor | undefined {
	const b = c.drawn?.find((l) => l.id === layer)?.box;
	if (!b) return undefined;
	const x = (b.x + b.w / 2) / c.doc.size.width;
	const y = (b.y + b.h / 2) / c.doc.size.height;
	return join(y < 0.4 ? 'top' : y > 0.6 ? 'bottom' : '', x < 0.4 ? 'left' : x > 0.6 ? 'right' : '');
}

function shadeOf(word: string, c: PhraseContext): string {
	const grounds = c.info.grounds ?? {};
	const all = c.info.themes.filter((t) => grounds[t]).map((t) => ({ t, l: luminance(grounds[t]!) })).sort((a, b) => a.l - b.l);
	if (!all.length) throw new DesignError(`Name the theme: ${c.info.themes.join(', ') || 'this layout has one'}.`);
	const now = all.find((x) => x.t === c.doc.theme)?.l ?? all.at(-1)!.l;
	const darker = all.filter((x) => x.l < now - 1e-6);
	const lighter = all.filter((x) => x.l > now + 1e-6);
	const dark = /^dark/.test(word);
	if (word === 'darkest' || word === 'lightest') return (dark ? all[0] : all.at(-1))!.t;
	if (word === 'dark' || word === 'light') {
		const fit = all.filter((x) => (dark ? x.l < 0.18 : x.l > 0.5));
		if (!fit.length) throw new DesignError(`No theme here is ${word}. The themes are ${c.info.themes.join(', ')}.`);
		if (fit.some((x) => x.t === c.doc.theme)) throw new DesignError(`${String(c.doc.theme)} is already ${word}. The themes are ${c.info.themes.join(', ')}.`);
		return (dark ? fit.at(-1) : fit[0])!.t;
	}
	// A step that shows: grounds a hair apart are passed over when there is one further on.
	const apart = (x: { l: number }) => (Math.max(x.l, now) + 0.05) / (Math.min(x.l, now) + 0.05) >= 1.25;
	const next = dark ? (darker.filter(apart).at(-1) ?? darker.at(-1)) : (lighter.filter(apart)[0] ?? lighter[0]);
	if (!next) throw new DesignError(`${String(c.doc.theme)} is already the ${dark ? 'darkest' : 'lightest'} theme. The themes are ${c.info.themes.join(', ')}.`);
	return next.t;
}

/** Phrases this design understands, for errors, help and the manifest. */
export function examples(c: Pick<PhraseContext, 'adapter' | 'info'> & { doc?: DesignDoc }): string[] {
	const out: string[] = [];
	for (const l of c.info.layers) {
		const n = l.id.replace(/[-_]/g, ' ');
		if (l.can.scale) out.push(`bigger ${n}`, `${n} a bit smaller`);
		for (const a of l.can.anchors ?? []) out.push(`${n} ${a.replace('-', ' ')}`);
		if (l.can.move) out.push(`move the ${n} up`, `nudge the ${n} left 2%`);
		if (l.can.align) out.push(`center the ${n}`, `left align the ${n}`);
		if (l.can.hide) out.push(`hide the ${n}`, `show the ${n}`);
		if (l.can.scale || l.can.move || l.can.anchors) out.push(`reset the ${n}`);
	}
	for (const s of c.info.copy) {
		out.push(`${s.id} "..."`);
		if (!s.required) out.push(`remove the ${s.id}`);
	}
	if (c.info.copy.length) out.push('replace "old words" with "new words"');
	for (const i of c.info.images) out.push(`${i.id} "photo.png"`);
	if (c.info.grounds && Object.keys(c.info.grounds).length > 1) out.push('darker theme', 'lighter theme');
	for (const t of c.info.themes) out.push(`${t} theme`);
	for (const s of c.info.sizes) if (s !== 'custom') out.push(`as ${PLATFORMS.find((p) => p.id === s)?.label ?? s}`);
	for (const t of c.adapter.templates().filter((x) => x.kind === c.info.kind && x.id !== c.info.id)) out.push(`${t.id} layout`);
	if (c.info.options.length || c.doc?.seed !== undefined) for (const o of c.info.options) out.push(o.range ? `more ${o.id}` : `${o.id} ${o.values?.[0] ?? ''}`.trim());
	if (c.doc?.seed !== undefined) out.push('another version');
	return out;
}

/** A few examples of different kinds. */
export function variety(all: string[], n: number): string[] {
	if (all.length <= n) return all;
	return Array.from({ length: n }, (_, i) => all[Math.floor((i * all.length) / n)]!);
}

/** The examples nearest a phrase: those sharing its words first, then by spelling. */
function close(phrase: string, all: string[]): string[] {
	const words: string[] = phrase.toLowerCase().match(/[a-z0-9]+/g) ?? [];
	const scored = all.map((e, i) => ({ e, i, n: (e.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((w) => words.includes(w)).length })).filter((x) => x.n).sort((a, b) => b.n - a.n || a.i - b.i);
	return [...scored.map((x) => x.e), ...nearest(phrase, all)].slice(0, 3);
}
