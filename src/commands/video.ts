import { join, resolve } from 'node:path';
import type { Command } from 'commander';
import { picturesFor, readPicture } from '../assets/image.js';
import { display, num, pick, write, type OutFile } from '../assets/io.js';
import { encode, hasFfmpeg, stillFrame, videoCatalog, videoDoc, videoFrames, videoTemplates, type VideoOptions } from '../assets/video.js';
import { cli } from '../lib/brand.js';
import { helpRow } from '../lib/help-row.js';
import { emit } from '../lib/output.js';

// `video`: share designs whose layers come in on the brand's ease-out, as MP4 and WebM through ffmpeg, PNG frames, or
// one still frame.

type Opts = Record<string, string | boolean | undefined> & { json?: boolean };

export function videoCommand(program: Command) {
	program
		.command('video [template]')
		.description('Motion pieces (reveal, inbox, band, announce, card) at square, portrait, vertical and landscape: MP4 and WebM through ffmpeg, else PNG frames')
		.option('-s, --size <size>', 'square (default), portrait, vertical or landscape')
		.option('--layout <template>', 'reveal: the share template to bring in (tile, reef, hatch, partner, ...)')
		.option('--theme <name>', 'paper, mist, mono, lavender, purple or deep')
		.option('--occasion <name>', 'launch, feature, partnership, funding, hiring, changelog, milestone or event: its words')
		.option('--headline <text>', 'the headline; *stars* highlight a phrase')
		.option('--body <text>', 'the line under it')
		.option('--badge <style>', 'pill, solid, dot or none')
		.option('--badge-text <text>', 'the badge\'s words')
		.option('--image <file>', 'inbox: your capture in the window instead of the console')
		.option('--seconds <n>', 'length, 2 to 20 (default: the template\'s)')
		.option('--fps <n>', '12 to 60 (default 30)')
		.option('--reduced-motion', 'fades only, no movement')
		.option('-f, --format <format>', 'mp4, webm, frames or all (default: mp4 and webm with ffmpeg, frames without)')
		.option('--still [seconds]', 'one PNG frame instead of a video (default: the last, the finished design)')
		.option('-o, --out <path>', 'output directory (default video/); with --still, a .png file name')
		.option('--list', 'templates, sizes and timing')
		.option('--json', 'JSON output')
		.action(async (template: string | undefined, _o, cmd: Command) => runVideo(template, cmd.optsWithGlobals() as Opts))
		.addHelpText('after', () => {
			const b = cli();
			return [
				'',
				'Examples:',
				helpRow(`${b} video reveal --layout reef --size vertical`, 'a story', 50),
				helpRow(`${b} video inbox --size landscape`, 'messages arriving', 50),
				helpRow(`${b} video band --headline "We raised *$4M*"`, '', 50),
				helpRow(`${b} video card --occasion changelog --still`, 'the poster frame as PNG', 50),
				'',
				'Frames are a pure function of time: the same flags give the same frames and, with ffmpeg, the same files.',
			].join('\n');
		});
}

async function runVideo(positional: string | undefined, o: Opts) {
	const cwd = process.cwd();
	if (o.list) {
		const cat = videoCatalog();
		emit(o, cat, () => [
			...cat.templates.map((t) => helpRow(t.id, `${t.description} (${t.layout}, ${t.theme}, ${t.seconds} s)`, 10)),
			'',
			`Sizes: ${cat.sizes.map((s) => `${s.id} ${s.width}x${s.height}`).join(', ')}. ${cat.fps} fps.`,
			`Easing: ${cat.easing.token} ${cat.easing.value}; entrances ${Math.round(cat.enter.seconds * 1000)} ms, ${Math.round(cat.enter.stagger * 1000)} ms apart.`,
			cat.encoder,
		].join('\n'));
		return;
	}
	const id = pick('video template', positional ?? 'reveal', videoTemplates());
	const def = videoDoc().templates[id]!;
	const ff = hasFfmpeg();
	const format = pick('format', String(o.format ?? (ff ? 'all' : 'frames')), ['mp4', 'webm', 'frames', 'all'] as const);
	if ((format === 'mp4' || format === 'webm' || format === 'all') && !ff && o.still === undefined) throw new Error(`${format === 'all' ? 'MP4 and WebM need' : `${format.toUpperCase()} needs`} ffmpeg on the PATH. Without it: --format frames.`);
	const sizeId = pick('size', String(o.size ?? 'square'), Object.keys(videoDoc().sizes));
	const [width, height] = videoDoc().sizes[sizeId]!;
	const fps = num('fps', o.fps, 12, 60, { integer: true }) ?? videoDoc().fps;
	const seconds = num('seconds', o.seconds, 2, 20) ?? def.seconds;
	const opts: VideoOptions = {
		template: id,
		size: sizeId,
		width,
		height,
		seconds,
		fps,
		reduced: !!o.reducedMotion,
		layout: typeof o.layout === 'string' ? o.layout : undefined,
		theme: typeof o.theme === 'string' ? o.theme : undefined,
		occasion: typeof o.occasion === 'string' ? o.occasion : undefined,
		headline: typeof o.headline === 'string' ? o.headline : undefined,
		body: typeof o.body === 'string' ? o.body : undefined,
		badge: typeof o.badge === 'string' ? o.badge : undefined,
		badgeText: typeof o.badgeText === 'string' ? o.badgeText : undefined,
		picture: typeof o.image === 'string',
	};
	const pics = await picturesFor(typeof o.image === 'string' ? await readPicture(cwd, o.image) : null);
	const name = `${id}${opts.layout ? `-${opts.layout}` : ''}-${sizeId}`;
	const files: OutFile[] = [];
	if (o.still !== undefined) {
		const at = o.still === true ? seconds : num('still', o.still, 0, seconds)!;
		const file = typeof o.out === 'string' && /\.png$/i.test(o.out) ? resolve(cwd, o.out) : join(resolve(cwd, typeof o.out === 'string' ? o.out : 'video'), `${name}-${String(at).replace('.', '_')}s.png`);
		write(file, await stillFrame(opts, pics, at));
		files.push({ path: display(cwd, file), format: 'png', template: id, at, width, height });
		emit(o, { files }, () => files.map((f) => `${f.path}  ${f.width}x${f.height}, at ${f.at} s`).join('\n'));
		return;
	}
	const dir = resolve(cwd, typeof o.out === 'string' ? o.out : 'video');
	if (format === 'frames') {
		let n = 0;
		for await (const f of videoFrames(opts, pics)) {
			write(join(dir, name, `frame-${String(f.index).padStart(5, '0')}.png`), f.png());
			n++;
		}
		files.push({ path: display(cwd, join(dir, name)), format: 'frames', template: id, frames: n, fps, width, height });
	} else {
		const outputs = (format === 'all' ? (['mp4', 'webm'] as const) : [format]).map((f) => ({ path: join(dir, `${name}.${f}`), format: f as 'mp4' | 'webm' }));
		async function* rgba() {
			for await (const f of videoFrames(opts, pics)) yield f.rgba;
		}
		await encode(rgba(), { width, height, fps, outputs });
		for (const out of outputs) files.push({ path: display(cwd, out.path), format: out.format, template: id, seconds, fps, width, height });
	}
	emit(o, { files }, () => files.map((f) => `${f.path}  ${f.width}x${f.height}${f.format === 'frames' ? `, ${f.frames} frames` : `, ${f.seconds} s at ${f.fps} fps`}`).join('\n'));
}
