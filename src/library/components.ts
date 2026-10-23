import { parse } from '@babel/parser';
import { UTILITY } from '../plan/elements.js';
import type { Surface } from '../project/surface.js';

// What each of an app's components is. A component is read for everything that says what it is: its name, what it
// renders (the root tag, its role, the input type, the tags inside), its own class words, its props and the values its
// variant and size props take, and how many places use it. Each is scored against the library's items, and the best
// item above a floor is its match, with a confidence and the signals behind it.

type Node = { type: string; start: number; end: number; [key: string]: any };

export type AppComponent = {
	file: string;
	name: string;
	exported: boolean;
	/** The component's function, as offsets into the file: the whole of it and its body. */
	span: { start: number; end: number };
	body: { start: number; end: number; expression: boolean };
	/** The first parameter: destructured names (and the rest), or one identifier, or none. */
	params: { names: string[]; rest?: string; identifier?: string; typeText?: string };
	/** The props it declares (destructured or in its props type), and the string values its variant-like props take. */
	props: string[];
	values: Record<string, string[]>;
	root?: { tag: string; role?: string; type?: string; classes: string[]; literals: { start: number; end: number; value: string }[] };
	/** forwardRef's second parameter, to pass on. */
	refParam?: string;
	inner: string[];
	lines: number;
};

export type Identified = AppComponent & { item?: string; kind?: string; confidence: number; signals: string[]; uses: number; useValues: Record<string, string[]> };

const PASCAL = /^[A-Z][A-Za-z0-9]*$/;
const VARIANT_PROPS = new Set(['variant', 'size', 'color', 'tone', 'intent', 'kind', 'appearance', 'look']);

function walk(node: any, visit: (n: Node, parent?: Node) => boolean | void, parent?: Node) {
	if (!node || typeof node.type !== 'string') return;
	if (visit(node, parent) === false) return;
	for (const key of Object.keys(node)) {
		if (key === 'loc' || key === 'start' || key === 'end' || key === 'leadingComments' || key === 'trailingComments') continue;
		const value = node[key];
		if (Array.isArray(value)) for (const v of value) walk(v, visit, node);
		else if (value && typeof value.type === 'string') walk(value, visit, node);
	}
}

const jsxName = (n: Node | undefined): string => {
	if (!n) return '';
	if (n.type === 'JSXIdentifier') return n.name;
	if (n.type === 'JSXMemberExpression') return `${jsxName(n.object)}.${jsxName(n.property)}`;
	return '';
};

/** The DOM tag a JSX name stands for: `motion.button` and `Primitive.button` are buttons; a component stays itself. */
const domTag = (name: string) => {
	const last = name.split('.').pop() ?? name;
	return /^[a-z]/.test(last) ? last : name;
};

/** The literal class strings of a className attribute: a string, a template's static parts, or cn/clsx/cva string args. */
function classStrings(value: Node | undefined): Node[] {
	if (!value) return [];
	if (value.type === 'StringLiteral') return [value];
	if (value.type !== 'JSXExpressionContainer') return [];
	const out: Node[] = [];
	walk(value.expression, (n) => {
		if (n.type === 'StringLiteral') out.push(n);
		if (n.type === 'TemplateLiteral') for (const q of n.quasis) out.push({ ...q, type: 'TemplateElement', value: q.value.cooked });
	});
	return out;
}

function attr(el: Node, name: string): Node | undefined {
	return el.openingElement?.attributes?.find((a: Node) => a.type === 'JSXAttribute' && a.name?.name === name);
}
const attrString = (el: Node, name: string) => {
	const v = attr(el, name)?.value;
	return v?.type === 'StringLiteral' ? v.value : v?.type === 'JSXExpressionContainer' && v.expression.type === 'StringLiteral' ? v.expression.value : undefined;
};

