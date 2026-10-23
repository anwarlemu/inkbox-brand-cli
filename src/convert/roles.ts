import { type RGBA, hsl, isStrong } from './color.js';
import type { Family, Palette } from './palette.js';

// A color becomes the brand token for the role it plays on the project: measured against the project's own page and
// text, so a near-black surface on a dark site and a white one on a light site are both the brand page, and white text
// on a dark site and black text on a light one are both brand text.

export type ColorToken = { name: string; alpha: number };

const token = (name: string, alpha = 1) => (alpha >= 0.995 ? `var(--ds-color-${name})` : `color-mix(in srgb, var(--ds-color-${name}) ${Math.round(alpha * 1000) / 10}%, transparent)`);
export const cssColor = (t: ColorToken | 'transparent') => (t === 'transparent' ? 'transparent' : token(t.name, t.alpha));

// Where a red, green or amber means a state (an error, a success, a warning) rather than a site's own accent.
const STATUS_CONTEXT = /(\bok\b|\berr\b|error|danger|invalid|destruct|delete|remove|alert|warn|caution|success|valid|positive|negative|online|offline|status|badge|toast|notice|delta|trend|increase|decrease|paid|overdue|pending|fail|pass|health|uptime|required)/i;

/**
 * The brand token for one of the project's colors. `series` keeps a chart's series apart (each its own brand series
 * color). `context` (the selector, variable name or code line) decides whether a red, green or amber is a state;
 * without it, as with Tailwind palette classes, it is.
 */
export function colorToken(rgba: RGBA, family: Family, palette: Palette, series?: string, context?: string): ColorToken | 'transparent' {
	const { h, s, l } = hsl(rgba);
	const a = rgba[3];
	if (a === 0) return 'transparent';
	const status = context === undefined || STATUS_CONTEXT.test(context);
	// A dark color (a maroon or navy ink, a deep button) plays the part of black: the brand's text and primary action.
	if (s > 0.3 && l > 0.28 && l < 0.88) {
		if (series && palette.series) {
			if (!palette.series.has(series)) palette.series.set(series, (palette.series.size % 4) + 1);
			return { name: `chart-series-${palette.series.get(series)}`, alpha: a };
		}
		if (status && h >= 85 && h < 165) return { name: 'status-success', alpha: a };
		if (status && (h < 18 || h >= 345)) return { name: 'status-danger', alpha: a };
		if (status && h >= 18 && h < 60) return { name: 'status-warning', alpha: a };
		return { name: family === 'text' ? 'text-brand' : family === 'border' ? 'border-brand' : 'bg-brand', alpha: a };
	}
	// A pale tint: a pale status color stays its status, faint; a pale blue or a tint marking a state is the brand tint;
	// a warm paper, blush or sage is the project's page or panel color and is read by lightness below.
	if (s > 0.3 && l >= 0.88 && family === 'surface' && a >= 0.995) {
		if (status && h >= 85 && h < 165) return { name: 'status-success', alpha: 0.1 };
		if (status && (h < 18 || h >= 345)) return { name: 'status-danger', alpha: 0.1 };
		if (status && h >= 18 && h < 60) return { name: 'status-warning', alpha: 0.12 };
		if (context === undefined || (h >= 190 && h < 265) || /(selected|active|current|info|highlight|tint|accent|primary|brand)/i.test(context)) return { name: 'bg-tint', alpha: 1 };
	}
	// How far this neutral sits from the project's page toward its text: 0 is the page, 1 is the main text.
	const t = Math.max(0, Math.min(1, (l - palette.bg) / (palette.fg - palette.bg || 1)));
	// Translucent: a tint of the text stays one; a tint of the page (a glass header, a fade) stays the page color, so it
	// does not turn into a gray smudge. Shadows and lines are drawn in black.
	if (a < 0.995) return t > 0.5 ? { name: 'text-default', alpha: a } : { name: family === 'surface' ? 'bg-default' : 'black', alpha: a };
	const pick = (name: string) => ({ name, alpha: 1 });
	if (family === 'text') return pick(t > 0.82 ? 'text-default' : t > 0.55 ? 'text-muted' : t > 0.25 ? 'text-subtle' : 'text-inverse');
	if (family === 'border') return pick(t < 0.12 ? 'border-subtle' : t < 0.32 ? 'border-default' : t < 0.6 ? 'border-strong' : 'text-default');
	return pick(t < 0.015 ? 'bg-default' : t < 0.09 ? 'bg-subtle' : t < 0.2 ? 'bg-frame' : t < 0.45 ? 'border-strong' : t < 0.82 ? 'text-subtle' : 'bg-inverse');
}

/** Text on a strong color (a blue button, a green badge) is the brand's text on color; on an opposite panel, inverse. */
export function onColor(rgba: RGBA, family: Family, background?: RGBA, palette?: Palette): ColorToken | undefined {
	if (family !== 'text' || !background || isStrong(rgba)) return undefined;
	if (isStrong(background)) return { name: 'text-on-brand', alpha: rgba[3] };
	if (!palette || background[3] < 0.9) return undefined;
	const at = (c: RGBA) => (hsl(c).l - palette.bg) / (palette.fg - palette.bg || 1);
	if (at(background) < 0.75 || at(rgba) > 0.5) return undefined;
	return { name: 'text-inverse', alpha: at(rgba) < 0.2 ? rgba[3] : Math.round(rgba[3] * 70) / 100 };
}

export const mapColor = (rgba: RGBA, family: Family, palette: Palette, series?: string, context?: string) => cssColor(colorToken(rgba, family, palette, series, context));
