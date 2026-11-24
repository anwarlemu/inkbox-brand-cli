import type { Command } from 'commander';
import { unknown } from '../assets/io.js';
import { deckCommand } from './deck.js';
import { designCommand } from './design.js';
import { iconsCommand } from './icons.js';
import { emailCommand } from './email.js';
import { figmaCommand } from './figma.js';
import { illustrateCommand } from './illustrate.js';
import { imageCommand } from './image.js';
import { manifestCommand } from './manifest.js';
import { merchCommand } from './merch.js';
import { videoCommand } from './video.js';

// The asset commands: image (share images, social posts, banners; og and social), deck, video, merch, illustrate,
// design, figma, and manifest (describe), the one document that lists them all for agents.

export function assets(program: Command) {
	imageCommand(program);
	deckCommand(program);
	videoCommand(program);
	merchCommand(program);
	illustrateCommand(program);
	designCommand(program);
	iconsCommand(program);
	emailCommand(program);
	figmaCommand(program);
	manifestCommand(program);
}

/** The bare command restyles the project and takes no arguments, so a mistyped command would read as an extra
 * argument. Name it as an unknown command with the closest ones instead, and exit 1. Runs after every command is
 * registered. */
export function rejectUnknownCommand(program: Command, argv: string[]) {
	const valued = new Set(program.options.filter((o) => o.required || o.optional).flatMap((o) => [o.long, o.short].filter((f): f is string => !!f)));
	let first: string | undefined;
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i]!;
		if (a === '--') break;
		if (a.startsWith('-')) {
			if (valued.has(a)) i++;
			continue;
		}
		first = a;
		break;
	}
	if (!first) return;
	const names = program.commands.flatMap((c) => [c.name(), ...c.aliases()]);
	if (names.includes(first) || first === 'help') return;
	const err = unknown('command', first, program.commands.map((c) => c.name()));
	if (argv.includes('--json')) process.stdout.write(`${JSON.stringify({ ok: false, error: err.message })}\n`);
	else process.stderr.write(`${err.message}\n`);
	process.exit(1);
}