/** The JSX a function returns first: its expression body, or the argument of its first return. */
function returnedJsx(fn: Node): Node | undefined {
	const unwrap = (n: Node | undefined): Node | undefined => (n?.type === 'ParenthesizedExpression' ? unwrap(n.expression) : n);
	if (fn.body?.type !== 'BlockStatement') return unwrap(fn.body);
	let found: Node | undefined;
	walk(fn.body, (n) => {
		if (found) return false;
		if (n.type === 'FunctionDeclaration' || n.type === 'FunctionExpression' || n.type === 'ArrowFunctionExpression') return n === fn.body ? undefined : false;
		if (n.type === 'ReturnStatement') {
			const arg = unwrap(n.argument);
			if (arg && (arg.type === 'JSXElement' || arg.type === 'JSXFragment' || arg.type === 'ConditionalExpression' || arg.type === 'LogicalExpression')) found = arg;
			return false;
		}
	});
	return found;
}

function firstElement(n: Node | undefined): Node | undefined {
	if (!n) return undefined;
	if (n.type === 'JSXElement') return n;
	if (n.type === 'JSXFragment') return n.children.map(firstElement).find(Boolean);
	if (n.type === 'ConditionalExpression') return firstElement(n.consequent) ?? firstElement(n.alternate);
	if (n.type === 'LogicalExpression') return firstElement(n.right);
	if (n.type === 'JSXExpressionContainer') return firstElement(n.expression);
	if (n.type === 'ParenthesizedExpression') return firstElement(n.expression);
	return undefined;
}

/** The members of a props type: an inline type literal, or an interface or type alias of that name in the file. */
function typeMembers(ast: Node, typeNode: Node | undefined, text: string): { names: string[]; values: Record<string, string[]> } {
	const names: string[] = [];
	const values: Record<string, string[]> = {};
	const read = (members: Node[]) => {
		for (const m of members) {
			if (m.type !== 'TSPropertySignature' || m.key?.type !== 'Identifier') continue;
			names.push(m.key.name);
			const lits: string[] = [];
			walk(m.typeAnnotation, (n) => {
				if (n.type === 'TSLiteralType' && n.literal?.type === 'StringLiteral') lits.push(n.literal.value);
			});
			if (lits.length) values[m.key.name] = lits;
		}
	};
	const visitType = (t: Node | undefined, depth = 0) => {
		if (!t || depth > 3) return;
		if (t.type === 'TSTypeLiteral') read(t.members);
		else if (t.type === 'TSIntersectionType' || t.type === 'TSUnionType') for (const s of t.types) visitType(s, depth + 1);
		else if (t.type === 'TSTypeReference' && t.typeName?.type === 'Identifier') {
			const name = t.typeName.name;
			for (const stmt of ast.program.body) {
				const decl = stmt.type === 'ExportNamedDeclaration' ? stmt.declaration : stmt;
				if (decl?.type === 'TSInterfaceDeclaration' && decl.id.name === name) {
					read(decl.body.body);
					for (const e of decl.extends ?? []) visitType({ type: 'TSTypeReference', typeName: e.expression, start: e.start, end: e.end }, depth + 1);
				}
				if (decl?.type === 'TSTypeAliasDeclaration' && decl.id.name === name) visitType(decl.typeAnnotation, depth + 1);
			}
		}
	};
	visitType(typeNode);
	void text;
	return { names, values };
}

/** The variant and size values a cva call in the file declares, for a component built on one. */
function cvaValues(ast: Node): Record<string, string[]> {
	const out: Record<string, string[]> = {};
	walk(ast, (n) => {
		if (n.type !== 'CallExpression' || n.callee?.name !== 'cva') return;
		const config = n.arguments[1];
		const variants = config?.properties?.find((p: Node) => p.key?.name === 'variants');
		for (const group of variants?.value?.properties ?? []) {
			const key = group.key?.name ?? group.key?.value;
			if (key) out[key] = (group.value?.properties ?? []).map((p: Node) => p.key?.name ?? p.key?.value).filter(Boolean);
		}
	});
	return out;
}

