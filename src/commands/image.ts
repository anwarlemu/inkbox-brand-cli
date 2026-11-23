import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import type { Command } from 'commander';
import { carouselDesigns, designOf, imageCatalog, imageSizes, occasionNames, picturesFor, readPicture, renderDesign, sizeId, type ImageRequest } from '../assets/image.js';
import { display, num, pick, unknown, write, type OutFile } from '../assets/io.js';
import { isCircle, TEMPLATES, type Design, type Pictures } from '../assets/share.js';
import { imageDoc } from '../assets/brand-art.js';
import { cli } from '../lib/brand.js';
import { readContent } from '../lib/content.js';
import { helpRow } from '../lib/help-row.js';
import { mustPass } from '../design/adapter.js';
import { platformOf } from '../design/platforms.js';
import { emit } from '../lib/output.js';

// `image` (with `og` and `social` as shortcuts): the share-image editor's templates, occasions, themes and sizes as PNG,
// SVG, JPEG and WebP, copy from flags or a --content file, the caller's picture in the window, seeded layouts and
// numbered carousels.

type Opts = Record<string, string | boolean | undefined> & { json?: boolean };

const CONTENT_KEYS = ['template', 'occasion', 'theme', 'size', 'width', 'height', 'headline', 'body', 'credit', 'badge', 'badgeText', 'badgeStyle', 'highlight', 'partner', 'image', 'imageUrl', 'console', 'sample', 'seed', 'emphasis', 'format', 'scale', 'out'];
export const IMAGE_FORMATS = ['png', 'svg', 'jpg', 'webp'] as const;
export type ImageFormat = (typeof IMAGE_FORMATS)[number];

function options(c: Command, sizeHelp: string) {
	return c
		.option('-t, --template <name>', `${TEMPLATES.join(', ')}; or an occasion`)
		.option('--occasion <name>', `${occasionNames().join(', ')}: its looks, and its words with the sample flag`)
		.option('--theme <name>', 'paper, mist, mono, lavender, purple or deep (default: the occasion\'s look, else paper)')
		.option('-s, --size <size>', sizeHelp)
		.option('--width <px>', 'custom size width, 160 to 4000')
		.option('--height <px>', 'custom size height, 160 to 4000')
		.option('--headline <text>', 'the headline; *stars* highlight a phrase, \\n breaks a line')
		.option('--body <text>', 'the line under the headline')
		.option('--credit <text>', 'a small credit under the words, such as @handle for a post')
		.option('--badge <text>', 'the badge\'s words (pill, solid, dot or none alone is its style)')
		.option('--badge-style <style>', 'pill, solid, dot or none')
		.option('--badge-text <text>', 'the same as --badge')
		.option('--highlight <name>', 'pink, lilac, violet or ink (no highlight)')
		.option('--partner <name>', 'a partner\'s name beside the lockup (a name, never another logo)')
		.option('-i, --image <file>', 'a picture for the window (app and feature): a product capture as PNG, JPEG, WebP or SVG')
		.option('--image-url <text>', 'the address shown over the picture in the window')
		.option('--console <what>', 'app and feature without --image: inbox (Acme placeholder mail, the default) or blank')
		.option('--sample', 'fill the words you did not pass with sample copy (nothing is drawn that you did not pass otherwise)')
		.option('--seed <n>', 'a variation of the layout, 1 to 1000000000; with no template named it picks the template too')
		.option('--no-emphasis', 'do not pick a phrase to highlight when the headline has no stars')
		.option('--carousel <file>', 'a JSON file with "slides" (each with its own headline, body, badge or image): one look, one headline size, numbered')
		.option('--no-numbers', 'leave a carousel\'s numbers out')
		.option('--content <file>', 'a JSON file with the same fields (headline, body, theme, ...); flags win')
		.option('-f, --format <formats>', 'png, svg, jpg, webp, a comma list, both (png and svg, the default) or all; or what an --out file ends in')
		.option('--scale <n>', 'pixel multiple for PNG, JPEG and WebP, 1 to 4', '1')
		.option('-o, --out <path>', 'a directory (default images/), or one file')
		.option('--all', 'every template (or the occasion\'s four looks) at the size')
		.option('--list', 'templates, occasions, sizes, themes and badges')
		.option('--json', 'JSON output');
}

