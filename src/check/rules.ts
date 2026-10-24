import { brand, cli, colorHex, isToken, scales, tokens } from '../lib/brand.js';
import { parseColor } from '../convert/color.js';
import { checkInteractionDecl, checkInteractions } from './interactions.js';
import type { SourceFile } from './source.js';

// The checks: every style value must come from the brand. Deterministic, fast, no model. Each finding says what to use.

export type RawFinding = { rule: string; message: string; hint: string; offset: number; length?: number; fix?: { start: number; end: number; text: string } };

const COLOR = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b|\b(?:rgba?|hsla?|oklch|oklab|lab|lch|hwb)\([^()]*\)/g;
const NAMED_COLOR = /(?<![\w-])(white|black|red|blue|green|gray|grey|orange|purple|yellow|pink|navy|teal|silver|maroon|olive|aqua|fuchsia|lime)(?![\w-])/gi;
const LENGTH = /(?<![\w.#-])(-?\d*\.?\d+)(px|rem)\b/g;

let hexIndex: Map<string, string> | undefined;
/** Every literal brand color (site, product, dark) by hex, so code that cannot read variables may still use them. */
function brandHexes() {
	if (hexIndex) return hexIndex;
	hexIndex = new Map();
	for (const theme of ['site', 'product', 'product-dark'] as const) {
		const table = theme === 'site' ? tokens().site : tokens().product;
		for (const name of Object.keys(table)) {
			const m = name.match(/^--ds-color-(.+)$/);
			const hex = m && colorHex(m[1], theme);
			if (hex && !hexIndex.has(hex.slice(0, 7))) hexIndex.set(hex.slice(0, 7), m[1]);
		}
	}
	return hexIndex;
}

const hexOf = (raw: string) => {
	const c = parseColor(raw);
	if (!c) return undefined;
	return `#${c.slice(0, 3).map((n) => Math.round(n).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
};

const pxScale = (prop: string) => new Map((/radius/.test(prop) ? scales().radius : /font-size/.test(prop) ? scales().text : scales().space).map(([name, px]) => [px, name]));

type Decl = { prop: string; value: string; offset: number; valueOffset: number; fontFace: boolean; selector?: string };

/** Declarations of a stylesheet (or styles extracted from a template), with their offsets. */
export function declarations(css: string): Decl[] {
	const out: Decl[] = [];
	const stack: {fontFace: boolean; selector: string}[] = [];
	let segStart = 0;
	const flush = (end: number) => {
		const seg = css.slice(segStart, end);
		for (const m of seg.matchAll(/(^|[\s;{])(--[\w-]+|[a-zA-Z-]+)\s*:\s*([^;{}]+)/g)) {
			const start = segStart + m.index + m[1].length;
			const lead = m[3].length - m[3].trimStart().length;
			out.push({ prop: m[2].toLowerCase(), value: m[3].trim(), offset: start, valueOffset: start + m[0].length - m[1].length - m[3].length + lead, fontFace: stack.at(-1)?.fontFace ?? false, selector: stack.at(-1)?.selector });
		}
	};
	for (let i = 0; i < css.length; i++) {
		const ch = css[i];
		if (ch === '/' && css[i + 1] === '*') {
			flush(i);
			const close = css.indexOf('*/', i + 2);
			i = close < 0 ? css.length : close + 1;
			segStart = i + 1;
			continue;
		}
		if (ch === '{') {
			let b = i - 1;
			while (b >= segStart && !';{}'.includes(css[b])) b--;
			flush(b + 1);
			const header = css.slice(b + 1, i).trim();
			stack.push({fontFace: /^@font-face/.test(header), selector: `${stack.at(-1)?.selector ?? ''} ${header.startsWith('@') ? '' : header}`.trim()});
			segStart = i + 1;
		} else if (ch === '}') {
			flush(i);
			stack.pop();
			segStart = i + 1;
		}
	}
	flush(css.length);
	return out;
}

const SKIP_PROPS = /^(src|content|font-display|unicode-range|grid-template|grid-area|grid-row|grid-column|aspect-ratio|z-index|order|flex|opacity|width|height|min-|max-|top|left|right|bottom|inset|transform|translate|scale|rotate|clip-path|mask|background-position|background-size|object-position|line-height|stroke-width|stroke-dash|columns|will-change|counter|quotes|tab-size|cursor|scroll)/;

/** One declaration checked against the brand. */
export function checkDecl(d: Decl, push: (f: RawFinding) => void) {
	if (d.fontFace || d.prop.startsWith('--ds-')) return;
	checkInteractionDecl(d, push);
	const offsetIn = (index = 0) => d.valueOffset + index;
	// Colors: brand variables only.
	for (const m of d.value.matchAll(COLOR)) {
		if (/var\(--ds-/.test(d.value) && /color-mix/.test(d.value) && !/#|rgb|hsl/.test(d.value.replace(/var\([^)]*\)/g, ''))) continue;
		const hex = hexOf(m[0]);
		const exact = hex && brandHexes().get(hex);
		const at = offsetIn(m.index);
		push({ rule: 'raw-color', message: `Raw color \`${m[0]}\` in \`${d.prop}\``, hint: exact ? `Use var(--ds-color-${exact}).` : `Use a brand color token (\`${cli()} tokens color\`).`, offset: at, length: m[0].length, fix: exact && parseColor(m[0])?.[3] === 1 ? { start: at, end: at + m[0].length, text: `var(--ds-color-${exact})` } : undefined });
	}
	if (/^(color|background|background-color|border|border-color|outline|outline-color|fill|stroke|box-shadow|text-decoration-color)$/.test(d.prop))
		for (const m of d.value.matchAll(NAMED_COLOR)) {
			if (/^(currentcolor|transparent|inherit)$/i.test(m[0])) continue;
			push({ rule: 'raw-color', message: `Named color \`${m[0]}\` in \`${d.prop}\``, hint: `Use a brand color token (\`${cli()} tokens color\`).`, offset: offsetIn(0) });
		}
	if (d.prop === 'font-family' && !/var\(--ds-font-|^(inherit|initial|unset)$/.test(d.value)) push({ rule: 'font', message: `Font \`${d.value.slice(0, 40)}\``, hint: 'Use var(--ds-font-sans) (var(--ds-font-mono) for code, var(--ds-font-data) for a figure).', offset: offsetIn(0) });
	if (d.prop === 'font-weight' && !brand().type?.bold && /^(600|700|800|900|bold|bolder)$/.test(d.value)) push({ rule: 'font', message: `Weight \`${d.value}\``, hint: 'The brand is never bold: var(--ds-font-weight-regular), or var(--ds-font-weight-medium) for emphasis in small UI text.', offset: offsetIn(0) });
	if (d.prop === 'letter-spacing' && !/^(0|normal|inherit|0em|0px)$/.test(d.value) && !/var\(--ds-tracking-/.test(d.value)) push({ rule: 'font', message: `Letter spacing \`${d.value}\``, hint: 'Use normal, or var(--ds-tracking-tight) on large headings.', offset: offsetIn(0) });
	if (d.prop === 'text-transform' && d.value === 'uppercase' && !brand().type?.caps) push({ rule: 'font', message: 'Uppercase text', hint: 'The brand uses sentence case: text-transform: none.', offset: offsetIn(0) });
	// Sizes: font sizes, spacing and radii on the brand scale.
	if (/^(font-size|padding|margin|gap|row-gap|column-gap|border(-[a-z]+)*-radius)(-[a-z]+)*$/.test(d.prop) && !SKIP_PROPS.test(d.prop)) {
		for (const m of d.value.matchAll(LENGTH)) {
			const px = Number(m[1]) * (m[2] === 'rem' ? 16 : 1);
			if (Math.abs(px) <= 2) continue;
			const exact = pxScale(d.prop).get(Math.abs(px));
			const at = offsetIn(m.index);
			push({ rule: 'off-scale', message: `\`${m[0]}\` in \`${d.prop}\``, hint: exact ? `Use var(${exact}).` : `Use the nearest brand step (\`${cli()} tokens ${/radius/.test(d.prop) ? 'radius' : /font/.test(d.prop) ? 'text' : 'space'}\`).`, offset: at, length: m[0].length, fix: exact && px > 0 ? { start: at, end: at + m[0].length, text: `var(${exact})` } : undefined });
		}
	}
	if (/^(transition|transition-duration|animation|animation-duration|transition-timing-function|animation-timing-function)$/.test(d.prop)) {
		if (/(?<![\w-])all(?![\w-])/.test(d.value) && d.prop.startsWith('transition')) push({ rule: 'motion', message: '`transition: all`', hint: 'Name the properties that change (color, background-color, box-shadow...).', offset: offsetIn(0) });
		if (/\bease-in\b(?!-)/.test(d.value)) push({ rule: 'motion', message: '`ease-in` easing', hint: 'Use var(--ds-easing-out): interface motion never eases in.', offset: offsetIn(0) });
		for (const m of d.value.matchAll(/(?<![\w.-])(\d*\.?\d+)(ms|s)\b/g)) {
			const ms = Number(m[1]) * (m[2] === 's' ? 1000 : 1);
			if (ms === 0 || (d.prop.startsWith('animation') && (ms > 1000 || /infinite/.test(d.value)))) continue;
			push({ rule: 'motion', message: `Duration \`${m[0]}\``, hint: 'Use var(--ds-duration-fast) (150ms), base (200ms), moderate (250ms) or slow (300ms).', offset: offsetIn(0) });
		}
		if (/cubic-bezier\(/.test(d.value)) push({ rule: 'motion', message: 'Custom easing', hint: 'Use var(--ds-easing-out) or var(--ds-easing-in-out).', offset: offsetIn(0) });
	}
	for (const m of d.value.matchAll(/var\((--ds-[\w-]+)/g)) if (!isToken(m[1])) push({ rule: 'unknown-token', message: `\`${m[1]}\` is not a brand token`, hint: `Find the right one with \`${cli()} tokens <term>\`.`, offset: offsetIn(0) });
}

// Tailwind: palette colors, arbitrary values and the default type scale are not the brand's.
const TW_PALETTE = /^(?:[\w-]+:)*!?-?(bg|text|border(?:-[xytrblse])?|ring(?:-offset)?|outline|divide|fill|stroke|from|via|to|decoration|placeholder|caret|accent|shadow)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|[1-9]00|950)(\/\d+)?$/;
const TW_ARBITRARY_COLOR = /^(?:[\w-]+:)*!?(bg|text|border(?:-[xytrblse])?|ring|outline|fill|stroke|from|via|to|decoration|divide|shadow)-\[(#[0-9a-fA-F]{3,8}|rgba?\([^\]]*\)|hsla?\([^\]]*\))\]/;
const TW_ARBITRARY_SIZE = /^(?:[\w-]+:)*!?-?(p[xytrblse]?|m[xytrblse]?|gap(?:-[xy])?|space-[xy]|text|rounded(?:-[a-z]+)?|tracking|leading|duration|delay)-\[(-?\d*\.?\d+(?:px|rem|ms|s|em)?)\]$/;
const TW_TEXT_DEFAULT = /^(?:[\w-]+:)*text-(xs|sm|base|lg|xl|[2-9]xl)$/;
const TW_BOLD = /^(?:[\w-]+:)*font-(semibold|bold|extrabold|black)$/;
const TW_SHADOW_DEFAULT = /^(?:[\w-]+:)*shadow-(2xs|xs|sm|md|lg|xl|2xl)$/;
const TW_EASE_IN = /^(?:[\w-]+:)*ease-in$/;
const TW_UPPERCASE = /^(?:[\w-]+:)*uppercase$/;
const TW_TRACKING = /^(?:[\w-]+:)*tracking-(wider|widest|wide)$/;

export function checkClass(token: string, offset: number, push: (f: RawFinding) => void) {
	const cls = token.replace(/[,'"`]+$/, '');
	if (TW_PALETTE.test(cls)) push({ rule: 'raw-color', message: `Tailwind palette class \`${cls}\``, hint: 'Use a brand class (bg-surface, text-fg, text-fg-muted, border-line, bg-brand, text-fg-brand) or bg-[var(--ds-color-...)].', offset, length: cls.length });
	else if (TW_ARBITRARY_COLOR.test(cls)) push({ rule: 'raw-color', message: `Arbitrary color \`${cls}\``, hint: 'Use a brand class or an arbitrary var(--ds-color-...).', offset, length: cls.length });
	else if (TW_ARBITRARY_SIZE.test(cls) && !/var\(--ds-/.test(cls)) push({ rule: 'off-scale', message: `Arbitrary value \`${cls}\``, hint: 'Use the scale (p-4, gap-6, rounded-card, text-body-sm, duration-200) or an arbitrary var(--ds-...).', offset, length: cls.length });
	else if (TW_TEXT_DEFAULT.test(cls)) push({ rule: 'off-scale', message: `Default text size \`${cls}\``, hint: 'Use the brand type scale: text-caption, text-body-sm, text-body, text-body-lg, text-h5 to text-h1, text-hero.', offset, length: cls.length });
	else if (TW_BOLD.test(cls) && !brand().type?.bold) push({ rule: 'font', message: `\`${cls}\``, hint: 'The brand is never bold: font-normal, or font-medium for emphasis in small UI text.', offset, length: cls.length });
	else if (TW_SHADOW_DEFAULT.test(cls)) push({ rule: 'off-scale', message: `Default shadow \`${cls}\``, hint: 'Use shadow-card, shadow-raised or shadow-floating.', offset, length: cls.length });
	else if (TW_EASE_IN.test(cls)) push({ rule: 'motion', message: '`ease-in`', hint: 'Use ease-out.', offset, length: cls.length });
	else if ((TW_UPPERCASE.test(cls) && !brand().type?.caps) || TW_TRACKING.test(cls)) push({ rule: 'font', message: `\`${cls}\``, hint: 'The brand uses sentence case and normal tracking.', offset, length: cls.length });
}

/** Colors written in code (chart configs, native colors): only the brand's literal values are allowed. */
export function checkCodeColor(value: string, offset: number, push: (f: RawFinding) => void) {
	for (const m of value.matchAll(COLOR)) {
		const hex = hexOf(m[0]);
		if (hex && brandHexes().has(hex)) continue;
		push({ rule: 'raw-color', message: `Color \`${m[0]}\` in code`, hint: 'Use the brand value for its role (`tokens color` lists them).', offset: offset + (m.index ?? 0), length: m[0].length });
	}
}

// Icon libraries other than the brand's, by package name (old Phosphor builds included).
const ICON_PACKAGE = /^(lucide(-[\w-]+)?|@lucide\/|@heroicons\/|@tabler\/icons|react-icons|@radix-ui\/react-icons|react-feather|feather-icons|@fortawesome\/|@mui\/icons-material|@material-ui\/icons|@material-symbols\/|@iconify\/|@iconify-icon\/|ionicons|@ionic\/icons|@expo\/vector-icons|react-native-vector-icons|@remixicon\/|remixicon|@primer\/octicons|@hugeicons\/|iconoir-react|@mynaui\/icons|boxicons|bootstrap-icons|react-bootstrap-icons|@carbon\/icons|@untitled-ui\/icons|@icons-pack\/|phosphor-react$|phosphor-icons$|@phosphor-icons\/(web|core)$)/;
const MODULE = /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)(['"])([^'"\n]+)\1/g;

/** Imports of an icon library that is not the brand's. */
export function checkIcons(text: string, push: (f: RawFinding) => void) {
	const icons = brand().icons;
	if (!icons) return;
	for (const m of text.matchAll(MODULE)) {
		const source = m[2];
		if (icons.packages.some((p) => source === p || source.startsWith(`${p}/`)) || !ICON_PACKAGE.test(source)) continue;
		const offset = (m.index ?? 0) + m[0].length - source.length - 1;
		push({ rule: 'icon-pack', message: `Icon library \`${source}\``, hint: `Every icon is ${icons.name}: import the matching glyph from ${icons.packages.map((p) => `\`${p}\``).join(' (web) or ')} (native).`, offset, length: source.length });
	}
}

/** Runs every rule on a parsed file. */
export function runRules(file: SourceFile): RawFinding[] {
	const out: RawFinding[] = checkInteractions(file);
	const push = (f: RawFinding) => out.push(f);
	if (file.kind === 'css') for (const d of declarations(file.text)) checkDecl(d, push);
	for (const t of file.classTokens) checkClass(t.value, t.offset, push);
	for (const s of file.strings) {
		if (s.context === 'style' && s.styleKey) checkDecl({ prop: s.styleKey.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`), value: s.value, offset: s.offset, valueOffset: s.offset, fontFace: false }, push);
		else if (s.context === 'code' && /^\s*(#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\()/.test(s.value) && s.value.length < 40) checkCodeColor(s.value, s.offset, push);
		else if (s.context === 'code' && /:\s*[^;]+;/.test(s.value) && /(color|background|border|font|padding|margin|transition)\s*:/.test(s.value)) for (const d of declarations(s.value)) checkDecl({ ...d, offset: s.offset + d.offset, valueOffset: s.offset + d.valueOffset }, push);
	}
	return out;
}
