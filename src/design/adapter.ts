import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { highlightNames, imageDoc, themeNames, themes } from '../assets/brand-art.js';
import { brandFonts, tokenColor } from '../assets/canvas.js';
import { deckDoc, LISTS, renderSlide, slideTypes, type Slide, type SlideType } from '../assets/deck.js';
import { designOf, imageSizes, measureDesign, picturesFor, readPicture, renderDesign, type ImageRequest, type Rendered } from '../assets/image.js';
import { illustrateDoc, renderIllustration, subjects } from '../assets/illustrate.js';
import { findItem, merchDoc, merchItems, PX_PER_IN, renderItem } from '../assets/merch.js';
import { over } from '../assets/place.js';
import { isCircle, layerCans, TEMPLATES, type Design, type Template } from '../assets/share.js';
import { encode, hasFfmpeg, stillFrame, videoDoc, videoFrames, videoTemplates, type VideoOptions } from '../assets/video.js';
import { brand, tokens } from '../lib/brand.js';
import { checkDesign, checkText, errorsOf, sheetCanvas, type Adapter, type DesignDoc, type DrawnLayer, type Finding, type Painter, type TemplateInfo } from './index.js';

// This brand's side of the design core: what can be made (images, slides, print files, illustrations and video), what
// each takes, and how a document becomes the engine's own request. Drawing is the engine's; nothing is drawn here.

const bool = ['true', 'false'];
const grounds = () => Object.fromEntries(Object.entries(themes()).map(([id, t]) => [id, t.bg]));
const isImage = (id: string): id is Template => (TEMPLATES as string[]).includes(id);
const WINDOWED: Template[] = ['app', 'feature'];
/** Templates a seed changes something in. */
const SEEDED: Template[] = ['tile', 'app', 'outline', 'hatch', 'reef', 'partner', 'funding', 'announce'];

const COPY = {
	headline: { id: 'headline', description: '*stars* set a phrase in the highlight; a line break starts a new line' },
	body: { id: 'body', description: 'the line under the headline' },
	badge: { id: 'badge', description: 'the badge\'s words' },
	credit: { id: 'credit', description: 'a small credit under the words, such as @handle' },
	partner: { id: 'partner', description: 'a partner\'s name beside the lockup (a name, never another logo)' },
};
const WORD_OPTIONS: TemplateInfo['options'] = [
	{ id: 'highlight', values: highlightNames(), description: 'the color of the highlighted phrase (ink is none)' },
	{ id: 'badge-style', values: ['pill', 'solid', 'dot'], description: 'how the badge is drawn' },
	{ id: 'emphasis', values: bool, description: 'highlight a phrase when the headline has no stars' },
];
/* What may give way when a layer changes: the words re-flow round a moved lockup or octopus, and a bigger headline
   pushes the words under it and the octopus. */
const REFLOWS: Record<string, string[]> = { headline: ['badge', 'body', 'credit', 'art', 'window', 'logo', 'partner'], badge: ['headline', 'body', 'credit'], body: ['credit'], logo: ['headline', 'badge', 'body', 'credit', 'partner', 'window', 'art'], art: ['headline', 'badge', 'body', 'credit'], window: ['art'] };
const CONSOLE: TemplateInfo['options'][number] = { id: 'console', values: ['inbox', 'blank'], description: 'the console in the window: with Acme placeholder mail, or without messages' };

function imageInfo(t: Template): TemplateInfo {
	const windowed = WINDOWED.includes(t);
	return {
		id: t,
		kind: 'image',
		description: imageDoc().templates[t]!.description,
		sizes: t === 'mark' ? [...imageSizes().map((s) => s.id), 'custom'] : [...imageSizes().map((s) => s.id).filter((s) => !isCircle(s)), 'custom'],
		themes: themeNames(),
		copy: t === 'mark' ? [COPY.partner] : Object.values(COPY),
		images: windowed ? [{ id: 'picture' }] : [],
		options: t === 'mark' ? [] : [...WORD_OPTIONS, ...(windowed ? [CONSOLE] : [])],
		layers: layerCans(t),
		reflows: REFLOWS,
		grounds: grounds(),
		formats: ['png', 'svg', 'jpg', 'webp'],
		layouts: t === 'mark' ? ['lockup', 'logo'] : t === 'feature' ? ['browser'] : t === 'app' ? ['product', 'console'] : t === 'funding' ? ['number', 'big number'] : t === 'announce' ? ['announcement'] : [],
	};
}

