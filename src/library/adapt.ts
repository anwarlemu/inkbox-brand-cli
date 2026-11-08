import { parse } from '@babel/parser';
import type { Surface } from '../project/surface.js';
import type { AppComponent } from './components.js';
import { brand } from '../lib/brand.js';
import { loadItemSync } from './registry.js';

// Two ways an identified component takes the library's look.
//
// An adapter: the component keeps its name, its props type and every other line of its file, and its body renders
// the library component instead, mapping its props onto the library's (variant="danger" to the library's outline in
// red, size="small" to sm). Only names the adapter knows how to pass on are allowed; a component with any other prop
// is not adapted, so nothing it does is silently dropped.
//
// A root restyle: where a swap is not possible, the classes of the element a component renders are rewritten, its
// look (color, border, radius, type, motion, and for controls their size) replaced by the library item's, its layout
// kept.

type Ctx = { c: AppComponent; surface: Surface; local: string; values: Record<string, string[]> };
export type Adapter = { exportName: string; extraImports?: string[]; prelude?: string; body: string };

const pick = (v: string, table: [RegExp, string][], fallback: string) => table.find(([re]) => re.test(v))?.[1] ?? fallback;

/** The library's variant names for a surface (brand.json): what a filled, outlined, quiet and on-brand button and a card use. */
export function variantsFor(surface: Surface) {
	const v = brand().variants;
	const p = surface === 'product' ? v.product : undefined;
	return p
		? { filled: p.filled, black: p.black, outlined: p.outlined, quiet: p.ghost, onBrand: p.onBrand, card: p.card }
		: { filled: v.site.filled, black: v.site.filled, outlined: v.site.outlined, quiet: v.site.quiet ?? v.site.outlined, onBrand: v.site.onBrand, card: v.site.card };
}

const BUTTON_VARIANTS = (surface: Surface): [RegExp, string][] => {
	const v = variantsFor(surface);
	return surface === 'site' || !brand().variants.product
		? [
				[/^(default|primary|solid|filled|main|cta|brand|dark|black)$/i, v.filled],
				[/^(white|light|inverse|inverted|on-?(brand|dark|blue))$/i, v.onBrand],
				...(v.quiet !== v.outlined ? ([[/^(ghost|link|tertiary|plain|text|subtle|quiet|minimal|transparent)$/i, v.quiet]] as [RegExp, string][]) : []),
				[/./, v.outlined],
			]
		: [
				[/^(primary|cta|brand|main|accent|blue)$/i, v.filled],
				[/^(default|solid|filled|dark|black)$/i, v.black],
				[/^(ghost|link|tertiary|plain|text|subtle|quiet|minimal|transparent)$/i, v.quiet],
				[/^(white|light|inverse|inverted|on-?(brand|dark|blue))$/i, v.onBrand],
				[/./, v.outlined],
			];
};
const DANGER = /^(destructive|danger|delete|remove|error|negative|critical|red)$/i;
/** The library's default button size name (brand.json variants.site.size; md when unset). */
const defaultSize = () => brand().variants.site.size ?? 'md';
const SIZES = (): [RegExp, string][] => [
	[/icon/i, 'icon'],
	[/^(xs|sm|small|compact|mini|tiny)$/i, 'sm'],
	[/./, defaultSize()],
];
// Badge roles, renamed to the library's own variants where brand.json says so (variants.site.badges).
const BADGE_ROLES: [RegExp, string][] = [
	[/^(primary|brand|info|blue|accent|new)$/i, 'brand'],
	[/^(success|green|positive|ok|active|live)$/i, 'success'],
	[/^(warning|yellow|amber|orange|pending|caution)$/i, 'warning'],
	[/^(destructive|danger|error|red|negative|critical|failed)$/i, 'destructive'],
	[/^(tag|topic)$/i, 'tag'],
	[/^(chip|pill|outline-pill)$/i, 'chip'],
	[/./, 'default'],
];
const BADGE_VARIANTS = (): [RegExp, string][] => BADGE_ROLES.map(([re, role]) => [re, brand().variants.site.badges?.[role] ?? role]);

