import { readFileSync } from 'node:fs';
import { brand, colorHex } from '../lib/brand.js';
import { pkgPath } from '../lib/paths.js';
import { tokens } from '../lib/brand.js';
import { type GroundId, type SizeSpec, type TemplateId } from './catalog.js';
import { baseline, cssOf, face as loadFace, fitText, measure, type Fitted, type Role } from './fonts.js';

export type Artwork = {
	template: TemplateId;
	size: SizeSpec;
	ground: GroundId;
	headline?: string;
	subtext?: string;
	eyebrow?: string;
	quote?: string;
	attribution?: string;
	/** A data URI, already read from disk. */
	imageHref?: string;
};

export type ArtworkSvg = { svg: string; roles: Role[]; background: string };

const used = new Set<Role>();

function paint(name: string): string {
	const hex = colorHex(name);
	if (!hex) throw new Error(`Missing color token ${name}.`);
	return hex;
}

function lengthPx(token: string): number {
	const raw = tokens().site[token];
	if (!raw) throw new Error(`Missing token ${token}.`);
	if (raw.endsWith('rem')) return Number.parseFloat(raw) * 16;
	if (raw.endsWith('px')) return Number.parseFloat(raw);
	throw new Error(`Token ${token} is not a length.`);
}

function esc(value: string): string {
	return value.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[ch]!);
}

function n(value: number): string {
	return String(Math.round(value * 100) / 100);
}

let markUri: string | undefined;
function mark(): string {
	markUri ??= `data:image/png;base64,${readFileSync(pkgPath('brand', 'logo', 'mark.png')).toString('base64')}`;
	return markUri;
}

let octopusUri: string | undefined;
function octopus(): string {
	octopusUri ??= `data:image/png;base64,${readFileSync(pkgPath('brand', 'logo', 'octopus.png')).toString('base64')}`;
	return octopusUri;
}

let wordPath: { d: string; w: number; h: number } | undefined;
function wordmark(): { d: string; w: number; h: number } {
	if (wordPath) return wordPath;
	const svg = readFileSync(pkgPath('brand', 'logo', 'wordmark.svg'), 'utf8');
	const d = svg.match(/\sd="([^"]+)"/)?.[1];
	const box = svg.match(/viewBox="([^"]+)"/)?.[1]?.split(/\s+/).map(Number);
	if (!d || !box || box.length !== 4) throw new Error('The wordmark file has no path.');
	wordPath = { d, w: box[2], h: box[3] };
	return wordPath;
}

