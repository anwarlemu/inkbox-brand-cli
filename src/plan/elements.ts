import { brand, cli, type Element, elements } from '../lib/brand.js';
import { loadIndexSync } from '../library/registry.js';
import type { Surface } from '../project/surface.js';

// Finds the elements of a file (markup tags and components, or CSS selectors) and the brand element each one is, from
// the match data in brand/elements.json: its tag, role, class or component words, and the context it sits in.

export type Hit = { line: number; label: string; kind: string; selector?: string };
type El = { tag: string; words: string; heads: string; utilities: string; attrs: string; context: string[] };

export const UTILITY = /[:[\]/]|^-?(text|bg|border|rounded|p[xytrbl]?|m[xytrbl]?|flex|grid|gap|font|tracking|leading|w|h|size|max|min|shadow|items|justify|self|space|inset|top|left|right|bottom|z|opacity|transition|duration|ease|overflow|block|inline|hidden|relative|absolute|fixed|sticky|col|row|order|ring|outline|underline|no-underline|truncate|whitespace|break|cursor|select|pointer|object|aspect|fill|stroke|translate|scale|rotate|animate|sr|not|group|peer|container|mx|my|uppercase|lowercase|capitalize|italic|antialiased|shrink|grow|basis|place|content|list|divide|backdrop|blur|filter)(-|$)/;

function splitClasses(classes: string[]) {
	const names: string[] = [];
	const utilities: string[] = [];
	for (const c of classes) (UTILITY.test(c) && !/^select-(content|item)$/.test(c) ? utilities : names).push(c.toLowerCase());
	// The last word of a class says what the part is: plan-card is a card, hero-title a title.
	const heads = names.map((n) => n.split(/[_-]+/).filter((w) => !/^(is|has)$/.test(w)).pop() ?? '').join(' ');
	return { words: names.join(' ').replace(/__/g, ' '), heads, utilities: utilities.join(' ') };
}

const wordIn = (text: string, word: string) => new RegExp(`(^|[\\s_-])${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[\\s_-])`).test(text);

/** Whether a link or button is drawn as a button, and which: filled (primary) or outlined (secondary). */
function buttonLook(el: El): 'primary' | 'secondary' | 'quiet' | undefined {
	const w = `${el.words} ${el.attrs.match(/variant\s*=\s*["'{]*([\w-]+)/)?.[1] ?? ''}`.toLowerCase();
	const isButton = el.tag === 'button' || /\b(btn|button|cta)\b/.test(w) || ((/(^|\s)(bg-|border)/.test(el.utilities) || /background|border/.test(el.attrs)) && /(^|\s)(p[xy]?-|rounded)/.test(el.utilities));
	if (!isButton) return undefined;
	if (/ghost|quiet|tertiary|plain|link/.test(w)) return 'quiet';
	if (/secondary|outline|bordered|alt/.test(w)) return 'secondary';
	if (/primary|cta|solid|filled|main/.test(w)) return 'primary';
	const filled = /(^|\s)bg-(?!transparent|none)/.test(el.utilities) || /background(-color)?\s*:\s*(?!transparent|none)/.test(el.attrs);
	const bordered = /(^|\s)border(\s|$|-(?!0|none))/.test(el.utilities) || /border\s*:\s*(?!0|none)/.test(el.attrs);
	return !filled && bordered ? 'secondary' : 'primary';
}

const SEMANTIC = new Set(['html', 'body', 'header', 'footer', 'nav', 'main', 'aside', 'section', 'article', 'table', 'th', 'td', 'tr', 'details', 'dialog', 'pre', 'h1', 'h2', 'h3', 'h4', 'select', 'textarea', 'input', 'figure', 'video', 'iframe', 'small', 'figcaption', 'time']);

