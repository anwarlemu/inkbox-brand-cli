import { existsSync, readFileSync } from 'node:fs';
import { Path2D, type Image } from '@napi-rs/canvas';
import { pkgPath } from '../lib/paths.js';
import { imageDoc, logoDoc, wordmarkPath } from './brand-art.js';
import { tokenColor, type Ctx, type Fonts } from './canvas.js';

/*
 * The product, drawn on the canvas the way the share-image editor draws it (agd-playground
 * src/components/inkbox-og/app.ts, from the Figma share image 739:75698): the workspace nav, the mailbox's own nav, the
 * message list and the open message, laid out on the Figma frame's 1040-wide grid and scaled to the window. The
 * content and colors come from brand/assets/image.json `app` (Acme placeholders, console tokens); the glyphs are the
 * brand's Phosphor icons in brand/assets/icons, tinted to the nav color.
 */

export type AppContent = {
	handle: string;
	domain: string;
	/* One message a line: from | date | subject | preview. */
	mails: string;
	subject: string;
	body: string;
	workspaceNav: string;
	mailboxNav: string;
	showWorkspace: boolean;
	showMailbox: boolean;
	showList: boolean;
	showOpen: boolean;
	showLogo: boolean;
	openIndex: number;
	listTitle: string;
	unread: string;
	textScale: number;
	radius: number;
	/* A video's arriving messages: how many rows of the list show (the last one, fractional, fading and rising in). */
	rows?: number;
	/* How wide the view is on the console's grid (1040 is all of it). */
	width?: number;
	/* No messages: the console with an empty list and reading pane. */
	blank?: boolean;
};

export const APP_W = 1040;
export const APP_H = 585;

export function appStart(): AppContent {
	const a = imageDoc().app as Record<string, unknown>;
	return {
		handle: String(a.handle),
		domain: String(a.domain),
		mails: (a.mails as string[]).join('\n'),
		subject: String(a.subject),
		body: String(a.body),
		workspaceNav: String(a.workspaceNav),
		mailboxNav: String(a.mailboxNav),
		showWorkspace: true,
		showMailbox: true,
		showList: true,
		showOpen: true,
		showLogo: true,
		openIndex: 0,
		listTitle: '',
		unread: String(a.unread ?? ''),
		textScale: 100,
		radius: 4.3,
	};
}

/* The glyphs as vector paths on Phosphor's 256 grid, so an SVG keeps them as paths. */
export type Icons = Map<string, Path2D>;

type Item = { icon: string; label: string; tag?: string; on?: boolean };
type NavSection = { label?: string; tune?: boolean; foot?: boolean; items: Item[] };

/* A nav written as text, one item a line: "Icon | Label | Tag", "*" at the end marks the chosen item, "# Label" starts
   a section ("# Label +" gives it a settings button) and "---" starts the foot, pinned to the bottom. */
