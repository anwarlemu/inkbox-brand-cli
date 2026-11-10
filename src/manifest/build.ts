import { readFileSync } from 'node:fs';
import { brandSummary } from '../brand/system.js';
import { imageCatalog } from '../image/catalog.js';
import { listComponents } from '../library/describe.js';
import { brand, cli } from '../lib/brand.js';
import { pkgPath } from '../lib/paths.js';
import { principleDocument, principleTopics } from '../principles/read.js';
import { videoCatalog } from '../video/catalog.js';

/** Every capability an agent can use, with the names it must not invent. */
export function manifest() {
	const version = JSON.parse(readFileSync(pkgPath('package.json'), 'utf8')).version as string;
	const images = imageCatalog();
	const video = videoCatalog();
	const components = listComponents();
	const rules = principleDocument();
	const system = brandSummary();
	const bin = cli();
	return {
		ok: true as const,
		schemaVersion: 1 as const,
		name: brand().name,
		bin: brand().bin,
		version,
		entry: 'manifest',
		alias: 'describe',
		determinism: 'The same inputs write byte-identical image and video files. Unknown templates, sizes, components, tokens, props, states and content fields exit 1. Pass --json for { ok: false, error }. Commands do not substitute a nearby name.',
		brand: system,
		images: {
			commands: ['image templates', 'image render', 'og', 'social'],
			templates: images.templates,
			sizes: images.sizes,
			grounds: images.grounds,
			exports: images.exports,
		},
		video: {
			commands: ['video templates', 'video render'],
			...video,
		},
		components: {
			commands: ['components', 'components list', 'components inspect <name>', 'components emit <name>'],
			count: components.count,
			items: components.items,
		},
		principles: {
			commands: ['principles', 'principles <topic>'],
			topics: principleTopics(),
			summary: rules.summary,
			product: { look: rules.product.look, do: rules.product.do, dont: rules.product.dont },
			website: { look: rules.website.look, do: rules.website.do, dont: rules.website.dont },
			voice: { source: rules.voice.source, avoid: rules.voice.avoid },
		},
		start: [`${bin} manifest --json`, `${bin} brand --json`, `${bin} components list --json`, `${bin} principles --json`, `${bin} image templates --json`, `${bin} video templates --json`],
	};
}
