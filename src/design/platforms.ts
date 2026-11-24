import type { Rect } from './types.js';

// The shared sizes: the same ids, pixels and other names in every brand CLI, with where each platform covers or crops
// the picture, the width it is usually shown at and the largest file it takes. `source` is the platform's own page.
// Each number is marked official (read on that page) or approximate (measured, or repeated by others where the
// platform's page cannot be read). Read 2026-11-23.
//
// `shown` is the width the picture usually takes on a desktop page, measured in each platform's own web app on 2026-11-23
// (X's timeline card 516 px and header 600 px, LinkedIn's feed 552 px and cover 792 px, Instagram's feed 468 px, a phone's
// story 390 px, YouTube's channel page 1280 px and its grid 360 px, an email's 600 px column). All are approximate: the
// platforms publish none. The small-text floor and the large-text line for contrast both read it.

export type Zone = { name: string; rect: Rect; official: boolean };   // rect in shares of the canvas
export type Platform = {
	id: string; label: string; width: number; height: number; aliases: string[];
	avoid: Zone[];                 // words, the logo and key art stay out of these
	safe?: Zone;                   // and, when given, inside this
	shown: number;                 // the width in CSS px it is usually shown at (approximate), for small and large text
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
	{ id: 'pinterest', label: 'Pinterest pin', width: 1000, height: 1500, aliases: ['pin', '2:3'], avoid: [], shown: 236, limit: { bytes: 20 * MB, official: true }, source: 'https://help.pinterest.com/en/business/article/pinterest-product-specs', note: 'Pinterest recommends 2:3 (1000 x 1500), 20 MB on desktop. Its grid shows pins about 236 px wide (approximate), so small text needs to be large.' },
	{ id: 'facebook-cover', label: 'Facebook page cover', width: 1702, height: 630, aliases: ['facebook-banner', 'fb-cover'], avoid: [px(1702, 630, 'the strip a phone crops at the left', 0, 0, 95, 630), px(1702, 630, 'the strip a phone crops at the right', 1607, 0, 95, 630), px(1702, 630, 'the profile picture, lower left', 0, 470, 420, 160)], shown: 851, limit: { bytes: 100 * 1024, official: true }, source: 'https://www.facebook.com/help/125379114252045', note: 'Facebook recommends 851 x 315 (this is twice that) and under 100 KB for fast loading; phones show 2.4:1, so the sides are cropped. The profile picture covers part of the left: where is approximate.' },
	{ id: 'facebook', label: 'Facebook post', width: 1080, height: 1350, aliases: ['facebook-post', 'fb-post', 'threads', 'threads-post', 'meta-feed'], avoid: [], shown: 500, limit: { bytes: 8 * MB, official: false }, note: 'Facebook, Threads and Meta feed ads take 4:5 at 1080 x 1350.' },
	{ id: 'ad-300x250', label: 'Medium rectangle ad', width: 300, height: 250, aliases: ['medium-rectangle', 'mrec'], avoid: [], shown: 300, limit: { bytes: 150 * 1024, official: false }, source: 'https://support.google.com/google-ads/answer/7031480', note: 'Listed by Google Ads among common sizes. The 150 KB limit is what ad networks usually ask for (approximate).' },
	{ id: 'ad-336x280', label: 'Large rectangle ad', width: 336, height: 280, aliases: ['large-rectangle'], avoid: [], shown: 336, limit: { bytes: 150 * 1024, official: false }, source: 'https://support.google.com/google-ads/answer/7031480' },
	{ id: 'ad-728x90', label: 'Leaderboard ad', width: 728, height: 90, aliases: ['leaderboard'], avoid: [], shown: 728, limit: { bytes: 150 * 1024, official: false }, source: 'https://support.google.com/google-ads/answer/7031480' },
	{ id: 'ad-300x600', label: 'Half page ad', width: 300, height: 600, aliases: ['half-page'], avoid: [], shown: 300, limit: { bytes: 150 * 1024, official: false }, source: 'https://support.google.com/google-ads/answer/7031480' },
	{ id: 'ad-320x50', label: 'Mobile banner ad', width: 320, height: 50, aliases: ['mobile-banner'], avoid: [], shown: 320, limit: { bytes: 150 * 1024, official: false }, note: 'An IAB size; Google\'s page lists 300x50 instead.' },
	{ id: 'ad-160x600', label: 'Wide skyscraper ad', width: 160, height: 600, aliases: ['skyscraper', 'wide-skyscraper'], avoid: [], shown: 160, limit: { bytes: 150 * 1024, official: false }, source: 'https://support.google.com/google-ads/answer/7031480' },
	{ id: 'ad-970x250', label: 'Billboard ad', width: 970, height: 250, aliases: ['billboard'], avoid: [], shown: 970, limit: { bytes: 150 * 1024, official: false }, note: 'An IAB size; Google\'s page lists 970x90.' },
	{ id: 'meeting', label: 'Video call background', width: 1920, height: 1080, aliases: ['zoom', 'zoom-background', 'meet', 'teams', 'virtual-background'], avoid: [px(1920, 1080, 'where the person sits', 560, 300, 800, 780)], shown: 960, note: 'Zoom recommends 1920 x 1080. The middle is covered by the person on the call (approximate), and apps mirror the picture for the person themselves.' },
	{ id: 'desktop', label: 'Desktop wallpaper', width: 2880, height: 1800, aliases: ['wallpaper', 'desktop-wallpaper', 'laptop'], avoid: [], shown: 1440 },
	{ id: 'phone-wallpaper', label: 'Phone wallpaper', width: 1170, height: 2532, aliases: ['lock-screen', 'mobile-wallpaper', 'iphone'], avoid: [px(1170, 2532, 'the clock', 0, 0, 1170, 760), px(1170, 2532, 'the home bar and controls', 0, 2240, 1170, 292)], shown: 390, note: 'An iPhone at 3x. Where the clock and controls sit is approximate.' },
	{ id: 'a4', label: 'A4 page', width: 2480, height: 3508, aliases: ['a4-page', 'one-pager', 'one-pager-a4'], avoid: [], shown: 794, note: 'At 300 dpi; shown is the page at 96 dpi.' },
	{ id: 'letter', label: 'US Letter page', width: 2550, height: 3300, aliases: ['us-letter', 'letter-page', 'one-pager-letter'], avoid: [], shown: 816, note: 'At 300 dpi; shown is the page at 96 dpi.' },
	{ id: 'business-card', label: 'Business card', width: 1050, height: 600, aliases: ['card-print', 'visiting-card'], avoid: [px(1050, 600, 'the bleed and safe margin', 0, 0, 1050, 75), px(1050, 600, 'the bleed and safe margin', 0, 525, 1050, 75), px(1050, 600, 'the bleed and safe margin', 0, 0, 75, 600), px(1050, 600, 'the bleed and safe margin', 975, 0, 75, 600)], shown: 336, note: '3.5 x 2 in at 300 dpi; the edges hold 0.125 in of bleed and 0.125 in of safe margin. Confirm with the printer.' },
	{ id: 'email-signature', label: 'Email signature', width: 1200, height: 300, aliases: ['signature'], avoid: [], shown: 600, limit: { bytes: 100 * 1024, official: false }, note: 'Shown at 600 x 150; keep it light, mail clients clip large signatures.' },
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