const slideId = (t: SlideType) => `slide-${t}`;
const slideOf = (id: string) => id.replace(/^slide-/, '') as SlideType;
function slideInfo(t: SlideType): TemplateInfo {
	const def = deckDoc().slides[t];
	const need: Partial<Record<SlideType, string>> = { cover: 'title', section: 'title', statement: 'title', bullets: 'items', agenda: 'items', timeline: 'items', stat: 'stat', quote: 'quote', qa: 'title' };
	return {
		id: slideId(t),
		kind: 'slide',
		description: def.description,
		sizes: ['slide'],
		themes: themeNames(),
		copy: Object.keys(def.slots).filter((id) => !(t === 'image' && id === 'url')).map((id) => ({ id, ...(need[t] === id ? { required: true } : {}) })),
		images: t === 'image' ? [{ id: 'picture' }] : [],
		options: LISTS.includes(t) ? [] : [WORD_OPTIONS[0]!],
		reflows: REFLOWS,
		layers: LISTS.includes(t) ? [{ id: 'headline', can: {} }, ...[1, 2, 3, 4, 5, 6].map((n) => ({ id: `point-${n}`, can: {} })), { id: 'logo', can: {} }, { id: 'hatch', can: {} }] : layerCans(def.template as Template, slideId(t)),
		grounds: grounds(),
		formats: ['png', 'svg', 'jpg', 'webp'],
		layouts: [t === 'image' ? 'capture slide' : `${t} slide`, ...(['cover', 'section', 'statement', 'bullets', 'agenda', 'timeline', 'stat', 'quote', 'qa', 'end'].includes(t) ? [t] : [])],
	};
}

const merchId = (id: string) => `merch-${id}`;
function merchInfo(id: string): TemplateInfo {
	const item = findItem(id);
	const ground = Object.fromEntries(item.variants.flatMap((v) => (merchDoc().variants[v]!.ground ? [[v, tokenColor(merchDoc().variants[v]!.ground)]] : [])));
	return {
		id: merchId(id),
		kind: 'merch',
		description: `${item.name}, ${item.size[0]} by ${item.size[1]} in print file (bleed ${item.bleed}, safe ${item.safe}).`,
		sizes: ['print'],
		themes: item.variants,
		copy: [...new Set(item.layers.flatMap((l) => (l.type === 'text' ? [l.slot] : [])))].map((s) => ({ id: s })),
		images: [],
		options: [{ id: 'dpi', range: [72, 600], description: 'PNG and PDF resolution' }, { id: 'guides', values: bool, description: 'trim and safe lines, for proofing only' }],
		layers: [],
		grounds: ground,
		formats: ['png', 'svg', 'pdf'],
		layouts: [id],
	};
}

const illId = (id: string) => `illustration-${id}`;
function illustrationInfo(id: string): TemplateInfo {
	const s = illustrateDoc().subjects[id]!;
	return {
		id: illId(id),
		kind: 'illustration',
		description: s.description,
		sizes: [...imageSizes().map((x) => x.id).filter((x) => id === 'octopus' || !isCircle(x)), 'custom'],
		themes: themeNames(),
		copy: [],
		images: s.picture ? [{ id: 'picture' }] : [],
		options: [...(id === 'octopus' ? [{ id: 'pose', values: Object.keys(illustrateDoc().poses), description: 'sitting or hanging' }] : []), ...(s.picture ? [CONSOLE] : [])],
		layers: [],
		grounds: grounds(),
		formats: ['png', 'svg', 'jpg', 'webp'],
		layouts: id === 'octopus' ? ['octopus'] : [],
	};
}

