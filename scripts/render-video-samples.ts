import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { renderVideo } from '../src/video/render.js';
import { videoSamples } from './video-samples.js';

/** Regenerates the committed sample videos. Run with `npx tsx scripts/render-video-samples.ts`. */
const outDir = join(import.meta.dirname, '..', 'brand', 'video', 'samples');
mkdirSync(outDir, { recursive: true });

for (const sample of videoSamples) {
	const result = await renderVideo({ ...sample, outDir });
	console.log(result.files.map((file) => `${file.path} ${file.bytes}`).join('\n'));
}
