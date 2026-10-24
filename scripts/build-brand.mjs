// Composes what the CLI installs from brand/: one stylesheet for a site, one for a product (when the brand has one),
// the Tailwind 4 theme, the font import, and a flat token index the engine reads. brand/tokens.css stays the single
// source; brand/brand.json names the brand and its fonts.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../brand/${p}`, import.meta.url), 'utf8');
const brand = JSON.parse(read('brand.json'));
const tokens = read('tokens.css');
const blocks = [...tokens.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ selector: m[1].replace(/\/\*[\s\S]*?\*\//g, '').trim(), body: m[2] }));
const root = blocks.find((b) => b.selector === ':root');
const hasProduct = (brand.surfaces ?? ['site', 'product']).includes('product');
// A site-only brand has no product block: a product is styled as the site.
const product = blocks.find((b) => b.selector === '.ds-product') ?? { body: '' };
const dark = blocks.find((b) => b.selector.includes('dark')) ?? { body: '' };
if (!root) throw new Error('brand/tokens.css needs a :root block');
if (hasProduct && (!product.body || !dark.body)) throw new Error('brand/tokens.css needs .ds-product and a dark block for a brand with a product');
const vars = (body) => Object.fromEntries([...body.matchAll(/(--ds-[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));

const header = `/* Written by ${brand.bin} from its brand files. Do not edit; run the CLI again to update. */\n`;
// A site may also hold product screens (an app behind the marketing pages): they opt in with the ds-product class.
const productBlocks = hasProduct ? `.ds-product {${product.body}}\n\n.dark .ds-product,\n[data-theme="dark"] .ds-product,\n.ds-product:is(.dark, [data-theme="dark"]) {${dark.body}}\n\n` : '';
const interactions = read('interactions.css');
const site = `${header}:root {${root.body}}\n\n${productBlocks}${read('site.css')}\n${interactions}`;
// A product project is a product everywhere, so its values apply at the root; its dark theme follows the app's own switch.
const productCss = !hasProduct ? site : `${header}:root {${root.body}}\n\n:root {${product.body}}\n\n:root:is(.dark, [data-theme="dark"]),\n.dark .ds-product,\n[data-theme="dark"] .ds-product {${dark.body}}\n\n${read('product.css')}`;

// Tailwind 4: theme names that read the brand variables, so classes like bg-surface or text-fg-muted work.
const t = vars(root.body);
// Role names for the core tokens; every other color token keeps its own name (--ds-color-paper is bg-paper).
const ROLES = {
	brand: 'brand', black: 'black', white: 'white', primary: 'action-primary', 'primary-hover': 'action-primary-hover', 'on-primary': 'action-primary-fg', 'focus-ring': 'focus-ring',
	surface: 'bg-default', subtle: 'bg-subtle', frame: 'bg-frame', canvas: 'bg-canvas', tint: 'bg-tint', inverse: 'bg-inverse', dark: 'bg-dark', code: 'bg-code', scrim: 'bg-scrim',
	fg: 'text-default', 'fg-secondary': 'text-secondary', 'fg-muted': 'text-muted', 'fg-subtle': 'text-subtle', 'fg-faint': 'text-faint', 'fg-nav': 'text-nav', 'fg-inverse': 'text-inverse', 'fg-brand': 'text-brand', 'on-brand': 'text-on-brand',
	line: 'border-default', 'line-subtle': 'border-subtle', 'line-strong': 'border-strong', hairline: 'border-hairline',
	success: 'status-success', warning: 'status-warning', danger: 'status-danger',
};
const color = Object.fromEntries(Object.entries(ROLES).filter(([, v]) => `--ds-color-${v}` in t));
const named = new Set(Object.values(color));
for (const name of Object.keys(t)) {
	const m = name.match(/^--ds-color-(.+)$/);
	if (!m || named.has(m[1])) continue;
	const key = m[1].replace(/^chart-(series-\d)$/, '$1').replace(/^status-/, '').replace(/^status-/, '').replace(/^bg-/, '').replace(/^border-/, 'line-').replace(/^text-/, 'fg-');
	if (!(key in color)) color[key] = m[1];
}
const theme = [
	...Object.entries(color).map(([k, v]) => `\t--color-${k}: var(--ds-color-${v});`),
	...Object.keys(t).filter((k) => /^--ds-font-(?!weight)/.test(k)).map((k) => `\t--font-${k.slice(10)}: var(${k});`),
	...Object.keys(t).filter((k) => k.startsWith('--ds-text-')).map((k) => `\t--text-${k.slice(10)}: var(${k});`),
	...Object.keys(t).filter((k) => k.startsWith('--ds-leading-')).map((k) => `\t--leading-${k.slice(13)}: var(${k});`),
	...Object.keys(t).filter((k) => k.startsWith('--ds-tracking-')).map((k) => `\t--tracking-${k.slice(14)}: var(${k});`),
	...Object.keys(t).filter((k) => k.startsWith('--ds-radius-')).map((k) => `\t--radius-${k.slice(12)}: var(${k});`),
	...Object.keys(t).filter((k) => k.startsWith('--ds-shadow-')).map((k) => `\t--shadow-${k.slice(12)}: var(${k});`),
	'\t--ease-out: var(--ds-easing-out);',
	'\t--ease-in-out: var(--ds-easing-in-out);',
	'\t--ease-drawer: var(--ds-easing-drawer);',
];
// Motion (Emil Kowalski's rules): overlays scale out of their trigger from 0.96 with a fade, dialogs stay centered,
// sheets and drawers travel their own size on the drawer curve, exits are shorter than entrances, and nothing starts
// from scale(0) or eases in. With reduced motion every entrance and exit is a fade only.
const motion = `@theme {
	--animate-pop-in: ds-pop-in var(--ds-duration-base) var(--ds-easing-out);
	--animate-pop-out: ds-pop-out var(--ds-duration-fast) var(--ds-easing-out) forwards;
	--animate-fade-in: ds-fade-in var(--ds-duration-fast) var(--ds-easing-out);
	--animate-fade-out: ds-fade-out var(--ds-duration-fast) var(--ds-easing-out) forwards;
	--animate-dialog-in: ds-dialog-in var(--ds-duration-moderate) var(--ds-easing-out);
	--animate-dialog-out: ds-dialog-out var(--ds-duration-fast) var(--ds-easing-out) forwards;
	--animate-sheet-in-right: ds-sheet-in-right var(--ds-duration-slow) var(--ds-easing-drawer);
	--animate-sheet-out-right: ds-sheet-out-right var(--ds-duration-base) var(--ds-easing-drawer) forwards;
	--animate-sheet-in-left: ds-sheet-in-left var(--ds-duration-slow) var(--ds-easing-drawer);
	--animate-sheet-out-left: ds-sheet-out-left var(--ds-duration-base) var(--ds-easing-drawer) forwards;
	--animate-sheet-in-top: ds-sheet-in-top var(--ds-duration-slow) var(--ds-easing-drawer);
	--animate-sheet-out-top: ds-sheet-out-top var(--ds-duration-base) var(--ds-easing-drawer) forwards;
	--animate-sheet-in-bottom: ds-sheet-in-bottom var(--ds-duration-slow) var(--ds-easing-drawer);
	--animate-sheet-out-bottom: ds-sheet-out-bottom var(--ds-duration-base) var(--ds-easing-drawer) forwards;
	--animate-content-in: ds-content-in var(--ds-duration-base) var(--ds-easing-out);
	--animate-accordion-down: ds-accordion-down var(--ds-duration-base) var(--ds-easing-out);
	--animate-accordion-up: ds-accordion-up var(--ds-duration-fast) var(--ds-easing-out);
	--animate-collapsible-down: ds-collapsible-down var(--ds-duration-base) var(--ds-easing-out);
	--animate-collapsible-up: ds-collapsible-up var(--ds-duration-fast) var(--ds-easing-out);
	--animate-pulse-soft: ds-pulse-soft 1.6s var(--ds-easing-in-out) infinite;
	--animate-spin-steady: spin 0.8s linear infinite;
	--animate-caret-blink: ds-caret-blink 1.1s steps(1) infinite;
	--animate-chart-line: ds-chart-line 700ms var(--ds-easing-out) backwards;
	--animate-chart-bar: ds-chart-bar 400ms var(--ds-easing-out) backwards;

	@keyframes ds-pop-in {
		from {
			opacity: 0;
			transform: scale(0.96);
		}
	}

	@keyframes ds-pop-out {
		to {
			opacity: 0;
			transform: scale(0.96);
		}
	}

	@keyframes ds-fade-in {
		from {
			opacity: 0;
		}
	}

	@keyframes ds-fade-out {
		to {
			opacity: 0;
		}
	}

	@keyframes ds-dialog-in {
		from {
			opacity: 0;
			transform: scale(0.96);
		}
	}

	@keyframes ds-dialog-out {
		to {
			opacity: 0;
			transform: scale(0.97);
		}
	}

	@keyframes ds-sheet-in-right {
		from {
			transform: translateX(100%);
		}
	}

	@keyframes ds-sheet-out-right {
		to {
			transform: translateX(100%);
		}
	}

	@keyframes ds-sheet-in-left {
		from {
			transform: translateX(-100%);
		}
	}

	@keyframes ds-sheet-out-left {
		to {
			transform: translateX(-100%);
		}
	}

	@keyframes ds-sheet-in-top {
		from {
			transform: translateY(-100%);
		}
	}

	@keyframes ds-sheet-out-top {
		to {
			transform: translateY(-100%);
		}
	}

	@keyframes ds-sheet-in-bottom {
		from {
			transform: translateY(100%);
		}
	}

	@keyframes ds-sheet-out-bottom {
		to {
			transform: translateY(100%);
		}
	}

	@keyframes ds-content-in {
		from {
			opacity: 0;
			transform: translateY(4px);
		}
	}

	@keyframes ds-accordion-down {
		from {
			height: 0;
			opacity: 0;
		}
		to {
			height: var(--radix-accordion-content-height);
		}
	}

	@keyframes ds-accordion-up {
		from {
			height: var(--radix-accordion-content-height);
		}
		to {
			height: 0;
			opacity: 0;
		}
	}

	@keyframes ds-collapsible-down {
		from {
			height: 0;
			opacity: 0;
		}
		to {
			height: var(--radix-collapsible-content-height);
		}
	}

	@keyframes ds-collapsible-up {
		from {
			height: var(--radix-collapsible-content-height);
		}
		to {
			height: 0;
			opacity: 0;
		}
	}

	@keyframes ds-pulse-soft {
		50% {
			opacity: 0.55;
		}
	}

	@keyframes ds-caret-blink {
		50% {
			opacity: 0;
		}
	}

	@keyframes ds-chart-line {
		from {
			stroke-dashoffset: 1;
		}
	}

	@keyframes ds-chart-bar {
		from {
			transform: scaleY(0.04);
		}
	}
}

@media (prefers-reduced-motion: reduce) {
	@keyframes ds-pop-in {
		from {
			opacity: 0;
		}
	}

	@keyframes ds-pop-out {
		to {
			opacity: 0;
		}
	}

	@keyframes ds-dialog-in {
		from {
			opacity: 0;
		}
	}

	@keyframes ds-dialog-out {
		to {
			opacity: 0;
		}
	}

	@keyframes ds-content-in {
		from {
			opacity: 0;
		}
	}

	@keyframes ds-sheet-in-right {
		from {
			opacity: 0;
		}
	}

	@keyframes ds-sheet-out-right {
		to {
			opacity: 0;
		}
	}

	@keyframes ds-sheet-in-left {
		from {
			opacity: 0;
		}
	}

	@keyframes ds-sheet-out-left {
		to {
			opacity: 0;
		}
	}

	@keyframes ds-sheet-in-top {
		from {
			opacity: 0;
		}
	}

	@keyframes ds-sheet-out-top {
		to {
			opacity: 0;
		}
	}

	@keyframes ds-sheet-in-bottom {
		from {
			opacity: 0;
		}
	}

	@keyframes ds-sheet-out-bottom {
		to {
			opacity: 0;
		}
	}

	@keyframes ds-chart-line {
		from {
			opacity: 0;
		}
	}

	@keyframes ds-chart-bar {
		from {
			opacity: 0;
		}
	}
}
`;
const themeCss = `${header}@theme inline {\n${theme.join('\n')}\n}\n\n${motion}\n${interactions}`;
const fonts = `${header}@import url("${brand.fonts.css}");\n`;

mkdirSync(new URL('../build', import.meta.url), { recursive: true });
const write = (p, s) => writeFileSync(new URL(`../build/${p}`, import.meta.url), s);
write('site.css', site);
// Tokens alone (site at the root, product under .ds-product, both darks), for the component library and its docs.
write('tokens.css', `${header}:root {${root.body}}\n${hasProduct ? `\n.ds-product {${product.body}}\n\n:is(.dark, [data-theme="dark"]) .ds-product,\n.ds-product:is(.dark, [data-theme="dark"]) {${dark.body}}\n` : ''}`);
write('product.css', productCss);
write('theme.css', themeCss);
write('fonts.css', fonts);
write('tokens.json', `${JSON.stringify({ site: t, product: { ...t, ...vars(product.body) }, dark: vars(dark.body), theme: color }, null, 1)}\n`);
console.log(`brand: ${Object.keys(t).length} tokens, site.css${hasProduct ? ', product.css' : ''}, theme.css, fonts.css, tokens.json`);
