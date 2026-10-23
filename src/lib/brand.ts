import { readFileSync } from 'node:fs';
import { pkgPath } from './paths.js';

// Everything the engine knows about the brand comes from the package's brand/ folder (built to build/): names,
// tokens, element styles. No brand value is written in src/.

/** A Google Fonts family for next/font: its import name, the CSS variable the tokens read, and its options. */
export type NextFont = { import: string; variable: string; options?: Record<string, unknown> };
export type BrandConfig = {
	name: string;
	bin: string;
	source: string;
	reviewModel: string;
	reviewThreshold: number;
	registryUrl?: string;
	/** The surfaces the brand has: a site (pages people read), a product (an app people work in), or both. */
	surfaces?: ('site' | 'product')[];
	/** How the brand's fonts load: a stylesheet URL, next/font families, and what a native app adds. */
	fonts: { css: string; next: NextFont[]; native: string };
	/** The library's variant names for what the engine picks: a filled, outlined and on-brand button, and a card. */
	/** The markup the CLI adds to a site's home: an attribute on the hero (with an optional script, a file in brand/) and
	 *  the closing words of headings wrapped in ds-accent. `does` says what each one gives, for the tasks. */
	touches: { hero?: { attribute: string; does: string; script?: string }; accent?: { does: string } };
	/** Type rules the check enforces beyond tokens: `caps` allows uppercase (a brand that sets small tags in caps), `bold`
	 * allows semibold and bold (a brand with a bold weight in its scale). */
	type?: { caps?: boolean; bold?: boolean };
	/** The one icon set: its name and the packages that provide it (web, native). The check flags imports of any other. */
	icons?: { name: string; packages: string[] };
	variants: { site: { filled: string; outlined: string; quiet?: string; onBrand: string; card: string; size?: string; badges?: Record<string, string> }; product?: { filled: string; black: string; outlined: string; ghost: string; onBrand: string; card: string } };
};

let config: BrandConfig | undefined;
export function brand(): BrandConfig {
	config ??= JSON.parse(readFileSync(pkgPath('brand', 'brand.json'), 'utf8'));
	return config!;
}

/** Whether the brand has a product surface; a site-only brand styles every project as a site. */
export const hasProduct = () => (brand().surfaces ?? ['site', 'product']).includes('product');

let framed: boolean | undefined;
/** Whether the brand's site layer draws ruled column lines (body::after), which review measures content against. */
export const hasFrame = () => (framed ??= /body::after\s*\{/.test(readFileSync(pkgPath('brand', 'site.css'), 'utf8')));

/** The command agents run. Always through npx, since the binary is not on the shell's PATH in apps. */
export const cli = () => `npx ${brand().bin}`;

/** The files the CLI writes into a project (its folder may share a name with a project's own route, so match files). */
export const isOwnFile = (rel: string) => new RegExp(`(^|/)_?${brand().bin}/(brand\\.css|theme\\.css|[\\w-]+\\.js)$|(^|/)ds-fonts\\.[jt]s$`).test(rel);

type TokenFile = { site: Record<string, string>; product: Record<string, string>; dark: Record<string, string>; theme: Record<string, string> };
let tokenFile: TokenFile | undefined;
export function tokens(): TokenFile {
	tokenFile ??= JSON.parse(readFileSync(pkgPath('build', 'tokens.json'), 'utf8'));
	return tokenFile!;
}

export const isToken = (name: string) => name in tokens().site || name in tokens().product;

/** Sizes in px at a 16px root, for snapping a site's own values to the nearest brand step. */
export type Scale = [name: string, px: number][];
let scaleCache: { text: Scale; space: Scale; radius: Scale; duration: Scale } | undefined;
export function scales() {
	if (scaleCache) return scaleCache;
	const t = tokens().site;
	const px = (v: string) => (v.endsWith('rem') ? Number.parseFloat(v) * 16 : v.endsWith('px') ? Number.parseFloat(v) : Number.NaN);
	const pick = (re: RegExp, read: (v: string) => number) => Object.entries(t).filter(([k]) => re.test(k)).map(([k, v]) => [k, read(v)] as [string, number]).filter(([, v]) => Number.isFinite(v) && v > 0);
	scaleCache = {
		text: pick(/^--ds-text-(h[1-5]|body-lg|body|body-sm|caption)$/, px),
		space: pick(/^--ds-space-[\d-]+$/, px),
		radius: pick(/^--ds-radius-(sm|control|card|shell)$/, px),
		duration: pick(/^--ds-duration-/, (v) => Number.parseFloat(v)),
	};
	return scaleCache;
}

export const nearest = (list: Scale, value: number) => list.reduce((a, b) => (Math.abs(b[1] - value) < Math.abs(a[1] - value) ? b : a))[0];

export type BrandTheme = 'site' | 'product' | 'product-dark';

/** A brand color's literal hex in a theme, for code that cannot read CSS variables (native apps, chart configs, SVG files). */
export function colorHex(name: string, theme: BrandTheme = 'site'): string | undefined {
	const t = tokens();
	const table = theme === 'site' ? t.site : theme === 'product' ? t.product : { ...t.product, ...t.dark };
	const raw = table[`--ds-color-${name}`];
	if (!raw) return undefined;
	if (raw.startsWith('#')) return raw.toUpperCase();
	const rgb = raw.match(/rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:\s*[/,]\s*([\d.]+))?/);
	if (!rgb) return undefined;
	const hex = [rgb[1], rgb[2], rgb[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join('').toUpperCase();
	return rgb[4] === undefined ? `#${hex}` : `#${hex}${Math.round(Number(rgb[4]) * 255).toString(16).padStart(2, '0').toUpperCase()}`;
}

let themeNames: Map<string, string> | undefined;
/** The Tailwind theme's class name for a brand color token (bg-default is `surface`, text-muted is `fg-muted`). */
export function themeClass(tokenName: string) {
	themeNames ??= new Map(Object.entries(tokens().theme).map(([cls, name]) => [name, cls]));
	return themeNames.get(tokenName) ?? themeNames.get(tokenName.replace(/^(bg|border)-/, ''));
}

export type Element = { name: string; match: { tags?: string[]; words?: string[]; roles?: string[]; context?: string[] }; css: Record<string, string>; states?: Record<string, Record<string, string>>; tailwind: string; rules: string[]; source: string };
let elementFile: { site: Record<string, Element>; product: Record<string, Element> } | undefined;
export function elements() {
	if (!elementFile) {
		const file = JSON.parse(readFileSync(pkgPath('brand', 'elements.json'), 'utf8'));
		// A site-only brand has no product elements: a product kind falls back to the site's.
		elementFile = { site: file.site, product: file.product ?? {} };
	}
	return elementFile!;
}
