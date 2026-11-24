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

const examples = { image: [], social: [], deck: [], video: [], merch: [], illustrations: [], designs: [], print: [], icons: [], email: [], compose: [] };
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
writeFileSync(join(work, 'deck.json'), JSON.stringify({ slides: ['cover', 'section', 'statement', 'bullets', 'agenda', 'timeline', 'stat', 'quote', 'image', 'qa', 'team', 'comparison', 'chart', 'end'].map((type) => ({ type, sample: true })) }));
const slides = cli(['deck', '--input', 'deck.json', '--out', 'deck']).files.filter((f) => f.format === 'png');
for (const f of slides) examples.deck.push({ id: f.slide, command: `deck ${f.slide} --sample`, ...(await webp(f.path, `deck-${f.slide}`, 0.25)) });
for (const [t, size] of [['reveal', 'square'], ['inbox', 'landscape'], ['band', 'square'], ['card', 'square'], ['logo', 'square'], ['stat', 'square']]) {
	const res = cli(['video', t, ...(t === 'stat' ? ['--headline', '*1,250* agents online'] : ['--sample']), '--size', size, '--format', 'mp4', '--out', 'video']);
	copyFileSync(join(work, res.files[0].path), join(out, `video-${t}.mp4`));
	const still = cli(['video', t, ...(t === 'stat' ? ['--headline', '*1,250* agents online'] : ['--sample']), '--size', size, '--still', '--out', 'video']);
	examples.video.push({ id: t, command: `video ${t} --sample --size ${size}`, video: `/assets-examples/video-${t}.mp4`, ...(await webp(still.files[0].path, `video-${t}`, 0.4)) });
}
for (const [item, variant] of [['sticker-sheet', 'paper'], ['socks', 'lavender'], ['tee-front', 'color'], ['tee-back', 'color'], ['hoodie-front', 'one-ink'], ['cap-front', 'one-purple'], ['tote', 'color'], ['mug-wrap', 'lavender'], ['sticker', 'paper'], ['poster', 'paper']])
	await add('merch', `merch-${item}`, ['merch', item, '--variant', variant, ...(['tee-back', 'poster'].includes(item) ? ['--sample'] : []), '--dpi', '72', '--format', 'png', '--out', 'merch'], undefined, 1);
for (const [s, extra] of [['octopus', []], ['octopus', ['--pose', 'hang', '--theme', 'purple']], ['reef', []], ['window', []], ['tile', []], ['pattern', []], ['outline', []], ['hatch', []]])
	await add('illustrations', `illustration-${s}${extra.length ? '-hang' : ''}`, ['illustrate', s, ...extra, '--format', 'png', '--out', `ill-${extra.length}`]);
// One SVG per kind, as written, for the Illustrations page's download links.
for (const s of ['reef', 'pattern']) {
	const res = cli(['illustrate', s, '--format', 'svg', '--out', 'svg']);
	copyFileSync(join(work, res.files[0].path), join(out, `illustration-${s}.svg`));
}
// A real design session: an X banner made, then revised step by step, as the Designs page shows it.
const steps = [
	['new tile --size x-banner --headline "Everything your agents need in one place" --badge "Now in beta" -o banner.design.json', ['design', 'new', 'tile', '--size', 'x-banner', '--headline', 'Everything your agents need in one place', '--badge', 'Now in beta', '-o', 'banner.design.json']],
	['revise banner.design.json "use the outline layout"', ['design', 'revise', 'banner.design.json', 'use the outline layout']],
	['revise banner.design.json "bigger headline"', ['design', 'revise', 'banner.design.json', 'bigger headline']],
	['revise banner.design.json "darker theme"', ['design', 'revise', 'banner.design.json', 'darker theme']],
	['revise banner.design.json "change the headline to \\"Every agent gets an inbox of its own\\", smaller octopus"', ['design', 'revise', 'banner.design.json', 'change the headline to "Every agent gets an inbox of its own", smaller octopus']],
	['revise banner.design.json "logo top right"', ['design', 'revise', 'banner.design.json', 'logo top right']],
	['edit banner.design.json --set body="Email, phone and calendars"', ['design', 'edit', 'banner.design.json', '--set', 'body=Email, phone and calendars']],
];
mkdirSync(join(work, 'design'), { recursive: true });
for (const [i, [command, args]] of steps.entries()) {
	execFileSync(process.execPath, [bin, ...args], { cwd: join(work, 'design'), encoding: 'utf8' });
	copyFileSync(join(work, 'design', 'banner.png'), join(work, `design-${i}.png`));
	examples.designs.push({ id: `design-${i}`, command: `design ${command}`, ...(await webp(`design-${i}.png`, `design-${i}`, 0.5)) });
}
let refused = '';
try {
	execFileSync(process.execPath, [bin, 'design', 'revise', 'banner.design.json', 'make the logo neon green'], { cwd: join(work, 'design'), encoding: 'utf8', stdio: 'pipe' });
} catch (err) {
	refused = String(err.stdout || err.stderr).trim();
}
examples.designs.push({ id: 'design-refused', command: 'design revise banner.design.json "make the logo neon green"', note: refused, src: examples.designs.at(-1).src, width: examples.designs.at(-1).width, height: examples.designs.at(-1).height });
for (const item of ['business-card', 'business-card-back', 'letterhead-letter', 'report-cover-letter', 'certificate-letter', 'event-badge', 'name-tag', 'notebook-cover'])
	await add('print', `print-${item}`, ['merch', item, '--sample', '--dpi', '72', '--format', 'png', '--out', 'print'], undefined, 1);
