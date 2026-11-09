// Sizes, templates and the words each template needs. Content in, a picture out: no extra knobs.

export const TEMPLATE_IDS = ['headline', 'statement', 'frame', 'quote', 'announcement'] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

export const SIZE_IDS = ['og', 'square', 'portrait', 'landscape'] as const;
export type SizeId = (typeof SIZE_IDS)[number];

export const GROUND_IDS = ['white', 'lilac'] as const;
export type GroundId = (typeof GROUND_IDS)[number];

export type SizeSpec = {
	id: SizeId;
	width: number;
	height: number;
	use: string;
	/** Inset from the canvas edge. */
	pad: number;
	/** Octopus mark, in pixels. The wordmark is scaled to it. */
	mark: number;
	headline: number;
	sub: number;
	quote: number;
	kicker: number;
	meta: number;
	frameTitle: number;
};

export const SIZES: Record<SizeId, SizeSpec> = {
	og: { id: 'og', width: 1200, height: 630, use: 'Open Graph and link previews', pad: 64, mark: 48, headline: 68, sub: 26, quote: 46, kicker: 18, meta: 16, frameTitle: 36 },
	square: { id: 'square', width: 1080, height: 1080, use: 'Instagram and LinkedIn square', pad: 80, mark: 56, headline: 80, sub: 30, quote: 56, kicker: 20, meta: 18, frameTitle: 44 },
	portrait: { id: 'portrait', width: 1080, height: 1350, use: 'Instagram portrait', pad: 88, mark: 60, headline: 84, sub: 32, quote: 60, kicker: 20, meta: 18, frameTitle: 48 },
	landscape: { id: 'landscape', width: 1200, height: 675, use: 'X and LinkedIn landscape', pad: 64, mark: 48, headline: 64, sub: 26, quote: 44, kicker: 18, meta: 16, frameTitle: 36 },
};

export type TemplateSpec = {
	id: TemplateId;
	description: string;
	requires: string[];
	optional: string[];
};

export const TEMPLATES: TemplateSpec[] = [
	{ id: 'headline', description: 'A headline, with an optional eyebrow.', requires: ['headline'], optional: ['eyebrow'] },
	{ id: 'statement', description: 'A headline and a line of subtext, with an optional eyebrow.', requires: ['headline', 'subtext'], optional: ['eyebrow'] },
	{ id: 'frame', description: 'A headline, optional subtext, and a product shot in a card. The shot fills the card from the top left. Without --image, a table stand-in is drawn.', requires: ['headline'], optional: ['subtext', 'image'] },
	{ id: 'quote', description: 'A quote and an optional attribution.', requires: ['quote'], optional: ['attribution'] },
	{ id: 'announcement', description: 'A pink eyebrow pill, a headline and optional subtext.', requires: ['headline', 'eyebrow'], optional: ['subtext'] },
];

export const GROUNDS: { id: GroundId; description: string }[] = [
	{ id: 'white', description: 'White page' },
	{ id: 'lilac', description: 'Lilac field' },
];

export function imageCatalog() {
	return {
		templates: TEMPLATES,
		sizes: SIZE_IDS.map((id) => {
			const size = SIZES[id];
			return { id, width: size.width, height: size.height, use: size.use };
		}),
		grounds: GROUNDS,
		exports: ['png', 'svg'] as const,
	};
}

export function templateById(id: string): TemplateSpec {
	const key = id.trim().toLowerCase();
	const found = TEMPLATES.find((item) => item.id === key);
	if (!found) throw new Error(`Unknown template "${id}". Use ${TEMPLATE_IDS.join(', ')}.`);
	return found;
}

export function sizeById(id: string): SizeSpec {
	const key = id.trim().toLowerCase();
	if (!SIZE_IDS.includes(key as SizeId)) throw new Error(`Unknown size "${id}". Use ${SIZE_IDS.join(', ')}.`);
	return SIZES[key as SizeId];
}

export function groundById(id: string): GroundId {
	const key = id.trim().toLowerCase();
	if (!GROUND_IDS.includes(key as GroundId)) throw new Error(`Unknown ground "${id}". Use white or lilac.`);
	return key as GroundId;
}