/** Every component a file defines: PascalCase functions, arrows, and forwardRef or memo wrappers that return JSX. */
export function componentsIn(file: string, text: string): AppComponent[] {
	let ast: Node;
	try {
		ast = parse(text, { sourceType: 'module', errorRecovery: true, plugins: ['jsx', 'typescript'] }) as unknown as Node;
	} catch {
		return [];
	}
	const exported = new Set<string>();
	for (const stmt of ast.program.body) {
		if (stmt.type === 'ExportNamedDeclaration') for (const s of stmt.specifiers ?? []) exported.add(s.local?.name);
		if (stmt.type === 'ExportDefaultDeclaration' && stmt.declaration?.type === 'Identifier') exported.add(stmt.declaration.name);
	}
	const cva = cvaValues(ast);
	const out: AppComponent[] = [];
	const add = (name: string, fn: Node, isExported: boolean, outer: Node) => {
		const jsx = returnedJsx(fn);
		if (!jsx) return;
		const param = fn.params?.[0];
		const params: AppComponent['params'] = { names: [] };
		let typeNode: Node | undefined;
		if (param?.type === 'ObjectPattern') {
			for (const p of param.properties) {
				if (p.type === 'RestElement') params.rest = p.argument?.name;
				else if (p.key?.name) params.names.push(p.key.name);
			}
			typeNode = param.typeAnnotation?.typeAnnotation;
		} else if (param?.type === 'Identifier') {
			params.identifier = param.name;
			typeNode = param.typeAnnotation?.typeAnnotation;
		}
		// forwardRef<El, Props>(...) and React.FC<Props> carry the props type on the wrapper instead.
		typeNode ??= outer.typeParameters?.params?.[1] ?? outer.typeParameters?.params?.[0] ?? outer.id?.typeAnnotation?.typeAnnotation?.typeParameters?.params?.[0];
		if (typeNode) params.typeText = text.slice(typeNode.start, typeNode.end);
		const members = typeMembers(ast, typeNode, text);
		const props = [...new Set([...params.names, ...members.names])];
		const values: Record<string, string[]> = {};
		for (const p of props) {
			const v = members.values[p] ?? cva[p];
			if (v?.length && VARIANT_PROPS.has(p)) values[p] = v;
		}
		for (const [k, v] of Object.entries(cva)) if (VARIANT_PROPS.has(k) && !values[k]) values[k] = v;
		const el = firstElement(jsx);
		let root: AppComponent['root'];
		if (el) {
			const classAttr = attr(el, 'className') ?? attr(el, 'class');
			const strings = classStrings(classAttr?.value);
			root = {
				tag: domTag(jsxName(el.openingElement.name)),
				role: attrString(el, 'role'),
				type: attrString(el, 'type'),
				classes: strings.flatMap((s) => String(s.value).split(/\s+/)).filter(Boolean),
				literals: strings.filter((s) => s.type === 'StringLiteral').map((s) => ({ start: s.start, end: s.end, value: s.value })),
			};
		}
		const inner = new Set<string>();
		walk(fn.body, (n) => {
			if (n.type === 'JSXOpeningElement') {
				const tag = domTag(jsxName(n.name));
				const type = n.attributes?.find((a: Node) => a.name?.name === 'type')?.value?.value;
				inner.add(tag === 'input' && type ? `input:${type}` : tag);
				const role = n.attributes?.find((a: Node) => a.name?.name === 'role')?.value?.value;
				if (role) inner.add(`role:${role}`);
			}
		});
		const body = fn.body?.type === 'BlockStatement' ? { start: fn.body.start, end: fn.body.end, expression: false } : { start: fn.body.start, end: fn.body.end, expression: true };
		const refParam = fn.params?.[1]?.type === 'Identifier' ? fn.params[1].name : undefined;
		out.push({ file, name, refParam, exported: isExported || exported.has(name), span: { start: outer.start, end: outer.end }, body, params, props, values, root, inner: [...inner], lines: text.slice(outer.start, outer.end).split('\n').length });
	};
	const unwrapCall = (n: Node | undefined): { fn?: Node; call?: Node } => {
		if (!n) return {};
		if (n.type === 'ArrowFunctionExpression' || n.type === 'FunctionExpression') return { fn: n };
		if (n.type === 'CallExpression' && /^(forwardRef|memo|React\.forwardRef|React\.memo)$/.test(n.callee.type === 'MemberExpression' ? `${n.callee.object.name}.${n.callee.property.name}` : n.callee.name ?? '')) {
			const inner = unwrapCall(n.arguments[0]);
			return { fn: inner.fn, call: n };
		}
		return {};
	};
	for (const stmt of ast.program.body) {
		const isExported = stmt.type === 'ExportNamedDeclaration' || stmt.type === 'ExportDefaultDeclaration';
		const decl = isExported ? stmt.declaration : stmt;
		if (!decl) continue;
		const before = out.length;
		// A component's span starts at its statement (before any export keyword), where module-level helpers can go.
		if (decl.type === 'FunctionDeclaration' && decl.id && PASCAL.test(decl.id.name)) add(decl.id.name, decl, isExported, decl);
		if (decl.type === 'VariableDeclaration') {
			for (const d of decl.declarations) {
				if (d.id?.type !== 'Identifier' || !PASCAL.test(d.id.name)) continue;
				const { fn, call } = unwrapCall(d.init);
				if (fn) add(d.id.name, fn, isExported, call ? { ...d, typeParameters: call.typeParameters } : d);
			}
		}
		for (const c of out.slice(before)) c.span.start = stmt.start;
	}
	return out;
}

