import type { Ctx } from './canvas.js';
import type { Rect } from './share.js';

// Text set for print files and illustrations: the brand sans or mono, weight and tracking as the share images set
// them, lines wrapped at a width and shrunk together until they fit a line limit, never cut off.

export type TextStyle = {
	family: string;
	weight: number;
	size: number;
	/** Letter spacing in em (the headline's -0.02, a label's 0.08). */
	tracking?: number;
	/** Line pitch as a multiple of the size. */
	leading?: number;
	color?: string;
	align?: 'left' | 'center' | 'right';
	caps?: boolean;
};

export function setFont(ctx: Ctx, s: Pick<TextStyle, 'family' | 'weight' | 'size' | 'tracking'>) {
	ctx.font = `${s.weight} ${s.size}px ${s.family}`;
	ctx.letterSpacing = `${(s.tracking ?? 0) * s.size}px`;
}

/** Splits text into lines no wider than `max` at the current font (explicit line breaks kept). */
export function wrap(ctx: Ctx, text: string, max: number): string[] {
	const out: string[] = [];
	for (const para of text.split('\n')) {
		const words = para.split(/\s+/).filter(Boolean);
		let line = '';
		for (const w of words) {
			const next = line ? `${line} ${w}` : w;
			if (line && ctx.measureText(next).width > max) {
				out.push(line);
				line = w;
			} else line = next;
		}
		out.push(line);
	}
	return out;
}

export type Fitted = { lines: string[]; size: number; widths: number[]; width: number; height: number; style: TextStyle };

/** Wraps `text` at `max` and steps the size down (to `minScale` of it) until it takes at most `maxLines` lines and no
 * word overflows. Throws when it cannot fit, so copy is never cut off. */
export function fit(ctx: Ctx, text: string, style: TextStyle, max: number, maxLines = 99, minScale = 0.5, what = 'text'): Fitted {
	const value = style.caps ? text.toUpperCase() : text;
	for (let size = style.size; size >= style.size * minScale - 0.01; size -= Math.max(0.5, style.size / 40)) {
		setFont(ctx, { ...style, size });
		const lines = wrap(ctx, value, max);
		const widths = lines.map((l) => ctx.measureText(l).width);
		if (lines.length <= maxLines && widths.every((w) => w <= max + 0.5)) {
			ctx.letterSpacing = '0px';
			return { lines, size, widths, width: Math.max(0, ...widths), height: lines.length * size * (style.leading ?? 1.2), style: { ...style, size } };
		}
	}
	ctx.letterSpacing = '0px';
	throw new Error(`The ${what} is too long for this layout: it needs more than ${maxLines} line${maxLines === 1 ? '' : 's'} at ${Math.round(style.size * minScale)}px in ${Math.round(max)}px. Shorten it.`);
}

/** Draws fitted lines with their first line's top at `top`; returns the box they fill. */
export function drawFitted(ctx: Ctx, f: Fitted, x: number, top: number, width = f.width): Rect {
	const s = f.style;
	const lh = s.size * (s.leading ?? 1.2);
	setFont(ctx, s);
	ctx.fillStyle = s.color ?? '#000000';
	ctx.textBaseline = 'alphabetic';
	ctx.textAlign = 'left';
	f.lines.forEach((l, i) => {
		const w = f.widths[i]!;
		const lx = s.align === 'center' ? x + (width - w) / 2 : s.align === 'right' ? x + width - w : x;
		// 0.92 of the size down from the line's top is where the editor sets the baseline.
		ctx.fillText(l, lx, top + i * lh + s.size * 0.92);
	});
	ctx.letterSpacing = '0px';
	const left = s.align === 'center' ? x + (width - f.width) / 2 : s.align === 'right' ? x + width - f.width : x;
	return { x: left, y: top, w: f.width, h: f.lines.length * lh };
}
