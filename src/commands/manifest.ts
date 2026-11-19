import type { Command } from 'commander';
import { helpRow } from '../lib/help-row.js';
import { emit } from '../lib/output.js';
import { manifest } from '../manifest/build.js';

// `manifest` (alias `describe`): every command, template, size, slot, theme, subject, lockup and rule in one document.

export function manifestCommand(program: Command) {
	program
		.command('manifest')
		.alias('describe')
		.description('Every command, flag, template, size, slot, theme, subject, lockup, component and rule in one document (start here; pass --json)')
		.option('--json', 'JSON output')
		.action((_o, cmd: Command) => {
			const doc = manifest(program);
			emit(cmd.optsWithGlobals(), doc, () => {
				const a = doc.assets;
				return [
					`${doc.name} ${doc.version} (${doc.run}). Agents: ${doc.run} manifest --json`,
					'',
					'Commands',
					...doc.commands.map((c) => helpRow(c.name, c.summary, 14)),
					'',
					`Image templates: ${a.image.templates.map((t) => t.id).join(', ')}`,
					`Occasions: ${a.image.occasions.map((o) => o.id).join(', ')}`,
					`Image sizes: ${a.image.sizes.map((s) => (s.width ? `${s.id} ${s.width}x${s.height}` : s.id)).join(', ')}`,
					`Themes: ${a.image.themes.map((t) => t.id).join(', ')}`,
					`Deck slides: ${a.deck.slides.map((s) => s.id).join(', ')}`,
					`Video: ${a.video.templates.map((t) => t.id).join(', ')} at ${a.video.sizes.map((s) => s.id).join(', ')}`,
					`Merch: ${a.merch.items.map((i) => `${i.id} ${i.trim.width}x${i.trim.height} in`).join(', ')}`,
					`Illustrations: ${a.illustrate.subjects.map((s) => s.id).join(', ')}`,
					`Lockups: ${a.lockups.map((l) => l.id).join(', ')}`,
					`Components: ${doc.components.count}. Principle topics: ${doc.principles.topics.join(', ')}.`,
					'',
					doc.validation,
				].join('\n');
			});
		});
}
