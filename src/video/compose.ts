import { readFileSync } from 'node:fs';
import { brand, colorHex, tokens } from '../lib/brand.js';
import { pkgPath } from '../lib/paths.js';
import { type GroundId } from '../image/catalog.js';
import { baseline, cssOf, fitText, measure, type Fitted, type Role } from '../image/fonts.js';
import { type VideoSize, type VideoTemplateId } from './catalog.js';

export type ClipCopy = {
	template: VideoTemplateId;
	size: VideoSize;
	ground: GroundId;
	headline?: string;
	subtext?: string;
	eyebrow?: string;
};

type Drawn = { height: number; svg: (y: number) => string };

function paint(name: string) {
	const hex = colorHex(name);
	if (!hex) throw new Error(`Missing color token ${name}.`);
	return hex;
}

function lengthPx(token: string) {
	const raw = tokens().site[token];
	if (!raw) throw new Error(`Missing token ${token}.`);
	if (raw.endsWith('rem')) return Number.parseFloat(raw) * 16;
	if (raw.endsWith('px')) return Number.parseFloat(raw);
	throw new Error(`Token ${token} is not a length.`);
}

function esc(value: string) {
	return value.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[ch]!);
}

function n(value: number) {
	return String(Math.round(value * 100) / 100);
}

let markUri: string | undefined;
function mark() {
	markUri ??= `data:image/png;base64,${readFileSync(pkgPath('brand', 'logo', 'mark.png')).toString('base64')}`;
	return markUri;
}

let octopus: { uri: string; width: number; height: number } | undefined;
function mascot() {
	if (octopus) return octopus;
	const buf = readFileSync(pkgPath('brand', 'logo', 'octopus.png'));
	if (buf.length < 24 || buf.toString('ascii', 1, 4) !== 'PNG') throw new Error('brand/logo/octopus.png is not a PNG.');
	octopus = { uri: `data:image/png;base64,${buf.toString('base64')}`, width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
	return octopus;
}

let wordPath: { d: string; w: number; h: number } | undefined;
function wordmark() {
	if (wordPath) return wordPath;
	const svg = readFileSync(pkgPath('brand', 'logo', 'wordmark.svg'), 'utf8');
	const d = svg.match(/\sd="([^"]+)"/)?.[1];
	const box = svg.match(/viewBox="([^"]+)"/)?.[1]?.split(/\s+/).map(Number);
	if (!d || !box || box.length !== 4) throw new Error('The wordmark file has no path.');
	wordPath = { d, w: box[2], h: box[3] };
	return wordPath;
}

