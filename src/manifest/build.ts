import { readFileSync } from 'node:fs';
import type { Command, Option } from 'commander';
import { brandSummary } from '../brand/system.js';
import { logoDoc } from '../assets/brand-art.js';
import { deckCatalog } from '../assets/deck.js';
import { imageCatalog } from '../assets/image.js';
import { illustrateCatalog } from '../assets/illustrate.js';
import { merchCatalog } from '../assets/merch.js';
import { videoCatalog } from '../assets/video.js';
import { adapter } from '../design/adapter.js';
import { designManifest } from '../design/index.js';
import { listComponents } from '../library/describe.js';
import { brand, cli } from '../lib/brand.js';
import { pkgPath } from '../lib/paths.js';
import { principleDocument, principleTopics } from '../principles/read.js';

// The one document an agent reads first (`manifest`, alias `describe`). Commands and flags are read from the command
// definitions, so they cannot drift; templates, sizes, slots, themes, subjects, lockups and rules come from brand/.

const flagOf = (o: Option) => o.long?.replace(/^--/, '') ?? o.short?.replace(/^-/, '') ?? o.flags;

export function commandsOf(program: Command) {
	return program.commands.map((c) => ({
		name: c.name(),
		aliases: c.aliases(),
		usage: `${cli()} ${c.name()}${c.usage() ? ` ${c.usage()}` : ''}`,
		summary: c.description(),
		flags: c.options.map(flagOf).filter((f, i, all) => all.indexOf(f) === i),
		subcommands: c.commands.map((s) => ({ name: `${c.name()} ${s.name()}`, summary: s.description(), flags: s.options.map(flagOf) })),
	}));
}

/** Every capability an agent can use, with the names it must not invent. */
export function manifest(program: Command) {
	const version = JSON.parse(readFileSync(pkgPath('package.json'), 'utf8')).version as string;
	const components = listComponents();
	const rules = principleDocument();
	const bin = cli();
	return {
		ok: true as const,
		schemaVersion: 2 as const,
		name: brand().name,
		bin: brand().bin,
		run: bin,
		version,
		entry: 'manifest',
		alias: 'describe',
		validation: 'Every command checks its inputs against this document. An unknown command, template, occasion, size, theme, slide type, video template, merch item, variant, subject, component, token or content field exits 1 and names the closest match and what is allowed (--json gives { ok: false, error }). The CLI does not substitute a nearby value.',
		determinism: 'The same inputs write byte-identical PNG, SVG, PDF and (with ffmpeg) MP4 and WebM files.',
		commands: commandsOf(program),
		assets: {
			image: imageCatalog(),
			deck: deckCatalog(),
			video: videoCatalog(),
			merch: merchCatalog(),
			illustrate: illustrateCatalog(),
			figma: {
				actions: ['tokens', 'push', 'pull', 'check'],
				push: ['image', 'slide', 'illustration', 'asset', 'component', 'page'],
				note: 'The CLI never calls Figma: each action writes files and prints the Figma MCP tool calls to make, in order.',
			},
			design: designManifest(adapter(), bin),
			lockups: logoDoc().lockups,
			rules: { illustration: 'brand/illustration.md', images: 'brand/assets/image.json notes' },
		},
		brand: brandSummary(),
		components: { commands: ['components', 'components list', 'components inspect <name>', 'components emit <name>'], count: components.count, items: components.items },
		principles: {
			commands: ['principles', 'principles <topic>'],
			topics: principleTopics(),
			summary: rules.summary,
			product: { look: rules.product.look, do: rules.product.do, dont: rules.product.dont },
			website: { look: rules.website.look, do: rules.website.do, dont: rules.website.dont },
			voice: { source: rules.voice.source, avoid: rules.voice.avoid },
		},
		start: [`${bin} manifest --json`, `${bin} brand --json`, `${bin} components list --json`, `${bin} image --list --json`, `${bin} deck --list --json`, `${bin} illustrate --list --json`],
	};
}
