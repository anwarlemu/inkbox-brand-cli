import { readFileSync } from 'node:fs';
import { brand, cli } from './brand.js';
import { pkgPath } from './paths.js';

/** One portable instruction source, shared by the website, CLI and installed project guide. */
export function agentGuide() {
	const b = brand();
	return readFileSync(pkgPath('brand', 'agent-guide.md'), 'utf8')
		.replaceAll('{{brand}}', b.name).replaceAll('{{bin}}', b.bin)
		.replaceAll('{{cli}}', cli()).replaceAll('{{source}}', b.source)
		.replaceAll('{{registry}}', b.registryUrl ?? '').trim();
}
