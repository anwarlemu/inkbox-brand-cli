import { readFileSync } from 'node:fs';
import { loadImage, Path2D, type Image } from '@napi-rs/canvas';
import { pkgPath } from '../lib/paths.js';
import { tokenColor, type ColorRef } from './canvas.js';

// The brand's share-image parts, read once from brand/assets: image.json (colors as tokens, themes, sizes, templates,
// occasions, the window's content) and logo.json (the wordmark's paths, the lockup, the art files). Every color comes
// out resolved through the tokens, so the drawing code never holds a hex of its own.

export type ThemeDoc = { label: string; bg: ColorRef; ink: ColorRef; muted: ColorRef; line: ColorRef; tile: ColorRef; tileAlpha: number; border: ColorRef; reefFade: number; dark: boolean; pill?: ColorRef };
export type Theme = Omit<ThemeDoc, 'bg' | 'ink' | 'muted' | 'line' | 'tile' | 'border' | 'pill'> & { pill: string; bg: string; ink: string; muted: string; line: string; tile: string; border: string };
export type SizeDef = { label: string; w: number; h: number; aliases: string[] };
export type Look = { template: string; theme: string; label: string; style?: Record<string, unknown>; sample?: Record<string, string> };
export type OccasionDef = { label: string; style: Record<string, unknown>; sample: Record<string, string>; looks: Look[] };

export type ImageDoc = {
	colors: Record<string, ColorRef | ColorRef[]>;
	themes: Record<string, ThemeDoc>;
	highlights: Record<string, { label: string; color: string; on?: Record<string, string> }>;
	tones: Record<string, string>;
	notes: string[];
	groups: Record<string, { label: string; sizes: string[] }>;
	sizes: Record<string, SizeDef>;
	templates: Record<string, { label: string; description: string }>;
	start: Record<string, string>;
	occasions: Record<string, OccasionDef>;
	templateOccasion: Record<string, string>;
	app: Record<string, unknown> & { colors: Record<string, string>; mails: string[]; source: string };
};

export type LogoDoc = {
	wordmark: { w: number; h: number; xTop: number; paths: string[] };
	lockup: { w: number; h: number; mark: { x: number; y: number; w: number; h: number }; word: { x: number; y: number; w: number; h: number } };
	clear: { share: number; min: number; source: string };
	art: Record<string, { file: string; label: string; ratio: number; source: string }>;
	reef: { file: string; w: number; h: number; source: string };
	lockups: { id: string; label: string; parts: ('mark' | 'word')[] }[];
};

let image: ImageDoc | undefined;
let logo: LogoDoc | undefined;
export const imageDoc = (): ImageDoc => (image ??= JSON.parse(readFileSync(pkgPath('brand', 'assets', 'image.json'), 'utf8')) as ImageDoc);
export const logoDoc = (): LogoDoc => (logo ??= JSON.parse(readFileSync(pkgPath('brand', 'assets', 'logo.json'), 'utf8')) as LogoDoc);

/** A named color from image.json `colors`, resolved. */
export function brandColor(name: string): string {
	const ref = imageDoc().colors[name];
	if (ref === undefined || Array.isArray(ref)) throw new Error(`brand/assets/image.json has no color \`${name}\`.`);
	return tokenColor(ref);
}
export function brandColors(name: string): string[] {
	const ref = imageDoc().colors[name];
	if (!Array.isArray(ref)) throw new Error(`brand/assets/image.json color \`${name}\` is not a list.`);
	return ref.map(tokenColor);
}

let themeCache: Record<string, Theme> | undefined;
/** Every theme with its colors resolved. */
export function themes(): Record<string, Theme> {
	if (themeCache) return themeCache;
	themeCache = {};
	for (const [id, t] of Object.entries(imageDoc().themes)) {
		const ink = tokenColor(t.ink);
		themeCache[id] = { ...t, bg: tokenColor(t.bg), ink, muted: tokenColor(t.muted), line: tokenColor(t.line), tile: tokenColor(t.tile), border: tokenColor(t.border), pill: t.pill ? tokenColor(t.pill) : brandColor(t.dark ? 'pillFillDark' : 'pillFill') };
	}
	return themeCache;
}
export const themeNames = () => Object.keys(imageDoc().themes);
export const highlightNames = () => Object.keys(imageDoc().highlights);
/** A highlight on a theme: its own color, or the token recorded for grounds it cannot be read on. */
export const highlightColor = (name: string, theme: string) => {
	const h = imageDoc().highlights[name];
	return tokenColor(h?.on?.[theme] ?? h?.color ?? '');
};
export const toneColor = (name: string) => tokenColor(imageDoc().tones[name] ?? imageDoc().tones.lilac!);

let word: Path2D | undefined;
/** The wordmark as one path, drawn on its own box (logo.json `wordmark`). */
export function wordmarkPath(): Path2D {
	if (!word) {
		word = new Path2D();
		for (const d of logoDoc().wordmark.paths) word.addPath(new Path2D(d));
	}
	return word;
}

/** The wordmark's paths as SVG markup on its own box, in one fill. */
export function wordmarkSvg(fill: string): string {
	return logoDoc().wordmark.paths.map((d) => `<path d="${d}" fill="${fill}"/>`).join('');
}

const art = new Map<string, Image>();
/** A brand art file (logo.json `art` by id, `reef`, or a path under brand/assets), loaded once. */
export async function artImage(id: string): Promise<Image> {
	const hit = art.get(id);
	if (hit) return hit;
	const doc = logoDoc();
	const file = id === 'reef' ? doc.reef.file : doc.art[id]?.file ?? id;
	const im = await loadImage(readFileSync(pkgPath('brand', 'assets', file)));
	art.set(id, im);
	return im;
}

/** The raw bytes of a brand art file, for embedding in SVG. */
export function artBytes(id: string): Buffer {
	const doc = logoDoc();
	const file = id === 'reef' ? doc.reef.file : doc.art[id]?.file ?? id;
	return readFileSync(pkgPath('brand', 'assets', file));
}