export function imageCommand(program: Command) {
	const sizes = `${imageSizes().map((s) => s.id).join(', ')}, custom; a comma list; a group (share, post, banner, profile); or all`;
	options(program.command('image [template]').description(`Share images, social posts, banners, thumbnails and profile pictures (${TEMPLATES.join(', ')}) as PNG, SVG, JPEG and WebP`), sizes)
		.action(async (t: string | undefined, _o, cmd: Command) => runImage(t, cmd.optsWithGlobals() as Opts, 'og'))
		.addHelpText('after', () => help());
	options(program.command('og [template]').description('A 1200 by 630 link preview: image at --size og'), 'og (default); any image size').action(async (t: string | undefined, _o, cmd: Command) => runImage(t, cmd.optsWithGlobals() as Opts, 'og'));
	options(program.command('social [template]').description('A social post: image at --size square (portrait, story, landscape and the banners too)'), 'square (default), portrait, story, landscape, li-square, x-banner, linkedin-banner; any image size').action(async (t: string | undefined, _o, cmd: Command) => runImage(t, cmd.optsWithGlobals() as Opts, 'square'));
}

function help(): string {
	const b = cli();
	const w = 64;
	return [
		'',
		'Examples:',
		helpRow(`${b} image tile --headline "Give every *AI agent* a way to be reached"`, '', w),
		helpRow(`${b} image launch --headline "Agent Cards are here" --size square`, 'an occasion picks its first look', w),
		helpRow(`${b} image feature --headline "..." --image capture.png --image-url acme.com`, 'your capture in the window', w),
		helpRow(`${b} image reef --headline "..." --size x-banner,linkedin-banner`, 'two banners', w),
		helpRow(`${b} image --occasion hiring --all --size post --headline "..."`, 'four looks at every post size', w),
		helpRow(`${b} image --seed 42 --headline "..."`, 'a layout for the words', w),
		helpRow(`${b} image card --carousel steps.json --size portrait`, 'a numbered carousel', w),
		helpRow(`${b} image tile --sample`, 'sample copy, to see a template', w),
		'',
		'Only the words you pass are drawn, and they are drawn whole or the command fails and says what to shorten.',
		'The same inputs write the same bytes. To change a picture until you like it, use the design command.',
	].join('\n');
}

/** Formats as typed: one, a comma list, both or all. */
export function formatsOf(typed: string, pool: readonly string[] = IMAGE_FORMATS): string[] {
	const out: string[] = [];
	for (const part of typed.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)) {
		if (part === 'both') out.push('png', 'svg');
		else if (part === 'all') out.push(...pool);
		else out.push(pick('format', part === 'jpeg' ? 'jpg' : part, [...pool, 'both', 'all']));
	}
	if (!out.length) throw new Error(`--format takes ${pool.join(', ')}, both or all.`);
	return [...new Set(out)];
}

/** Sizes as typed: one, a comma list, a group or all. */
export function sizesOf(typed: string): { ids: string[]; wide: boolean } {
	const groups = imageDoc().groups;
	const ids: string[] = [];
	let wide = false;
	for (const part of typed.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)) {
		if (part === 'all') ids.push(...imageSizes().map((s) => s.id));
		else if (groups[part]) ids.push(...groups[part]!.sizes);
		else ids.push(sizeId(part));
		if (part === 'all' || groups[part]) wide = true;
	}
	if (!ids.length) throw new Error('--size takes a size id.');
	return { ids: [...new Set(ids)], wide };
}