/** How each component is used across the app: how many times, and the literal values its variant-like props get. */
export function usesIn(text: string, names: Set<string>): Map<string, { count: number; values: Record<string, string[]> }> {
	const out = new Map<string, { count: number; values: Record<string, string[]> }>();
	let ast: Node;
	try {
		ast = parse(text, { sourceType: 'module', errorRecovery: true, plugins: ['jsx', 'typescript'] }) as unknown as Node;
	} catch {
		return out;
	}
	walk(ast, (n) => {
		if (n.type !== 'JSXOpeningElement') return;
		const name = jsxName(n.name);
		if (!names.has(name)) return;
		const entry = out.get(name) ?? { count: 0, values: {} };
		entry.count++;
		for (const a of n.attributes ?? []) {
			const key = a.name?.name;
			if (!key || !VARIANT_PROPS.has(key)) continue;
			const v = a.value?.type === 'StringLiteral' ? a.value.value : a.value?.expression?.type === 'StringLiteral' ? a.value.expression.value : undefined;
			if (v) entry.values[key] = [...new Set([...(entry.values[key] ?? []), v])];
		}
		out.set(name, entry);
	});
	return out;
}

// What each library item looks like in an app: the words its components are named with, the tags, roles and input
// types it renders, the props that give it away, and the tags it contains. Composite site and product items are
// matched by name and structure too, so they can take the item's styling even where a swap is not possible.
type Signature = { item: string; surface?: Surface; names: RegExp; not?: RegExp; tags?: string[]; roles?: string[]; inputs?: string[]; props?: string[]; contains?: string[] };

