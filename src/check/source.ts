import { specimen } from '../convert/markup.js';
import { parse } from '@babel/parser';
import { extname } from 'node:path';

export type Node = { type: string; start: number; end: number; loc: { start: { line: number; column: number } }; [key: string]: any };

export type ClassToken = { value: string; offset: number; element?: Node };
export type StringLiteral = { value: string; offset: number; raw: string; context: 'className' | 'style' | 'jsx-attr' | 'jsx-text' | 'code'; attr?: string; element?: Node; styleKey?: string };
export type Import = { local: string; imported: string; source: string };

export type SourceFile = {
	path: string;
	text: string;
	kind: 'script' | 'css' | 'markdown' | 'other';
	ast?: Node;
	parseError?: string;
	imports: Import[];
	classTokens: ClassToken[];
	strings: StringLiteral[];
	jsxElements: Node[];
	parents: Map<Node, Node | undefined>;
	lineStarts: number[];
	overrides: { fileReason?: string; lines: Map<number, string> };
};

const SCRIPT = new Set(['.tsx', '.jsx', '.ts', '.js', '.mjs', '.cjs']);
const CSS = new Set(['.css', '.scss', '.sass', '.less', '.styl', '.pcss']);
const MARKDOWN = new Set(['.md', '.mdx']);
// Component and page files of other frameworks: their <style> blocks and style attributes are checked as CSS.
const MARKUP = new Set(['.astro', '.vue', '.svelte', '.html', '.htm', '.erb', '.php', '.hbs', '.handlebars', '.mustache', '.liquid', '.njk', '.jinja', '.jinja2', '.j2', '.twig', '.ejs', '.cshtml', '.razor', '.heex', '.eex', '.gohtml', '.tmpl', '.jsp']);
const CLASS_HELPERS = new Set(['cn', 'clsx', 'cva', 'twMerge', 'classNames', 'cx', 'tv']);

export function lineOf(file: SourceFile, offset: number) {
	let lo = 0;
	let hi = file.lineStarts.length - 1;
	while (lo < hi) {
		const mid = (lo + hi + 1) >> 1;
		if (file.lineStarts[mid] <= offset) lo = mid;
		else hi = mid - 1;
	}
	return { line: lo + 1, column: offset - file.lineStarts[lo] + 1 };
}

function collectOverrides(text: string) {
	const lines = new Map<number, string>();
	let fileReason: string | undefined;
	text.split('\n').forEach((line, index) => {
		const match = line.match(/ds-override:\s*([^*\n]*?)\s*(\*\/\}?|-->)?\s*$/);
		if (!match) return;
		const reason = match[1].trim() || '(no reason given)';
		if (index === 0) fileReason = reason;
		lines.set(index + 1, reason);
	});
	return { fileReason, lines };
}

function splitClasses(value: string, offset: number, element?: Node): ClassToken[] {
	const tokens: ClassToken[] = [];
	const re = /\S+/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(value))) tokens.push({ value: m[0], offset: offset + m.index, element });
	return tokens;
}

export function loadSource(path: string, text: string): SourceFile {
	const ext = extname(path).toLowerCase();
	const lineStarts = [0];
	for (let i = 0; i < text.length; i++) if (text[i] === '\n') lineStarts.push(i + 1);
	const file: SourceFile = {
		path,
		text,
		kind: SCRIPT.has(ext) ? 'script' : CSS.has(ext) ? 'css' : MARKDOWN.has(ext) ? 'markdown' : 'other',
		imports: [],
		classTokens: [],
		strings: [],
		jsxElements: [],
		parents: new Map(),
		lineStarts,
		overrides: collectOverrides(text),
	};
	if (MARKUP.has(ext)) return loadMarkup(file);
	if (file.kind !== 'script') return file;
	try {
		file.ast = parse(text, { sourceType: 'module', errorRecovery: true, plugins: ['jsx', 'typescript'] }) as unknown as Node;
	} catch (error) {
		file.parseError = (error as Error).message;
		return file;
	}
	walk(file, file.ast, undefined, { inClassName: false, element: undefined });
	return file;
}

/**
 * Keeps only the styles of a markup file, blanking everything else (newlines stay, so offsets and lines still point
 * into the real file), and reads its class attributes as class tokens.
 */
