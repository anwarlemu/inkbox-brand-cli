import { parse } from '@babel/parser';
import type { Surface } from '../project/surface.js';
import type { AppComponent } from './components.js';
import { brand } from '../lib/brand.js';

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
	const prelude = [
		mapLiteral(`DS_${key}_VARIANT`, variants, BUTTON_VARIANTS(surface), variantsFor(surface).outlined),
		mapLiteral(`DS_${key}_SIZE`, sizes, SIZES(), defaultSize()),
		`const DS_${key}_DANGER = new Set<string>(${JSON.stringify([...new Set(variants)].filter((v) => DANGER.test(v)))});`,
	].join('\n');
	const v = a.get('variant');
	const s = a.get('size');
	const loading = a.get('loading') ?? a.get('isLoading');
	const left = a.get('leftIcon') ?? a.get('startIcon') ?? a.get('icon');
	const right = a.get('rightIcon') ?? a.get('endIcon');
	const full = a.get('fullWidth') ?? a.get('block');
	const classes = [a.get('className'), v ? `DS_${key}_DANGER.has(String(${v})) ? "border-danger text-danger" : undefined` : undefined, full ? `${full} ? "w-full" : undefined` : undefined].filter(Boolean);
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
export function adaptComponent(text: string, c: AppComponent, item: string, surface: Surface, importFrom: string, values: Record<string, string[]>): string | undefined {
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
	return insertImports(out, imports);
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
		const kept = lit.value.split(/\s+/).filter((cls) => cls && !isLook(cls, control));
		const next = lit === first ? [...kept, ...libraryClassList.split(/\s+/).filter((cls) => !kept.includes(cls))] : kept;
		const value = next.join(' ');
		if (value === lit.value) continue;
		const quote = out[lit.start];
		out = `${out.slice(0, lit.start)}${quote}${value}${quote}${out.slice(lit.end)}`;
		changed = true;
	}
	return changed ? out : undefined;
}
