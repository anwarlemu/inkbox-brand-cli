import { GROUND_IDS, type GroundId } from '../image/catalog.js';

// Fixed clips. Timing and pixel sizes are part of the template, not a request option.
// Frames are SVG, rasterized by the same resvg build the image commands use, then stored in an APNG.
// APNG keeps those PNG bytes as-is, so a repeat of the same request writes the same file.
// A lossy video codec is not used: those encoders are not byte-stable across machines, and none is vendored here.

export const VIDEO_FPS = 10;
export const VIDEO_FRAMES = 10;

export const RENDERER = {
	id: 'resvg-apng',
	rasterizer: '@resvg/resvg-wasm',
	container: 'apng',
	fps: VIDEO_FPS,
	frames: VIDEO_FRAMES,
	durationMs: Math.round((VIDEO_FRAMES / VIDEO_FPS) * 1000),
} as const;

export const VIDEO_TEMPLATE_IDS = ['social', 'announce', 'product'] as const;
export type VideoTemplateId = (typeof VIDEO_TEMPLATE_IDS)[number];

export const VIDEO_SIZE_IDS = ['square', 'vertical', 'landscape'] as const;
export type VideoSizeId = (typeof VIDEO_SIZE_IDS)[number];

export type VideoSize = {
	id: VideoSizeId;
	width: number;
	height: number;
	use: string;
	pad: number;
	mark: number;
	headline: number;
	sub: number;
	kicker: number;
	meta: number;
	/** Octopus width on tall frames. 0 omits it. Height follows the file's own pixels. */
	mascot: number;
};

export const VIDEO_SIZES: Record<VideoSizeId, VideoSize> = {
	square: { id: 'square', width: 1080, height: 1080, use: 'Square social clip, 1:1', pad: 80, mark: 64, headline: 72, sub: 32, kicker: 20, meta: 18, mascot: 0 },
	vertical: { id: 'vertical', width: 1080, height: 1920, use: 'Vertical social clip, 9:16', pad: 88, mark: 72, headline: 76, sub: 32, kicker: 22, meta: 18, mascot: 280 },
	landscape: { id: 'landscape', width: 1920, height: 1080, use: 'Landscape clip, 16:9', pad: 96, mark: 64, headline: 72, sub: 30, kicker: 20, meta: 18, mascot: 0 },
};

export type VideoTemplate = {
	id: VideoTemplateId;
	description: string;
	requires: string[];
	optional: string[];
};

export const VIDEO_TEMPLATES: VideoTemplate[] = [
	{ id: 'social', description: 'Animated social clip. The lockup, a headline, and an optional eyebrow and subtext fade in on the brand ease.', requires: ['headline'], optional: ['eyebrow', 'subtext'] },
	{ id: 'announce', description: 'Announcement clip. A pink eyebrow pill, a headline, and optional subtext.', requires: ['headline', 'eyebrow'], optional: ['subtext'] },
	{ id: 'product', description: 'Product clip. The lockup, then a headline and subtext on a raised panel. No product screenshot is invented.', requires: ['headline', 'subtext'], optional: ['eyebrow'] },
];

export function videoCatalog() {
	return {
		renderer: RENDERER,
		templates: VIDEO_TEMPLATES,
		sizes: VIDEO_SIZE_IDS.map((id) => {
			const size = VIDEO_SIZES[id];
			return { id, width: size.width, height: size.height, use: size.use };
		}),
		grounds: [...GROUND_IDS],
		exports: ['apng'] as const,
	};
}

export function videoTemplateById(id: string): VideoTemplate {
	const key = id.trim().toLowerCase();
	const found = VIDEO_TEMPLATES.find((item) => item.id === key);
	if (!found) throw new Error(`Unknown video template "${id}". Use ${VIDEO_TEMPLATE_IDS.join(', ')}.`);
	return found;
}

export function videoSizeById(id: string): VideoSize {
	const key = id.trim().toLowerCase();
	if (!VIDEO_SIZE_IDS.includes(key as VideoSizeId)) throw new Error(`Unknown video size "${id}". Use ${VIDEO_SIZE_IDS.join(', ')}.`);
	return VIDEO_SIZES[key as VideoSizeId];
}

export type { GroundId };
