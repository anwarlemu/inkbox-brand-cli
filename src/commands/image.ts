import { readFileSync } from 'node:fs';
import type { Command } from 'commander';
import { imageCatalog } from '../image/catalog.js';
import { parseExports, renderImage, type ExportFormat } from '../image/render.js';
import { cli } from '../lib/brand.js';
import { emit } from '../lib/output.js';

const TEXT = ['headline', 'subtext', 'eyebrow', 'quote', 'attribution', 'image', 'template', 'size', 'ground', 'out', 'export'] as const;

type Flags = {
	template?: string;
	size?: string;
	ground?: string;
	headline?: string;
	subtext?: string;
	eyebrow?: string;
	quote?: string;
	attribution?: string;
	image?: string;
	content?: string;
	out?: string;
	export?: string;
	json?: boolean;
};

function fromFile(path: string | undefined): Partial<Record<(typeof TEXT)[number], string>> {
	if (!path) return {};
	let raw: unknown;
	try {
		raw = JSON.parse(readFileSync(path, 'utf8'));
	} catch (error) {
		throw new Error(`Could not read --content ${path}: ${(error as Error).message}`);
	}
	if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('--content must be a JSON object.');
	const out: Partial<Record<(typeof TEXT)[number], string>> = {};
	for (const key of TEXT) {
		const value = (raw as Record<string, unknown>)[key];
		if (typeof value === 'string') out[key] = value;
	}
	return out;
}

function pick(flag: string | undefined, file: string | undefined): string | undefined {
	return flag ?? file;
}

async function runRender(flags: Flags, defaultSize: string) {
	const file = fromFile(flags.content);
	const template = pick(flags.template, file.template);
	if (!template) throw new Error(`Pass --template. \`${cli()} image templates\` lists them.`);
	const exports = parseExports(pick(flags.export, file.export));
	const result = await renderImage({
		template,
		size: pick(flags.size, file.size) ?? defaultSize,
		ground: pick(flags.ground, file.ground),
		outDir: pick(flags.out, file.out) ?? 'images',
		exports: exports as ExportFormat[],
		headline: pick(flags.headline, file.headline),
		subtext: pick(flags.subtext, file.subtext),
		eyebrow: pick(flags.eyebrow, file.eyebrow),
		quote: pick(flags.quote, file.quote),
		attribution: pick(flags.attribution, file.attribution),
		image: pick(flags.image, file.image),
	});
	emit(flags, result, () => [`Wrote ${result.files.length} ${result.files.length === 1 ? 'file' : 'files'} (${result.template}, ${result.size}, ${result.width}x${result.height}).`, ...result.files.map((file) => `  ${file.path}`)].join('\n'));
}

function examples(kind: 'image' | 'og' | 'social'): string {
	const bin = cli();
	if (kind === 'og') return `\nExamples:\n  ${bin} og --template headline --headline "A mailbox for your agents" --json\n  ${bin} og --template announcement --eyebrow "New" --headline "Phone lines for agents" --subtext "A number of their own." --out ./images\n\nA newline in copy can be a real newline, or the two characters backslash and n.\n--content file.json reads the same fields. Flags win. --out is a directory; the file name follows the template and the size.\n`;
	if (kind === 'social') return `\nExamples:\n  ${bin} social --size square --template statement --headline "Every agent gets an inbox" --subtext "Email, phone and iMessage." --json\n  ${bin} social --size portrait --template quote --quote "Give every agent an inbox of its own." --attribution "A teammate"\n  ${bin} social --size landscape --template frame --headline "The console" --image ./screen.png --export png\n\nSizes: square (1080x1080, the default), portrait (1080x1350), landscape (1200x675), og (1200x630).\n`;
	return `\nExamples:\n  ${bin} image templates --json\n  ${bin} image render --size og --template headline --headline "A mailbox for your agents" --json\n  ${bin} og --template statement --headline "Every agent gets an inbox" --subtext "Email, phone and iMessage."\n  ${bin} social --size portrait --template quote --quote "Give every agent an inbox of its own."\n`;
}

function imageOptions(command: Command, mode: 'any' | 'social' | 'og') {
	command
		.option('--template <name>', 'headline, statement, frame, quote or announcement')
		.option('--headline <text>', 'main line')
		.option('--subtext <text>', 'second line, under the headline')
		.option('--eyebrow <text>', 'short label above the headline; a pink pill on the announcement template')
		.option('--quote <text>', 'the words of a quote')
		.option('--attribution <text>', 'who said the quote')
		.option('--image <path>', 'PNG or JPEG for the frame template. It fills the card from the top left')
		.option('--content <file>', 'JSON file with the same fields; flags override it')
		.option('--ground <ground>', 'white (default) or lilac')
		.option('--out <dir>', 'directory to write (default: images)')
		.option('--export <formats>', 'png, svg, or png,svg (default both)')
		.option('--json', 'JSON output');
	if (mode === 'any') command.option('--size <size>', 'og (1200x630, the default), square (1080x1080), portrait (1080x1350) or landscape (1200x675)');
	if (mode === 'social') command.option('--size <size>', 'square (1080x1080, the default), portrait (1080x1350), landscape (1200x675) or og (1200x630)');
}

/** `image`, `og` and `social`: brand pictures from the words an agent passes in. */
export function registerImage(program: Command) {
	const image = program.command('image').description('Render brand images for Open Graph and social posts').addHelpText('after', examples('image'));
	image.command('templates').description('List templates, sizes, grounds and export formats').option('--json', 'JSON output').action((_opts, command: Command) => {
		const catalog = imageCatalog();
		emit(command.optsWithGlobals(), catalog, () =>
			[
				'Templates',
				...catalog.templates.map((item) => `  ${item.id.padEnd(14)} ${item.description} Needs ${item.requires.map((key) => `--${key}`).join(' and ')}.`),
				'',
				'Sizes',
				...catalog.sizes.map((item) => `  ${item.id.padEnd(14)} ${String(item.width).padStart(4)}x${item.height}  ${item.use}`),
				'',
				'Grounds',
				...catalog.grounds.map((item) => `  ${item.id.padEnd(14)} ${item.description}`),
				'',
				'Export: png and svg. Pass --export png or --export svg for one of them.',
			].join('\n'),
		);
	});
	const render = image.command('render').description('Render one image from the content you pass in').addHelpText('after', examples('image'));
	imageOptions(render, 'any');
	render.action((_opts, command: Command) => runRender(command.optsWithGlobals(), 'og'));

	const og = program.command('og').description('Render a 1200x630 Open Graph image').addHelpText('after', examples('og'));
	imageOptions(og, 'og');
	og.action((_opts, command: Command) => runRender({ ...command.optsWithGlobals(), size: 'og' }, 'og'));

	const social = program.command('social').description('Render a social post at a square, portrait or landscape size').addHelpText('after', examples('social'));
	imageOptions(social, 'social');
	social.action((_opts, command: Command) => runRender(command.optsWithGlobals(), 'square'));
}
