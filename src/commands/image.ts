import { join, resolve } from 'node:path';
import type { Command } from 'commander';
import { designOf, imageCatalog, imageSizes, occasionNames, picturesFor, readPicture, renderDesign, sizeId, type ImageRequest } from '../assets/image.js';
import { display, num, pick, write, type OutFile } from '../assets/io.js';
import { TEMPLATES } from '../assets/share.js';
import { imageDoc } from '../assets/brand-art.js';
import { cli } from '../lib/brand.js';
import { readContent } from '../lib/content.js';
import { helpRow } from '../lib/help-row.js';
import { emit } from '../lib/output.js';

// `image` (with `og` and `social` as shortcuts): the share-image editor's templates, occasions, themes and sizes as PNG
// and SVG, copy from flags or a --content file, the caller's picture in the window, and seeded new layouts.

type Opts = Record<string, string | boolean | undefined> & { json?: boolean };

const CONTENT_KEYS = ['template', 'occasion', 'theme', 'size', 'width', 'height', 'headline', 'body', 'credit', 'badge', 'badgeText', 'highlight', 'partner', 'image', 'imageUrl', 'seed', 'emphasis', 'format', 'scale', 'out'];

function options(c: Command, sizeHelp: string) {
	return c
		.option('-t, --template <name>', `${TEMPLATES.join(', ')}; or an occasion`)
		.option('--occasion <name>', `${occasionNames().join(', ')}: its words and its looks`)
		.option('--theme <name>', 'paper, mist, mono, lavender, purple or deep (default: the occasion\'s look, else paper)')
		.option('-s, --size <size>', sizeHelp)
		.option('--width <px>', 'custom size width, 160 to 4000')
		.option('--height <px>', 'custom size height, 160 to 4000')
		.option('--headline <text>', 'the headline; *stars* highlight a phrase, \\n breaks a line')
		.option('--body <text>', 'the line under the headline')
		.option('--credit <text>', 'a small credit under the words, such as @handle for a post')
		.option('--badge <style>', 'pill, solid, dot or none')
		.option('--badge-text <text>', 'the badge\'s words')
		.option('--highlight <name>', 'pink, lilac, violet or ink (no highlight)')
		.option('--partner <name>', 'a partner\'s name beside the lockup (a name, never another logo)')
		.option('-i, --image <file>', 'a picture for the window (app and feature): a product capture as PNG, JPEG, WebP or SVG')
		.option('--image-url <text>', 'the address shown over the picture in the window')
		.option('--seed <n>', 'a new on-brand layout for the same words: 1 to 1000000000, the same seed gives the same layout')
		.option('--no-emphasis', 'do not pick a phrase to highlight when the headline has no stars')
		.option('--content <file>', 'a JSON file with the same fields (headline, body, theme, ...); flags win')
		.option('-f, --format <format>', 'png, svg or both (default: both, or what an --out file ends in)')
		.option('--scale <n>', 'PNG pixel multiple, 1 to 4', '1')
		.option('-o, --out <path>', 'a directory (default images/), or one .png or .svg file')
		.option('--all', 'every template (or the occasion\'s four looks) at the size')
		.option('--list', 'templates, occasions, sizes, themes and badges')
		.option('--json', 'JSON output');
}

