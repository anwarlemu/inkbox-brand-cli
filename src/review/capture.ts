import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const VIEWPORTS = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } } as const;
export type ViewportName = keyof typeof VIEWPORTS;
export type Shot = { viewport: ViewportName; index: number; path: string; top: number; height: number };

const SLICE = 1800;
const MAX_SLICES_PER_VIEWPORT = 6;

function cachedChromium(): string | undefined {
	const roots = [process.env.PLAYWRIGHT_BROWSERS_PATH, join(homedir(), 'Library', 'Caches', 'ms-playwright'), join(homedir(), '.cache', 'ms-playwright')].filter((r): r is string => !!r && existsSync(r));
	const candidates = [
		['chrome-mac-arm64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'],
		['chrome-mac', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'],
		['chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'],
		['chrome-linux', 'chrome'],
		['chrome-linux64', 'chrome'],
		['chrome-headless-shell-mac-arm64', 'chrome-headless-shell'],
		['chrome-headless-shell-linux64', 'chrome-headless-shell'],
	];
	for (const root of roots) {
		for (const dir of readdirSync(root).filter((d) => /^chromium/.test(d)).sort().reverse()) {
			for (const parts of candidates) {
				const path = join(root, dir, ...parts);
				if (existsSync(path)) return path;
			}
		}
	}
	return undefined;
}

async function launch() {
	const { chromium } = await import('playwright-core').catch(() => {
		throw new Error('playwright-core is not installed. Run: npm i -D playwright-core && npx playwright install chromium');
	});
	const cached = cachedChromium();
	for (const opts of [{}, ...(cached ? [{ executablePath: cached }] : []), { channel: 'chrome' }, { channel: 'msedge' }]) {
		try {
			return await chromium.launch(opts);
		} catch {}
	}
	throw new Error('No Chromium found. Run: npx playwright install chromium');
}

/**
 * What sits outside the ruled column lines (a site's frame): visible text, images and controls whose visible box
 * crosses a line, grouped by their nearest named container. Empty when the page has no frame.
 */
function outsideLines(): string[] {
	const frame = getComputedStyle(document.body, '::after');
	if (!frame.borderLeftWidth || frame.borderLeftStyle === 'none' || !Number.parseFloat(frame.width)) return [];
	const vw = document.documentElement.clientWidth;
	const left = (vw - Number.parseFloat(frame.width)) / 2;
	const right = left + Number.parseFloat(frame.width);
	const found = new Map<string, string>();
	for (const el of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
		if (el.closest('[data-ds-dots-layer], script, style, noscript, template')) continue;
		const own = el.matches('img, svg, video, canvas, picture, button, input, select, textarea, iframe') || Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent?.trim());
		if (!own || el.parentElement?.closest('svg, button')) continue;
		const style = getComputedStyle(el);
		if (style.visibility === 'hidden' || Number(style.opacity) === 0) continue;
		let { left: l, right: r, top, bottom } = el.getBoundingClientRect();
		// Only the part a clipping ancestor (a marquee, a scroller) leaves visible counts.
		for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
			const ps = getComputedStyle(p);
			if (ps.overflowX !== 'visible' || ps.clipPath !== 'none') {
				const pr = p.getBoundingClientRect();
				l = Math.max(l, pr.left);
				r = Math.min(r, pr.right);
				top = Math.max(top, pr.top);
				bottom = Math.min(bottom, pr.bottom);
			}
		}
		// Off-screen helpers (a skip link) and full-width backdrops (a hero's glow) are not content.
		if (r - l < 2 || bottom - top < 2 || r < 0 || l > vw || r - l >= vw * 0.9) continue;
		if (l >= left - 1 && r <= right + 1) continue;
		// Name the outermost box that crosses too (the floating window, not each line of text in it).
		const crosses = (n: HTMLElement) => {
			const b = n.getBoundingClientRect();
			return b.width < vw * 0.9 && (b.left < left - 1 || b.right > right + 1);
		};
		let top_ = el;
		while (top_.parentElement && top_.parentElement !== document.body && crosses(top_.parentElement)) top_ = top_.parentElement;
		const named = top_.closest<HTMLElement>('[class]:not(svg *), [id]') ?? top_;
		const name = named.id ? `#${named.id}` : `.${String(named.className).trim().split(/\s+/)[0]}`;
		if (!found.has(name)) found.set(name, `${name} (${Math.round(l)} to ${Math.round(r)}px; lines at ${Math.round(left)} and ${Math.round(right)})`);
	}
	return [...found.values()];
}

