import { colorHex } from '../lib/brand.js';
import { COLOR_IN_VALUE, type RGBA, hsl, parseColor } from './color.js';
import type { Palette } from './palette.js';

/**
 * A one-color mark (a logo, an icon file) drawn light for a dark site, redrawn in brand text so it shows on the brand's
 * white page. Anything with real color in it is an illustration and stays as drawn.
 */
export function convertSvgMark(svg: string, palette: Palette) {
	if (palette.mode !== 'dark') return svg;
	const colors = [...svg.matchAll(COLOR_IN_VALUE)].map((m) => parseColor(m[0])).filter((c): c is RGBA => !!c);
	if (!colors.length || colors.some((c) => hsl(c).s > 0.15 || (c[3] > 0 && hsl(c).l < 0.6))) return svg;
	const ink = colorHex('text-default') ?? '#000000';
	return svg.replace(COLOR_IN_VALUE, (c) => {
		const rgba = parseColor(c);
		return rgba && rgba[3] < 0.995 ? `${ink}${Math.round(rgba[3] * 255).toString(16).padStart(2, '0')}` : ink;
	});
}
