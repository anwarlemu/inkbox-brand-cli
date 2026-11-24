import { colorHex } from '../lib/brand.js';
import { artImage, logoDoc, wordmarkPath } from './brand-art.js';
import { surface, toPng } from './canvas.js';
import { drawable } from './glyphs.js';
import { pick } from './io.js';

// Emails as plain HTML tables with inline styles, the form every mail client keeps: a newsletter, an announcement, a
// receipt, a password reset and a signature. Colors and type are the tokens (Inter where the client has it, then the
// system sans); the logo is the brand's own file, written beside the HTML. Only the words that are passed are drawn.

export const EMAILS = ['newsletter', 'announcement', 'receipt', 'password-reset', 'signature'] as const;
export type EmailKind = (typeof EMAILS)[number];

export type EmailCopy = { headline?: string; body?: string; button?: string; url?: string; items?: string; total?: string; name?: string; role?: string; email?: string; footer?: string };

const NEED: Record<EmailKind, (keyof EmailCopy)[]> = { newsletter: ['headline', 'body'], announcement: ['headline'], receipt: ['headline', 'items'], 'password-reset': ['button', 'url'], signature: ['name'] };
const TAKES: Record<EmailKind, (keyof EmailCopy)[]> = {
	newsletter: ['headline', 'body', 'button', 'url', 'footer'],
	announcement: ['headline', 'body', 'button', 'url', 'footer'],
	receipt: ['headline', 'body', 'items', 'total', 'footer'],
	'password-reset': ['headline', 'body', 'button', 'url', 'footer'],
	signature: ['name', 'role', 'email', 'url'],
};

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const c = (name: string) => colorHex(name) ?? '#000000';
const FONT = `Inter, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`;
const MONO = `'IBM Plex Mono', Menlo, Consolas, monospace`;

export function emailTakes(kind: string) {
	const k = pick('email', kind, EMAILS);
	return { takes: TAKES[k], needs: NEED[k] };
}

/** The HTML for an email, and the logo file it points at (`logo` is its address: a URL, or a file beside the HTML). */
export async function email(kind: string, copy: EmailCopy, logo = 'logo.png'): Promise<{ html: string; logoFile: Buffer }> {
	const k = pick('email', kind, EMAILS);
	for (const key of Object.keys(copy) as (keyof EmailCopy)[]) if (copy[key] !== undefined && !TAKES[k].includes(key)) throw new Error(`A ${k} email does not take --${key}. It takes ${TAKES[k].map((t) => `--${t}`).join(', ')}.`);
	for (const key of NEED[k]) if (!copy[key]?.trim()) throw new Error(`A ${k} email needs --${key}.`);
	for (const [key, v] of Object.entries(copy)) drawable(key, v);
	const ink = c('ink');
	const muted = c('text-secondary');
	const line = c('border-subtle');
	const lilac = c('lilac');
	const brand = c('brand');
	const white = c('white');
	const p = (text: string, style = '') => text.split(/\n\n+/).map((t) => `<p style="margin:0 0 16px;font-family:${FONT};font-size:15px;line-height:1.6;color:${muted};${style}">${esc(t).replace(/\n/g, '<br>')}</p>`).join('');
	const button = copy.button && copy.url ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px"><tr><td style="border-radius:9999px;background:${brand}"><a href="${esc(copy.url)}" style="display:inline-block;padding:12px 24px;font-family:${FONT};font-size:14px;font-weight:600;color:${white};text-decoration:none;border-radius:9999px">${esc(copy.button)}</a></td></tr></table>` : '';
	const logoImg = `<img src="${esc(logo)}" width="${Math.round((logoDoc().lockup.w / logoDoc().lockup.h) * 26)}" height="26" alt="" style="display:block;border:0">`;
	if (k === 'signature') {
		const rows = [
			`<tr><td style="padding:0 0 6px">${logoImg}</td></tr>`,
			`<tr><td style="font-family:${FONT};font-size:14px;font-weight:600;color:${ink}">${esc(copy.name!)}</td></tr>`,
			copy.role ? `<tr><td style="font-family:${FONT};font-size:13px;color:${muted}">${esc(copy.role)}</td></tr>` : '',
			copy.email ? `<tr><td style="font-family:${MONO};font-size:12px;color:${muted}">${esc(copy.email)}</td></tr>` : '',
			copy.url ? `<tr><td style="font-family:${MONO};font-size:12px"><a href="${esc(copy.url.startsWith('http') ? copy.url : `https://${copy.url}`)}" style="color:${brand};text-decoration:none">${esc(copy.url)}</a></td></tr>` : '',
		].join('');
		return { html: `<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${rows}</table>\n`, logoFile: await logoPng() };
	}
	let middle = '';
	if (copy.headline) middle += `<h1 style="margin:0 0 16px;font-family:${FONT};font-size:26px;line-height:1.25;font-weight:600;color:${ink}">${esc(copy.headline)}</h1>`;
	if (copy.body) middle += p(copy.body);
	if (k === 'receipt') {
		const rows = copy.items!.split('|').map((s) => s.trim()).filter(Boolean).map((row) => {
			const [what, amount = ''] = row.split(/\s+-\s+|\t/);
			return `<tr><td style="padding:10px 0;border-bottom:1px solid ${line};font-family:${FONT};font-size:14px;color:${ink}">${esc(what!)}</td><td align="right" style="padding:10px 0;border-bottom:1px solid ${line};font-family:${MONO};font-size:13px;color:${ink}">${esc(amount)}</td></tr>`;
		});
		if (copy.total) rows.push(`<tr><td style="padding:12px 0;font-family:${FONT};font-size:14px;font-weight:600;color:${ink}">Total</td><td align="right" style="padding:12px 0;font-family:${MONO};font-size:13px;font-weight:600;color:${ink}">${esc(copy.total)}</td></tr>`);
		middle += `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:8px 0 16px">${rows.join('')}</table>`;
	}
	middle += button;
	if (k === 'password-reset' && copy.url) middle += p(copy.url, `font-family:${MONO};font-size:12px;word-break:break-all`);
	const footer = copy.footer ? `<tr><td style="padding:20px 32px;font-family:${FONT};font-size:12px;line-height:1.5;color:${muted}">${esc(copy.footer)}</td></tr>` : '';
	const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(copy.headline ?? '')}</title></head>
<body style="margin:0;padding:0;background:${lilac}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${lilac}"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${white};border-radius:16px;border:1px solid ${line}">
<tr><td style="padding:28px 32px 8px">${logoImg}</td></tr>
<tr><td style="padding:16px 32px 16px">${middle}</td></tr>
${footer}
</table></td></tr></table>
</body></html>
`;
	return { html, logoFile: await logoPng() };
}

/* The lockup (the octopus and the wordmark in ink), a PNG at twice the size the email shows it. */
async function logoPng(): Promise<Buffer> {
	const L = logoDoc().lockup;
	const h = 52;
	const k = h / L.h;
	const s = surface(Math.ceil(L.w * k), h);
	const mark = await artImage('sit');
	s.ctx.drawImage(mark, 0, 0, L.mark.w * k, L.mark.h * k);
	s.ctx.translate(L.word.x * k, L.word.y * k);
	s.ctx.scale(k, k);
	s.ctx.fillStyle = c('ink');
	s.ctx.fill(wordmarkPath());
	return toPng(s);
}
