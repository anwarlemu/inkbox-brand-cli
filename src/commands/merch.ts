import { join, resolve } from 'node:path';
import type { Command } from 'commander';
import { display, num, write, type OutFile } from '../assets/io.js';
import { formatsOf } from './image.js';
import { findItem, merchCatalog, merchItems, renderItem, PX_PER_IN } from '../assets/merch.js';
import { cli } from '../lib/brand.js';
import { helpRow } from '../lib/help-row.js';
import { emit } from '../lib/output.js';

// `merch`: print files only (never mockups). SVG at physical size and PNG at 300 dpi, bleed included.

type Opts = Record<string, string | boolean | undefined> & { json?: boolean };
const SLOTS = ['headline', 'body', 'name', 'role', 'email', 'url', 'address', 'date'];

export function merchCommand(program: Command) {
	program
		.command('merch [item]')
		.description('Print files: merch (cap, tee, hoodie, tote, mug, sticker, poster, notebook) and stationery (business card, letterhead, report cover, certificate, event badge, name tag), SVG at physical size, PNG and PDF with bleed')
		.option('--item <id>', 'cap-front, tee-front, tee-back, hoodie-front, tote, mug-wrap, sticker or poster')
		.option('--theme <id>', 'the same as --variant')
		.option('-v, --variant <id>', 'paper, lavender, purple or ink (a printed ground); color (full color, no ground); one-ink, one-white or one-purple (one color, the wordmark alone); each item names its own')
		.option('--headline <text>', 'tee-back and poster: the line (*stars* take the pink on the poster)')
		.option('--url <text>', 'the address (tee-back, poster, business card, letterhead)')
		.option('--body <text>', 'report cover and certificate: the line under the headline')
		.option('--name <text>', 'business card, badge, name tag, certificate: a person\'s name (theirs, never made up)')
		.option('--role <text>', 'business card, badge, name tag: the role')
		.option('--email <text>', 'business card: the email address')
		.option('--address <text>', 'letterhead: the postal address')
		.option('--date <text>', 'report cover and certificate: the date')
		.option('--sample', 'print sample copy where you passed none')
		.option('--dpi <n>', 'PNG resolution, 72 to 600', String(PX_PER_IN))
		.option('--guides', 'draw the trim and safe lines for proofing')
		.option('-f, --format <formats>', 'svg, png, pdf, a comma list, both (svg and png) or all', 'both')
		.option('-o, --out <dir>', 'output directory (default merch/)')
		.option('--all', 'every item in every variant')
		.option('--list', 'items with trim, bleed, safe area, variants and sources')
		.option('--json', 'JSON output')
		.action(async (item: string | undefined, _o, cmd: Command) => runMerch(item, cmd.optsWithGlobals() as Opts))
		.addHelpText('after', () => [
			'',
			'Examples:',
			helpRow(`${cli()} merch tee-front --variant color`, '', 44),
			helpRow(`${cli()} merch sticker --variant lavender --guides`, 'trim and safe lines for proofing', 44),
			helpRow(`${cli()} merch poster --headline "Give every *AI agent* a way to be reached"`, '', 44),
			helpRow(`${cli()} merch --all --dpi 150 --out merch`, 'every item in every variant', 44),
			'',
			'Sizes are common vendor print areas, not a vendor template: confirm with the vendor. The sticker SVG holds a CutContour path (the die line), not printed.',
		].join('\n'));
}

async function runMerch(positional: string | undefined, o: Opts) {
	const cwd = process.cwd();
	if (o.list) {
		const cat = merchCatalog();
		emit(o, cat, () => [cat.note, '', ...cat.items.map((i) => `${i.id.padEnd(13)} ${`${i.trim.width} x ${i.trim.height} in`.padEnd(14)} bleed ${String(i.bleed).padEnd(6)} safe ${String(i.safe).padEnd(6)} ${`${i.pixels.width}x${i.pixels.height}px`.padEnd(12)} ${i.variants.join(', ')}\n${' '.repeat(14)}${i.method}. ${i.source}`)].join('\n'));
		return;
	}
	const formats = formatsOf(String(o.format ?? 'both'), ['svg', 'png', 'pdf']);
	const variant = typeof o.variant === 'string' ? o.variant : typeof o.theme === 'string' ? o.theme : undefined;
	const dpi = num('dpi', o.dpi, 72, 600, { integer: true }) ?? PX_PER_IN;
	const slots: Record<string, string> = {};
	for (const k of SLOTS) if (typeof o[k] === 'string') slots[k] = o[k] as string;
	const named = positional ?? (typeof o.item === 'string' ? o.item : undefined);
	const jobs: { id: string; variant?: string }[] = [];
	if (o.all) {
		if (named) throw new Error('Pass an item or --all, not both.');
		for (const i of merchItems()) for (const v of i.variants) jobs.push({ id: i.id, variant: v });
	} else {
		if (!named) throw new Error(`Name an item: ${cli()} merch tee-front (--list shows them).`);
		jobs.push({ id: findItem(named).id, variant });
	}
	const dir = resolve(cwd, typeof o.out === 'string' ? o.out : 'merch');
	const files: OutFile[] = [];
	for (const job of jobs) {
		const item = findItem(job.id);
		const r = await renderItem(item, { variant: job.variant, slots: o.all ? {} : slots, sample: !!o.sample, guides: !!o.guides, dpi, png: formats.includes('png'), svg: formats.includes('svg'), pdf: formats.includes('pdf') });
		if (!r.layers.length) throw new Error(`${item.id} draws nothing in ${r.variant}.`);
		const base = join(dir, `${item.id}-${r.variant}`);
		const inches = `${r.widthIn} x ${r.heightIn} in`;
		if (r.svg) {
			write(`${base}.svg`, r.svg);
			files.push({ path: display(cwd, `${base}.svg`), format: 'svg', item: item.id, variant: r.variant, inches, width: Math.round(r.widthIn * PX_PER_IN), height: Math.round(r.heightIn * PX_PER_IN) });
		}
		if (r.pdf) {
			write(`${base}.pdf`, r.pdf);
			files.push({ path: display(cwd, `${base}.pdf`), format: 'pdf', item: item.id, variant: r.variant, inches, dpi, width: r.width, height: r.height });
		}
		if (r.png) {
			write(`${base}.png`, r.png);
			files.push({ path: display(cwd, `${base}.png`), format: 'png', item: item.id, variant: r.variant, inches, dpi, width: r.width, height: r.height });
		}
	}
	emit(o, { files, dpi, note: merchCatalog().note }, () => files.map((f) => `${f.path}  ${f.inches}${f.format === 'png' ? `, ${f.width}x${f.height} px at ${f.dpi} dpi` : ''}`).join('\n'));
}
