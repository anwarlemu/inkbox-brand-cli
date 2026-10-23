// Limits CI enforces on the harness itself: no brand strings in the engine, no em dashes, a short contract.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const brand = JSON.parse(readFileSync(join(root, 'brand', 'brand.json'), 'utf8'));
const errors = [];
const walk = (dir) => readdirSync(join(root, dir)).flatMap((f) => (statSync(join(root, dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));

for (const file of walk('src')) {
	const text = readFileSync(join(root, file), 'utf8');
	for (const word of [brand.name, brand.bin]) if (text.includes(word)) errors.push(`${file}: brand string "${word}" (read it from brand/brand.json)`);
}
for (const file of [...walk('src'), ...walk('registry'), ...walk('brand').filter((f) => /\.(md|json|css|js)$/.test(f)), 'README.md', 'CLAUDE.md']) {
	if (readFileSync(join(root, file), 'utf8').includes('—')) errors.push(`${file}: em dash`);
}
const contract = readFileSync(join(root, 'brand', 'contract.md'), 'utf8').trim().split('\n').length;
if (contract > 12) errors.push(`brand/contract.md: ${contract} lines (max 12)`);

if (errors.length) {
	console.error(errors.join('\n'));
	process.exit(1);
}
console.log(`ci limits: no brand strings in src, no em dashes, contract ${contract} lines`);