/** What the page actually uses, measured, so the reviewer does not guess fonts or sizes from pixels. */
function measuredFacts(): string[] {
	const facts: string[] = [];
	const first = (stack: string) => stack.split(',')[0].replace(/["']/g, '').trim();
	const loaded = (family: string) => (document.fonts.check(`16px "${family}"`) ? 'loaded' : 'not loaded');
	for (const [label, sel] of [['h1', 'h1'], ['section headings', 'h2'], ['body text', 'p'], ['buttons', 'button, a[class*="btn"]'], ['navigation', 'nav a, header a']] as const) {
		const el = document.querySelector<HTMLElement>(sel);
		if (!el) continue;
		const cs = getComputedStyle(el);
		const fam = first(cs.fontFamily);
		facts.push(`${label}: ${fam} (${loaded(fam)}), ${Math.round(Number.parseFloat(cs.fontSize))}px, weight ${cs.fontWeight}, color ${cs.color}`);
	}
	facts.push(`page background: ${getComputedStyle(document.body).backgroundColor}`);
	return facts;
}

export async function capture(url: string, viewports: ViewportName[], outDir: string): Promise<{ shots: Shot[]; outside: string[]; facts: string[] }> {
	mkdirSync(outDir, { recursive: true });
	const browser = await launch();
	const shots: Shot[] = [];
	const outside: string[] = [];
	let facts: string[] = [];
	try {
		// A narrower desktop too: fixed widths that fit at 1440 cross the lines on a laptop.
		const narrow = await browser.newPage({ viewport: { width: 1100, height: 800 }, deviceScaleFactor: 1 });
		await narrow.goto(url, { waitUntil: 'networkidle', timeout: 120_000 });
		for (const item of await narrow.evaluate(outsideLines)) outside.push(`at 1100px: ${item}`);
		await narrow.close();
		for (const viewport of viewports) {
			const page = await browser.newPage({ viewport: VIEWPORTS[viewport], deviceScaleFactor: 1, extraHTTPHeaders: { Accept: 'text/html' } });
			await page.goto(url, { waitUntil: 'networkidle', timeout: 120_000 });
			await page.addStyleTag({ content: '*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition-duration:0s!important}' });
			const height = await page.evaluate(() => document.documentElement.scrollHeight);
			for (let y = 0; y < height; y += 600) {
				await page.evaluate((top) => window.scrollTo(0, top), y);
				await page.waitForTimeout(60);
			}
			await page.evaluate(() => window.scrollTo(0, 0));
			await page.waitForTimeout(400);
			for (const item of await page.evaluate(outsideLines)) outside.push(`at ${VIEWPORTS[viewport].width}px: ${item}`);
			if (viewport === 'desktop') facts = await page.evaluate(measuredFacts);
			const slices = Math.min(MAX_SLICES_PER_VIEWPORT, Math.ceil(height / SLICE));
			for (let i = 0; i < slices; i++) {
				const top = i * SLICE;
				const path = join(outDir, `${viewport}-${String(i).padStart(2, '0')}.jpg`);
				await page.screenshot({ path, type: 'jpeg', quality: 80, fullPage: true, clip: { x: 0, y: top, width: VIEWPORTS[viewport].width, height: Math.min(SLICE, height - top) } });
				shots.push({ viewport, index: i, path, top, height: Math.min(SLICE, height - top) });
			}
			await page.close();
		}
	} finally {
		await browser.close();
	}
	return { shots, outside: outside.slice(0, 12), facts };
}
