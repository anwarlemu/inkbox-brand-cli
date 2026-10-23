import { convertScript } from './script.js';
import { parseColor } from './color.js';
import { type Stats, convertCss } from './css.js';
import type { Palette } from './palette.js';
import { mapColor } from './roles.js';

/**
 * A swatch or a type specimen (a brand page, a style guide): the color or font it sets is printed right after it, so it
 * is content and keeps its own value.
 */
export function specimen(css: string, after: string, page = '') {
	const text = after.replace(/<[^>]*>/g, ' ');
	const hexes = css.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
	if (hexes.some((h) => text.toLowerCase().includes(h.toLowerCase()))) return true;
	// A palette page prints its colors somewhere (a key, a label, a copy button's data): a bar of them is content too.
	const printed = page.replace(/<(style|script)\b[\s\S]*?<\/\1>/gi, ' ').replace(/\sstyle\s*=\s*(["'])[\s\S]*?\1/gi, ' ').toLowerCase();
	if (hexes.length && hexes.every((h) => printed.includes(h.toLowerCase()))) return true;
	const font = css.match(/font-family\s*:\s*["']?([^,"';]+)/i)?.[1]?.trim();
	return !!font && !/^(inherit|var\()/.test(font) && text.includes(font);
}

/** The CSS inside a template in any language: <style> blocks, style attributes and color attributes. */
export function convertMarkup(text: string, palette: Palette, stats: Stats) {
	return text
		.replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi, (all, open: string, css: string, close: string) => `${open}${convertCss(css, palette, stats)}${close}`)
		// Inline scripts are code like any other: the same conversion as a .js file (data blocks stay as they are).
		.replace(/(<script\b(?![^>]*\bsrc=)(?![^>]*type=["'](?:application\/(?:ld\+)?json|text\/template)["'])[^>]*>)([\s\S]*?)(<\/script>)/gi, (all, open: string, js: string, close: string) => `${open}${convertScript(js, palette, stats, {})}${close}`)
		.replace(/(\sstyle\s*=\s*)(["'])([^"']*)\2/gi, (all, head: string, q: string, css: string, offset: number, whole: string) => (specimen(css, whole.slice(offset, offset + 600), whole) ? all : `${head}${q}${convertCss(css, palette, stats)}${q}`))
		.replace(/(\s(?:fill|stroke|stop-color|color)\s*=\s*)(["'])([^"']+)\2/gi, (all, head: string, q: string, value: string) => {
			const rgba = parseColor(value);
			if (!rgba) return all;
			stats.colors++;
			return `${head}${q}${mapColor(rgba, 'text', palette)}${q}`;
		});
}
