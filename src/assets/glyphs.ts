import { readFileSync } from 'node:fs';
import { pkgPath } from '../lib/paths.js';

// Which characters the brand's faces can draw, read from the font files' own character maps. Copy with anything else
// (an emoji, a script the face has no letters for) is an error: the canvas would otherwise draw it in whatever face this
// computer has, which is off brand and differs from one computer to the next.

const maps = new Map<string, Set<number>>();

function cmap(file: string): Set<number> {
	const hit = maps.get(file);
	if (hit) return hit;
	const b = readFileSync(pkgPath('brand', 'fonts', file));
	const out = new Set<number>();
	const n = b.readUInt16BE(4);
	for (let i = 0; i < n; i++) {
		const rec = 12 + i * 16;
		if (b.toString('latin1', rec, rec + 4) !== 'cmap') continue;
		const base = b.readUInt32BE(rec + 8);
		const tables = b.readUInt16BE(base + 2);
		for (let t = 0; t < tables; t++) {
			const at = base + b.readUInt32BE(base + 4 + t * 8 + 4);
			const format = b.readUInt16BE(at);
			if (format === 4) {
				const segs = b.readUInt16BE(at + 6) / 2;
				for (let s = 0; s < segs; s++) {
					const end = b.readUInt16BE(at + 14 + s * 2);
					const start = b.readUInt16BE(at + 16 + segs * 2 + s * 2);
					const delta = b.readUInt16BE(at + 16 + segs * 4 + s * 2);
					const ro = at + 16 + segs * 6 + s * 2;
					const off = b.readUInt16BE(ro);
					for (let c = start; c <= end && c < 0xffff; c++) {
						const g = off ? b.readUInt16BE(ro + off + (c - start) * 2) : (c + delta) & 0xffff;
						if (g) out.add(c);
					}
				}
			} else if (format === 12) {
				const groups = b.readUInt32BE(at + 12);
				for (let g = 0; g < groups; g++) for (let c = b.readUInt32BE(at + 16 + g * 12); c <= b.readUInt32BE(at + 20 + g * 12); c++) out.add(c);
			}
		}
	}
	maps.set(file, out);
	return out;
}

type Face = { family: string; files: Record<string, string> };
let doc: { sans: Face; mono: Face } | undefined;

/** The characters of `text` a face cannot draw, each once. */
export function missing(text: string, face: 'sans' | 'mono' = 'sans'): string[] {
	doc ??= JSON.parse(readFileSync(pkgPath('brand', 'fonts', 'fonts.json'), 'utf8')) as { sans: Face; mono: Face };
	const sets = Object.values(doc[face].files).map(cmap);
	const out: string[] = [];
	for (const ch of text) {
		const c = ch.codePointAt(0)!;
		if (c === 9 || c === 10 || c === 13 || c === 0x200b || c === 0xfe0f || c === 0xfe0e) continue;
		if (!sets.every((s) => s.has(c)) && !out.includes(ch)) out.push(ch);
	}
	return out;
}

/** Throws when a face has no letters for some of `text`, naming them. */
export function drawable(slot: string, text: string | undefined, face: 'sans' | 'mono' = 'sans') {
	if (!text) return;
	const gone = missing(text, face);
	if (gone.length) throw new Error(`${doc![face].family} (the brand's face) has no character for ${gone.slice(0, 6).map((c) => `"${c}"`).join(', ')}${gone.length > 6 ? ` and ${gone.length - 6} more` : ''} in the ${slot}. Take ${gone.length === 1 ? 'it' : 'them'} out, or write it in Latin, Cyrillic, Greek or Vietnamese letters.`);
}
