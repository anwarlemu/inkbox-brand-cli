import type { Rect } from './types.js';

// The shared sizes: the same ids, pixels and other names in every brand CLI, with where each platform covers or crops
// the picture, the width it is usually shown at and the largest file it takes. `source` is the platform's own page.
// Each number is marked official (read on that page) or approximate (measured, or repeated by others where the
// platform's page cannot be read). Read 2026-11-23.

export type Zone = { name: string; rect: Rect; official: boolean };   // rect in shares of the canvas
export type Platform = {
	id: string; label: string; width: number; height: number; aliases: string[];
	avoid: Zone[];                 // words, the logo and key art stay out of these
	safe?: Zone;                   // and, when given, inside this
	shown: number;                 // the width in CSS px it is usually shown at (approximate), for the small-text floor
	limit?: { bytes: number; official: boolean };
	source?: string;
	note?: string;
};

const MB = 1024 * 1024;
const px = (w: number, h: number, name: string, x: number, y: number, rw: number, rh: number, official = false): Zone => ({ name, official, rect: { x: x / w, y: y / h, w: rw / w, h: rh / h } });

export const PLATFORMS: Platform[] = [
	{ id: 'og', label: 'Link preview', width: 1200, height: 630, aliases: ['link-preview', 'share', 'opengraph', 'open-graph', 'social-card', '1.91:1'], avoid: [], shown: 540, limit: { bytes: 5 * MB, official: false }, source: 'https://developer.x.com/en/docs/x-for-websites/cards/overview/summary-card-with-large-image', note: 'X allows 5 MB for a card picture. Its page refuses automated reading, so the limit is approximate.' },
	{ id: 'square', label: 'Square post', width: 1080, height: 1080, aliases: ['1:1', 'instagram', 'instagram-post', 'ig-post', 'square-post'], avoid: [], shown: 468, limit: { bytes: 8 * MB, official: false } },
	{ id: 'portrait', label: 'Portrait post', width: 1080, height: 1350, aliases: ['4:5', 'portrait-post', 'instagram-portrait', 'vertical'], avoid: [], shown: 468, limit: { bytes: 8 * MB, official: false } },
	{
		id: 'story', label: 'Story', width: 1080, height: 1920, aliases: ['9:16', 'stories', 'instagram-story', 'ig-story', 'reel-cover', 'tiktok', 'phone'],
		avoid: [px(1080, 1920, 'the profile bar at the top', 0, 0, 1080, 250), px(1080, 1920, 'the reply bar at the bottom', 0, 1580, 1080, 340)],
		shown: 390, limit: { bytes: 8 * MB, official: false }, source: 'https://www.facebook.com/business/help/980593475366490',
		note: 'Meta asks for about 14% at the top (250 px) and 20% at the bottom (340 px) to stay free. Its page draws the numbers with a script and could not be read, so they are approximate. Reels covers are stricter (about 35% at the bottom).',
	},
	{ id: 'landscape', label: 'Landscape post', width: 1200, height: 675, aliases: ['16:9', 'x-post', 'twitter-post', 'twitter', 'tweet', 'landscape-post', 'wide', 'horizontal'], avoid: [], shown: 516, limit: { bytes: 5 * MB, official: false }, source: 'https://help.x.com/en/using-x/posting-gifs-and-pictures' },
	{
		id: 'x-banner', label: 'X header', width: 1500, height: 500, aliases: ['x', 'x-header', 'twitter-banner', 'twitter-header', 'twitter-cover', 'x-cover', '3:1'],
		avoid: [px(1500, 500, 'the profile picture, lower left', 0, 280, 390, 220), px(1500, 500, 'the strip X may crop at the top', 0, 0, 1500, 60), px(1500, 500, 'the strip X may crop at the bottom', 0, 440, 1500, 60)],
		shown: 600, limit: { bytes: 5 * MB, official: false }, source: 'https://help.x.com/en/managing-your-account/common-issues-when-uploading-profile-photo',
		note: 'X recommends 1500 x 500 and the header is cropped by up to about 60 px at the top and bottom. The profile picture covers the lower left: its place is measured on x.com at its 600 px column, so it is approximate.',
	},
	{ id: 'linkedin', label: 'LinkedIn post', width: 1200, height: 627, aliases: ['linkedin-post', 'li-post'], avoid: [], shown: 552, limit: { bytes: 5 * MB, official: false } },
	{
		id: 'linkedin-banner', label: 'LinkedIn profile cover', width: 1584, height: 396, aliases: ['linkedin-cover', 'linkedin-header', 'linkedin-background', 'li-banner', '4:1'],
		avoid: [px(1584, 396, 'the profile picture, lower left', 0, 168, 400, 228)],
		shown: 792, limit: { bytes: 8 * MB, official: true }, source: 'https://www.linkedin.com/help/linkedin/answer/a568217',
		note: '1584 x 396 and under 8 MB are LinkedIn\'s. Where the profile picture sits is measured on the desktop page, so it is approximate.',
	},
	{
		id: 'linkedin-page', label: 'LinkedIn page cover', width: 1512, height: 256, aliases: ['linkedin-company', 'linkedin-company-banner', 'linkedin-page-banner', 'linkedin-page-cover', 'li-page'],
		avoid: [px(1512, 256, 'the lower-right corner', 1260, 154, 252, 102), px(1512, 256, 'the page logo, lower left', 0, 160, 225, 96), px(1512, 256, 'the left edge', 0, 0, 40, 256), px(1512, 256, 'the right edge', 1472, 0, 40, 256), px(1512, 256, 'the top edge', 0, 0, 1512, 16), px(1512, 256, 'the bottom edge', 0, 240, 1512, 16)],
		shown: 1128, limit: { bytes: 3 * MB, official: true }, source: 'https://www.linkedin.com/help/linkedin/answer/a563309',
		note: '1512 x 256, 3 MB, and "keep key details away from the edges, especially the lower-right corner" are LinkedIn\'s. The widths of those edges are approximate, as it gives none. (The older 1128 x 191 is the same shape to within 1%.)',
	},
	{
		id: 'youtube', label: 'YouTube channel art', width: 2560, height: 1440, aliases: ['youtube-banner', 'youtube-channel-art', 'channel-art', 'youtube-art', 'youtube-cover', 'yt-banner'],
		avoid: [], safe: { name: 'the part every device shows', official: true, rect: { x: (1 - 1235 / 2048) / 2, y: (1 - 338 / 1152) / 2, w: 1235 / 2048, h: 338 / 1152 } },
		shown: 1280, limit: { bytes: 6 * MB, official: true }, source: 'https://support.google.com/youtube/answer/10456525',
		note: 'YouTube: 2560 x 1440 recommended, words and logos inside 1235 x 338 of 2048 x 1152, 6 MB or smaller.',
	},
	{
		id: 'youtube-thumbnail', label: 'YouTube thumbnail', width: 1280, height: 720, aliases: ['thumbnail', 'yt-thumbnail', 'video-thumbnail', 'youtube-thumb'],
		avoid: [px(1280, 720, 'the video length, lower right', 1120, 630, 160, 90)],
		shown: 360, limit: { bytes: 2 * MB, official: true }, source: 'https://support.google.com/youtube/answer/72431',
		note: 'YouTube takes 2 MB from a phone and 50 MB from a computer; the check warns at 2 MB. Where the video length sits is approximate.',
	},
	{ id: 'email', label: 'Email header', width: 1200, height: 400, aliases: ['email-header', 'newsletter'], avoid: [], shown: 600, limit: { bytes: 1 * MB, official: false }, note: 'Emails are usually 600 px wide, so this is drawn at twice that.' },
	{
		id: 'avatar', label: 'Profile picture', width: 800, height: 800, aliases: ['profile-picture', 'profile-photo', 'pfp', 'profile', 'app-icon'],
		avoid: [], safe: { name: 'the circle it is cropped to', official: true, rect: { x: (1 - Math.SQRT1_2) / 2, y: (1 - Math.SQRT1_2) / 2, w: Math.SQRT1_2, h: Math.SQRT1_2 } },
		shown: 400, limit: { bytes: 2 * MB, official: true }, source: 'https://help.x.com/en/managing-your-account/common-issues-when-uploading-profile-photo',
		note: 'X takes 2 MB; YouTube takes 15 MB. Shown as a circle, so everything stays inside the square the circle holds.',
	},
];

/** A size no platform owns (slides, merch, custom): no zones, shown at 540 px or half its width, whichever is more. */
export function platformOf(id: string, width: number, height: number): Platform {
	const hit = PLATFORMS.find((p) => p.id === id);
	// A custom size in a platform's exact pixels is that platform's, except where two share a shape with zones that differ.
	return hit ?? { id, label: id, width, height, aliases: [], avoid: [], shown: Math.max(540, width / 2) };
}

/** A zone in pixels of a canvas. */
export const zonePx = (z: Zone, width: number, height: number): Rect => ({ x: z.rect.x * width, y: z.rect.y * height, w: z.rect.w * width, h: z.rect.h * height });

const key = (s: string) => s.toLowerCase().trim().replace(/[\s_]+/g, '-');

/** The shared id a size may be called by ("twitter header" is x-banner), or undefined. */
export function sizeAlias(typed: string): string | undefined {
	const k = key(typed);
	return PLATFORMS.find((p) => p.id === k || p.aliases.includes(k))?.id;
}