/** What to say about a file that a platform would refuse or a picture drawn larger than it is. */
export function sizeWarning(size: string, bytes: number, what = 'PNG'): string | undefined {
	const limit = platformOf(size, 0, 0).limit;
	if (!limit || bytes <= limit.bytes) return undefined;
	return `The ${size} ${what} is ${(bytes / 1048576).toFixed(1)} MB; the platform takes up to ${limit.bytes / 1048576} MB${limit.official ? '' : ' (approximate)'}. Use --format jpg or webp${what === 'PNG' ? '' : ' at a lower --scale'}.`;
}

async function runImage(positional: string | undefined, flags: Opts, defaultSize: string) {
	const cwd = process.cwd();
	const file = readContent(typeof flags.content === 'string' ? flags.content : undefined, CONTENT_KEYS, cwd);
	const o: Opts = { ...Object.fromEntries(Object.entries(file).map(([k, v]) => [k, typeof v === 'boolean' ? v : String(v)])), ...Object.fromEntries(Object.entries(flags).filter(([, v]) => v !== undefined)) };
	// --no-emphasis defaults to true in commander; only a file's "emphasis": false turns it off when the flag is absent.
	if (flags.emphasis === true && file.emphasis === false) o.emphasis = false;
	if (positional === 'templates' || o.list) {
		const cat = imageCatalog();
		emit(o, cat, () => [
			'Templates',
			...cat.templates.map((t) => helpRow(t.id, `${t.name}. ${t.description}${t.window ? ' Takes --image.' : ''}`, 12)),
			'',
			'Occasions (four looks, and sample words with --sample)',
			...cat.occasions.map((x) => helpRow(x.id, x.looks.map((l) => `${l.template}/${l.theme}`).join(', '), 12)),
			'',
			'Sizes',
			...cat.sizes.map((s) => helpRow(s.id, s.width ? `${s.width}x${s.height}  ${s.label}${s.aliases.length ? ` (also ${s.aliases.join(', ')})` : ''}` : 'custom: --width and --height', 18)),
			'',
			`Themes: ${cat.themes.map((t) => t.id).join(', ')}. Highlights: ${cat.highlights.map((h) => h.id).join(', ')}. Badge styles: ${cat.badges.join(', ')}. Formats: ${cat.formats.join(', ')}.`,
			cat.copy,
		].join('\n'));
		return;
	}
	const named = positional && positional !== 'render' ? positional : undefined;
	if (named && typeof o.template === 'string' && named.toLowerCase() !== o.template.toLowerCase()) throw new Error(`Pass the template once (got ${named} and --template ${o.template}).`);
	let template = named ?? (typeof o.template === 'string' ? o.template : undefined);
	const str = (k: string) => (typeof o[k] === 'string' ? (o[k] as string) : undefined);
	const outExt = str('out') ? /\.(png|svg|jpe?g|webp)$/i.exec(str('out')!)?.[1]?.toLowerCase().replace('jpeg', 'jpg') : undefined;
	const formats = formatsOf(String(o.format ?? outExt ?? 'both'));
	const scale = num('scale', o.scale, 1, 4) ?? 1;
	const width = num('width', o.width, 160, 4000, { integer: true });
	const height = num('height', o.height, 160, 4000, { integer: true });
	const seed = num('seed', o.seed, 1, 1_000_000_000, { integer: true });
	const base: ImageRequest = {
		occasion: str('occasion'),
		theme: str('theme'),
		width,
		height,
		headline: str('headline'),
		body: str('body'),
		credit: str('credit'),
		badge: str('badge'),
		badgeText: str('badgeText'),
		badgeStyle: str('badgeStyle'),
		highlight: str('highlight'),
		partner: str('partner'),
		picture: str('image') !== undefined,
		pictureUrl: str('imageUrl'),
		console: str('console'),
		sample: o.sample === true || o.sample === 'true',
		seed,
		emphasise: o.emphasis !== false,
	};
	const { ids: sizes, wide } = sizesOf(str('size') ?? defaultSize);
	const fits = (t: string | undefined, size: string) => !isCircle(size) || t === 'mark';
	// Jobs: one template, every template, the occasion's four looks, or a carousel's slides.
	const jobs: { template?: string; theme?: string; size: string; request?: ImageRequest; name?: string; image?: string }[] = [];
	if (str('carousel')) {
		const path = resolve(cwd, str('carousel')!);
		let spec: Record<string, unknown>;
		try {
			spec = JSON.parse(readFileSync(path, 'utf8'));
		} catch (err) {
			throw new Error(`Could not read ${str('carousel')} as JSON (${(err as Error).message}).`);
		}
		const list = spec.slides;
		if (!Array.isArray(list) || list.length < 2) throw new Error(`${str('carousel')} needs "slides", a list of two or more.`);
		if (list.length > 20) throw new Error(`A carousel holds up to 20 pictures; ${str('carousel')} has ${list.length}.`);
		template ??= typeof spec.template === 'string' ? spec.template : undefined;
		const SLIDE = ['headline', 'body', 'badge', 'credit', 'image', 'imageUrl', 'template'];
		for (const [i, x] of (list as Record<string, unknown>[]).entries()) for (const k of Object.keys(x ?? {})) if (!SLIDE.includes(k)) throw new Error(`Slide ${i + 1} of ${str('carousel')}: ${unknown('field', k, SLIDE).message}`);
		for (const k of Object.keys(spec)) if (!['slides', 'template', 'theme', 'badge', 'badgeStyle', 'highlight', 'size', 'seed'].includes(k)) throw new Error(`${str('carousel')}: ${unknown('field', k, ['slides', 'template', 'theme', 'badge', 'badgeStyle', 'highlight', 'size', 'seed']).message}`);
		const own = sizesOf(flags.size ? String(flags.size) : typeof spec.size === 'string' ? spec.size : str('size') ?? 'square').ids;
		const total = list.length;
		for (const size of own) {
			for (const [i, x] of (list as Record<string, string>[]).entries())
				jobs.push({ size, template: x.template ?? template, image: x.image ? resolve(dirname(path), x.image) : undefined, name: `${String(i + 1).padStart(2, '0')}-${x.template ?? template ?? 'tile'}-${size}`, request: { ...base, theme: base.theme ?? (spec.theme as string | undefined), highlight: base.highlight ?? (spec.highlight as string | undefined), badgeStyle: base.badgeStyle ?? (spec.badgeStyle as string | undefined), seed: seed ?? (typeof spec.seed === 'number' ? spec.seed : undefined), headline: x.headline, body: x.body, credit: x.credit, badge: x.badge ?? base.badge ?? (spec.badge as string | undefined), picture: !!x.image, pictureUrl: x.imageUrl, page: o.numbers === false ? '' : `${i + 1}/${total}`, template: x.template ?? template ?? 'tile', size } });
		}
	} else if (o.all) {
		if (template && !occasionNames().includes(template.toLowerCase())) throw new Error('Pass a template or --all, not both (an occasion with --all gives its four looks).');
		const occ = base.occasion ?? template;
		for (const size of sizes) {
			if (occ) for (const look of imageDoc().occasions[pick('occasion', occ, occasionNames())]!.looks) jobs.push({ template: look.template, theme: base.theme ?? look.theme, size });
			else for (const t of TEMPLATES) if (fits(t, size) && !(t === 'mark' && (base.headline || base.body || base.badge || base.credit)) && !(base.picture && !['app', 'feature'].includes(t))) jobs.push({ template: t, size });
		}
		if (occ) base.occasion = pick('occasion', occ, occasionNames());
	} else {
		if (!template && !base.occasion && !seed) throw new Error(`Name a template or an occasion: ${cli()} image tile (one of ${TEMPLATES.join(', ')}; or ${occasionNames().join(', ')}; --list shows them).`);
		for (const size of sizes) if (!wide || fits(template, size)) jobs.push({ template, size });
	}
	if (!jobs.length) throw new Error('Nothing to draw: the profile picture takes the mark template.');
	const out = str('out');
	const single = out && outExt ? resolve(cwd, out) : undefined;
	if (single && (jobs.length > 1 || formats.length > 1)) throw new Error('--out names one file, so pass one template, one size and one --format. For several files, pass a directory.');
	if (single && outExt !== formats[0]) throw new Error(`--out ends in ${single.split('.').pop()} but --format is ${formats[0]}.`);
	const dir = resolve(cwd, out && !single ? out : 'images');
	const pictures = new Map<string, Pictures>();
	const picsFor = async (path?: string) => {
		const key = path ?? '';
		if (!pictures.has(key)) pictures.set(key, await picturesFor(path ? await readPicture(cwd, path) : null));
		return pictures.get(key)!;
	};
	const files: OutFile[] = [];
	const warnings: string[] = [];
	const seen = new Set<string>();
	// Everything is drawn before anything is written, so a picture that cannot hold its words writes nothing.
	const writes: [string, Buffer | string][] = [];
	const designs: Design[] = [];
	if (str('carousel')) {
		const bySize = new Map<string, typeof jobs>();
		for (const j of jobs) bySize.set(j.size, [...(bySize.get(j.size) ?? []), j]);
		for (const group of bySize.values()) designs.push(...(await carouselDesigns(group.map((j) => j.request!), (i) => picsFor(group[i]!.image))));
	}
	for (const [i, job] of jobs.entries()) {
		const d = designs[i] ?? designOf({ ...base, template: job.template, theme: job.theme ?? base.theme, size: job.size });
		const pics = await picsFor(job.image ?? (job.request ? undefined : str('image')));
		const r = await renderDesign(d, pics, { png: formats.includes('png'), svg: formats.includes('svg'), jpg: formats.includes('jpg'), webp: formats.includes('webp'), scale });
		mustPass(d, r);
		const sizeName = d.size === 'custom' ? `${d.w}x${d.h}` : d.size;
		let name = job.name ?? `${d.template}-${d.theme}-${sizeName}${seed ? `-s${seed}` : ''}`;
		for (let n = 2; seen.has(name); n++) name = `${d.template}-${d.theme}-${sizeName}-${n}`;
		seen.add(name);
		const stem = single ? single.replace(/\.(png|svg|jpe?g|webp)$/i, '') : join(dir, name);
		const shot = pics.get('picture');
		if (d.window === 'picture' && shot && r.drawn.window && shot.width < r.drawn.window.w * scale * 0.75) warnings.push(`The picture is ${shot.width} px wide and is drawn ${Math.round(r.drawn.window.w * scale)} px wide, so it will look soft. Use a larger one.`);
		for (const f of IMAGE_FORMATS) {
			const data = r[f];
			if (data === undefined) continue;
			const path = single ?? `${stem}.${f}`;
			writes.push([path, data]);
			const k = f === 'svg' ? scale : 1;
			files.push({ path: display(cwd, path), format: f, template: d.template, theme: d.theme, size: d.size, width: Math.round(r.width / k), height: Math.round(r.height / k), bytes: Buffer.byteLength(data) });
			const w = f === 'svg' ? undefined : sizeWarning(d.size, Buffer.byteLength(data), f.toUpperCase());
			if (w) warnings.push(w);
		}
	}
	for (const [path, data] of writes) write(path, data);
	const said = [...new Set(warnings)];
	emit(o, { files, ...(said.length ? { warnings: said } : {}) }, () => [...files.map((f) => `${f.path}  ${f.width}x${f.height}`), ...said.map((w) => `Note: ${w}`)].join('\n'));
}
