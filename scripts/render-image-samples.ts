import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { renderImage } from '../src/image/render.js';
import { imageSamples } from './image-samples.js';

/** Regenerates the committed sample pictures. Run with `npx tsx scripts/render-image-samples.ts`. */
const outDir = join(import.meta.dirname, '..', 'brand', 'imagery', 'samples');
mkdirSync(outDir, { recursive: true });

for (const sample of imageSamples) {
	const result = await renderImage({ ...sample, outDir, exports: ['png'] });
	console.log(result.files.map((file) => file.path).join('\n'));
}