const icons = cli(['icons', '--out', 'icons']).files.filter((f) => f.format === 'png');
for (const f of icons) examples.icons.push({ id: f.path.split('/').pop(), command: `icons  (${f.path.split('/').pop()})`, ...(await webp(f.path, `icon-${f.width}-${examples.icons.length}`, 1)) });
const mails = [
	['announcement', ['--headline', 'Agent Cards are here', '--body', 'Every agent can now publish a card other agents can find.', '--button', 'Read more', '--url', 'https://acme.com', '--footer', 'Acme, 1 Main Street']],
	['receipt', ['--headline', 'Your receipt', '--items', 'Pro plan - $20 | Extra numbers - $5', '--total', '$25']],
	['password-reset', ['--headline', 'Reset your password', '--button', 'Reset password', '--url', 'https://acme.com/reset']],
	['signature', ['--name', 'Your name', '--role', 'Your role', '--email', 'you@acme.com', '--url', 'acme.com']],
];
for (const [kind, args] of mails) {
	cli(['email', kind, ...args, '--out', 'email']);
	mkdirSync(join(out, 'email'), { recursive: true });
	copyFileSync(join(work, 'email', `${kind}.html`), join(out, 'email', `${kind}.html`));
	examples.email.push({ id: kind, command: `email ${kind} ${args.map((a) => (a.startsWith('--') ? a : `"${a}"`)).join(' ')}`, src: `/assets-examples/email/${kind}.html`, width: 600, height: 400 });
}
copyFileSync(join(work, 'email', 'logo.png'), join(out, 'email', 'logo.png'));
// Compose: designs built from blocks on the grid, as the docs' Designs page shows them.
const composeRuns = [
	['flow', [['new', 'compose', '--size', 'og', '-o', 'flow.design.json'], ['compose', 'add', 'flow.design.json', 'headline', 'How a message *reaches an agent*', '--place', 'top-left'], ['compose', 'add', 'flow.design.json', 'flow', '--set', 'steps=Message in | Agent reads | Agent replies | Person sees it', '--at', '0,5,12,3'], ['compose', 'add', 'flow.design.json', 'logo', '--place', 'bottom-left']]],
	['chart', [['new', 'compose', '--size', 'square', '-o', 'chart.design.json'], ['compose', 'add', 'chart.design.json', 'headline', 'Where agents *get messages*', '--at', '0,0,12,2'], ['compose', 'add', 'chart.design.json', 'chart', '--set', 'data=Email 42 | Phone 31 | Cards 27', '--set', 'title=Messages by channel', '--at', '0,3,12,6'], ['compose', 'add', 'chart.design.json', 'art', '--at', '8,9,4,3'], ['compose', 'add', 'chart.design.json', 'logo', '--at', '0,11,4,1']]],
];
mkdirSync(join(work, 'compose'), { recursive: true });
for (const [name, runs] of composeRuns) {
	for (const args of runs) execFileSync(process.execPath, [bin, 'design', ...args], { cwd: join(work, 'compose'), encoding: 'utf8' });
	examples.compose.push({ id: `compose-${name}`, command: runs.map((a) => `design ${a.map((x) => (/\s/.test(x) ? `"${x}"` : x)).join(' ')}`).join('\n'), ...(await webp(`compose/${name}.png`, `compose-${name}`, 0.5)) });
}
writeFileSync(join(out, 'examples.json'), `${JSON.stringify(examples, null, '\t')}\n`);
rmSync(work, { recursive: true, force: true });
console.log(`assets examples: ${Object.values(examples).flat().length} pictures in ${out}`);
