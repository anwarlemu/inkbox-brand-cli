import { readFileSync } from 'node:fs';
import { create, type FontkitFont } from 'fontkit';
import { brand } from '../lib/brand.js';
import { pkgPath } from '../lib/paths.js';

export type Role = 'sans' | 'medium' | 'mono';

type Face = {
	role: Role;
	weight: number;
	file: string;
	/** Family name stored in the font file, before the medium face is aliased onto the sans family. */
	fileFamily: string;
	/** Family name to request. Medium is selected with font-weight on the sans family. */
	cssFamily: string;
	buffer: Buffer;
	font: FontkitFont;
};

let loaded: Face[] | undefined;

function load(): Face[] {
	if (loaded) return loaded;
	const files = brand().fonts.files;
	if (!files?.length) throw new Error('brand.json needs fonts.files so images can use the brand type.');
	const faces: Face[] = [];
	for (const spec of files) {
		if (spec.role !== 'sans' && spec.role !== 'medium' && spec.role !== 'mono') throw new Error(`Unknown font role "${spec.role}".`);
		const buffer = readFileSync(pkgPath('brand', spec.file));
		const font = create(buffer);
		if (typeof font.layout !== 'function' || !font.familyName) throw new Error(`Could not read ${spec.file}.`);
		faces.push({ role: spec.role, weight: spec.weight, file: spec.file, fileFamily: font.familyName, cssFamily: font.familyName, buffer, font });
	}
	const sans = faces.find((face) => face.role === 'sans');
	const medium = faces.find((face) => face.role === 'medium');
	const mono = faces.find((face) => face.role === 'mono');
	if (!sans || !medium || !mono) throw new Error('fonts.files needs a sans face, a medium face and a mono face.');
	// The medium file's own family name is not what the rasterizer matches at weight 500.
	medium.cssFamily = sans.font.familyName;
	loaded = faces;
	return faces;
}

/** The font files the brand actually ships, after the medium face is aliased onto the sans family. */
export function fontFacts() {
	return load().map((item) => ({
		role: item.role,
		weight: item.weight,
		file: item.file,
		family: item.cssFamily,
		fileFamily: item.fileFamily,
		bytes: item.buffer.length,
	}));
}

export function face(role: Role): Face {
	const found = load().find((item) => item.role === role);
	if (!found) throw new Error(`Missing the ${role} face.`);
	return found;
}

export function cssOf(role: Role): { family: string; weight: number } {
	const item = face(role);
	return { family: item.cssFamily, weight: item.weight };
}

export function fontBuffers(): Uint8Array[] {
	return load().map((item) => new Uint8Array(item.buffer.buffer, item.buffer.byteOffset, item.buffer.byteLength));
}

export function measure(role: Role, text: string, size: number): number {
	if (!text) return 0;
	const item = face(role);
	return (item.font.layout(text).advanceWidth * size) / item.font.unitsPerEm;
}

/** Baseline for a line box whose top is `lineTop`. Uses the face's ascender so caps do not clip. */
export function baseline(role: Role, size: number, lineTop: number, lineHeight: number): number {
	const item = face(role);
	const asc = (item.font.ascent / item.font.unitsPerEm) * size;
	const desc = (Math.abs(item.font.descent) / item.font.unitsPerEm) * size;
	const pad = Math.max(0, (lineHeight - (asc + desc)) / 2);
	return lineTop + pad + asc;
}

export type Fitted = { lines: string[]; size: number; lineHeight: number; width: number; height: number };

function wrap(text: string, role: Role, size: number, maxWidth: number): string[] {
	const lines: string[] = [];
	for (const para of text.split(/\n+/)) {
		const words = para.trim().split(/\s+/).filter(Boolean);
		if (!words.length) continue;
		let line = '';
		for (const word of words) {
			const next = line ? `${line} ${word}` : word;
			if (!line || measure(role, next, size) <= maxWidth) line = next;
			else {
				lines.push(line);
				line = word;
			}
		}
		if (line) lines.push(line);
	}
	return lines;
}

function ellipsize(lines: string[], role: Role, size: number, maxWidth: number, maxLines: number): string[] {
	const cut = lines.slice(0, Math.max(1, maxLines));
	const mark = '…';
	return cut.map((line, index) => {
		const more = index === cut.length - 1 && lines.length > cut.length;
		if (!more && measure(role, line, size) <= maxWidth) return line;
		let next = line;
		while (next && measure(role, `${next}${mark}`, size) > maxWidth) next = next.slice(0, -1).trimEnd();
		return next ? `${next}${mark}` : mark;
	});
}

/**
 * Shrink the type until the words fit the box. Prefers the design size. At the floor, any line that
 * still does not fit takes an ellipsis rather than painting past the edge.
 */
export function fitText(
	text: string,
	role: Role,
	box: { maxWidth: number; maxHeight: number; maxSize: number; minSize: number; maxLines: number; leading: number },
): Fitted {
	const clean = text.replace(/\r\n/g, '\n').trim();
	if (!clean || box.maxWidth <= 0 || box.maxHeight <= 0) return { lines: [], size: box.maxSize, lineHeight: 0, width: 0, height: 0 };
	const floor = Math.min(box.minSize, 12);
	for (let size = Math.round(box.maxSize); size >= floor; size -= 1) {
		const lineHeight = Math.max(size, Math.round(size * box.leading));
		if (lineHeight > box.maxHeight) continue;
		const raw = wrap(clean, role, size, box.maxWidth);
		const tooWide = raw.some((line) => measure(role, line, size) > box.maxWidth + 0.5);
		const height = raw.length * lineHeight;
		if (!tooWide && raw.length > 0 && raw.length <= box.maxLines && height <= box.maxHeight) {
			const width = Math.max(0, ...raw.map((line) => measure(role, line, size)));
			return { lines: raw, size, lineHeight, width, height };
		}
	}
	const size = floor;
	const lineHeight = Math.max(size, Math.round(size * box.leading));
	// A line that cannot fit the box is omitted. Painting it would run into the next block.
	if (lineHeight > box.maxHeight) return { lines: [], size, lineHeight: 0, width: 0, height: 0 };
	const maxLines = Math.max(1, Math.min(box.maxLines, Math.floor(box.maxHeight / lineHeight)));
	const lines = ellipsize(wrap(clean, role, size, box.maxWidth), role, size, box.maxWidth, maxLines);
	const width = Math.max(0, ...lines.map((line) => measure(role, line, size)));
	return { lines, size, lineHeight, width, height: lines.length * lineHeight };
}