const videoId = (id: string) => `video-${id}`;
function videoInfo(id: string): TemplateInfo {
	const def = videoDoc().templates[id]!;
	return {
		id: videoId(id),
		kind: 'video',
		description: def.description,
		sizes: Object.keys(videoDoc().sizes),
		themes: themeNames(),
		copy: def.layout === 'mark' ? [COPY.partner] : Object.values(COPY),
		images: def.layout === 'app' ? [{ id: 'picture' }] : [],
		options: [...(def.layout === 'mark' ? [] : WORD_OPTIONS), { id: 'seconds', range: [2, 20], description: 'length' }, { id: 'fps', range: [12, 60], description: 'frames a second' }, { id: 'reduced-motion', values: bool, description: 'fades only, no movement' }, ...(id === 'reveal' ? [{ id: 'layout', values: TEMPLATES.filter((t) => t !== 'mark'), description: 'the share template it brings in' }] : [])],
		layers: [],
		grounds: grounds(),
		formats: ['png', 'mp4'],
		layouts: [id === 'announce' || id === 'card' ? `${id} video` : id],
	};
}

let infos: TemplateInfo[] | undefined;
const all = () => (infos ??= [...TEMPLATES.map(imageInfo), ...slideTypes().map(slideInfo), ...merchItems().map((i) => merchInfo(i.id)), ...subjects().map(illustrationInfo), ...videoTemplates().map(videoInfo)]);

/* ------------------------------------------------------------- requests */

const flag = (v: unknown) => (v === undefined ? undefined : v === true || v === 'true');
const text = (v: unknown) => (v === undefined ? undefined : String(v));

/** The engine's request an image document stands for: the same one the image command makes. */
export function requestOf(doc: DesignDoc): ImageRequest {
	return {
		template: doc.template,
		size: doc.size.id,
		...(doc.size.id === 'custom' ? { width: doc.size.width, height: doc.size.height } : {}),
		theme: doc.theme,
		headline: doc.copy.headline,
		body: doc.copy.body,
		credit: doc.copy.credit,
		badgeText: doc.copy.badge,
		partner: doc.copy.partner,
		badgeStyle: text(doc.options['badge-style']),
		highlight: text(doc.options.highlight),
		console: text(doc.options.console),
		emphasise: flag(doc.options.emphasis) ?? true,
		picture: doc.images.picture !== undefined,
		seed: doc.seed ? doc.seed : undefined,
		edits: doc.layers,
	};
}

const slideRequest = (doc: DesignDoc): Slide => ({ type: slideOf(doc.template), ...doc.copy, theme: doc.theme, ...(doc.seed ? { seed: doc.seed } : {}), ...(doc.options.highlight ? { highlight: String(doc.options.highlight) } : {}), ...(Object.keys(doc.layers).length ? { edits: doc.layers } : {}) });

function videoRequest(doc: DesignDoc): VideoOptions {
	const id = doc.template.replace(/^video-/, '');
	const def = videoDoc().templates[id]!;
	const r = requestOf(doc);
	return {
		...r,
		template: id,
		size: doc.size.id,
		width: doc.size.width,
		height: doc.size.height,
		seconds: Number(doc.options.seconds ?? def.seconds),
		fps: Math.round(Number(doc.options.fps ?? videoDoc().fps)),
		reduced: flag(doc.options['reduced-motion']),
		layout: text(doc.options.layout),
		edits: undefined,
	};
}

const picture = async (doc: DesignDoc, dir: string) => (doc.images.picture ? await readPicture(dir, doc.images.picture) : null);
const take = (r: Record<string, unknown>, formats: string[]) => Object.fromEntries(formats.flatMap((f) => (r[f] === undefined ? [] : [[f, typeof r[f] === 'string' ? Buffer.from(r[f] as string) : (r[f] as Uint8Array)]])));