/** Every name a component can be handed and the adapter knows how to pass on. */
const PASS = new Set(['className', 'children', 'ref', 'id', 'style', 'title', 'onClick', 'onChange', 'onBlur', 'onFocus', 'disabled', 'type', 'name', 'value', 'defaultValue', 'placeholder', 'required', 'htmlFor', 'asChild', 'tabIndex', 'role', 'form']);

function access(c: AppComponent) {
	const has = (n: string) => c.params.names.includes(n);
	const get = (n: string) => (c.params.identifier ? `${c.params.identifier}.${n}` : has(n) ? n : undefined);
	const spread = c.params.identifier ? `{...${c.params.identifier}}` : c.params.rest ? `{...${c.params.rest}}` : '';
	// Destructured names that are not passed on would be lost: pass every plain one on explicitly.
	const forwards = c.params.names.filter((n) => PASS.has(n) && !['className', 'children', 'ref', 'asChild'].includes(n)).map((n) => `${n}={${n}}`);
	const ref = c.refParam ? `ref={${c.refParam}}` : get('ref') && !c.params.identifier ? 'ref={ref}' : '';
	return { has, get, spread, forwards, ref };
}

const mapLiteral = (name: string, values: string[], table: [RegExp, string][], fallback: string) => `const ${name}: Record<string, string> = { ${[...new Set(values)].map((v) => `${JSON.stringify(v)}: ${JSON.stringify(pick(v, table, fallback))}`).join(', ')} };`;

// Missing props use a literal key; a nullish fallback on that literal fails TypeScript's reachability check.
const variantKey = (prop: string | undefined) => prop ? `String(${prop} ?? "default")` : '"default"';

function button({ c, surface, local, values }: Ctx): Adapter | undefined {
	const known = new Set([...PASS, 'variant', 'size', 'loading', 'isLoading', 'leftIcon', 'rightIcon', 'startIcon', 'endIcon', 'icon', 'fullWidth', 'block']);
	if (c.params.names.some((n) => !known.has(n))) return undefined;
	const a = access(c);
	const variants = [...(values.variant ?? []), 'default'];
	const sizes = [...(values.size ?? []), 'default'];
	const key = c.name.toUpperCase();
	// A library button with a destructive variant takes danger values as it; otherwise the outline in the danger color.
	const destructive = /\bdestructive\s*:/.test(loadItemSync('button')?.files?.[0]?.content ?? '');
	const table: [RegExp, string][] = destructive ? [[DANGER, 'destructive'], ...BUTTON_VARIANTS(surface)] : BUTTON_VARIANTS(surface);
	const prelude = [
		mapLiteral(`DS_${key}_VARIANT`, variants, table, variantsFor(surface).outlined),
		mapLiteral(`DS_${key}_SIZE`, sizes, SIZES(), defaultSize()),
		...(a.get('variant') && !destructive ? [`const DS_${key}_DANGER = new Set<string>(${JSON.stringify([...new Set(variants)].filter((v) => DANGER.test(v)))});`] : []),
	].join('\n');
	const v = a.get('variant');
	const s = a.get('size');
	const loading = a.get('loading') ?? a.get('isLoading');
	const left = a.get('leftIcon') ?? a.get('startIcon') ?? a.get('icon');
	const right = a.get('rightIcon') ?? a.get('endIcon');
	const full = a.get('fullWidth') ?? a.get('block');
	const classes = [a.get('className'), v && !destructive ? `DS_${key}_DANGER.has(String(${v})) ? "border-danger text-danger" : undefined` : undefined, full ? `${full} ? "w-full" : undefined` : undefined].filter(Boolean);
	// Disabled while loading, and whenever the app passes disabled (destructured, or still inside the rest).
	const passedDisabled = a.get('disabled') ?? (c.params.rest ? `${c.params.rest}.disabled` : 'false');
	const disabled = loading ? `disabled={!!${passedDisabled} || !!${loading}}` : '';
	const attrs = [
		a.spread,
		...a.forwards.filter((f) => !(loading && f.startsWith('disabled='))),
		a.ref,
		`variant={(DS_${key}_VARIANT[${variantKey(v)}] ?? "${variantsFor(surface).outlined}") as DsComponentProps<typeof ${local}>["variant"]}`,
		`size={(DS_${key}_SIZE[${variantKey(s)}] ?? "${defaultSize()}") as DsComponentProps<typeof ${local}>["size"]}`,
		classes.length ? `className={[${classes.join(', ')}].filter(Boolean).join(" ") || undefined}` : '',
		a.get('asChild') && !c.params.identifier ? 'asChild={asChild}' : '',
		disabled,
	].filter(Boolean);
	const children = a.get('children') ?? (c.params.identifier ? `${c.params.identifier}.children` : undefined);
	const inner = left || right ? `{${left ?? 'null'}}{${children ?? 'null'}}{${right ?? 'null'}}` : children ? `{${children}}` : '';
	return { exportName: 'Button', prelude, body: `<${local} ${attrs.join(' ')}>${inner}</${local}>` };
}

