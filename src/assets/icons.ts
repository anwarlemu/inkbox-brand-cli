import { readdirSync, readFileSync } from 'node:fs';
import { pkgPath } from '../lib/paths.js';
import { artImage, themeNames, themes } from './brand-art.js';
import { surface, toPng, withAlpha } from './canvas.js';
import { pick } from './io.js';
import { brandColor } from './brand-art.js';

// Icons and marks: the favicon set, app icons and the brand's own glyphs. Each is the octopus (the brand's mark, its
// own art, never redrawn) on a theme's ground, at the sizes browsers and app stores ask for. The glyphs are the
// Phosphor icons the console uses (MIT licence), as their SVG files.

export type IconFile = { name: string; width: number; height: number; data: Buffer; purpose: string };

/** Sizes and what each is for. `pad` is the share of the side left round the octopus; maskable keeps it inside the
 * middle 80 percent circle Android may crop to. */
export const ICONS: { name: string; size: number; pad: number; purpose: string; ground: boolean }[] = [
	{ name: 'favicon-16.png', size: 16, pad: 0.02, purpose: 'browser tab', ground: false },
	{ name: 'favicon-32.png', size: 32, pad: 0.04, purpose: 'browser tab, high density', ground: false },
	{ name: 'favicon-48.png', size: 48, pad: 0.06, purpose: 'Windows site tile', ground: false },
	{ name: 'apple-touch-icon.png', size: 180, pad: 0.14, purpose: 'iOS home screen (no transparency)', ground: true },
	{ name: 'icon-192.png', size: 192, pad: 0.12, purpose: 'web app manifest', ground: true },
	{ name: 'icon-512.png', size: 512, pad: 0.12, purpose: 'web app manifest', ground: true },
	{ name: 'icon-maskable-512.png', size: 512, pad: 0.24, purpose: 'web app manifest, maskable (inside the 80% safe circle)', ground: true },
	{ name: 'app-icon-1024.png', size: 1024, pad: 0.16, purpose: 'App Store and Play Store (no transparency)', ground: true },
];

async function draw(size: number, pad: number, theme: string, ground: boolean): Promise<Buffer> {
	const s = surface(size, size);
	const t = themes()[theme]!;
	if (ground) {
		s.ctx.fillStyle = t.bg;
		s.ctx.fillRect(0, 0, size, size);
	}
	const im = await artImage('sit');
	const w = size * (1 - 2 * pad);
	const h = (w * im.height) / im.width;
	if (ground && size >= 128) {
		const k = w / 281.7;
		const c = (a: number) => withAlpha(brandColor('shadow'), a);
		s.ctx.filter = `drop-shadow(0 ${8 * k}px ${8.5 * k}px ${c(0.12)}) drop-shadow(0 ${31 * k}px ${15 * k}px ${c(0.08)})`;
	}
	s.ctx.drawImage(im, (size - w) / 2, (size - h) / 2, w, h);
	s.ctx.filter = 'none';
	return toPng(s, { opaque: ground });
}

/** An .ico holding PNGs (every browser since IE 11 reads them). */
export function ico(pngs: { size: number; data: Buffer }[]): Buffer {
	const head = Buffer.alloc(6 + 16 * pngs.length);
	head.writeUInt16LE(0, 0);
	head.writeUInt16LE(1, 2);
	head.writeUInt16LE(pngs.length, 4);
	let at = head.length;
	pngs.forEach((p, i) => {
		const o = 6 + i * 16;
		head.writeUInt8(p.size >= 256 ? 0 : p.size, o);
		head.writeUInt8(p.size >= 256 ? 0 : p.size, o + 1);
		head.writeUInt16LE(1, o + 4);
		head.writeUInt16LE(32, o + 6);
		head.writeUInt32LE(p.data.length, o + 8);
		head.writeUInt32LE(at, o + 12);
		at += p.data.length;
	});
	return Buffer.concat([head, ...pngs.map((p) => p.data)]);
}

/** The favicon set, app icons, a web manifest snippet and the HTML to link them. */
export async function iconSet(themeName = 'paper'): Promise<{ files: IconFile[]; html: string; manifest: string }> {
	const theme = pick('theme', themeName, themeNames());
	const files: IconFile[] = [];
	for (const i of ICONS) files.push({ name: i.name, width: i.size, height: i.size, data: await draw(i.size, i.pad, theme, i.ground), purpose: i.purpose });
	const small = files.filter((f) => ['favicon-16.png', 'favicon-32.png', 'favicon-48.png'].includes(f.name)).map((f) => ({ size: f.width, data: f.data }));
	files.unshift({ name: 'favicon.ico', width: 48, height: 48, data: ico(small), purpose: 'browser tab (16, 32 and 48 inside)' });
	const bg = themes()[theme]!.bg;
	const manifest = `${JSON.stringify({ icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }, { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }], theme_color: bg, background_color: bg }, null, '\t')}\n`;
	const html = ['<link rel="icon" href="/favicon.ico" sizes="48x48">', '<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">', '<link rel="apple-touch-icon" href="/apple-touch-icon.png">', '<link rel="manifest" href="/site.webmanifest">'].join('\n');
	return { files, html: `${html}\n`, manifest };
}

/** The brand's glyphs: the Phosphor icons the console uses, by name. Apple's logo (the console's iMessage glyph) is
 * another company's mark, so it is left out. */
export function glyphs(): { name: string; svg: string }[] {
	const dir = pkgPath('brand', 'assets', 'icons');
	return readdirSync(dir).filter((f) => f.endsWith('.svg') && f !== 'apple-logo.svg').sort().map((f) => ({ name: f.replace(/\.svg$/, ''), svg: readFileSync(`${dir}/${f}`, 'utf8') }));
}
