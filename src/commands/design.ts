import type { Command } from 'commander';
import { adapter, paint } from '../design/adapter.js';
import { runDesign } from '../design/index.js';
import { cli } from '../lib/brand.js';

// `design`: make a picture, revise it in plain words or exact edits, check it, undo it. It reads its own arguments, so the
// program's flags are never mistaken for the design's; commander only lists it.

export function designCommand(program: Command) {
	program
		.command('design [args...]')
		.description('Make a design and revise it: new, revise "bigger headline, logo top right", edit, undo, redo, history, show, variants, compare, sizes, render, check')
		.allowUnknownOption()
		.helpOption(false);
}

/** Runs `design ...` when that is the command; returns false when it is not. */
export async function tryDesign(argv: string[]): Promise<boolean> {
	if (argv[0] !== 'design') return false;
	process.exitCode = await runDesign(argv.slice(1), adapter(), { cwd: process.cwd(), bin: cli(), out: (s) => process.stdout.write(`${s}\n`), err: (s) => process.stderr.write(`${s}\n`), paint });
	return true;
}