function badge({ c, local, values }: Ctx): Adapter | undefined {
	const known = new Set([...PASS, 'variant', 'tone', 'color', 'size', 'intent']);
	if (c.params.names.some((n) => !known.has(n))) return undefined;
	const a = access(c);
	const prop = ['variant', 'tone', 'intent', 'color'].find((p) => a.get(p) && (values[p]?.length || c.params.names.includes(p))) ?? 'variant';
	const key = c.name.toUpperCase();
	const prelude = mapLiteral(`DS_${key}_VARIANT`, [...(values[prop] ?? []), 'default'], BADGE_VARIANTS(), 'default');
	const v = a.get(prop);
	const attrs = [a.spread, ...a.forwards, a.ref, `variant={(DS_${key}_VARIANT[${variantKey(v)}] ?? "default") as DsComponentProps<typeof ${local}>["variant"]}`, a.get('className') ? `className={${a.get('className')}}` : ''].filter(Boolean);
	const children = a.get('children') ?? (c.params.identifier ? `${c.params.identifier}.children` : undefined);
	return { exportName: 'Badge', prelude, body: `<${local} ${attrs.join(' ')}>${children ? `{${children}}` : ''}</${local}>` };
}

/** Components with no variants of their own: the library's takes the same element props. */
function passthrough(exportName: string, opts: { void?: boolean; variant?: string } = {}) {
	return ({ c, local }: Ctx): Adapter | undefined => {
		if (c.params.names.some((n) => !PASS.has(n))) return undefined;
		const a = access(c);
		const attrs = [a.spread, ...a.forwards, a.ref, a.get('className') ? `className={${a.get('className')}}` : '', opts.variant ? `variant="${opts.variant}"` : ''].filter(Boolean);
		const children = a.get('children') ?? (c.params.identifier ? `${c.params.identifier}.children` : undefined);
		return { exportName, body: opts.void || !children ? `<${local} ${attrs.join(' ')} />` : `<${local} ${attrs.join(' ')}>{${children}}</${local}>` };
	};
}

function card(ctx: Ctx): Adapter | undefined {
	const { c, local, surface } = ctx;
	const known = new Set([...PASS, 'title', 'description', 'footer']);
	if (c.params.names.some((n) => !known.has(n))) return undefined;
	const a = access(c);
	const title = a.get('title');
	const description = a.get('description');
	const footer = a.get('footer');
	if (!title && !description && !footer) return passthrough('Card', { variant: variantsFor(surface).card === 'default' ? undefined : variantsFor(surface).card })(ctx);
	const attrs = [a.spread, ...a.forwards.filter((f) => !f.startsWith('title=')), a.ref, a.get('className') ? `className={${a.get('className')}}` : '', variantsFor(surface).card === 'default' ? '' : `variant="${variantsFor(surface).card}"`].filter(Boolean);
	const children = a.get('children') ?? (c.params.identifier ? `${c.params.identifier}.children` : undefined);
	const header = title || description ? `<DsCardHeader>${title ? `{${title} && <DsCardTitle>{${title}}</DsCardTitle>}` : ''}${description ? `{${description} && <DsCardDescription>{${description}}</DsCardDescription>}` : ''}</DsCardHeader>` : '';
	return {
		exportName: 'Card',
		extraImports: ['CardHeader as DsCardHeader', 'CardTitle as DsCardTitle', 'CardDescription as DsCardDescription', ...(footer ? ['CardFooter as DsCardFooter'] : [])],
		body: `<${local} ${attrs.join(' ')}>${header}${children ? `{${children}}` : ''}${footer ? `{${footer} && <DsCardFooter>{${footer}}</DsCardFooter>}` : ''}</${local}>`,
	};
}

