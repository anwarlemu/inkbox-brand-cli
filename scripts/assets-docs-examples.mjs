// Writes the docs site's asset gallery (apps/www/public/assets-examples) by running the built CLI itself, so every
// picture on the Assets, Illustrations and Figma pages is exactly what the command writes. Pictures are stored as WebP
// at half size to keep the repo light; examples.json lists each with the command that made it.
// usage: npm run build && node scripts/assets-docs-examples.mjs
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const root = new URL('..', import.meta.url).pathname;
const bin = join(root, 'bin.js');
const out = join(root, 'apps', 'www', 'public', 'assets-examples');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const work = mkdtempSync(join(tmpdir(), 'ds-docs-assets-'));

function cli(args) {
	return JSON.parse(execFileSync(process.execPath, [bin, ...args, '--json'], { cwd: work, encoding: 'utf8', maxBuffer: 1 << 26 }));
}

async function webp(file, id, scale = 0.5) {
	const im = await loadImage(readFileSync(join(work, file)));
	const w = Math.round(im.width * scale);
	const h = Math.round(im.height * scale);
	const c = createCanvas(w, h);
	c.getContext('2d').drawImage(im, 0, 0, w, h);
	writeFileSync(join(out, `${id}.webp`), c.toBuffer('image/webp', 86));
	return { src: `/assets-examples/${id}.webp`, width: w, height: h };
}

const examples = { image: [], social: [], deck: [], video: [], merch: [], illustrations: [] };
async function add(group, id, args, pick = (files) => files.find((f) => f.format === 'png'), scale) {
	const res = cli(args);
	const f = pick(res.files);
	examples[group].push({ id, command: args.join(' ').replace(/ --out \S+| --format \S+/g, ''), ...(await webp(f.path, id, scale)) });
}

const IMAGE = [['tile', 'launch'], ['app', 'launch'], ['outline', 'launch'], ['hatch', 'changelog'], ['reef', 'launch'], ['feature', 'feature'], ['partner', 'partnership'], ['funding', 'funding'], ['announce', 'hiring'], ['card', 'feature']];
for (const [t, occ] of IMAGE) await add('image', `image-${t}`, ['image', t, '--occasion', occ, '--sample', '--format', 'png', '--out', 'img']);
const SOCIAL = [
	['launch', 'square', []],
	['hiring', 'portrait', []],
	['feature', 'story', ['--template', 'feature']],
	['launch', 'x-banner', ['--template', 'reef', '--theme', 'lavender']],
	['launch', 'linkedin-banner', ['--template', 'tile']],
	['changelog', 'landscape', ['--template', 'card', '--theme', 'mist']],
];
for (const [occ, size, extra] of SOCIAL) await add('social', `social-${occ}-${size}`, ['image', '--occasion', occ, '--sample', '--size', size, ...extra, '--format', 'png', '--out', 'social']);
writeFileSync(join(work, 'deck.json'), JSON.stringify({ slides: ['cover', 'section', 'statement', 'bullets', 'stat', 'quote', 'image', 'end'].map((type) => ({ type, sample: true })) }));
const slides = cli(['deck', '--input', 'deck.json', '--out', 'deck']).files.filter((f) => f.format === 'png');
for (const f of slides) examples.deck.push({ id: f.slide, command: `deck ${f.slide} --sample`, ...(await webp(f.path, `deck-${f.slide}`, 0.25)) });
for (const [t, size] of [['reveal', 'square'], ['inbox', 'landscape'], ['band', 'square'], ['card', 'square']]) {
	const res = cli(['video', t, '--sample', '--size', size, '--format', 'mp4', '--out', 'video']);
	copyFileSync(join(work, res.files[0].path), join(out, `video-${t}.mp4`));
	const still = cli(['video', t, '--sample', '--size', size, '--still', '--out', 'video']);
	examples.video.push({ id: t, command: `video ${t} --sample --size ${size}`, video: `/assets-examples/video-${t}.mp4`, ...(await webp(still.files[0].path, `video-${t}`, 0.4)) });
}
for (const [item, variant] of [['tee-front', 'color'], ['tee-back', 'color'], ['hoodie-front', 'one-ink'], ['cap-front', 'one-purple'], ['tote', 'color'], ['mug-wrap', 'lavender'], ['sticker', 'paper'], ['poster', 'paper']])
	await add('merch', `merch-${item}`, ['merch', item, '--variant', variant, ...(['tee-back', 'poster'].includes(item) ? ['--sample'] : []), '--dpi', '72', '--format', 'png', '--out', 'merch'], undefined, 1);
for (const [s, extra] of [['octopus', []], ['octopus', ['--pose', 'hang', '--theme', 'purple']], ['reef', []], ['window', []], ['tile', []], ['pattern', []], ['outline', []], ['hatch', []]])
	await add('illustrations', `illustration-${s}${extra.length ? '-hang' : ''}`, ['illustrate', s, ...extra, '--format', 'png', '--out', `ill-${extra.length}`]);
// One SVG per kind, as written, for the Illustrations page's download links.
for (const s of ['reef', 'pattern']) {
	const res = cli(['illustrate', s, '--format', 'svg', '--out', 'svg']);
	copyFileSync(join(work, res.files[0].path), join(out, `illustration-${s}.svg`));
}
writeFileSync(join(out, 'examples.json'), `${JSON.stringify(examples, null, '\t')}\n`);
rmSync(work, { recursive: true, force: true });
console.log(`assets examples: ${Object.values(examples).flat().length} pictures in ${out}`);