function loadMarkup(file: SourceFile): SourceFile {
	const keep = new Uint8Array(file.text.length);
	const mark = (start: number, end: number) => keep.fill(1, start, end);
	for (const m of file.text.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) mark(m.index + m[0].indexOf('>') + 1, m.index + m[0].length - '</style>'.length);
	// A style attribute's closing quote becomes `;`, so its last declaration ends like one in a stylesheet.
	const semicolons = new Set<number>();
	for (const m of file.text.matchAll(/\sstyle\s*=\s*(["'])([\s\S]*?)\1/gi)) {
		// A swatch or type specimen shows its own value, printed beside it: content, as the converter treats it.
		if (specimen(m[2], file.text.slice(m.index + m[0].length, m.index + m[0].length + 600), file.text)) continue;
		const start = m.index + m[0].length - m[2].length - 1;
		mark(start, start + m[2].length);
		semicolons.add(start + m[2].length);
	}
	for (const m of file.text.matchAll(/\sclass\s*=\s*(["'])([^"']*)\1/gi)) file.classTokens.push(...splitClasses(m[2], m.index + m[0].length - m[2].length - 1));
	let styles = '';
	for (let i = 0; i < file.text.length; i++) styles += semicolons.has(i) ? ';' : keep[i] || file.text[i] === '\n' ? file.text[i] : ' ';
	return { ...file, kind: 'css', text: styles };
}

type WalkState = { inClassName: boolean; element?: Node; attr?: string; styleKey?: string };

function walk(file: SourceFile, node: Node, parent: Node | undefined, state: WalkState) {
	if (!node || typeof node.type !== 'string') return;
	file.parents.set(node, parent);
	let next = state;
	switch (node.type) {
		case 'ImportDeclaration':
			for (const spec of node.specifiers ?? []) {
				file.imports.push({
					local: spec.local.name,
					imported: spec.type === 'ImportDefaultSpecifier' ? 'default' : spec.type === 'ImportNamespaceSpecifier' ? '*' : spec.imported?.name ?? spec.imported?.value,
					source: node.source.value,
				});
			}
			return;
		case 'JSXElement':
			file.jsxElements.push(node);
			next = { ...state, element: node, inClassName: false, attr: undefined, styleKey: undefined };
			break;
		case 'JSXAttribute': {
			const name = node.name?.name;
			next = { ...state, attr: typeof name === 'string' ? name : undefined, inClassName: name === 'className' || name === 'class', styleKey: undefined };
			break;
		}
		case 'CallExpression':
			if (node.callee?.type === 'Identifier' && CLASS_HELPERS.has(node.callee.name)) next = { ...state, inClassName: true };
			break;
		case 'ObjectProperty':
			if (state.attr) next = { ...state, styleKey: node.key?.name ?? node.key?.value };
			break;
		case 'StringLiteral':
			recordString(file, node.value, node.start + 1, text(file, node), state);
			return;
		case 'TemplateElement':
			recordString(file, node.value.cooked ?? node.value.raw, node.start, node.value.raw, state);
			return;
		case 'JSXText': {
			const value = node.value as string;
			if (value.trim()) {
				const lead = value.length - value.trimStart().length;
				file.strings.push({ value: value.trim(), offset: node.start + lead, raw: value, context: 'jsx-text', element: state.element });
			}
			return;
		}
	}
	for (const key of Object.keys(node)) {
		if (key === 'loc' || key === 'start' || key === 'end' || key === 'leadingComments' || key === 'trailingComments' || key === 'innerComments' || key === 'extra') continue;
		const child = node[key];
		if (Array.isArray(child)) for (const c of child) walk(file, c, node, next);
		else if (child && typeof child === 'object' && typeof child.type === 'string') walk(file, child, node, next);
	}
}

const text = (file: SourceFile, node: Node) => file.text.slice(node.start, node.end);

function recordString(file: SourceFile, value: string, offset: number, raw: string, state: WalkState) {
	if (state.inClassName) {
		file.classTokens.push(...splitClasses(value, offset, state.element));
		file.strings.push({ value, offset, raw, context: 'className', element: state.element });
		return;
	}
	if (state.attr === 'style') {
		file.strings.push({ value, offset, raw, context: 'style', element: state.element, styleKey: state.styleKey });
		return;
	}
	if (state.attr && state.element) {
		file.strings.push({ value, offset, raw, context: 'jsx-attr', attr: state.attr, element: state.element, styleKey: state.styleKey });
		return;
	}
	file.strings.push({ value, offset, raw, context: 'code', styleKey: state.styleKey });
}

export function elementName(element: Node): string {
	const name = element.openingElement?.name;
	if (!name) return '';
	if (name.type === 'JSXIdentifier') return name.name;
	if (name.type === 'JSXMemberExpression') return `${name.object.name}.${name.property.name}`;
	return '';
}

export function jsxAttr(element: Node, attr: string): Node | undefined {
	return element.openingElement?.attributes?.find((a: Node) => a.type === 'JSXAttribute' && a.name?.name === attr);
}

export function literalAttr(element: Node, attr: string): string | undefined {
	const node = jsxAttr(element, attr);
	if (!node?.value) return undefined;
	if (node.value.type === 'StringLiteral') return node.value.value;
	if (node.value.type === 'JSXExpressionContainer' && node.value.expression.type === 'StringLiteral') return node.value.expression.value;
	return undefined;
}

export function importFor(file: SourceFile, local: string) {
	return file.imports.find((i) => i.local === local.split('.')[0]);
}
