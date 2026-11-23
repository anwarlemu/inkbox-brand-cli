import { join, resolve } from 'node:path';
import type { Command } from 'commander';
import { readPicture, sizeId } from '../assets/image.js';
import { illustrateCatalog, renderIllustration, subjects } from '../assets/illustrate.js';
import { display, num, pick, write, type OutFile } from '../assets/io.js';
import { cli } from '../lib/brand.js';
import { helpRow } from '../lib/help-row.js';
import { emit } from '../lib/output.js';
import { formatsOf, IMAGE_FORMATS } from './image.js';

// `illustrate`: the brand's illustration style as code (brand/illustration.md): the octopus, the reef, the console
// window and the wordmark patterns as scenes, SVG (real vector shapes) and PNG.

type Opts = Record<string, string | boolean | undefined> & { json?: boolean };

export function illustrateCommand(program: Command) {
	program
		.command('illustrate [subject]')
		.description('Brand illustrations (octopus, reef, window, tile, pattern, outline, hatch) at any size: SVG with real vector shapes and PNG')
		.option('--theme <name>', 'paper, mist, mono, lavender, purple or deep (default: the subject\'s)')
		.option('--pose <pose>', 'octopus: sit (default) or hang')
		.option('-s, --size <size>', 'any image size (square by default, og, story, x-banner, ...) or custom')
		.option('--width <px>', 'custom size width, 160 to 4000')
		.option('--height <px>', 'custom size height, 160 to 4000')
		.option('-i, --image <file>', 'window: your capture in a browser window instead of the console')
		.option('--image-url <text>', 'window: the address over the capture')
		.option('--console <what>', 'window without --image: inbox (Acme placeholder mail, the default) or blank')
		.option('--seed <n>', 'a variation of the scene')
		.option('-f, --format <formats>', 'png, svg, jpg, webp, a comma list, both (png and svg, the default) or all; or what an --out file ends in')
		.option('--scale <n>', 'PNG pixel multiple, 1 to 4', '1')
		.option('-o, --out <path>', 'a directory (default illustrations/), or one .png or .svg file')
		.option('--all', 'every subject at the size')
		.option('--list', 'subjects, poses, themes and sizes')
		.option('--json', 'JSON output')
		.action(async (subject: string | undefined, _o, cmd: Command) => runIllustrate(subject, cmd.optsWithGlobals() as Opts))
		.addHelpText('after', () => {
			const b = cli();
			return [
				'',
				'Examples:',
				helpRow(`${b} illustrate reef --size og`, 'the reef with the octopus', 46),
				helpRow(`${b} illustrate octopus --pose hang --theme purple`, '', 46),
				helpRow(`${b} illustrate window --image capture.png`, 'your capture in the window', 46),
				helpRow(`${b} illustrate --all --size story`, 'every subject', 46),
				'',
				'The rules, each with its source, are in brand/illustration.md. The octopus is the brand\'s art file, never redrawn.',
			].join('\n');
		});
}

async function runIllustrate(positional: string | undefined, o: Opts) {
	const cwd = process.cwd();
	if (o.list) {
		const cat = illustrateCatalog();
		emit(o, cat, () => [...cat.subjects.map((s) => helpRow(s.id, `${s.description}${s.picture ? ' Takes --image.' : ''}`, 10)), '', `Poses: ${cat.poses.map((p) => p.id).join(', ')}. Themes: ${cat.themes.join(', ')}. Sizes: any image size, square by default.`].join('\n'));
		return;
	}
	const outExt = typeof o.out === 'string' ? /\.(png|svg|jpe?g|webp)$/i.exec(o.out)?.[1]?.toLowerCase().replace('jpeg', 'jpg') : undefined;
	const formats = formatsOf(String(o.format ?? outExt ?? 'both'));
	const seed = num('seed', o.seed, 1, 1_000_000_000, { integer: true });
	const scale = num('scale', o.scale, 1, 4) ?? 1;
	const width = num('width', o.width, 160, 4000, { integer: true });
	const height = num('height', o.height, 160, 4000, { integer: true });
	let list: string[];
	if (o.all) {
		if (positional) throw new Error('Pass a subject or --all, not both.');
		list = subjects();
	} else {
		if (!positional) throw new Error(`Name a subject: ${cli()} illustrate reef (one of ${subjects().join(', ')}).`);
		list = [pick('subject', positional, subjects())];
	}
	const out = typeof o.out === 'string' ? o.out : undefined;
	const single = out && outExt ? resolve(cwd, out) : undefined;
	if (single && (list.length > 1 || formats.length > 1)) throw new Error('--out names one file, so pass one subject and one --format. For several files, pass a directory.');
	if (single && formats[0] !== outExt) throw new Error(`--out ends in ${single.split('.').pop()} but --format is ${formats[0]}.`);
	const dir = resolve(cwd, out && !single ? out : 'illustrations');
	const picture = typeof o.image === 'string' ? await readPicture(cwd, o.image) : null;
	const files: OutFile[] = [];
	for (const subject of list) {
		const r = await renderIllustration({ subject, theme: typeof o.theme === 'string' ? o.theme : undefined, size: typeof o.size === 'string' ? o.size : undefined, width, height, pose: typeof o.pose === 'string' ? o.pose : undefined, picture: o.all ? null : picture, pictureUrl: typeof o.imageUrl === 'string' ? o.imageUrl : undefined, console: typeof o.console === 'string' ? o.console : undefined, seed }, { png: formats.includes('png'), svg: formats.includes('svg'), jpg: formats.includes('jpg'), webp: formats.includes('webp'), scale });
		const stem = join(dir, `${subject}-${r.theme}-${typeof o.size === 'string' ? sizeId(o.size) : 'square'}`);
		for (const f of IMAGE_FORMATS) {
			const data = r[f];
			if (data === undefined) continue;
			const path = single ?? `${stem}.${f}`;
			const k = f === 'svg' ? scale : 1;
			write(path, data);
			files.push({ path: display(cwd, path), format: f, subject, theme: r.theme, width: Math.round(r.width / k), height: Math.round(r.height / k) });
		}
	}
	emit(o, { files }, () => files.map((f) => `${f.path}  ${f.width}x${f.height}`).join('\n'));
}
