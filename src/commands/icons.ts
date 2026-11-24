import { join, resolve } from 'node:path';
import type { Command } from 'commander';
import { glyphs, iconSet, ICONS } from '../assets/icons.js';
import { display, write, type OutFile } from '../assets/io.js';
import { cli } from '../lib/brand.js';
import { helpRow } from '../lib/help-row.js';
import { emit } from '../lib/output.js';

// `icons`: the favicon set and app icons from the brand's mark, and its glyphs as SVG files.

type Opts = Record<string, string | boolean | undefined> & { json?: boolean };

export function iconsCommand(program: Command) {
	program
		.command('icons [what]')
		.description('Favicons (ico, 16, 32, 48), the Apple touch icon, web app icons (192, 512, maskable), the 1024 app icon, and the brand glyphs as SVG')
		.option('--theme <name>', 'the ground behind the octopus: paper, mist, mono, lavender, purple or deep (default paper)')
		.option('-o, --out <dir>', 'output directory (default icons/)')
		.option('--list', 'what each file is for')
		.option('--json', 'JSON output')
		.action(async (what: string | undefined, _o, cmd: Command) => runIcons(what, cmd.optsWithGlobals() as Opts))
		.addHelpText('after', () => ['', 'Examples:', helpRow(`${cli()} icons`, 'the favicon set and app icons', 30), helpRow(`${cli()} icons glyphs`, 'the console\'s Phosphor icons as SVG (MIT)', 30), helpRow(`${cli()} image mark --size avatar`, 'a profile picture', 30)].join('\n'));
}

async function runIcons(what: string | undefined, o: Opts) {
	const cwd = process.cwd();
	if (o.list) {
		emit(o, { icons: ICONS.map((i) => ({ file: i.name, size: i.size, purpose: i.purpose })), glyphs: glyphs().map((g) => g.name), licence: 'Phosphor Icons, MIT' }, () => [...ICONS.map((i) => helpRow(i.name, `${i.size}px, ${i.purpose}`, 24)), '', `Glyphs: ${glyphs().length} Phosphor icons (MIT), the ones the console uses.`].join('\n'));
		return;
	}
	if (what && !['set', 'glyphs'].includes(what)) throw new Error(`Unknown icons kind \`${what}\`. Choose from: set (default), glyphs.`);
	const dir = resolve(cwd, typeof o.out === 'string' ? o.out : 'icons');
	const files: OutFile[] = [];
	if (what === 'glyphs') {
		for (const g of glyphs()) {
			write(join(dir, `${g.name}.svg`), g.svg);
			files.push({ path: display(cwd, join(dir, `${g.name}.svg`)), format: 'svg', width: 256, height: 256 });
		}
		write(join(dir, 'LICENSE.txt'), 'Phosphor Icons (https://phosphoricons.com), MIT License, Copyright (c) 2023 Phosphor Icons.\n');
	} else {
		const set = await iconSet(typeof o.theme === 'string' ? o.theme : undefined);
		for (const f of set.files) {
			write(join(dir, f.name), f.data);
			files.push({ path: display(cwd, join(dir, f.name)), format: f.name.split('.').pop()!, width: f.width, height: f.height, purpose: f.purpose });
		}
		write(join(dir, 'site.webmanifest'), set.manifest);
		write(join(dir, 'icons.html'), set.html);
		files.push({ path: display(cwd, join(dir, 'site.webmanifest')), format: 'json', width: 0, height: 0 }, { path: display(cwd, join(dir, 'icons.html')), format: 'html', width: 0, height: 0 });
	}
	emit(o, { files }, () => files.map((f) => `${f.path}${f.width ? `  ${f.width}x${f.height}` : ''}`).join('\n'));
}