async function render(doc: DesignDoc, dir: string, out: { formats: string[]; scale: number }): Promise<{ files: Record<string, Uint8Array>; layers: DrawnLayer[] }> {
	const want = (f: string) => out.formats.includes(f);
	const wants = { png: want('png'), svg: want('svg'), jpg: want('jpg'), webp: want('webp'), scale: out.scale };
	const none = !out.formats.length;
	switch (doc.kind) {
		case 'image': {
			const d = designOf(requestOf(doc));
			const pics = await picturesFor(await picture(doc, dir));
			if (none) return { files: {}, layers: (await measureDesign(d, pics)).layers };
			const r = await renderDesign(d, pics, wants);
			return { files: take(r as unknown as Record<string, unknown>, out.formats), layers: r.layers };
		}
		case 'slide': {
			const r = await renderSlide({ ...slideRequest(doc), picture: await picture(doc, dir) }, wants);
			return { files: take(r as unknown as Record<string, unknown>, out.formats), layers: r.layers };
		}
		case 'merch': {
			const r = await renderItem(findItem(doc.template.replace(/^merch-/, '')), { variant: doc.theme, slots: doc.copy, guides: flag(doc.options.guides), dpi: Math.min(600, Math.round(Number(doc.options.dpi ?? PX_PER_IN) * out.scale)), png: want('png') || none, svg: want('svg'), pdf: want('pdf') });
			return { files: take(r as unknown as Record<string, unknown>, out.formats), layers: r.layers };
		}
		case 'illustration': {
			const id = doc.template.replace(/^illustration-/, '');
			const r = await renderIllustration({ subject: id, theme: doc.theme, size: doc.size.id, ...(doc.size.id === 'custom' ? { width: doc.size.width, height: doc.size.height } : {}), pose: text(doc.options.pose), console: text(doc.options.console), picture: await picture(doc, dir), seed: doc.seed ? doc.seed : undefined }, { ...wants, png: want('png') });
			return { files: take(r as unknown as Record<string, unknown>, out.formats), layers: r.layers };
		}
		case 'video': {
			const o = videoRequest(doc);
			const pics = await picturesFor(await picture(doc, dir));
			const files: Record<string, Uint8Array> = {};
			const { videoDesign } = await import('../assets/video.js');
			const layers = (await measureDesign(videoDesign(o).design, pics)).layers;
			if (want('png')) files.png = await stillFrame(o, pics, o.seconds);
			if (want('mp4')) {
				if (!hasFfmpeg()) throw new Error('MP4 needs ffmpeg on the PATH. Without it, use --format png for the last frame.');
				const tmp = mkdtempSync(join(tmpdir(), 'ds-design-'));
				try {
					const file = join(tmp, 'out.mp4');
					const frames = async function* () {
						for await (const f of videoFrames(o, pics)) yield f.rgba;
					};
					await encode(frames(), { width: o.width, height: o.height, fps: o.fps, outputs: [{ path: file, format: 'mp4' }] });
					files.mp4 = readFileSync(file);
				} finally {
					rmSync(tmp, { recursive: true, force: true });
				}
			}
			return { files, layers };
		}
	}
}