export function parseNav(s: string): NavSection[] {
	const out: NavSection[] = [{ items: [] }];
	let foot = false;
	for (const raw of s.split('\n')) {
		const l = raw.trim();
		if (!l) continue;
		if (l === '---') {
			foot = true;
			out.push({ foot, items: [] });
			continue;
		}
		if (l.startsWith('#')) {
			const tune = l.endsWith('+');
			out.push({ label: l.replace(/^#+\s*/, '').replace(/\s*\+$/, ''), tune, foot, items: [] });
			continue;
		}
		const on = l.endsWith('*');
		const [icon = '', label = '', tag = ''] = l.replace(/\s*\*$/, '').split('|').map((p) => p.trim());
		out[out.length - 1]!.items.push({ icon, label: label || icon, tag: tag || undefined, on });
	}
	return out.filter((sec) => sec.label || sec.items.length);
}

function colorsOf() {
	const c = imageDoc().app.colors;
	const t = (k: string) => tokenColor(c[k]!);
	return { strong: t('strong'), ink: t('ink'), muted: t('muted'), accent: t('accent'), tint: t('tint'), side: t('side'), bg: t('bg'), line: t('line'), pink: t('pink'), pinkFill: t('pinkFill'), blue: t('avatar'), avatarInk: t('avatarInk'), unreadBg: t('unreadBg'), unread: t('unread'), shadow: t('shadow') };
}

export function parseMails(s: string) {
	return s
		.split('\n')
		.map((l) => l.trim())
		.filter(Boolean)
		.map((l) => {
			const [from = '', date = '', subject = '', preview = ''] = l.split('|').map((p) => p.trim());
			return { from, date, subject, preview };
		});
}

const kebab = (name: string) => name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2').toLowerCase();

/** The icon names a nav text uses, plus the fixed glyphs of the list and the open message. */
function iconNames(a: AppContent): string[] {
	const names = new Set(['SlidersHorizontal', 'CaretDown', 'PencilSimpleLine', 'GearSix', 'ArrowBendUpLeft', 'ShareFat']);
	for (const s of [...parseNav(a.workspaceNav), ...parseNav(a.mailboxNav)]) for (const it of s.items) names.add(it.icon);
	return [...names];
}

/** The window's glyphs, from brand/assets/icons (Phosphor, one path each). A name with no file draws its label only. */
export async function loadIcons(a: AppContent = appStart()): Promise<Icons> {
	const map: Icons = new Map();
	for (const name of iconNames(a)) {
		const file = pkgPath('brand', 'assets', 'icons', `${kebab(name)}.svg`);
		if (!existsSync(file)) continue;
		const d = readFileSync(file, 'utf8').match(/\sd="([^"]+)"/)?.[1];
		if (d) map.set(name, new Path2D(d));
	}
	return map;
}

/** Every icon file the window can draw, by its Phosphor name. */
export function iconCatalog(): string[] {
	return [...new Set(iconNames(appStart()))];
}

function fit(ctx: Ctx, s: string, w: number) {
	if (ctx.measureText(s).width <= w) return s;
	let lo = 0;
	let hi = s.length;
	while (lo < hi) {
		const mid = (lo + hi + 1) >> 1;
		if (ctx.measureText(`${s.slice(0, mid)}…`).width <= w) lo = mid;
		else hi = mid - 1;
	}
	return `${s.slice(0, lo).trimEnd()}…`;
}

function wrapPlain(ctx: Ctx, s: string, w: number) {
	const out: string[] = [];
	let line = '';
	for (const word of s.split(/\s+/)) {
		const next = line ? `${line} ${word}` : word;
		if (line && ctx.measureText(next).width > w) {
			out.push(line);
			line = word;
		} else line = next;
	}
	if (line) out.push(line);
	return out;
}

function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
	ctx.beginPath();
	ctx.roundRect(x, y, w, h, r);
}

/* Draws the app into a 1040 by 585 box at the context's current transform (the caller scales it). Columns that are
   turned off give their room to the open message. */
export function drawApp(ctx: Ctx, a0: Partial<AppContent>, icons: Icons, fonts: Fonts, mark: Image | null) {
	const a = { ...appStart(), ...a0 };
	const C = colorsOf();
	const L = logoDoc().lockup;
	const handle = a.handle.trim() || 'agent';
	const email = `${handle}@${a.domain.trim() || String(imageDoc().app.domain)}`;
	const font = (size: number, weight = 400) => `${weight} ${size * (a.textScale / 100)}px ${fonts.sans}`;
	const icon = (name: string, x: number, y: number, s = 11.92) => {
		const path = icons.get(name);
		if (!path) return;
		ctx.save();
		ctx.translate(x, y);
		ctx.scale(s / 256, s / 256);
		ctx.fillStyle = C.ink;
		ctx.fill(path);
		ctx.restore();
	};
	ctx.textBaseline = 'middle';
	ctx.textAlign = 'left';
	const r = a.radius;

	const cols = [a.showWorkspace ? 156 : 0, a.showMailbox ? 156 : 0, a.showList ? 222 : 0];
	const x1 = cols[0]!;
	const x2 = x1 + cols[1]!;
	const x3 = x2 + cols[2]!;
	const APPW = a.width ?? APP_W;
	const openW = APPW - x3;

	ctx.fillStyle = C.bg;
	ctx.fillRect(0, 0, APPW, APP_H * 2);
	if (cols[1]) {
		ctx.fillStyle = C.side;
		ctx.fillRect(x1, 0, 156, APP_H * 2);
	}
	ctx.fillStyle = C.line;
	for (const x of [x1, x2, x3]) if (x > 0 && x < APPW) ctx.fillRect(x - 0.27, 0, 0.54, APP_H * 2);

	const nav = (it: Item, x: number, y: number, w: number, pill: string) => {
		if (it.on) {
			ctx.fillStyle = pill;
			rr(ctx, x, y, w, 20.58, r);
			ctx.fill();
		}
		icon(it.icon, x + 6.5, y + 4.33);
		ctx.fillStyle = C.ink;
		ctx.font = font(7.6, it.on ? 500 : 400);
		ctx.fillText(it.label, x + 23.83, y + 10.3);
		if (it.tag) {
			const tx = x + 23.83 + ctx.measureText(it.label).width + 5.5;
			ctx.font = font(5.6, 500);
			const tw = ctx.measureText(it.tag).width + 7.6;
			const pink = /beta|new/i.test(it.tag);
			ctx.strokeStyle = pink ? C.pink : C.line;
			ctx.lineWidth = 0.6;
			ctx.fillStyle = pink ? C.pinkFill : C.tint;
			rr(ctx, tx, y + 4.33, tw, 11.92, 3);
			ctx.fill();
			ctx.stroke();
			ctx.fillStyle = pink ? C.pink : C.muted;
			ctx.fillText(it.tag, tx + 3.8, y + 10.4);
		}
	};
	const label = (s: string, x: number, y: number) => {
		ctx.fillStyle = C.muted;
		ctx.font = font(7, 400);
		ctx.fillText(s, x, y + 4.6);
	};
	const sections = (secs: NavSection[], pill: string, shadow: boolean, startY: number) => {
		let y = startY;
		const foot = secs.filter((s) => s.foot);
		const body = secs.filter((s) => !s.foot);
		const draw = (sec: NavSection) => {
			if (sec.label) {
				label(sec.label, 8.67, y + 6.5);
				if (sec.tune) icon('SlidersHorizontal', 138.1, y + 6.67, 8.67);
				y += 19.83;
			}
			for (const it of sec.items) {
				if (it.on && shadow) {
					ctx.save();
					ctx.shadowColor = withA(C.shadow, 0.06);
					ctx.shadowBlur = 3;
					ctx.shadowOffsetY = 0.6;
					nav(it, 6.5, y, 142.46, pill);
					ctx.restore();
				} else nav(it, 6.5, y, 142.46, pill);
				y += 21.67;
			}
			y += 5;
		};
		body.forEach(draw);
		const footH = foot.reduce((h, s) => h + (s.label ? 19.83 : 0) + s.items.length * 21.67 + 5, 0);
		y = Math.max(y, APP_H - footH - 7);
		foot.forEach(draw);
	};

	if (cols[0]) {
		if (mark && a.showLogo) {
			const k = 13 / L.h;
			ctx.drawImage(mark, 8.67, 10.83, L.mark.w * k, L.mark.h * k);
			ctx.save();
			ctx.translate(8.67 + L.word.x * k, 10.83 + L.word.y * k);
			ctx.scale(k, k);
			ctx.fillStyle = C.strong;
			ctx.fill(wordmarkPath());
			ctx.restore();
		}
		sections(parseNav(a.workspaceNav), C.tint, false, 34.67);
	}

	if (cols[1]) {
		ctx.save();
		ctx.translate(x1, 0);
		ctx.fillStyle = C.blue;
		rr(ctx, 13.54, 11.92, 10.83, 10.83, 2.4);
		ctx.fill();
		ctx.fillStyle = C.avatarInk;
		ctx.font = font(6.6, 500);
		ctx.textAlign = 'center';
		ctx.fillText(handle[0]!.toUpperCase(), 18.96, 17.5);
		ctx.textAlign = 'left';
		ctx.fillStyle = C.strong;
		ctx.font = font(7.6, 500);
		ctx.fillText(fit(ctx, `@${handle}`, 92), 30.33, 17.4);
		icon('CaretDown', 131.6, 11.9, 10.83);
		sections(parseNav(a.mailboxNav), C.bg, true, 34.67);
		ctx.restore();
	}

	const mails = a.blank ? [] : parseMails(a.mails);
	const chosen = Math.min(Math.max(0, a.openIndex), Math.max(0, mails.length - 1));

	if (cols[2]) {
		ctx.save();
		ctx.translate(x2, 0);
		ctx.fillStyle = C.strong;
		ctx.font = font(7.6, 500);
		ctx.fillText(fit(ctx, a.listTitle || handle, 150), 13, 11.5);
		ctx.fillStyle = C.accent;
		ctx.font = font(7.6, 400);
		ctx.fillText(fit(ctx, email, 150), 13, 22.7);
		icon('PencilSimpleLine', 174.9, 11.7, 10.83);
		icon('GearSix', 192.2, 11.7, 10.83);
		let y = 40.75;
		mails.forEach((m, i) => {
			const shown = a.rows === undefined ? 1 : Math.max(0, Math.min(1, a.rows - i));
			if (shown <= 0) return;
			ctx.save();
			ctx.globalAlpha *= shown;
			ctx.translate(0, (1 - shown) * 8);
			if (i === chosen) {
				ctx.fillStyle = C.tint;
				rr(ctx, 6.5, y, 208.54, 53.58, r);
				ctx.fill();
			} else if (i !== chosen + 1) {
				ctx.fillStyle = C.line;
				ctx.fillRect(6.5, y - 1.36, 208.54, 0.54);
			}
			ctx.font = font(7.6, 500);
			ctx.fillStyle = C.strong;
			ctx.fillText(fit(ctx, m.from, 140), 13, y + 14);
			ctx.font = font(7.6, 400);
			ctx.fillStyle = C.muted;
			ctx.textAlign = 'right';
			ctx.fillText(m.date, 202, y + 14);
			ctx.textAlign = 'left';
			ctx.fillStyle = C.strong;
			ctx.fillText(fit(ctx, m.subject, 192), 13, y + 37.9);
			ctx.fillStyle = C.accent;
			ctx.fillText(fit(ctx, m.preview, 192), 13, y + 49);
			ctx.restore();
			y += 56.29;
		});
		ctx.restore();
	}

	if (a.showOpen && openW > 40 && !a.blank) {
		ctx.save();
		ctx.translate(x3, 0);
		const first = mails[chosen] ?? { from: '', date: '', subject: '', preview: '' };
		const right = openW - 20;
		ctx.fillStyle = C.strong;
		ctx.font = font(10.6, 500);
		ctx.fillText(fit(ctx, a.subject || first.subject, right - 80), 13, 17.75);
		ctx.fillStyle = C.muted;
		ctx.font = font(7, 400);
		ctx.textAlign = 'right';
		ctx.fillText(`${mails.length || 1} message${mails.length === 1 ? '' : 's'}`, right, 17.75);
		ctx.textAlign = 'left';
		ctx.fillStyle = C.line;
		ctx.fillRect(0, 35.23, openW, 0.54);
		ctx.fillStyle = C.strong;
		ctx.font = font(7.6, 500);
		ctx.fillText(first.from, 13, 46.5);
		const fw = ctx.measureText(first.from).width;
		if (a.unread.trim()) {
			ctx.font = font(5.6, 500);
			const uw = ctx.measureText(a.unread).width + 4.4;
			ctx.fillStyle = C.unreadBg;
			rr(ctx, 13 + fw + 2.2, 42.5, uw, 8, 1.6);
			ctx.fill();
			ctx.fillStyle = C.unread;
			ctx.fillText(a.unread, 13 + fw + 4.4, 46.7);
		}
		ctx.font = font(7.6, 400);
		ctx.fillStyle = C.accent;
		ctx.fillText(`To: ${email}`, 13, 57.6);
		ctx.fillStyle = C.muted;
		ctx.textAlign = 'right';
		ctx.fillText(first.date, right, 52);
		ctx.textAlign = 'left';
		icon('ArrowBendUpLeft', right - 94, 47.5, 8.67);
		icon('ShareFat', right - 84, 47.5, 8.67);

		ctx.fillStyle = C.strong;
		ctx.font = font(7.6, 400);
		let y = 80.75;
		const body = a.body.replaceAll('{handle}', handle);
		const wrapW = Math.min(openW - 26, Math.max(366.7, openW * 0.72));
		for (const para of body.split(/\n/)) {
			if (!para.trim()) {
				y += 4;
				continue;
			}
			for (const line of wrapPlain(ctx, para, wrapW)) {
				ctx.fillText(line, 13, y);
				y += 9 * (a.textScale / 100);
				if (y > APP_H + 10) break;
			}
		}
		ctx.restore();
	}
}

function withA(color: string, alpha: number) {
	return tokenColor({ token: color, alpha });
}