function siteHost() {
	const site = brand().site;
	if (!site) return undefined;
	try {
		return new URL(site).host || undefined;
	} catch {
		return site.replace(/^https?:\/\//, '').replace(/\/$/, '') || undefined;
	}
}

function textSvg(fitted: Fitted, role: Role, x: number, top: number, fill: string) {
	if (!fitted.lines.length) return '';
	const { family, weight } = cssOf(role);
	return fitted.lines
		.map((line, index) => {
			const y = baseline(role, fitted.size, top + index * fitted.lineHeight, fitted.lineHeight);
			return `<text x="${n(x)}" y="${n(y)}" font-family="${esc(family)}" font-size="${fitted.size}" font-weight="${weight}" fill="${fill}" letter-spacing="0">${esc(line)}</text>`;
		})
		.join('\n');
}

function lockup(x: number, y: number, markSize: number, ink: string) {
	const word = wordmark();
	const wordH = Math.round(markSize * 0.5);
	const scale = wordH / word.h;
	const wordW = word.w * scale;
	const gap = Math.round(markSize * 0.28);
	const wordY = y + (markSize - wordH) / 2;
	const svg = [
		`<image href="${mark()}" x="${n(x)}" y="${n(y)}" width="${n(markSize)}" height="${n(markSize)}"/>`,
		`<g transform="translate(${n(x + markSize + gap)} ${n(wordY)}) scale(${n(scale)})">`,
		`<path d="${word.d}" fill="${ink}"/>`,
		'</g>',
	].join('\n');
	return { svg, width: markSize + gap + wordW, height: markSize };
}

function clipLabel(label: string, size: number, inner: number) {
	if (measure('medium', label, size) <= inner) return label;
	const markChar = '…';
	let next = label;
	while (next && measure('medium', `${next}${markChar}`, size) > inner) next = next.slice(0, -1).trimEnd();
	return next ? `${next}${markChar}` : markChar;
}

function pill(text: string, x: number, maxWidth: number, maxSize: number): Drawn {
	const raw = text.replace(/\s+/g, ' ').trim();
	let size = maxSize;
	const padX = () => Math.round(size * 0.9);
	const heightOf = () => Math.round(size * 2.25);
	while (size > 13 && measure('medium', raw, size) + padX() * 2 > maxWidth) size -= 1;
	const label = clipLabel(raw, size, Math.max(8, maxWidth - padX() * 2));
	const height = heightOf();
	const width = Math.min(maxWidth, Math.ceil(measure('medium', label, size) + padX() * 2));
	const { family, weight } = cssOf('medium');
	return {
		height,
		svg(y: number) {
			const yText = baseline('medium', size, y + (height - size * 1.25) / 2, size * 1.25);
			return [
				`<rect x="${n(x)}" y="${n(y)}" width="${n(width)}" height="${n(height)}" rx="${n(height / 2)}" fill="${paint('pink')}"/>`,
				`<text x="${n(x + padX())}" y="${n(yText)}" font-family="${esc(family)}" font-size="${size}" font-weight="${weight}" fill="${paint('rose')}" letter-spacing="0">${esc(label)}</text>`,
			].join('\n');
		},
	};
}

function block(text: string | undefined, role: Role, x: number, maxWidth: number, maxHeight: number, maxSize: number, minSize: number, maxLines: number, leading: number, fill: string) {
	const fitted = fitText(text ?? '', role, { maxWidth, maxHeight, maxSize, minSize, maxLines, leading });
	return {
		height: fitted.height,
		svg(y: number) {
			return textSvg(fitted, role, x, y, fill);
		},
	};
}

export type PreparedClip = {
	width: number;
	height: number;
	background: string;
	staticSvg: string;
	motionSvg: (progress: number) => string;
};

/** Layout once, then paint each frame from the same lines with a new opacity and offset. */
export function prepareClip(copy: ClipCopy): PreparedClip {
	const { size } = copy;
	const background = copy.ground === 'lilac' ? paint('bg-subtle') : paint('bg-default');
	const ink = paint('text-default');
	const secondary = paint('text-secondary');
	const brandInk = paint('text-brand');
	const x = size.pad;
	const maxWidth = size.width - size.pad * 2;
	const lock = lockup(x, size.pad, size.mark, ink);
	const host = siteHost();
	const hostSize = size.meta;
	const hostBaseline = size.height - size.pad;
	const hostSvg = host
		? `<text x="${n(x)}" y="${n(hostBaseline)}" font-family="${esc(cssOf('mono').family)}" font-size="${hostSize}" font-weight="${cssOf('mono').weight}" fill="${paint('text-muted')}" letter-spacing="0">${esc(host)}</text>`
		: '';
	const bottom = host ? hostBaseline - hostSize * 1.4 : size.height - size.pad;
	const top = size.pad + size.mark + Math.round(size.pad * 0.45);
	const inset = copy.template === 'product' ? lengthPx('--ds-section-padding') : 0;
	const textX = x + inset;
	const textWidth = maxWidth - inset * 2;
	const gap = 20;
	const rise = 12;
	const pieces: { height: number; svg: (y: number) => string }[] = [];
	if (copy.template === 'announce' && copy.eyebrow) {
		pieces.push(pill(copy.eyebrow, textX, textWidth, size.kicker));
	} else if (copy.eyebrow) {
		const drawn = block(copy.eyebrow, 'medium', textX, textWidth, size.kicker * 2, size.kicker, 14, 1, 1.2, brandInk);
		pieces.push(drawn);
	}
	const budget = Math.max(0, bottom - top - rise - inset * 2);
	const used = () => pieces.reduce((sum, piece, index) => sum + piece.height + (index > 0 ? gap : 0), 0);
	const remain = () => budget - used() - (pieces.length ? gap : 0);
	pieces.push(block(copy.headline, 'sans', textX, textWidth, Math.max(size.headline, remain()), size.headline, 28, 4, 1.15, ink));
	if (copy.subtext && remain() >= 16) pieces.push(block(copy.subtext, 'sans', textX, textWidth, remain(), size.sub, 18, 3, 1.35, secondary));
	const stackHeight = used();
	let cursor = top + inset;
	const motionParts = pieces.map((piece, index) => {
		if (index > 0) cursor += gap;
		const y = cursor;
		cursor += piece.height;
		return piece.svg(y);
	});
	let panel = '';
	if (copy.template === 'product') {
		const radius = lengthPx('--ds-radius-dialog');
		const panelX = x;
		const panelY = top;
		const panelW = maxWidth;
		const panelH = Math.min(bottom - top, stackHeight + rise + inset * 2);
		panel = [
			`<rect x="${n(panelX)}" y="${n(panelY)}" width="${n(panelW)}" height="${n(panelH)}" rx="${n(radius)}" fill="${paint('bg-default')}"/>`,
			`<rect x="${n(panelX + 0.5)}" y="${n(panelY + 0.5)}" width="${n(panelW - 1)}" height="${n(panelH - 1)}" rx="${n(Math.max(0, radius - 0.5))}" fill="none" stroke="${paint('border-ring')}" stroke-width="1"/>`,
		].join('\n');
	}
	let mascotSvg = '';
	if (size.mascot > 0) {
		const art = mascot();
		const width = size.mascot;
		const height = Math.round(width * (art.height / art.width));
		const mx = size.width - size.pad - width;
		const my = size.height - size.pad - height;
		mascotSvg = `<image href="${art.uri}" x="${n(mx)}" y="${n(my)}" width="${n(width)}" height="${n(height)}"/>`;
	}
	const staticSvg = [lock.svg, panel, mascotSvg, hostSvg].filter(Boolean).join('\n');
	const motion = motionParts.filter(Boolean).join('\n');
	return {
		width: size.width,
		height: size.height,
		background,
		staticSvg,
		motionSvg: (progress) => {
			const opacity = Math.round(Math.min(1, Math.max(0, progress)) * 10000) / 10000;
			const dy = Math.round((1 - opacity) * rise);
			return `<g opacity="${opacity}" transform="translate(0 ${dy})">\n${motion}\n</g>`;
		},
	};
}

export function frameSvg(clip: PreparedClip, progress: number) {
	const svg = [
		`<svg xmlns="http://www.w3.org/2000/svg" width="${clip.width}" height="${clip.height}" viewBox="0 0 ${clip.width} ${clip.height}">`,
		`<rect width="${clip.width}" height="${clip.height}" fill="${clip.background}"/>`,
		clip.staticSvg,
		clip.motionSvg(progress),
		'</svg>',
	].join('\n');
	return { svg, background: clip.background };
}