function siteHost(): string | undefined {
	const site = brand().site;
	if (!site) return undefined;
	try {
		return new URL(site).host || undefined;
	} catch {
		return site.replace(/^https?:\/\//, '').replace(/\/$/, '') || undefined;
	}
}

function textLines(fitted: Fitted, role: Role, x: number, top: number, fill: string): string {
	if (!fitted.lines.length) return '';
	used.add(role);
	const { family, weight } = cssOf(role);
	return fitted.lines
		.map((line, index) => {
			const y = baseline(role, fitted.size, top + index * fitted.lineHeight, fitted.lineHeight);
			return `<text x="${n(x)}" y="${n(y)}" font-family="${esc(family)}" font-size="${fitted.size}" font-weight="${weight}" fill="${fill}" letter-spacing="0">${esc(line)}</text>`;
		})
		.join('\n');
}

function lockup(x: number, y: number, markSize: number, ink: string): { svg: string; width: number; height: number } {
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

function hostText(host: string, x: number, yBaseline: number, size: number, fill: string): string {
	used.add('mono');
	const { family, weight } = cssOf('mono');
	return `<text x="${n(x)}" y="${n(yBaseline)}" font-family="${esc(family)}" font-size="${size}" font-weight="${weight}" fill="${fill}" letter-spacing="0">${esc(host)}</text>`;
}

/** Pixel offset from the baseline to the bottom of the em box. Negative, because the descender hangs below it. */
function descentPx(role: Role, size: number): number {
	const item = loadFace(role);
	return (item.font.descent / item.font.unitsPerEm) * size;
}

function footerY(height: number, pad: number, size: number): number {
	// Sit the em box on the pad. descentPx is negative, so this lifts the baseline.
	return height - pad - descentPx('mono', size);
}

function place(blockHeight: number, topMin: number, bottomMax: number, bias: number): number {
	const space = bottomMax - topMin - blockHeight;
	if (space <= 8) return topMin;
	return topMin + Math.round(space * bias);
}

function fitted(text: string | undefined, role: Role, maxWidth: number, maxHeight: number, maxSize: number, minSize: number, maxLines: number, leading: number): Fitted {
	return fitText(text ?? '', role, { maxWidth, maxHeight, maxSize, minSize, maxLines, leading });
}

type Block = { height: number; draw: (y: number) => string };

function stack(blocks: Block[], gap: number): { height: number; draw: (y: number) => string } {
	const present = blocks.filter((block) => block.height > 0);
	const height = present.reduce((sum, block, index) => sum + block.height + (index > 0 ? gap : 0), 0);
	return {
		height,
		draw: (y) => {
			let cursor = y;
			return present
				.map((block, index) => {
					if (index > 0) cursor += gap;
					const svg = block.draw(cursor);
					cursor += block.height;
					return svg;
				})
				.filter(Boolean)
				.join('\n');
		},
	};
}

function kickerBlock(text: string | undefined, x: number, maxWidth: number, maxSize: number, fill: string): Block {
	const line = fitted(text, 'medium', maxWidth, maxSize * 1.6, maxSize, 14, 1, 1.2);
	return {
		height: line.height,
		draw: (y) => textLines(line, 'medium', x, y, fill),
	};
}

function bodyBlock(text: string | undefined, role: Role, x: number, maxWidth: number, maxHeight: number, maxSize: number, minSize: number, maxLines: number, leading: number, fill: string): Block {
	const line = fitted(text, role, maxWidth, maxHeight, maxSize, minSize, maxLines, leading);
	return { height: line.height, draw: (y) => textLines(line, role, x, y, fill) };
}

function clipLabel(label: string, size: number, inner: number): string {
	if (measure('medium', label, size) <= inner) return label;
	const mark = '…';
	let next = label;
	while (next && measure('medium', `${next}${mark}`, size) > inner) next = next.slice(0, -1).trimEnd();
	return next ? `${next}${mark}` : mark;
}

function pillBlock(text: string, x: number, maxWidth: number, maxSize: number): Block {
	const raw = text.replace(/\s+/g, ' ').trim();
	let size = maxSize;
	const padX = () => Math.round(size * 0.9);
	const heightOf = () => Math.round(size * 2.25);
	while (size > 13 && measure('medium', raw, size) + padX() * 2 > maxWidth) size -= 1;
	const label = clipLabel(raw, size, Math.max(8, maxWidth - padX() * 2));
	const height = heightOf();
	const width = Math.min(maxWidth, Math.ceil(measure('medium', label, size) + padX() * 2));
	return {
		height,
		draw: (y) => {
			used.add('medium');
			const { family, weight } = cssOf('medium');
			const yText = baseline('medium', size, y + (height - size * 1.25) / 2, size * 1.25);
			return [
				`<rect x="${n(x)}" y="${n(y)}" width="${n(width)}" height="${n(height)}" rx="${n(height / 2)}" fill="${paint('pink')}"/>`,
				`<text x="${n(x + padX())}" y="${n(yText)}" font-family="${esc(family)}" font-size="${size}" font-weight="${weight}" fill="${paint('rose')}" letter-spacing="0">${esc(label)}</text>`,
			].join('\n');
		},
	};
}

/** Distance from the baseline up to the middle of the glyph's ink. */
function inkAboveBaseline(role: Role, text: string, size: number): number {
	const item = loadFace(role);
	const box = item.font.layout(text).glyphs[0]?.bbox;
	if (!box || box.maxY <= box.minY) return size * 0.35;
	return ((box.minY + box.maxY) / 2 / item.font.unitsPerEm) * size;
}

function quoteTile(x: number, y: number, size: number): string {
	const radius = Math.min(lengthPx('--ds-radius-panel'), Math.round(size * 0.28));
	const glyph = Math.round(size * 0.62);
	used.add('medium');
	const { family, weight } = cssOf('medium');
	// Center the quote's ink in the tile. The glyph sits high in the em box, so the em box's middle is not the visual middle.
	const yText = y + size / 2 + inkAboveBaseline('medium', '“', glyph);
	return [
		`<rect x="${n(x)}" y="${n(y)}" width="${n(size)}" height="${n(size)}" rx="${n(radius)}" fill="${paint('pink')}"/>`,
		`<text x="${n(x + size / 2)}" y="${n(yText)}" text-anchor="middle" font-family="${esc(family)}" font-size="${glyph}" font-weight="${weight}" fill="${paint('rose')}" letter-spacing="0">“</text>`,
	].join('\n');
}

function skeleton(x: number, y: number, w: number, h: number, radius: number): string {
	const band = Math.round(Math.min(76, Math.max(56, h * 0.16)));
	const inset = Math.round(Math.min(28, Math.max(16, w * 0.035)));
	const tile = Math.round(Math.min(36, band * 0.56));
	const tileX = x + inset;
	const tileY = y + (band - tile) / 2;
	const tileMark = Math.round(tile * 0.7);
	const actionH = 12;
	const actionW = Math.round(Math.min(84, Math.max(48, w * 0.1)));
	const actionX = x + w - inset - actionW;
	const actionY = y + (band - actionH) / 2;
	const rows = h > 560 ? 5 : 4;
	const rowH = (h - band) / rows;
	const barH = 10;
	const widths = [0.4, 0.32, 0.36, 0.26, 0.34];
	const ends = [0.12, 0.09, 0.14, 0.1, 0.11];
	const parts = [
		`<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" fill="${paint('bg-default')}"/>`,
		`<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(band)}" fill="${paint('bg-subtle')}"/>`,
		`<rect x="${n(tileX)}" y="${n(tileY)}" width="${n(tile)}" height="${n(tile)}" rx="${n(Math.min(12, tile * 0.28))}" fill="${paint('pink')}"/>`,
		`<image href="${mark()}" x="${n(tileX + (tile - tileMark) / 2)}" y="${n(tileY + (tile - tileMark) / 2)}" width="${n(tileMark)}" height="${n(tileMark)}"/>`,
		`<rect x="${n(actionX)}" y="${n(actionY)}" width="${n(actionW)}" height="${actionH}" rx="${n(actionH / 2)}" fill="${paint('bg-subtle-hover')}"/>`,
	];
	for (let i = 0; i < rows; i++) {
		const rowY = y + band + rowH * i;
		if (i > 0) parts.push(`<rect x="${n(x)}" y="${n(rowY)}" width="${n(w)}" height="1" fill="${paint('border-row')}"/>`);
		const barY = rowY + (rowH - barH) / 2;
		const inner = w - inset * 2;
		const barW = Math.round(inner * widths[i % widths.length]);
		const endW = Math.round(inner * ends[i % ends.length]);
		parts.push(`<rect x="${n(x + inset)}" y="${n(barY)}" width="${n(barW)}" height="${barH}" rx="${barH / 2}" fill="${paint('bg-subtle-hover')}"/>`);
		parts.push(`<rect x="${n(x + w - inset - endW)}" y="${n(barY)}" width="${n(endW)}" height="${barH}" rx="${barH / 2}" fill="${paint('bg-subtle-hover')}"/>`);
	}
	return [
		`<clipPath id="card"><rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${n(radius)}"/></clipPath>`,
		'<g clip-path="url(#card)">',
		...parts,
		'</g>',
	].join('\n');
}

function frameCard(x: number, y: number, w: number, h: number, imageHref: string | undefined): string {
	const radius = lengthPx('--ds-radius-dialog');
	const ring = paint('border-ring');
	const body = imageHref
		? [
				`<clipPath id="card"><rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${n(radius)}"/></clipPath>`,
				`<image href="${imageHref}" x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" preserveAspectRatio="xMinYMin slice" clip-path="url(#card)"/>`,
			].join('\n')
		: skeleton(x, y, w, h, radius);
	const stroke = `<rect x="${n(x + 0.5)}" y="${n(y + 0.5)}" width="${n(w - 1)}" height="${n(h - 1)}" rx="${n(Math.max(0, radius - 0.5))}" fill="none" stroke="${ring}" stroke-width="1"/>`;
	return `${body}\n${stroke}`;
}

function poster(art: Artwork, ink: string, secondary: string, meta: string, host: string | undefined): string[] {
	const { size } = art;
	const x = size.pad;
	const maxWidth = size.width - size.pad * 2;
	const tall = size.height / size.width > 1.02;
	const lock = lockup(x, size.pad, size.mark, ink);
	const parts: string[] = [lock.svg];
	const topMin = size.pad + size.mark + Math.round(size.pad * (tall ? 0.55 : 0.42));
	const footerSize = size.meta;
	const bottomMax = host ? footerY(size.height, size.pad, footerSize) - footerSize * 1.15 : size.height - size.pad;
	const bias = tall ? 0.14 : 0.2;
	const gap = Math.round(Math.min(size.pad * 0.32, 22));
	const budget = Math.max(0, bottomMax - topMin);
	const blocks: Block[] = [];
	if (art.template === 'announcement' && art.eyebrow) blocks.push(pillBlock(art.eyebrow, x, maxWidth, size.kicker));
	else if (art.eyebrow && (art.template === 'headline' || art.template === 'statement')) blocks.push(kickerBlock(art.eyebrow, x, maxWidth, size.kicker, paint('text-brand')));
	const spent = () => blocks.reduce((sum, block, index) => sum + block.height + (index > 0 ? gap : 0), 0);
	const remain = () => budget - spent() - (blocks.length ? gap : 0);
	const wantsSub = (art.template === 'statement' || art.template === 'announcement') && Boolean(art.subtext);
	if (art.template === 'headline' || art.template === 'statement' || art.template === 'announcement') {
		const subLine = Math.round(18 * 1.4);
		const reserve = wantsSub ? subLine + gap : 0;
		const open = remain();
		// Keep a line for the subtext when the headline would otherwise take the whole field and spill into the footer.
		const headlineRoom = open - reserve >= Math.round(size.headline * 0.9) ? open - reserve : open;
		blocks.push(bodyBlock(art.headline, 'sans', x, maxWidth, Math.max(0, headlineRoom), size.headline, 28, tall ? 5 : 4, 1.2, ink));
	}
	if (wantsSub) {
		const room = remain();
		if (room >= 16) blocks.push(bodyBlock(art.subtext, 'sans', x, maxWidth, room, size.sub, 18, 3, 1.4, secondary));
	}
	const group = stack(blocks, gap);
	const y = place(group.height, topMin, bottomMax, bias);
	parts.push(group.draw(y));
	if (host) parts.push(hostText(host, x, footerY(size.height, size.pad, footerSize), footerSize, meta));
	return parts;
}

function quoteArt(art: Artwork, ink: string, meta: string, host: string | undefined): string[] {
	const { size } = art;
	const x = size.pad;
	const maxWidth = size.width - size.pad * 2;
	const tall = size.height >= size.width;
	const lock = lockup(x, size.pad, size.mark, ink);
	const parts: string[] = [lock.svg];
	const tile = Math.round(size.mark * 1.15);
	const mascotW = tall ? Math.round(Math.min(size.width, size.height) * 0.22) : 0;
	const mascotH = mascotW ? Math.round(mascotW * (283 / 320)) : 0;
	const footerSize = size.meta;
	const textBottom = mascotH ? size.height - size.pad - mascotH - Math.round(size.pad * 0.35) : host ? footerY(size.height, size.pad, footerSize) - footerSize : size.height - size.pad;
	const topMin = size.pad + size.mark + Math.round(size.pad * 0.55);
	const tileGap = Math.round(tile * 0.5);
	const attrReserve = art.attribution ? Math.round(size.kicker * 2.6) : 0;
	const attrGapEstimate = art.attribution ? Math.round(size.quote * 0.55) : 0;
	const quoteMax = Math.max(0, textBottom - topMin - tile - tileGap - attrReserve - attrGapEstimate);
	const quote = fitted(art.quote, 'sans', maxWidth, quoteMax, size.quote, 26, tall ? 7 : 5, 1.25);
	const attribution = fitted(art.attribution, 'medium', maxWidth, size.kicker * 2, Math.round(size.kicker * 1.15), 14, 1, 1.2);
	const attrGap = attribution.height ? Math.round(quote.size * 0.55) : 0;
	const blockH = tile + tileGap + quote.height + attrGap + attribution.height;
	const y = place(blockH, topMin, textBottom, tall ? 0.16 : 0.28);
	parts.push(quoteTile(x, y, tile));
	parts.push(textLines(quote, 'sans', x, y + tile + tileGap, ink));
	if (attribution.height) parts.push(textLines(attribution, 'medium', x, y + tile + tileGap + quote.height + attrGap, paint('text-brand')));
	if (mascotW) {
		parts.push(`<image href="${octopus()}" x="${n(size.width - size.pad - mascotW)}" y="${n(size.height - size.pad - mascotH)}" width="${n(mascotW)}" height="${n(mascotH)}"/>`);
	}
	if (host) {
		const hostW = measure('mono', host, footerSize);
		const clearOfMascot = mascotW === 0 || x + hostW + 24 <= size.width - size.pad - mascotW;
		if (clearOfMascot) parts.push(hostText(host, x, footerY(size.height, size.pad, footerSize), footerSize, meta));
	}
	return parts;
}

function frameArt(art: Artwork, ink: string, secondary: string, meta: string, host: string | undefined): string[] {
	const { size } = art;
	const x = size.pad;
	const maxWidth = size.width - size.pad * 2;
	const lock = lockup(x, size.pad, size.mark, ink);
	const parts: string[] = [lock.svg];
	const footerSize = size.meta;
	if (host) {
		const hostW = measure('mono', host, footerSize);
		const hostX = size.width - size.pad - hostW;
		if (hostX > x + lock.width + 24) {
			// Center the host on the mark: the baseline sits on the mark's midline, lifted by half the descender.
			const yBase = size.pad + size.mark / 2 - descentPx('mono', footerSize) / 2;
			parts.push(hostText(host, hostX, yBase, footerSize, meta));
		}
	}
	const regionTop = size.pad + size.mark + Math.round(size.pad * 0.48);
	const regionBottom = size.height - size.pad;
	const textBudget = Math.round((regionBottom - regionTop) * 0.34);
	const title = fitted(art.headline, 'sans', maxWidth, textBudget, size.frameTitle, 22, 2, 1.2);
	const subGap = art.subtext ? Math.round(size.pad * 0.22) : 0;
	const subBudget = Math.max(0, textBudget - title.height - subGap);
	const sub = fitted(art.subtext, 'sans', maxWidth, subBudget, size.sub, 16, 2, 1.35);
	let y = regionTop;
	parts.push(textLines(title, 'sans', x, y, ink));
	y += title.height;
	if (sub.height) {
		y += subGap;
		parts.push(textLines(sub, 'sans', x, y, secondary));
		y += sub.height;
	}
	y += Math.round(size.pad * 0.42);
	const frameH = regionBottom - y;
	if (frameH < 96) throw new Error('That headline does not leave room for the frame. Shorten it.');
	parts.push(frameCard(x, y, maxWidth, frameH, art.imageHref));
	return parts;
}

/** The picture, without embedded fonts. The rasterizer loads the face files itself. */
export function compose(art: Artwork): ArtworkSvg {
	used.clear();
	const ink = paint('text-default');
	const secondary = paint('text-secondary');
	const meta = art.ground === 'lilac' ? paint('text-secondary') : paint('text-muted');
	const background = art.ground === 'lilac' ? paint('bg-subtle') : paint('bg-default');
	const host = siteHost();
	const { size } = art;
	const title = (art.template === 'quote' ? art.quote : art.headline) ?? art.template;
	const body =
		art.template === 'quote' ? quoteArt(art, ink, meta, host) : art.template === 'frame' ? frameArt(art, ink, secondary, meta, host) : poster(art, ink, secondary, meta, host);
	const svg = [
		`<?xml version="1.0" encoding="UTF-8"?>`,
		`<svg xmlns="http://www.w3.org/2000/svg" width="${size.width}" height="${size.height}" viewBox="0 0 ${size.width} ${size.height}" role="img" text-rendering="geometricPrecision">`,
		`<title>${esc(title)}</title>`,
		`<rect width="${size.width}" height="${size.height}" fill="${background}"/>`,
		...body,
		'</svg>',
		'',
	].join('\n');
	return { svg, roles: [...used], background };
}

/** Same picture with the faces embedded, so the file renders where the fonts are not installed. */
export function embedFonts(svg: string, roles: Role[]): string {
	const css = roles
		.map((role) => {
			const item = loadFace(role);
			const b64 = item.buffer.toString('base64');
			return `@font-face{font-family:"${item.cssFamily}";src:url("data:font/ttf;base64,${b64}") format("truetype");font-weight:${item.weight};font-style:normal;}`;
		})
		.join('');
	const tag = svg.indexOf('<svg ');
	const end = svg.indexOf('>', tag);
	return `${svg.slice(0, end + 1)}\n<defs><style type="text/css">${css}</style></defs>${svg.slice(end + 1)}`;
}
