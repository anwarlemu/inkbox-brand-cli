import { parse } from '@babel/parser';
import { elements } from '../lib/brand.js';
import type { Surface } from '../project/surface.js';

// Compound controls return a Portal around their styled element. Style the actual Radix part, including renamed
// imports, while retaining the app's state, refs, handlers, positioning, children and public props.
type Node = { type: string; start: number; end: number; [key: string]: any };
type Part = { family: string; part: string };
const FAMILIES = new Set(['dropdown-menu', 'context-menu', 'select', 'popover']);
const ROWS = new Set(['Item', 'CheckboxItem', 'RadioItem', 'SubTrigger']);
const LOOK = /^(bg|text|border|rounded|shadow|ring|outline|font|tracking|leading|backdrop|transition|duration|ease)(-|$)/;
const KEEP_TEXT = /^text-(left|center|right|justify|start|end|wrap|nowrap|balance|pretty|ellipsis|clip)$/;

function walk(n: any, visit: (node: Node) => void) {
	if (!n || typeof n.type !== 'string') return;
	visit(n);
	for (const [key, value] of Object.entries(n)) {
		if (key === 'loc' || key.endsWith('Comments')) continue;
		if (Array.isArray(value)) value.forEach(v => walk(v, visit));
		else if (value && typeof value === 'object') walk(value, visit);
	}
}

// Only class-list literals, never strings in comparisons, object keys, callbacks or arbitrary helper arguments.
function classLiterals(n: Node | undefined): Node[] {
	if (!n) return [];
	if (n.type === 'StringLiteral') return [n];
	if (n.type === 'JSXExpressionContainer') return classLiterals(n.expression);
	if (n.type === 'CallExpression' && ['cn', 'clsx', 'classnames', 'twMerge'].includes(n.callee?.name)) return n.arguments.flatMap(classLiterals);
	if (n.type === 'BinaryExpression' && n.operator === '+') return [...classLiterals(n.left), ...classLiterals(n.right)];
	return [];
}

export function restyleOverlays(text: string, surface: Surface): { text: string; parts: string[] } {
	let ast: Node;
	try { ast = parse(text, { sourceType: 'module', plugins: ['jsx', 'typescript'] }) as unknown as Node; }
	catch { return { text, parts: [] }; }
	const namespaces = new Map<string, string>();
	const named = new Map<string, Part>();
	for (const n of ast.program.body) {
		if (n.type !== 'ImportDeclaration') continue;
		const family = String(n.source.value).replace('@radix-ui/react-', '');
		if (!FAMILIES.has(family) || !n.source.value.startsWith('@radix-ui/react-')) continue;
		for (const spec of n.specifiers) {
			if (spec.type === 'ImportNamespaceSpecifier') namespaces.set(spec.local.name, family);
			else if (spec.type === 'ImportSpecifier') named.set(spec.local.name, { family, part: spec.imported.name });
		}
	}
	const edits: { start: number; end: number; value: string }[] = [];
	const parts: string[] = [];
	walk(ast, n => {
		if (n.type !== 'JSXOpeningElement') return;
		const name = n.name;
		const found = name.type === 'JSXIdentifier' ? named.get(name.name) : name.type === 'JSXMemberExpression' && namespaces.has(name.object?.name) ? { family: namespaces.get(name.object.name)!, part: name.property.name } : undefined;
		if (!found) return;
		const { family, part } = found;
		const menu = family === 'dropdown-menu' || family === 'context-menu' || family === 'select';
		const kind = family === 'select' && part === 'Trigger' ? 'input' : menu ? ROWS.has(part) ? 'menu-item' : ['Content', 'SubContent'].includes(part) ? 'menu-panel' : undefined : part === 'Content' ? 'popover-panel' : undefined;
		if (!kind) return;
		const attr = n.attributes.find((a: Node) => a.type === 'JSXAttribute' && a.name.name === 'className');
		const literals = classLiterals(attr?.value);
		if (!literals.length) return;
		const defs = elements()[surface];
		const glass = n.attributes.some((a: Node) => ['variant', 'data-variant'].includes(a.name?.name) && a.value?.value === 'glass') || literals.some(l => /\bbg-glass\b/.test(l.value));
		const key = glass && menu ? kind === 'menu-item' ? 'glass-menu-item' : 'glass-menu' : kind;
		const def = defs[key] ?? elements().site[key];
		if (!def) return;
		let classes = `${def.tailwind} motion-reduce:animate-none`;
		if (family === 'select') {
			if (kind === 'input') classes += ' min-h-11 min-w-0 gap-3.25 pr-3.25 data-placeholder:text-fg disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-danger [&>span]:min-w-0 [&>span]:truncate [&>span]:text-left';
			if (kind === 'menu-item' || kind === 'menu-panel') classes = classes.replace('font-display', 'font-sans').replace('text-body-sm', 'text-h5').replace('bg-wash-hover', 'bg-search-selected');
			if (kind === 'menu-panel') classes += ' min-w-0 w-[max(11rem,var(--radix-select-trigger-width))]';
		}
		if (menu && kind === 'menu-panel') {
			const prefix = family === 'select' ? 'select' : family;
			if (part === 'SubContent') classes += ` min-w-[min(10rem,var(--radix-${prefix}-content-available-width))]`;
			classes += ` max-h-(--radix-${prefix}-content-available-height) max-w-(--radix-${prefix}-content-available-width) overflow-y-auto overscroll-contain`;
		}
		if (kind === 'popover-panel') classes += ' max-h-(--radix-popover-content-available-height) max-w-(--radix-popover-content-available-width) overflow-y-auto overscroll-contain';
		literals.forEach((literal, index) => {
			const kept = literal.value.split(/\s+/).filter((cls: string) => {
				// Keep app-specific variants, indicator offsets and layout; replace the base skin and focus wash.
				if (classes.split(/\s+/).includes(cls) || part === 'SubContent' && cls.startsWith('min-w-')) return false;
				if (family === 'select' && kind === 'menu-panel' && /^(w|min-w)-/.test(cls)) return false;
				const base = cls.split(':').pop()!;
				if (cls.includes(':') && !/^(focus|focus-visible|data-\[highlighted\]):/.test(cls)) return true;
				return cls && (KEEP_TEXT.test(base) || !LOOK.test(base) && !/^(p|px|py)-/.test(base) && !/^max-[hw]-/.test(base));
			});
			const value = [...new Set([...kept, ...(index === 0 ? classes.split(/\s+/) : [])])].join(' ');
			if (value !== literal.value) edits.push({ start: literal.start, end: literal.end, value: JSON.stringify(value) });
		});
		parts.push(`${family}.${part}`);
	});
	for (const edit of edits.sort((a, b) => b.start - a.start)) text = text.slice(0, edit.start) + edit.value + text.slice(edit.end);
	return { text, parts: [...new Set(parts)] };
}