const ADAPTERS: Record<string, (ctx: Ctx) => Adapter | undefined> = {
	button,
	badge,
	card,
	input: passthrough('Input', { void: true }),
	textarea: passthrough('Textarea', { void: true }),
	label: passthrough('Label'),
	separator: passthrough('Separator', { void: true }),
	skeleton: passthrough('Skeleton'),
	kbd: passthrough('Kbd'),
};

export const adaptable = (item: string) => item in ADAPTERS;

/**
 * The component's file with its body rendering the library component, or undefined when it cannot be adapted
 * without losing something it does. Everything else in the file (imports, types, helpers) stays.
 */
/** Only replace wrappers whose runtime behavior is entirely forwarded props. */
function safeWrapper(text: string, c: AppComponent) {
 try {
  const source = text.slice(c.body.start, c.body.end);
  const ast: any = parse(`const wrapper = () => ${source}`, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
  let node = ast.program.body[0].declarations[0].init.body;
  // Local constants that only compute class strings from props (const tone = variant === "primary" ? "bg-..." : "...")
  // are part of the look the library replaces; anything else (hooks, calls, handlers) is behavior and stops the swap.
  const computed = new Set<string>();
  if (node.type === 'BlockStatement') {
   const statements = node.body;
   const last = statements[statements.length - 1];
   if (last?.type !== 'ReturnStatement') return false;
   for (const stmt of statements.slice(0, -1)) {
    if (stmt.type !== 'VariableDeclaration' || stmt.kind !== 'const') return false;
    for (const d of stmt.declarations) {
     if (d.id.type !== 'Identifier' || !classOnly(d.init)) return false;
     computed.add(d.id.name);
    }
   }
   node = last.argument;
   while (node?.type === 'ParenthesizedExpression') node = node.expression;
  }
  if (node?.type !== 'JSXElement') return false;
  const access = (expression: any) => expression?.type === 'Identifier' ? expression.name : expression?.type === 'MemberExpression' && expression.object?.name === c.params.identifier ? expression.property?.name : undefined;
  const mentions = (n: any): boolean => !!n && typeof n === 'object' && (n.type === 'Identifier' && computed.has(n.name) || Object.entries(n).some(([k, v]) => k !== 'loc' && (Array.isArray(v) ? v.some(mentions) : v && typeof v === 'object' && mentions(v))));
  for (const attr of node.openingElement.attributes) {
   if (computed.size && attr.type === 'JSXAttribute' && attr.name?.name !== 'className' && mentions(attr.value)) return false;
   if (attr.type === 'JSXSpreadAttribute') {
    if (attr.argument.type !== 'Identifier' || ![c.params.identifier, c.params.rest].includes(attr.argument.name)) return false;
   } else if (attr.name?.name !== 'className') {
    if (attr.value?.type !== 'JSXExpressionContainer') return false;
    const name = access(attr.value.expression);
    if (!name || (name !== attr.name.name && !(attr.name.name === 'disabled' && ['loading', 'isLoading'].includes(name)))) return false;
   }
  }
  return node.children.every((child: any) => child.type === 'JSXText' ? !child.value.trim() : child.type === 'JSXExpressionContainer' && access(child.expression) === 'children');
 } catch { return false; }
}

/** An expression that only picks or joins class strings: literals, the component's values, comparisons and choices. */
function classOnly(n: any): boolean {
 if (!n) return false;
 switch (n.type) {
  case 'StringLiteral':
  case 'NumericLiteral':
  case 'BooleanLiteral':
  case 'NullLiteral':
  case 'Identifier':
   return true;
  case 'TemplateLiteral':
   return n.expressions.every(classOnly);
  case 'ConditionalExpression':
   return classOnly(n.test) && classOnly(n.consequent) && classOnly(n.alternate);
  case 'LogicalExpression':
  case 'BinaryExpression':
   return classOnly(n.left) && classOnly(n.right);
  case 'UnaryExpression':
   return n.operator === '!' && classOnly(n.argument);
  case 'MemberExpression':
   // A lookup in a class map (SIZES[size]) or a prop (props.variant).
   return classOnly(n.object) && (n.computed ? classOnly(n.property) : n.property?.type === 'Identifier');
  case 'ParenthesizedExpression':
  case 'TSAsExpression':
  case 'TSNonNullExpression':
   return classOnly(n.expression);
  case 'ArrayExpression':
   return n.elements.every(classOnly);
  default:
   return false;
 }
}

export function adaptComponent(text: string, c: AppComponent, item: string, surface: Surface, importFrom: string, values: Record<string, string[]>): string | undefined {
	if (!safeWrapper(text, c)) return undefined;
	const make = ADAPTERS[item];
	if (!make) return undefined;
	const local = `Ds${item.replace(/(^|-)([a-z])/g, (_, __, ch: string) => ch.toUpperCase())}`;
	const adapter = make({ c, surface, local, values });
	if (!adapter) return undefined;
	const body = c.body.expression ? `(${adapter.body})` : `{\n  return ${adapter.body};\n}`;
	let out = text.slice(0, c.body.start) + body + text.slice(c.body.end);
	if (adapter.prelude) out = out.slice(0, c.span.start) + `${adapter.prelude}\n\n` + out.slice(c.span.start);
	const names = [`${adapter.exportName} as ${local}`, ...(adapter.extraImports ?? [])];
	const imports = [`import { ${names.join(', ')} } from "${importFrom}";`, ...(adapter.prelude ? ['import type { ComponentProps as DsComponentProps } from "react";'] : [])];
	return insertImports(dropOrphanStyles(text, out), imports);
}

/**
 * The class maps the old body read (const styles = { primary: 'bg-indigo-600 ...' }) are unused once it renders the
 * library's item; left in, they fail noUnusedLocals (the Vite template's default) and the swap is reverted. Removes a
 * file-level, unexported constant that holds only class strings, when the swap left it unread.
 */
export function dropOrphanStyles(before: string, after: string) {
	let ast: any;
	try {
		ast = parse(after, { sourceType: 'module', plugins: ['jsx', 'typescript'] });
	} catch {
		return after;
	}
	const strings = (n: any): boolean =>
		n?.type === 'StringLiteral' ||
		(n?.type === 'TemplateLiteral' && !n.expressions.length) ||
		(n?.type === 'ArrayExpression' && n.elements.every(strings)) ||
		(n?.type === 'ObjectExpression' && n.properties.every((p: any) => p.type === 'ObjectProperty' && !p.computed && strings(p.value))) ||
		((n?.type === 'TSAsExpression' || n?.type === 'TSSatisfiesExpression') && strings(n.expression));
	const uses = (text: string, name: string) => (text.match(new RegExp(`(?<![\\w$.])${name}(?![\\w$])`, 'g')) ?? []).length;
	const drop: { start: number; end: number }[] = [];
	for (const node of ast.program.body) {
		if (node.type !== 'VariableDeclaration' || node.declarations.length !== 1) continue;
		const [d] = node.declarations;
		if (d.id?.type !== 'Identifier' || !strings(d.init)) continue;
		if (uses(after, d.id.name) === 1 && uses(before, d.id.name) > 1) drop.push({ start: node.start, end: node.end });
	}
	let out = after;
	for (const { start, end } of drop.reverse()) out = out.slice(0, start) + out.slice(end).replace(/^[ \t]*\n(?:[ \t]*\n)?/, '');
	return out;
}


/** Adds import lines after the file's last import (after a "use client" directive when there is no import). */
function insertImports(text: string, lines: string[]) {
	const re = /^import[\s\S]*?from\s+["'][^"']+["'];?[^\n]*$|^import\s+["'][^"']+["'];?$/gm;
	let last = -1;
	for (const m of text.matchAll(re)) last = m.index! + m[0].length;
	if (last < 0) {
		const directive = text.match(/^\s*["']use (client|server)["'];?\n/);
		last = directive ? directive[0].length - 1 : -1;
	}
	return last < 0 ? `${lines.join('\n')}\n${text}` : `${text.slice(0, last)}\n${lines.join('\n')}${text.slice(last)}`;
}

// The parts of a class list that are its look; layout (display, position, width, margin, alignment) is never touched.
const LOOK = /^(bg|text|border|rounded|shadow|ring|outline|font|tracking|leading|transition|duration|ease|from|via|to|decoration|placeholder|uppercase|lowercase|capitalize|italic|underline|backdrop|opacity-(?:[0-9]))(-|$)/;
const KEEP_TEXT = /^text-(left|center|right|justify|start|end|wrap|nowrap|balance|pretty|ellipsis|clip)$/;
// For controls the library also sets the size (height, padding, gap).
const SIZE = /^(h|min-h|px|py|p|pl|pr|pt|pb|ps|pe|gap|size)-/;
const CONTROLS = new Set(['button', 'badge', 'input', 'textarea', 'kbd']);

const base = (cls: string) => cls.split(':').pop()!.replace(/^!/, '');
function isLook(cls: string, control: boolean) {
	const b = base(cls);
	if (KEEP_TEXT.test(b)) return false;
	// The brand's shape utilities (ds-cut-frame) and their parameters ([--ds-shape-fill:...], any state) draw the look.
	if (/^ds-[\w-]+$/.test(cls) || /(^|:)\[--ds-[\w-]+:/.test(cls)) return true;
	return LOOK.test(b) || (control && SIZE.test(b)) || /^(hover|focus|focus-visible|active|dark|disabled|group-hover|aria-[\w-]+|data-\[[^\]]+\]):/.test(cls) && (LOOK.test(b) || SIZE.test(b));
}

/** The library item's classes for one look: a cva's base, the variant and size picked, and the compounds that match. */
export function libraryClasses(content: string, exportName: string, pickVariant: (values: string[]) => string | undefined, size = defaultSize()): string | undefined {
	let ast: any;
	try {
		ast = parse(content, { sourceType: 'module', plugins: ['jsx', 'typescript'] });
	} catch {
		return undefined;
	}
	const strings = (n: any): string[] => (n?.type === 'StringLiteral' ? [n.value] : n?.type === 'ArrayExpression' ? n.elements.flatMap(strings) : []);
	const found: string[] = [];
	const visit = (n: any) => {
		if (!n || typeof n.type !== 'string' || found.length) return;
		if (n.type === 'CallExpression' && n.callee?.name === 'cva') {
			const [baseArg, config] = n.arguments;
			const variantGroup = config?.properties?.find((p: any) => p.key?.name === 'variants')?.value?.properties ?? [];
			const group = (name: string) => variantGroup.find((p: any) => p.key?.name === name)?.value?.properties ?? [];
			const variant = pickVariant(group('variant').map((p: any) => p.key?.name ?? p.key?.value));
			const out = [...strings(baseArg)];
			const valueOf = (g: string, v?: string) => group(g).find((p: any) => (p.key?.name ?? p.key?.value) === v)?.value;
			if (variant) out.push(...strings(valueOf('variant', variant)));
			out.push(...strings(valueOf('size', size)));
			for (const compound of config?.properties?.find((p: any) => p.key?.name === 'compoundVariants')?.value?.elements ?? []) {
				const props = Object.fromEntries(compound.properties.map((p: any) => [p.key?.name, strings(p.value)]));
				const fits = (!props.variant || props.variant.includes(variant)) && (!props.size || props.size.includes(size));
				if (fits) out.push(...(props.className ?? []));
			}
			found.push(out.join(' '));
			return;
		}
		for (const k of Object.keys(n)) {
			if (k === 'loc') continue;
			const v = n[k];
			if (Array.isArray(v)) v.forEach(visit);
			else if (v && typeof v.type === 'string') visit(v);
		}
	};
	visit(ast);
	if (found.length) return found[0];
	// No cva: the first class string of the exported component's root.
	const m = content.match(new RegExp(`function ${exportName}\\b[\\s\\S]*?className=\\{cn\\(\\s*"([^"]+)"`));
	return m?.[1];
}

/** Which of the library's looks an element is drawn as, from its classes: filled, outlined or quiet. */
export function lookOf(classes: string[]): 'filled' | 'outlined' | 'quiet' {
	const b = classes.map(base);
	if (b.some((c) => /^bg-(?!transparent|none|inherit)/.test(c))) return 'filled';
	if (b.some((c) => /^border(-(?!0|none|transparent)|$)/.test(c) || /^ring(-|$)/.test(c))) return 'outlined';
	return 'quiet';
}

/** The component's file with its root element's look replaced by the library item's, or undefined when nothing changes. */
export function restyleRoot(text: string, c: AppComponent, item: string, libraryClassList: string): string | undefined {
	const literals = c.root?.literals ?? [];
	if (!literals.length) return undefined;
	const control = CONTROLS.has(item);
	let out = text;
	let changed = false;
	// Right to left, so earlier offsets stay valid.
	const sorted = [...literals].sort((a, b) => b.start - a.start);
	const first = literals.reduce((a, b) => (a.start < b.start ? a : b));
	for (const lit of sorted) {
		// A separator (" ") or an empty string between expressions is not a class list.
		if (!lit.value.trim()) continue;
		const library = libraryClassList.split(/\s+/).filter((cls) => cls && isLook(cls, control));
		const present = lit.value.split(/\s+/).filter(Boolean);
		// Already the library's look (a second run): leave the order as it is.
		if (lit === first && library.every((cls) => present.includes(cls)) && present.every((cls) => !isLook(cls, control) || library.includes(cls))) continue;
		const kept = present.filter((cls) => !isLook(cls, control));
		// Only the library's look (and a control's size) is taken: its layout classes (flex, gap, padding on a card) would
		// change how the component lays out its children.
		const next = lit === first ? [...kept, ...libraryClassList.split(/\s+/).filter((cls) => cls && !kept.includes(cls) && isLook(cls, control))] : kept;
		const value = next.join(' ');
		if (value === lit.value) continue;
		const quote = out[lit.start];
		out = `${out.slice(0, lit.start)}${quote}${value}${quote}${out.slice(lit.end)}`;
		changed = true;
	}
	return changed ? out : undefined;
}

/** A cva call's parts: its base classes and each group's values (variant, size), with the string nodes that hold them. */
function cvaOf(content: string) {
	let ast: any;
	try {
		ast = parse(content, { sourceType: 'module', plugins: ['jsx', 'typescript'] });
	} catch {
		return undefined;
	}
	let found: any;
	const visit = (n: any) => {
		if (!n || typeof n.type !== 'string' || found) return;
		if (n.type === 'CallExpression' && n.callee?.name === 'cva') {
			found = n;
			return;
		}
		for (const k of Object.keys(n)) {
			if (k === 'loc') continue;
			const v = n[k];
			if (Array.isArray(v)) v.forEach(visit);
			else if (v && typeof v.type === 'string') visit(v);
		}
	};
	visit(ast);
	if (!found) return undefined;
	const strings = (n: any): any[] => (n?.type === 'StringLiteral' ? [n] : n?.type === 'ArrayExpression' ? n.elements.flatMap(strings) : n?.type === 'TemplateLiteral' && !n.expressions.length ? [{ ...n.quasis[0], value: n.quasis[0].value.cooked, template: true }] : []);
	const [baseArg, config] = found.arguments;
	const groups: Record<string, Record<string, any[]>> = {};
	for (const g of config?.properties?.find((p: any) => p.key?.name === 'variants')?.value?.properties ?? []) {
		const name = g.key?.name ?? g.key?.value;
		groups[name] = {};
		for (const v of g.value?.properties ?? []) groups[name][v.key?.name ?? v.key?.value] = strings(v.value);
	}
	return { base: strings(baseArg), groups };
}

/**
 * A component built on its own cva (shadcn's button.tsx): its base and each variant and size take the library item's
 * look (color, border, radius, type, motion; a control's size), keeping their layout and the variant names, so every
 * use renders the library's look without a change at the use site. Undefined when the file has no cva to restyle.
 */
export function restyleCva(text: string, item: string, libraryContent: string, surface: Surface): string | undefined {
	const app = cvaOf(text);
	const lib = cvaOf(libraryContent);
	if (!app || !lib || !app.groups.variant) return undefined;
	const control = CONTROLS.has(item);
	const classes = (nodes: any[]) => nodes.map((n) => n.value as string).join(' ').split(/\s+/).filter(Boolean);
	const libVariants = Object.keys(lib.groups.variant ?? {});
	const pickVariant = (name: string) => (libVariants.includes(name) ? name : DANGER.test(name) && libVariants.includes('destructive') ? 'destructive' : pick(name, BUTTON_VARIANTS(surface), variantsFor(surface).outlined));
	const libSizes = Object.keys(lib.groups.size ?? {});
	const pickSize = (name: string) => (libSizes.includes(name) ? name : pick(name, SIZES(), defaultSize()));
	const edits: { start: number; end: number; value: string }[] = [];
	const rewrite = (nodes: any[], library: string[]) => {
		if (!nodes.length) return;
		const look = library.filter((cls) => isLook(cls, control));
		const first = nodes[0];
		nodes.forEach((n) => {
			const present = (n.value as string).split(/\s+/).filter(Boolean);
			const kept = present.filter((cls) => !isLook(cls, control));
			const next = n === first ? [...kept, ...look.filter((cls) => !kept.includes(cls))] : kept;
			if (next.join(' ') === present.join(' ')) return;
			edits.push({ start: n.start, end: n.end, value: n.template ? next.join(' ') : JSON.stringify(next.join(' ')) });
		});
	};
	rewrite(app.base, classes(lib.base));
	for (const [name, nodes] of Object.entries(app.groups.variant)) rewrite(nodes, classes(lib.groups.variant?.[pickVariant(name)] ?? []));
	for (const [name, nodes] of Object.entries(app.groups.size ?? {})) rewrite(nodes, classes(lib.groups.size?.[pickSize(name)] ?? []));
	if (!edits.length) return undefined;
	let out = text;
	for (const e of edits.sort((a, b) => b.start - a.start)) out = out.slice(0, e.start) + e.value + out.slice(e.end);
	return out;
}

/**
 * The library item's look for one use of an app component a page selection leaves out (other pages share it): the
 * variant and size the use names, mapped to the library's, look classes only, each marked important so they win over
 * the component's own classes on this page alone. Undefined when the item has no such look.
 */
export function useSiteLook(item: string, libraryContent: string, surface: Surface, variant?: string, size?: string): string[] | undefined {
	const lib = cvaOf(libraryContent);
	const control = CONTROLS.has(item);
	// A look the brand's cut shape draws (a pseudo-element under the content) also clears the element's own ground,
	// line, corners and shadow, or the component's background shows through the cut corner.
	const look = (s: string) => {
		const out = s.split(/\s+/).filter((cls) => cls && isLook(cls, control));
		return out.some((cls) => /^ds-cut(-frame)?$/.test(cls)) ? [...out, 'bg-transparent', 'border-0', 'rounded-none', 'shadow-none'] : out;
	};
	if (!lib) {
		const classes = libraryClasses(libraryContent, item.replace(/(^|-)([a-z])/g, (_m, _d, c: string) => c.toUpperCase()), () => undefined);
		return classes ? look(classes) : undefined;
	}
	const libVariants = Object.keys(lib.groups.variant ?? {});
	const v = variant === undefined ? (libVariants.includes('default') ? 'default' : libVariants[0]) : libVariants.includes(variant) ? variant : DANGER.test(variant) && libVariants.includes('destructive') ? 'destructive' : item === 'button' ? pick(variant, BUTTON_VARIANTS(surface), variantsFor(surface).outlined) : item === 'badge' ? pick(variant, BADGE_VARIANTS(), 'default') : libVariants[0];
	const libSizes = Object.keys(lib.groups.size ?? {});
	const s = size === undefined || !libSizes.length ? (libSizes.includes('default') ? 'default' : undefined) : libSizes.includes(size) ? size : pick(size, SIZES(), defaultSize());
	const text = (nodes: any[] | undefined) => (nodes ?? []).map((n) => n.value as string).join(' ');
	return look([text(lib.base), text(lib.groups.variant?.[v ?? '']), text(s ? lib.groups.size?.[s] : [])].join(' '));
}
