import { readFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import type { Command } from 'commander';
import { deckCatalog, renderSlide, slideTypes, type Slide } from '../assets/deck.js';
import { readPicture } from '../assets/image.js';
import { display, num, pick, write, type OutFile } from '../assets/io.js';
import { imagesToPdf } from '../assets/pdf.js';
import { cli } from '../lib/brand.js';
import { helpRow } from '../lib/help-row.js';
import { emit } from '../lib/output.js';
import { formatsOf } from './image.js';

// `deck`: slides at 1920 by 1080 from a JSON file or flags, a PNG per slide and one PDF.

type Opts = Record<string, string | boolean | undefined> & { json?: boolean };
const SLOT_FLAGS = ['title', 'headline', 'body', 'number', 'badge', 'items', 'stat', 'quote', 'attribution', 'url'];

export function deckCommand(program: Command) {
	program
		.command('deck [slide]')
		.description('Slides at 1920 by 1080 (cover, section, statement, bullets, stat, quote, image, end): PNG per slide and one PDF')
		.option('-i, --input <file>', 'deck.json: { "slides": [ { "type": "cover", "title": "..." }, ... ] }')
		.option('--slide <type>', 'one slide of this type, from flags')
		.option('--theme <name>', 'paper, mist, mono, lavender, purple or deep (default: the type\'s)')
		.option('--title <text>', 'the title (every type but quote); *stars* highlight a phrase')
		.option('--headline <text>', 'the same as --title')
		.option('--badge <text>', 'section: the same as --number')
		.option('--body <text>', 'cover and image: the line under the title')
		.option('--number <text>', 'section: the number in the badge')
		.option('--items <text>', 'bullets: up to six points separated by |')
		.option('--stat <text>', 'stat: the big number')
		.option('--quote <text>', 'quote: the quote')
		.option('--attribution <text>', 'quote: who said it (a role and a company, never a made-up person)')
		.option('--url <text>', 'image and end: the address')
		.option('--image <file>', 'image: your capture in the window (default: the console\'s inbox)')
		.option('-s, --size <size>', '16:9 (1920 by 1080, the one slide size)')
		.option('--seed <n>', 'a variation of the slide\'s layout')
		.option('--sample', 'fill the words you did not pass with sample copy')
		.option('-f, --format <formats>', 'png, pdf, svg, jpg, webp, a comma list, both (PNG and PDF, the default) or all', 'both')
		.option('-o, --out <dir>', 'output directory (default deck/)')
		.option('--list', 'slide types with their slots')
		.option('--json', 'JSON output')
		.action(async (slide: string | undefined, _o, cmd: Command) => runDeck(slide, cmd.optsWithGlobals() as Opts))
		.addHelpText('after', () => {
			const b = cli();
			return [
				'',
				'Examples:',
				helpRow(`${b} deck --input deck.json --out deck`, 'every slide and deck.pdf', 48),
				helpRow(`${b} deck cover --title "Give every *AI agent* a way to be reached"`, '', 48),
				helpRow(`${b} deck bullets --items "Email | Phone | Agent Cards"`, '', 48),
				helpRow(`${b} deck image --image capture.png --url acme.com`, 'your capture in the window', 48),
				helpRow(`${b} deck --list`, 'slide types and their slots', 48),
				'',
				'deck.json slides take their type\'s slots by name, "theme", and "image" (a path relative to the file).',
			].join('\n');
		});
}

async function runDeck(positional: string | undefined, o: Opts) {
	const cwd = process.cwd();
	if (o.list) {
		const cat = deckCatalog();
		emit(o, cat, () => cat.slides.map((s) => helpRow(s.id, `${s.description} Slots: ${Object.keys(s.slots).join(', ')}${s.picture ? ', image' : ''}. Theme: ${s.theme}.`, 12)).join('\n'));
		return;
	}
	const typed = String(o.format ?? 'both');
	const formats = typed === 'both' ? ['png', 'pdf'] : formatsOf(typed, ['png', 'pdf', 'svg', 'jpg', 'webp']);
	if (typeof o.size === 'string') pick('slide size', o.size, ['16:9', '16x9', 'landscape', '1920x1080'] as const);
	const seed = num('seed', o.seed, 1, 1_000_000_000, { integer: true });
	const type = positional ?? (typeof o.slide === 'string' ? o.slide : undefined);
	if (type && o.input) throw new Error('Pass --input or one slide type, not both.');
	let slides: Record<string, unknown>[];
	let base = cwd;
	if (typeof o.input === 'string') {
		const path = isAbsolute(o.input) ? o.input : resolve(cwd, o.input);
		let parsed: { slides?: unknown };
		try {
			parsed = JSON.parse(readFileSync(path, 'utf8'));
		} catch (err) {
			throw new Error(`Could not read ${o.input} as JSON (${(err as Error).message}).`);
		}
		if (!Array.isArray(parsed.slides) || !parsed.slides.length) throw new Error(`${o.input} needs a "slides" list.`);
		slides = parsed.slides as Record<string, unknown>[];
		base = dirname(path);
		for (const flag of [...SLOT_FLAGS, 'image', 'theme']) if (o[flag] !== undefined) throw new Error(`--${flag} goes with one slide; with --input, put it in the file.`);
	} else {
		if (!type) throw new Error(`Pass --input deck.json or a slide type: ${cli()} deck cover (one of ${slideTypes().join(', ')}).`);
		const one: Record<string, unknown> = { type };
		for (const k of SLOT_FLAGS) if (typeof o[k] === 'string') one[k] = (o[k] as string).replace(/\\n/g, '\n');
		if (typeof o.theme === 'string') one.theme = o.theme;
		if (typeof o.image === 'string') one.image = o.image;
		slides = [one];
	}
	if (o.sample || seed) slides = slides.map((s) => ({ ...(o.sample ? { sample: true } : {}), ...(seed ? { seed } : {}), ...s }));
	const dir = resolve(cwd, typeof o.out === 'string' ? o.out : 'deck');
	const files: OutFile[] = [];
	// Every slide is drawn before any is written, so a slide that cannot hold its words writes nothing.
	const writes: [string, Buffer | string][] = [];
	const pages: { rgb: Buffer; width: number; height: number }[] = [];
	for (const [i, s] of slides.entries()) {
		if (!s || typeof s.type !== 'string') throw new Error(`Slide ${i + 1} needs a "type" (${slideTypes().join(', ')}).`);
		const id = pick('slide type', s.type, slideTypes());
		const picture = typeof s.image === 'string' && s.image.trim() ? await readPicture(base, s.image) : null;
		const pictures = Array.isArray(s.images) ? await Promise.all((s.images as unknown[]).map((f) => readPicture(base, String(f)))) : undefined;
		let r;
		try {
			r = await renderSlide({ ...(s as Slide), type: id, picture, ...(pictures ? { images: pictures } : {}) }, { png: formats.some((f) => f !== 'svg'), svg: formats.includes('svg'), jpg: formats.includes('jpg'), webp: formats.includes('webp') });
		} catch (err) {
			throw new Error(`Slide ${i + 1} (${id}): ${(err as Error).message}`);
		}
		const name = join(dir, `slide-${String(i + 1).padStart(2, '0')}-${id}`);
		if (r.svg) {
			writes.push([`${name}.svg`, r.svg]);
			files.push({ path: display(cwd, `${name}.svg`), format: 'svg', slide: id, width: r.width, height: r.height });
		}
		for (const f of ['jpg', 'webp'] as const) {
			if (!r[f]) continue;
			writes.push([`${name}.${f}`, r[f]!]);
			files.push({ path: display(cwd, `${name}.${f}`), format: f, slide: id, width: r.width, height: r.height });
		}
		if (r.png && formats.includes('png')) {
			writes.push([`${name}.png`, r.png]);
			files.push({ path: display(cwd, `${name}.png`), format: 'png', slide: id, width: r.width, height: r.height });
		}
		if (r.rgb && formats.includes('pdf')) pages.push({ rgb: r.rgb, width: r.width, height: r.height });
	}
	if (formats.includes('pdf')) {
		const pdf = join(dir, 'deck.pdf');
		// 16:9 pages, 13.33 by 7.5 in.
		writes.push([pdf, imagesToPdf(pages, 960)]);
		files.push({ path: display(cwd, pdf), format: 'pdf', pages: pages.length, width: 1920, height: 1080 });
	}
	for (const [path, data] of writes) write(path, data);
	emit(o, { files }, () => files.map((f) => `${f.path}  ${f.format === 'pdf' ? `${f.pages} page${f.pages === 1 ? '' : 's'}` : `${f.width}x${f.height}`}`).join('\n'));
}