/** Every color words may be drawn in or on: the brand's tokens, and the two tints the pill is filled with on each theme. */
function wordColors(): string[] {
	const out = new Set<string>();
	for (const v of Object.values(tokens().site)) if (/^#[0-9a-f]{6}$/i.test(v)) out.add(v.toUpperCase());
	for (const t of Object.values(themes())) out.add(over(t.pill, t.bg));
	return [...out];
}

function defaults(template: string, size: string): Pick<DesignDoc, 'size' | 'theme' | 'seed' | 'options'> {
	const info = all().find((t) => t.id === template)!;
	const known = imageSizes().find((s) => s.id === size);
	const px = known ? { id: size, width: known.width, height: known.height } : { id: size, width: 1200, height: 800 };
	if (info.kind === 'image') {
		const t = template as Template;
		return { size: px, theme: designOf({ template: t, size: isCircle(size) ? size : 'og' }).theme, seed: SEEDED.includes(t) ? 0 : undefined, options: {} };
	}
	if (info.kind === 'slide') {
		const def = deckDoc().slides[slideOf(template)];
		return { size: { id: 'slide', width: deckDoc().width, height: deckDoc().height }, theme: def.theme, seed: SEEDED.includes(def.template as Template) ? 0 : undefined, options: {} };
	}
	if (info.kind === 'merch') {
		const item = findItem(template.replace(/^merch-/, ''));
		return { size: { id: 'print', width: Math.round((item.size[0] + 2 * item.bleed) * PX_PER_IN), height: Math.round((item.size[1] + 2 * item.bleed) * PX_PER_IN) }, theme: item.variants[0], seed: undefined, options: {} };
	}
	if (info.kind === 'illustration') {
		const s = illustrateDoc().subjects[template.replace(/^illustration-/, '')]!;
		return { size: px, theme: s.theme, seed: s.layout && SEEDED.includes(s.layout as Template) ? 0 : undefined, options: {} };
	}
	const def = videoDoc().templates[template.replace(/^video-/, '')]!;
	const [width, height] = videoDoc().sizes[size] ?? videoDoc().sizes.square!;
	return { size: { id: size, width, height }, theme: def.theme, seed: SEEDED.includes(def.layout as Template) ? 0 : undefined, options: {} };
}

export function adapter(): Adapter {
	return {
		brand: brand().bin,
		templates: all,
		defaults,
		render,
		sample(template) {
			const info = all().find((t) => t.id === template)!;
			const has = (o: Record<string, string>) => Object.fromEntries(Object.entries(o).filter(([k, v]) => v && info.copy.some((c) => c.id === k)));
			if (info.kind === 'slide') return has(deckDoc().slides[slideOf(template)].slots);
			if (info.kind === 'merch') return has(merchDoc().sample);
			const doc = imageDoc();
			const s = doc.occasions[doc.templateOccasion[template] ?? 'launch']!.sample;
			return has({ headline: s.headline ?? '', body: s.body ?? '', badge: s.badgeText ?? '', ...(template === 'partner' ? { partner: s.partnerName ?? 'Acme' } : {}) });
		},
		colors: wordColors,
		/* A highlight's stars are marks, not words. */
		words: (text) => text.replace(/\\\*/g, '\u0000').replace(/\*/g, '').replace(/\u0000/g, '*'),
		aliases: {
			sizes: { ...Object.fromEntries(imageSizes().flatMap((s) => s.aliases.map((a) => [a, s.id]))), vertical: 'portrait' },
			templates: Object.fromEntries(Object.entries(imageDoc().occasions).map(([id, o]) => [id, o.looks[0]!.template])),
			copy: { 'badge-text': 'badge', kicker: 'badge', handle: 'credit' },
			layers: { octopus: 'art', mascot: 'art', console: 'window', lockup: 'logo', border: 'frame' },
		},
	};
}

/** Contact sheets, on the same canvas with the brand's face. */
export const paint: Painter = (spec) => {
	const sans = brandFonts().sans;
	return sheetCanvas(spec, { createCanvas, loadImage } as never, sans.replace(/"/g, ''));
};

/* ----------------------------------------------- the plain commands */

/** What the check says about a picture the image command drew, with the document it stands for. */
export function findingsFor(d: Design, r: Pick<Rendered, 'layers' | 'png'>): Finding[] {
	const info = all().find((t) => t.id === d.template)!;
	const doc = { version: 1, brand: brand().bin, kind: 'image', template: d.template, size: { id: d.size, width: d.w, height: d.h }, theme: d.theme, copy: { ...d.asked }, images: {}, options: {}, layers: d.edits, history: [], future: [] } as DesignDoc;
	return checkDesign({ doc, info, layers: r.layers, adapter: adapter(), png: r.png });
}

/** Throws when a drawn picture breaks a rule, naming each. */
export function mustPass(d: Design, r: Pick<Rendered, 'layers' | 'png'>) {
	const errors = errorsOf(findingsFor(d, r));
	if (errors.length) throw new Error(`The ${d.template} picture breaks a rule, so nothing was written.\n${checkText(errors)}`);
}
