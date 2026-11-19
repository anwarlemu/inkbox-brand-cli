import { join, resolve } from 'node:path';
import type { Command } from 'commander';
import { readPicture } from '../assets/image.js';
import { illustrateCatalog, renderIllustration, subjects } from '../assets/illustrate.js';
import { display, num, pick, write, type OutFile } from '../assets/io.js';
import { cli } from '../lib/brand.js';
import { helpRow } from '../lib/help-row.js';
import { emit } from '../lib/output.js';

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
		.option('-f, --format <format>', 'png, svg or both (default both, or what an --out file ends in)')
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
	const outExt = typeof o.out === 'string' ? /\.(png|svg)$/i.exec(o.out)?.[1]?.toLowerCase() : undefined;
	const format = pick('format', String(o.format ?? outExt ?? 'both'), ['png', 'svg', 'both'] as const);
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
	const single = out && /\.(png|svg)$/i.test(out) ? resolve(cwd, out) : undefined;
	if (single && (list.length > 1 || format === 'both')) throw new Error('--out names one file, so pass one subject and --format png or svg. For several files, pass a directory.');
	const dir = resolve(cwd, out && !single ? out : 'illustrations');
	const picture = typeof o.image === 'string' ? await readPicture(cwd, o.image) : null;
	const files: OutFile[] = [];
	for (const subject of list) {
		const r = await renderIllustration({ subject, theme: typeof o.theme === 'string' ? o.theme : undefined, size: typeof o.size === 'string' ? o.size : undefined, width, height, pose: typeof o.pose === 'string' ? o.pose : undefined, picture: o.all ? null : picture, pictureUrl: typeof o.imageUrl === 'string' ? o.imageUrl : undefined }, { png: format !== 'svg', svg: format !== 'png', scale });
		const stem = single ? single.replace(/\.(png|svg)$/i, '') : join(dir, `${subject}-${r.theme}-${typeof o.size === 'string' ? o.size : 'square'}`);
		if (r.png) {
			write(`${stem}.png`, r.png);
			files.push({ path: display(cwd, `${stem}.png`), format: 'png', subject, theme: r.theme, width: r.width, height: r.height });
		}
		if (r.svg) {
			write(`${stem}.svg`, r.svg);
			files.push({ path: display(cwd, `${stem}.svg`), format: 'svg', subject, theme: r.theme, width: Math.round(r.width / scale), height: Math.round(r.height / scale) });
		}
	}
	emit(o, { files }, () => files.map((f) => `${f.path}  ${f.width}x${f.height}`).join('\n'));
}