function score(el: El, def: Element) {
	const m = def.match;
	let s = 0;
	let named = !m.words?.length && !m.roles?.length;
	const role = el.attrs.match(/role\s*=\s*["']?([\w-]+)/)?.[1];
	if (m.tags?.includes(el.tag)) {
		s += SEMANTIC.has(el.tag) ? 4 : 3;
		// Semantic tags say what they are on their own; a div, a paragraph or a link needs its class to.
		if (SEMANTIC.has(el.tag)) named = true;
	}
	if (role && m.roles?.includes(role)) {
		s += 5;
		named = true;
	}
	for (const word of m.words ?? []) {
		if (wordIn(el.heads, word)) s += 5;
		else if (wordIn(el.words, word)) s += 2;
		else continue;
		named = true;
	}
	if (m.context?.length) s += m.context.some((c) => el.context.includes(c)) ? 3 : -3;
	// A tag in the right place is not enough: the element's own class, role or component name has to say what it is.
	return named ? s : Math.min(s, 3);
}

export function kindOf(el: El, surface: Surface): string | undefined {
	const defs = elements()[surface];
	const look = ['a', 'button', 'input'].includes(el.tag) || /\b(btn|button|cta)\b/.test(el.words) ? buttonLook(el) : undefined;
	const inHeader = el.context.includes('header') || el.context.includes('nav');
	// Explicit menu parts take precedence over generic navigation links and fields.
	const menuKinds = ['glass-menu-item', 'glass-menu', 'menu-item', 'menu-panel', 'popover-panel'];
	const names = el.words.split(/\s+/);
	const role = el.attrs.match(/role\s*=\s*["']?([\w-]+)/)?.[1] ?? '';
	const menu = menuKinds.find((id) => {
		const match = defs[id]?.match;
		return match?.words?.some((word) => names.some((name) => name === word || name.endsWith(`-${word}`))) || match?.roles?.includes(role);
	});
	if (menu) return menu;
	// Links and buttons first: their look decides more than their name.
	if (surface === 'site') {
		if (el.tag === 'h1') return 'hero-title';
		if (el.tag === 'h2' && !el.context.includes('card')) return 'section-heading';
		if (look && inHeader) return 'header-action';
		if (look === 'primary') return el.context.includes('section-blue') ? 'button-on-brand' : 'button-primary';
		if (look) return 'button-secondary';
		if (el.tag === 'a' && inHeader) return 'nav-link';
	} else {
		if (el.tag === 'h1' || (el.tag === 'h2' && !el.context.includes('card'))) return 'app-page-title';
		if (el.tag === 'a' && el.context.includes('sidebar')) return 'app-nav-item';
		if (look === 'quiet') return 'app-button-ghost';
		if (look === 'secondary') return 'app-button-outline';
		if (look === 'primary') return /danger|destructive|delete|remove|revoke/.test(el.words) ? 'app-button-danger' : 'app-button-brand';
	}
	let best: [string, number] | undefined;
	for (const [id, def] of Object.entries(defs)) {
		const s = score(el, def);
		if (s >= 4 && (!best || s > best[1])) best = [id, s];
	}
	return best?.[0];
}

function contextLabels(tag: string, words: string) {
	const labels: string[] = [];
	if (['nav', 'header', 'footer', 'form', 'table', 'thead', 'aside', 'dialog', 'pre', 'article', 'section', 'main'].includes(tag)) labels.push(tag);
	if (/\bhero\b/.test(words)) labels.push('hero');
	if (/\b(sidebar|sidenav|side-nav)\b/.test(words)) labels.push('sidebar');
	if (/\b(nav|navbar|menu|header)\b/.test(words)) labels.push('nav');
	if (/\bfooter\b/.test(words)) labels.push('footer');
	if (/\b(card|tile|panel)\b/.test(words)) labels.push('card');
	if (/\b(blue|brand)[-\s]?(section|band|surface)|on-brand\b/.test(words)) labels.push('section-blue');
	if (tag === 'aside') labels.push('sidebar');
	return labels;
}

const VOID = new Set(['input', 'img', 'br', 'hr', 'meta', 'link', 'source', 'area', 'col', 'embed', 'wbr']);

/** The brand elements in a file: markup tags and components, or the selectors of a stylesheet. */
export function elementsIn(rel: string, text: string, surface: Surface): Hit[] {
	const lineAt = (offset: number) => text.slice(0, offset).split('\n').length;
	const hits: Hit[] = [];
	const pushAt = (line: number, label: string, el: El, selector?: string) => {
		const kind = kindOf(el, surface);
		if (kind) hits.push({ line, label: label.replace(/\s+/g, ' '), kind, ...(selector ? { selector } : {}) });
	};
	const push = (offset: number, label: string, el: El, selector?: string) => pushAt(lineAt(offset), label, el, selector);
	if (/\.(css|scss|sass|less|styl)$/.test(rel)) {
		// Comments go, their newlines kept so line numbers hold. Blanking them to spaces instead would leave long runs of
		// whitespace, which the selector pattern below scans in quadratic time (a stylesheet with 700KB of comments hangs).
		const css = text.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ''));
		const cssLine = (offset: number) => css.slice(0, offset).split('\n').length;
		for (const m of css.matchAll(/(^|[};])\s*([^{}@;/][^{};]*?)\s*\{/g)) {
			const selector = m[2].trim().split(',')[0].trim();
			if (!selector || selector.startsWith(':root') || /^(from|to|\d+%)$/.test(selector) || /::?(before|after|placeholder|-webkit)|:(hover|focus|active|disabled|visited|focus-visible|checked)/.test(selector)) continue;
			const parts = selector.split(/\s*[>+~]\s*|\s+/).filter(Boolean);
			const last = parts.pop() ?? '';
			const tag = (last.match(/^[a-z][a-z0-9]*/i)?.[0] ?? 'div').toLowerCase();
			const split = splitClasses([...last.matchAll(/\.([\w-]+)/g)].map((c) => c[1]));
			const context = parts.flatMap((c) => contextLabels((c.match(/^[a-z][a-z0-9]*/i)?.[0] ?? '').toLowerCase(), splitClasses([...c.matchAll(/\.([\w-]+)/g)].map((x) => x[1])).words));
			pushAt(cssLine(m.index + m[0].indexOf(m[2])), selector.length > 60 ? `${selector.slice(0, 57)}...` : selector, { tag, ...split, attrs: last.match(/\[[^\]]*\]/g)?.join(' ') ?? '', context }, selector);
		}
		return hits;
	}
	const stack: { name: string; labels: string[] }[] = /(^|\/)[^/]*hero[^/]*$/i.test(rel) ? [{ name: '#file', labels: ['hero'] }] : [];
	for (const m of text.matchAll(/<(\/?)([A-Za-z][\w.-]*)((?:[^<>"'{}]|"[^"]*"|'[^']*'|\{(?:[^{}]|\{[^{}]*\})*\})*?)(\/?)>/g)) {
		const [, closing, rawName, attrs, selfClosing] = m;
		const name = rawName.toLowerCase();
		if (closing) {
			const at = stack.map((s) => s.name).lastIndexOf(name);
			if (at >= 0) stack.splice(at);
			continue;
		}
		if (['script', 'style', 'svg', 'path', 'meta', 'link', 'head', 'title'].includes(name)) continue;
		// A component's name reads like a class: <Button variant="outline"> and <PricingCard> are recognized.
		const component = /^[A-Z]/.test(rawName) ? (rawName.split('.').pop() ?? '').replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase() : '';
		const classAttr = attrs.match(/class(?:Name)?\s*=\s*(?:"([^"]*)"|'([^']*)'|\{([\s\S]*?)\}(?=\s|$|\/))/);
		const classText = classAttr ? (classAttr[1] ?? classAttr[2] ?? (classAttr[3] ?? '').match(/["'`]([^"'`]*)["'`]/g)?.join(' ') ?? '') : '';
		const split = splitClasses(classText.replace(/["'`]/g, ' ').split(/\s+/).filter(Boolean));
		const words = `${split.words} ${component}`.trim();
		const heads = `${split.heads} ${component.split('-').pop() ?? ''}`.trim();
		const tag = component ? (/\bbutton\b/.test(component) ? 'button' : /\b(link|anchor)\b/.test(component) ? 'a' : /\binput\b/.test(component) ? 'input' : 'div') : name;
		push(m.index, `<${rawName}${attrs.length > 50 ? `${attrs.slice(0, 47)}...` : attrs}>`, { tag, words, heads, utilities: split.utilities, attrs, context: stack.flatMap((s) => s.labels) });
		if (!selfClosing && !VOID.has(name)) stack.push({ name, labels: contextLabels(tag, words) });
	}
	return hits;
}

/** An element's brand styling as text: CSS with its states (hover gated to real pointers) and the Tailwind classes. */
let kindIndex: Map<string, string> | undefined;
/** The library item that covers an element kind (from each item's kinds in the bundled registry). */
export function libraryItemFor(kind: string) {
	if (!kindIndex) {
		// The plainest item that covers a kind wins: a ui component before a composite or a block, and the first of each.
		const rank: Record<string, number> = { ui: 0, product: 1, site: 1, visual: 2, block: 3 };
		const items = loadIndexSync()
			.filter((i) => i.type in rank)
			.sort((a, b) => rank[a.type] - rank[b.type]);
		kindIndex = new Map();
		// An item named for the kind (code-window for code-window) is the answer outright.
		for (const i of items) for (const k of i.kinds ?? []) if (k === i.name) kindIndex.set(k, i.name);
		for (const i of items) for (const k of i.kinds ?? []) if (!kindIndex.has(k)) kindIndex.set(k, i.name);
	}
	return kindIndex.get(kind);
}

export function renderElement(id: string, surface: Surface, { css = true, tailwind = true } = {}) {
	const def = elements()[surface][id] ?? elements()[surface === 'site' ? 'product' : 'site'][id];
	if (!def) return '';
	const decl = (o: Record<string, string>, pad: string) => Object.entries(o).map(([k, v]) => `${pad}${k}: ${v};`).join('\n');
	const lines = [`${def.name} (${id})`, ...def.rules.map((r) => `  - ${r}`)];
	if (css) {
		lines.push('  CSS:', '  .el {', decl(def.css, '    '), '  }');
		for (const [state, o] of Object.entries(def.states ?? {})) {
			if (state.startsWith('@media')) lines.push(`  ${state} { .el {`, decl(o, '    '), '  } }');
			else if (state === ':hover') lines.push('  @media (hover: hover) and (pointer: fine) { .el:hover {', decl(o, '    '), '  } }');
			else lines.push(`  .el${state.startsWith('[') ? state : state} {`, decl(o, '    '), '  }');
		}
	}
	if (tailwind) lines.push(`  Tailwind: ${def.tailwind}`);
	// In a React + Tailwind app the library's component already looks like this.
	const item = libraryItemFor(id);
	if (item) lines.push(`  Component: \`${cli()} add ${item}\` (${(brand() as { registryUrl?: string }).registryUrl ?? ''}/components/${item})`);
	return lines.join('\n');
}
