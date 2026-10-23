import type { BrandTheme } from '../lib/brand.js';
import { type RGBA, parseColor } from './color.js';
import type { Stats } from './css.js';
import type { Palette } from './palette.js';
import { colorToken } from './roles.js';
import { brandLiteral, convertLiterals, lineFamily } from './script.js';

// Native and other UI code (Swift, Kotlin, Dart, Android XML, XAML, C#, Python...): each color becomes the brand's
// value for its role, in the language's own color form, so the file needs no new imports.

const NATIVE_COLOR = [
	// Compose, Flutter, Android: Color(0xFF1A1A1A)
	{ re: /\bColor\(\s*0x([0-9a-fA-F]{8})\s*\)/g, read: (m: RegExpMatchArray) => parseColor(`#${m[1].slice(2)}${m[1].slice(0, 2)}`), write: (argb: string) => `Color(0x${argb})` },
	// SwiftUI and UIKit: Color(red: 0.1, green: 0.1, blue: 0.1[, opacity: 1])
	{
		re: /\b(Color|UIColor|NSColor)\(\s*(?:\.sRGB,\s*)?red:\s*([\d.]+)\s*(?:\/\s*255(?:\.0)?)?,\s*green:\s*([\d.]+)\s*(?:\/\s*255(?:\.0)?)?,\s*blue:\s*([\d.]+)\s*(?:\/\s*255(?:\.0)?)?(?:,\s*(?:opacity|alpha):\s*([\d.]+))?\s*\)/g,
		read: (m: RegExpMatchArray) => {
			const scale = /\/\s*255/.test(m[0]) || [m[2], m[3], m[4]].some((v) => Number(v) > 1) ? 1 : 255;
			return [Number(m[2]) * scale, Number(m[3]) * scale, Number(m[4]) * scale, m[5] === undefined ? 1 : Number(m[5])] as RGBA;
		},
		write: (argb: string, m: RegExpMatchArray) => {
			const [a, r, g, b] = [0, 2, 4, 6].map((i) => Math.round((Number.parseInt(argb.slice(i, i + 2), 16) / 255) * 1000) / 1000);
			const key = m[1] === 'Color' ? 'opacity' : 'alpha';
			return `${m[1]}(red: ${r}, green: ${g}, blue: ${b}${a < 1 ? `, ${key}: ${a}` : m[5] !== undefined ? `, ${key}: 1` : ''})`;
		},
	},
];

/** The first native color written on a line, for reading an app's palette. */
export function readNativeColor(line: string): RGBA | undefined {
	for (const kind of NATIVE_COLOR) for (const m of line.matchAll(kind.re)) return kind.read(m);
	return undefined;
}

export function convertNative(text: string, palette: Palette, stats: Stats, theme: BrandTheme, xml = false) {
	palette.series ??= new Map();
	const lineAt = (src: string, offset: number) => src.slice(src.lastIndexOf('\n', offset) + 1, (src.indexOf('\n', offset) + 1 || src.length + 1) - 1);
	let next = text;
	for (const kind of NATIVE_COLOR) {
		const src = next;
		next = src.replace(kind.re, (...args) => {
			const offset = args[args.length - 2] as number;
			const m = args.slice(0, -2) as unknown as RegExpMatchArray;
			const rgba = kind.read(m);
			if (!rgba) return args[0];
			stats.colors++;
			return kind.write(brandLiteral(colorToken(rgba, lineFamily(lineAt(src, offset)), palette), theme, 'argb'), m);
		});
	}
	if (!xml) return convertLiterals(next, palette, stats, (t) => brandLiteral(t, theme));
	// Android resources and XAML write alpha first: android:textColor="#80FFFFFF", <color name="bg">#121212</color>
	const src = next;
	return src.replace(/(=\s*"|>\s*)(#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?|#[0-9a-fA-F]{3})(?=\s*["<])/g, (all, head: string, value: string, offset: number) => {
		const rgba = parseColor(value.length === 9 ? `#${value.slice(3)}${value.slice(1, 3)}` : value);
		if (!rgba) return all;
		stats.colors++;
		const argb = brandLiteral(colorToken(rgba, lineFamily(lineAt(src, offset)), palette), theme, 'argb');
		return `${head}#${argb.startsWith('FF') ? argb.slice(2) : argb}`;
	});
}