const SIGNATURES: Signature[] = [
	{ item: 'button', names: /^(button|btn|cta|action|submit)$/, not: /group|bar|list|toolbar/, tags: ['button'], props: ['variant', 'size', 'asChild', 'loading', 'onClick', 'disabled', 'leftIcon', 'rightIcon'] },
	{ item: 'badge', names: /^(badge|tag|pill|chip|status|label)$/, not: /input|filter|list/, tags: ['span'], props: ['variant', 'tone', 'color'] },
	{ item: 'card', names: /^(card|panel|tile|box)$/, not: /stat|metric|pricing|plan|price/, tags: ['div', 'article', 'section'], props: ['title', 'description', 'footer', 'header'] },
	{ item: 'input', names: /^(input|textfield|textbox|field)$/, not: /area|select|tag|search|group/, tags: ['input'], inputs: ['text', 'email', 'password', 'url', 'number', 'search', 'tel'] },
	{ item: 'textarea', names: /^(textarea|multiline)$/, tags: ['textarea'] },
	{ item: 'label', names: /^(label|fieldlabel|formlabel)$/, tags: ['label'], props: ['htmlFor', 'required'] },
	{ item: 'select', names: /^(select|dropdown|picker|combobox)$/, not: /menu/, tags: ['select'], contains: ['option'], props: ['options', 'onValueChange'] },
	{ item: 'checkbox', names: /^(checkbox|check)$/, inputs: ['checkbox'], roles: ['checkbox'], props: ['checked', 'onCheckedChange'] },
	{ item: 'switch', names: /^(switch|toggle)$/, not: /theme|group/, roles: ['switch'], props: ['checked', 'onCheckedChange', 'onToggle'] },
	{ item: 'tabs', names: /^(tabs?|tablist|tabbar)$/, roles: ['tablist'], contains: ['role:tab'] },
	{ item: 'segmented-control', names: /^(segmented|segment|segmentedcontrol|togglegroup)$/, roles: ['radiogroup'] },
	{ item: 'dialog', names: /^(dialog|modal|popup|lightbox)$/, roles: ['dialog'], tags: ['dialog'], props: ['open', 'onClose', 'onOpenChange'] },
	{ item: 'sheet', names: /^(sheet|drawer|sidepanel|slideover|offcanvas)$/, props: ['open', 'onClose', 'side'] },
	{ item: 'tooltip', names: /^(tooltip|hint)$/, roles: ['tooltip'], props: ['content', 'label', 'side'] },
	{ item: 'popover', names: /^(popover|popup|flyout)$/, props: ['open', 'trigger', 'content'] },
	{ item: 'dropdown-menu', names: /^(dropdownmenu|menu|contextmenu|actionmenu|kebab|overflowmenu)$/, roles: ['menu'], contains: ['role:menuitem'] },
	{ item: 'accordion', names: /^(accordion|collapsible|disclosure|faq|expander)$/, tags: ['details'], contains: ['summary'] },
	{ item: 'avatar', names: /^(avatar|userimage|profileimage|initials)$/, props: ['src', 'name', 'initials', 'fallback'] },
	{ item: 'skeleton', names: /^(skeleton|shimmer|placeholder|loadingblock)$/ },
	{ item: 'spinner', names: /^(spinner|loader|loading|loadingspinner)$/, contains: ['svg'] },
	{ item: 'progress', names: /^(progress|progressbar|meter)$/, roles: ['progressbar'], tags: ['progress'], props: ['value', 'max'] },
	{ item: 'table', names: /^(table|datatable|grid)$/, tags: ['table'], contains: ['thead', 'tbody', 'th'] },
	{ item: 'separator', names: /^(separator|divider|rule|hr)$/, tags: ['hr'] },
	{ item: 'kbd', names: /^(kbd|key|shortcut|hotkey|keycap)$/, tags: ['kbd'] },
	{ item: 'copy-button', names: /^(copybutton|copy|clipboard|copytoclipboard)$/, props: ['value', 'text', 'onCopy'] },
	{ item: 'empty-state', names: /^(emptystate|empty|noresults|nodata|blankslate|zerostate)$/ },
	{ item: 'code-window', names: /^(codeblock|codecard|codewindow|code|snippet|codesnippet|terminal)$/, tags: ['pre'], contains: ['code'] },
	{ item: 'site-header', surface: 'site', names: /^(header|siteheader|navbar|nav|navigation|topnav|mainnav)$/, tags: ['header', 'nav'] },
	{ item: 'site-footer', surface: 'site', names: /^(footer|sitefooter)$/, tags: ['footer'] },
	{ item: 'hero', surface: 'site', names: /^(hero|herosection|banner|jumbotron|masthead|splash)$/ },
	{ item: 'cta', surface: 'site', names: /^(cta|calltoaction|ctasection|closingcta|signupband)$/ },
	{ item: 'faq', surface: 'site', names: /^(faq|faqs|faqsection|questions)$/, contains: ['details'] },
	{ item: 'pricing', surface: 'site', names: /^(pricing|pricingtable|plans|pricingsection|pricingcard|plancard)$/ },
	{ item: 'logo-strip', surface: 'site', names: /^(logos|logostrip|logocloud|logowall|customers|trustedby|clients)$/ },
	{ item: 'testimonials', surface: 'site', names: /^(testimonials?|reviews?|quotes?)$/, tags: ['blockquote'], contains: ['blockquote'] },
	{ item: 'section', surface: 'site', names: /^(section|sectionheading|sectionheader|sectiontitle)$/, tags: ['section'] },
];