export function imageCommand(program: Command) {
	const sizes = 'og, card, linkedin, square, portrait, story, landscape, li-square, x-banner, linkedin-banner, li-page, youtube, email, custom; a group (share, post, banner); or all';
	options(program.command('image [template]').description('Share images, social posts and banners (tile, app, outline, hatch, reef, feature, partner, funding, announce, card) as PNG and SVG'), sizes)
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
		helpRow(`${b} image launch --size square`, 'an occasion picks its first look', w),
		helpRow(`${b} image feature --image capture.png --image-url acme.com`, 'your capture in the window', w),
		helpRow(`${b} image reef --size x-banner --theme lavender`, 'a banner', w),
		helpRow(`${b} image --occasion hiring --all --size post`, 'four looks at every post size', w),
		helpRow(`${b} image card --seed 42`, 'a new layout for the same words', w),
		helpRow(`${b} image --content post.json --out images`, 'copy from a JSON file', w),
		'',
		'Templates and themes draw the same as the share-image editor; the same inputs write the same bytes.',
	].join('\n');
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
			'Occasions (words and four looks)',
			...cat.occasions.map((x) => helpRow(x.id, x.looks.map((l) => `${l.template}/${l.theme}`).join(', '), 12)),
			'',
			'Sizes',
			...cat.sizes.map((s) => helpRow(s.id, s.width ? `${s.width}x${s.height}  ${s.label}${s.aliases.length ? ` (also ${s.aliases.join(', ')})` : ''}` : 'custom: --width and --height', 18)),
			'',
			`Themes: ${cat.themes.map((t) => t.id).join(', ')}. Highlights: ${cat.highlights.map((h) => h.id).join(', ')}. Badges: ${cat.badges.join(', ')}.`,
		].join('\n'));
		return;
	}
	const named = positional && positional !== 'render' ? positional : undefined;
	if (named && typeof o.template === 'string' && named.toLowerCase() !== o.template.toLowerCase()) throw new Error(`Pass the template once (got ${named} and --template ${o.template}).`);
	const template = named ?? (typeof o.template === 'string' ? o.template : undefined);
	const outExt = typeof o.out === 'string' ? /\.(png|svg)$/i.exec(o.out)?.[1]?.toLowerCase() : undefined;
	const format = pick('format', String(o.format ?? outExt ?? 'both'), ['png', 'svg', 'both'] as const);
	const scale = num('scale', o.scale, 1, 4) ?? 1;
	const width = num('width', o.width, 160, 4000, { integer: true });
	const height = num('height', o.height, 160, 4000, { integer: true });
	const seed = num('seed', o.seed, 1, 1_000_000_000, { integer: true });
	const base: ImageRequest = {
		occasion: typeof o.occasion === 'string' ? o.occasion : undefined,
		theme: typeof o.theme === 'string' ? o.theme : undefined,
		width,
		height,
		headline: typeof o.headline === 'string' ? o.headline : undefined,
		body: typeof o.body === 'string' ? o.body : undefined,
		credit: typeof o.credit === 'string' ? o.credit : undefined,
		badge: typeof o.badge === 'string' ? o.badge : undefined,
		badgeText: typeof o.badgeText === 'string' ? o.badgeText : undefined,
		highlight: typeof o.highlight === 'string' ? o.highlight : undefined,
		partner: typeof o.partner === 'string' ? o.partner : undefined,
		picture: typeof o.image === 'string',
		pictureUrl: typeof o.imageUrl === 'string' ? o.imageUrl : undefined,
		seed,
		emphasise: o.emphasis !== false,
	};
	// Sizes: one, a group, or all.
	const sizeArg = typeof o.size === 'string' ? o.size.trim().toLowerCase() : defaultSize;
	const groups = imageDoc().groups;
	const sizes = sizeArg === 'all' ? imageSizes().map((s) => s.id) : groups[sizeArg] ? groups[sizeArg]!.sizes : [sizeId(sizeArg)];
	// Jobs: one template, every template, or the occasion's four looks.
	const jobs: { template?: string; theme?: string; size: string }[] = [];
	if (o.all) {
		if (template && !occasionNames().includes(template.toLowerCase())) throw new Error('Pass a template or --all, not both (an occasion with --all gives its four looks).');
		const occ = base.occasion ?? template;
		for (const size of sizes) {
			if (occ) for (const look of imageDoc().occasions[pick('occasion', occ, occasionNames())]!.looks) jobs.push({ template: look.template, theme: base.theme ?? look.theme, size });
			else for (const t of TEMPLATES) jobs.push({ template: t, size });
		}
		if (occ) base.occasion = pick('occasion', occ, occasionNames());
	} else {
		if (!template && !base.occasion) throw new Error(`Name a template or an occasion: ${cli()} image tile (one of ${TEMPLATES.join(', ')}; or ${occasionNames().join(', ')}; --list shows them).`);
		for (const size of sizes) jobs.push({ template, size });
	}
	const out = typeof o.out === 'string' ? o.out : undefined;
	const single = out && /\.(png|svg)$/i.test(out) ? resolve(cwd, out) : undefined;
	if (single && (jobs.length > 1 || format === 'both')) throw new Error('--out names one file, so pass one template, one size and --format png or svg. For several files, pass a directory.');
	if (single && !single.toLowerCase().endsWith(`.${format}`)) throw new Error(`--out ends in ${single.split('.').pop()} but --format is ${format}.`);
	const dir = resolve(cwd, out && !single ? out : 'images');
	const picture = typeof o.image === 'string' ? await readPicture(cwd, o.image) : null;
	const pics = await picturesFor(picture);
	const files: OutFile[] = [];
	const seen = new Set<string>();
	for (const job of jobs) {
		const d = designOf({ ...base, template: job.template, theme: job.theme ?? base.theme, size: job.size });
		const r = await renderDesign(d, pics, { png: format !== 'svg', svg: format !== 'png', scale });
		const sizeName = d.size === 'custom' ? `${d.w}x${d.h}` : d.size;
		let name = `${d.template}-${d.theme}-${sizeName}${seed ? `-s${seed}` : ''}`;
		for (let n = 2; seen.has(name); n++) name = `${d.template}-${d.theme}-${sizeName}-${n}`;
		seen.add(name);
		const stem = single ? single.replace(/\.(png|svg)$/i, '') : join(dir, name);
		if (r.png) {
			write(`${stem}.png`, r.png);
			files.push({ path: display(cwd, `${stem}.png`), format: 'png', template: d.template, theme: d.theme, size: d.size, width: r.width, height: r.height });
		}
		if (r.svg) {
			write(`${stem}.svg`, r.svg);
			files.push({ path: display(cwd, `${stem}.svg`), format: 'svg', template: d.template, theme: d.theme, size: d.size, width: Math.round(r.width / scale), height: Math.round(r.height / scale) });
		}
	}
	emit(o, { files }, () => files.map((f) => `${f.path}  ${f.width}x${f.height}`).join('\n'));
}