/** The words a component's name is made of, lowercased and joined (PrimaryButton gives primarybutton, primary, button). */
function nameWords(name: string) {
	const words = name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase().split(/\s+/);
	return { whole: words.join(''), words, head: words[words.length - 1] };
}

/** The best library item for a component, with its score and the signals that gave it. */
export function identify(c: AppComponent, surface: Surface, kindsOf: (item: string) => string[] = () => []): { item?: string; kind?: string; confidence: number; signals: string[] } {
	const { whole, words, head } = nameWords(c.name);
	const classWords = (c.root?.classes ?? []).filter((cl) => !UTILITY.test(cl)).flatMap((cl) => cl.toLowerCase().split(/[_-]+/));
	let best: { item: string; score: number; signals: string[] } | undefined;
	for (const sig of SIGNATURES) {
		const signals: string[] = [];
		let score = 0;
		if (sig.not?.test(whole)) continue;
		if (sig.names.test(whole)) {
			score += 7;
			signals.push(`named ${c.name}`);
		} else if (sig.names.test(head)) {
			score += 5;
			signals.push(`named …${head}`);
		} else if (words.some((w) => sig.names.test(w))) {
			score += 2;
			signals.push(`name has ${words.find((w) => sig.names.test(w))}`);
		}
		const tag = c.root?.tag;
		if (tag && sig.tags?.includes(tag)) {
			score += 3;
			signals.push(`renders <${tag}>`);
		}
		const roles = [c.root?.role, ...c.inner.filter((t) => t.startsWith('role:')).map((t) => t.slice(5))].filter(Boolean) as string[];
		const role = roles.find((r) => sig.roles?.includes(r));
		if (role) {
			score += 5;
			signals.push(`role ${role}`);
		}
		const input = [c.root?.tag === 'input' ? c.root.type ?? 'text' : undefined, ...c.inner.filter((t) => t.startsWith('input:')).map((t) => t.slice(6))].find((t) => t && sig.inputs?.includes(t));
		if (input) {
			score += 4;
			signals.push(`input type ${input}`);
		}
		const contains = (sig.contains ?? []).filter((t) => c.inner.includes(t));
		if (contains.length) {
			score += 2;
			signals.push(`contains ${contains.join(', ')}`);
		}
		const props = (sig.props ?? []).filter((p) => c.props.includes(p));
		if (props.length) {
			score += Math.min(3, props.length * 1.5);
			signals.push(`props ${props.join(', ')}`);
		}
		const classHit = classWords.find((w) => sig.names.test(w));
		if (classHit) {
			score += 2;
			signals.push(`class ${classHit}`);
		}
		if (sig.surface && sig.surface !== surface) score -= 2;
		if (score > 0 && (!best || score > best.score)) best = { item: sig.item, score, signals };
	}
	// A floor: a name alone is enough (7); structure alone needs two signals that agree.
	if (!best || best.score < 5) return { confidence: 0, signals: best?.signals ?? [] };
	const kinds = kindsOf(best.item);
	return { item: best.item, kind: kinds[0], confidence: Math.min(1, best.score / 12), signals: best.signals };
}
