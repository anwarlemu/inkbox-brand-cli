import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from '@babel/parser';
import { matchName, suggest } from '../lib/names.js';
import { pkgPath } from '../lib/paths.js';
import { loadIndexSync, loadItemSync, type RegistryItem } from './registry.js';

type Ast = { type: string; start?: number; end?: number; [key: string]: any };

const SKIP = new Set(['loc', 'range', 'leadingComments', 'trailingComments', 'innerComments', 'extra']);

const DIR: Record<string, string> = {
	ui: 'components/ui',
	site: 'components/site',
	product: 'components/product',
	visual: 'components/visuals',
	block: 'components/blocks',
	hook: 'hooks',
	lib: 'lib',
};

export type PropSpec = { name: string; kind: 'enum' | 'boolean'; values: string[]; default?: string };

type ComponentSpec = { exportName: string; props: PropSpec[] };

type LibraryItem = {
	name: string;
	title: string;
	description: string;
	type: string;
	surface: string;
	useFor: string;
	constraints: string[];
	reference?: string;
	exports: string[];
	source: string;
	example: string;
};

function walk(node: Ast | null | undefined, visit: (node: Ast) => void) {
	if (!node || typeof node.type !== 'string') return;
	visit(node);
	for (const [key, value] of Object.entries(node)) {
		if (SKIP.has(key)) continue;
		if (Array.isArray(value)) {
			for (const item of value) if (item && typeof item.type === 'string') walk(item, visit);
		} else if (value && typeof value.type === 'string') walk(value, visit);
	}
}

function propKey(prop: Ast): string | undefined {
	if (prop.key?.type === 'Identifier' && !prop.computed) return prop.key.name;
	if (prop.key?.type === 'StringLiteral') return prop.key.value;
	return undefined;
}

function objectProp(obj: Ast | undefined, name: string): Ast | undefined {
	if (!obj || obj.type !== 'ObjectExpression') return undefined;
	for (const prop of obj.properties ?? []) {
		if (prop.type === 'ObjectProperty' && propKey(prop) === name) return prop.value;
	}
	return undefined;
}

function stringValue(node: Ast | undefined) {
	if (node?.type === 'StringLiteral') return node.value as string;
	return undefined;
}

function cvaProps(call: Ast): PropSpec[] {
	const arg = call.arguments?.[1] as Ast | undefined;
	const variants = objectProp(arg, 'variants');
	const defaults = objectProp(arg, 'defaultVariants');
	if (!variants || variants.type !== 'ObjectExpression') return [];
	const props: PropSpec[] = [];
	for (const prop of variants.properties ?? []) {
		if (prop.type !== 'ObjectProperty' || prop.value?.type !== 'ObjectExpression') continue;
		const name = propKey(prop);
		if (!name) continue;
		const values = (prop.value.properties as Ast[])
			.filter((item) => item.type === 'ObjectProperty')
			.map((item) => propKey(item))
			.filter((item): item is string => !!item);
		const fallback = stringValue(objectProp(defaults, name));
		props.push({ name, kind: 'enum', values, ...(fallback ? { default: fallback } : {}) });
	}
	return props;
}

function parseTs(source: string) {
	return parse(source, { sourceType: 'module', plugins: ['typescript', 'jsx'] }) as unknown as Ast;
}

function aliasesOf(ast: Ast) {
	const aliases = new Map<string, Ast>();
	walk(ast, (node) => {
		if (node.type === 'TSTypeAliasDeclaration' && node.id?.type === 'Identifier' && node.typeAnnotation) aliases.set(node.id.name, node.typeAnnotation);
	});
	return aliases;
}

function resolveAlias(node: Ast | undefined, aliases: Map<string, Ast>): Ast | undefined {
	if (!node || node.type !== 'TSTypeReference') return undefined;
	const name = node.typeName?.type === 'Identifier' ? node.typeName.name : undefined;
	if (!name) return undefined;
	return aliases.get(name);
}

function literalUnion(node: Ast | undefined, aliases: Map<string, Ast>, seen = new Set<string>()): string[] | undefined {
	if (!node) return undefined;
	if (node.type === 'TSParenthesizedType') return literalUnion(node.typeAnnotation, aliases, seen);
	if (node.type === 'TSLiteralType' && node.literal?.type === 'StringLiteral') return [node.literal.value];
	if (node.type === 'TSTypeReference') {
		const name = node.typeName?.type === 'Identifier' ? node.typeName.name : '';
		if (!name || seen.has(name)) return undefined;
		seen.add(name);
		return literalUnion(resolveAlias(node, aliases), aliases, seen);
	}
	if (node.type === 'TSUnionType') {
		const values: string[] = [];
		for (const part of node.types as Ast[]) {
			if (part.type === 'TSUndefinedKeyword' || part.type === 'TSNullKeyword') continue;
			const nested = literalUnion(part, aliases, seen);
			if (!nested) return undefined;
			values.push(...nested);
		}
		return values.length ? [...new Set(values)] : undefined;
	}
	return undefined;
}

function propsFromType(node: Ast | undefined, aliases: Map<string, Ast>, into: Map<string, PropSpec>, seen = new Set<string>()) {
	if (!node) return;
	if (node.type === 'TSParenthesizedType') return propsFromType(node.typeAnnotation, aliases, into, seen);
	if (node.type === 'TSIntersectionType' || node.type === 'TSUnionType') {
		for (const part of node.types as Ast[]) propsFromType(part, aliases, into, seen);
		return;
	}
	if (node.type === 'TSTypeReference') {
		const name = node.typeName?.type === 'Identifier' ? node.typeName.name : '';
		if (!name || seen.has(name)) return;
		const alias = aliases.get(name);
		if (!alias) return;
		seen.add(name);
		propsFromType(alias, aliases, into, seen);
		return;
	}
	if (node.type !== 'TSTypeLiteral') return;
	for (const member of (node.members ?? []) as Ast[]) {
		if (member.type !== 'TSPropertySignature') continue;
		const name = member.key?.type === 'Identifier' ? member.key.name : member.key?.type === 'StringLiteral' ? member.key.value : undefined;
		if (!name || into.has(name)) continue;
		const typeNode = member.typeAnnotation?.typeAnnotation as Ast | undefined;
		const values = literalUnion(typeNode, aliases);
		if (values) into.set(name, { name, kind: 'enum', values });
		else if (typeNode?.type === 'TSBooleanKeyword') into.set(name, { name, kind: 'boolean', values: ['true', 'false'] });
	}
}

function patternDefaults(pattern: Ast | undefined) {
	const defaults = new Map<string, string>();
	if (pattern?.type !== 'ObjectPattern') return defaults;
	for (const prop of (pattern.properties ?? []) as Ast[]) {
		if (prop.type !== 'ObjectProperty' || prop.value?.type !== 'AssignmentPattern') continue;
		const id = prop.value.left?.type === 'Identifier' ? prop.value.left.name : undefined;
		const right = prop.value.right as Ast | undefined;
		if (!id) continue;
		if (right?.type === 'StringLiteral' && right.value) defaults.set(id, right.value);
		if (right?.type === 'BooleanLiteral') defaults.set(id, String(right.value));
	}
	return defaults;
}

function functionsOf(ast: Ast) {
	const functions = new Map<string, Ast>();
	walk(ast, (node) => {
		if (node.type === 'FunctionDeclaration' && node.id?.type === 'Identifier') functions.set(node.id.name, node);
		if ((node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') && node.id?.type === 'Identifier') functions.set(node.id.name, node);
	});
	walk(ast, (node) => {
		if (node.type !== 'VariableDeclarator' || node.id?.type !== 'Identifier') return;
		if (node.init?.type === 'ArrowFunctionExpression' || node.init?.type === 'FunctionExpression') functions.set(node.id.name, node.init);
	});
	return functions;
}

function exportedNames(ast: Ast) {
	const names: string[] = [];
	walk(ast, (node) => {
		if (node.type === 'ExportNamedDeclaration' && node.declaration?.type === 'FunctionDeclaration' && node.declaration.id?.name) names.push(node.declaration.id.name);
		if (node.type === 'ExportNamedDeclaration' && node.declaration?.type === 'VariableDeclaration') {
			for (const decl of node.declaration.declarations ?? []) if (decl.id?.type === 'Identifier') names.push(decl.id.name);
		}
		if (node.type === 'ExportNamedDeclaration' && node.specifiers) {
			for (const spec of node.specifiers) if (spec.exported?.type === 'Identifier') names.push(spec.exported.name);
		}
	});
	return [...new Set(names)];
}

function referencedCva(fn: Ast, cvas: Map<string, PropSpec[]>) {
	const used = new Map<string, PropSpec>();
	walk(fn.body, (node) => {
		if (node.type === 'Identifier' && cvas.has(node.name)) {
			for (const prop of cvas.get(node.name) ?? []) if (!used.has(prop.name)) used.set(prop.name, { ...prop });
		}
	});
	return used;
}

function componentSpecs(source: string): { exports: string[]; components: ComponentSpec[] } {
	if (!source.trim()) return { exports: [], components: [] };
	const ast = parseTs(source);
	const aliases = aliasesOf(ast);
	const cvas = new Map<string, PropSpec[]>();
	walk(ast, (node) => {
		if (node.type !== 'VariableDeclarator' || node.id?.type !== 'Identifier') return;
		if (node.init?.type === 'CallExpression' && node.init.callee?.type === 'Identifier' && node.init.callee.name === 'cva') cvas.set(node.id.name, cvaProps(node.init));
	});
	const functions = functionsOf(ast);
	const names = exportedNames(ast);
	const components: ComponentSpec[] = [];
	for (const exportName of names) {
		const fn = functions.get(exportName);
		if (!fn || !/^[A-Z]/.test(exportName)) continue;
		const props = referencedCva(fn, cvas);
		const param = fn.params?.[0] as Ast | undefined;
		propsFromType(param?.typeAnnotation?.typeAnnotation, aliases, props);
		for (const [name, value] of patternDefaults(param)) {
			const existing = props.get(name);
			if (existing && !existing.default) existing.default = value;
			else if (!existing && (value === 'true' || value === 'false')) props.set(name, { name, kind: 'boolean', values: ['true', 'false'], default: value });
		}
		components.push({ exportName, props: [...props.values()] });
	}
	return { exports: names, components };
}

function frontmatter(text: string) {
	const match = text.match(/^---\n([\s\S]*?)\n---\n?/);
	if (!match) throw new Error('Component docs have no frontmatter.');
	const data: Record<string, string | string[]> = {};
	for (const line of match[1].split('\n')) {
		const pair = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
		if (!pair) continue;
		const raw = pair[2].trim();
		if (raw.startsWith('[') && raw.endsWith(']')) {
			const inner = raw.slice(1, -1).trim();
			data[pair[1]] = !inner ? [] : inner.includes('"') ? [...inner.matchAll(/"([^"]*)"/g)].map((item) => item[1]) : inner.split(',').map((item) => item.trim()).filter(Boolean);
		}
		else if (raw.startsWith('"') && raw.endsWith('"')) data[pair[1]] = raw.slice(1, -1);
		else data[pair[1]] = raw;
	}
	return data;
}

function stringField(value: string | string[] | undefined) {
	return typeof value === 'string' ? value : '';
}

function listField(value: string | string[] | undefined) {
	return Array.isArray(value) ? value : [];
}

function fromSource(name: string): LibraryItem | undefined {
	const docsPath = pkgPath('registry', 'docs', `${name}.md`);
	if (!existsSync(docsPath)) return undefined;
	const meta = frontmatter(readFileSync(docsPath, 'utf8'));
	const type = stringField(meta.type) || 'ui';
	const ext = type === 'hook' || type === 'lib' ? 'ts' : 'tsx';
	const declared = listField(meta.files);
	const relative = declared[0] ?? `${DIR[type] ?? 'components/ui'}/${name}.${ext}`;
	const sourcePath = pkgPath('registry', relative);
	if (!existsSync(sourcePath)) throw new Error(`Component ${name} is missing registry/${relative}.`);
	const examplePath = pkgPath('registry', 'examples', `${name}.tsx`);
	return {
		name: stringField(meta.name) || name,
		title: stringField(meta.title) || name,
		description: stringField(meta.description),
		type,
		surface: stringField(meta.surface) || 'site',
		useFor: stringField(meta.use_for),
		constraints: listField(meta.never),
		reference: stringField(meta.source) || undefined,
		exports: [],
		source: readFileSync(sourcePath, 'utf8'),
		example: existsSync(examplePath) ? readFileSync(examplePath, 'utf8') : '',
	};
}

function fromRegistry(item: RegistryItem): LibraryItem {
	return {
		name: item.name,
		title: item.title ?? item.name,
		description: item.description ?? '',
		type: item.type,
		surface: item.surface ?? 'site',
		useFor: item.useFor ?? '',
		constraints: item.constraints ?? [],
		reference: item.source,
		exports: item.exports ?? [],
		source: (item.files ?? []).map((file) => file.content).join('\n'),
		example: item.examples?.[0]?.content ?? '',
	};
}

function sourceNames() {
	const dir = pkgPath('registry', 'docs');
	if (!existsSync(dir)) return [];
	return readdirSync(dir)
		.filter((file) => file.endsWith('.md'))
		.map((file) => file.replace(/\.md$/, ''))
		.sort();
}

function knownNames() {
	const fromDocs = sourceNames();
	if (fromDocs.length) return fromDocs;
	return loadIndexSync().map((item) => item.name);
}

function loadLibraryItem(name: string): LibraryItem {
	const names = knownNames();
	const resolved = matchName(name, names);
	if (!resolved) {
		const close = suggest(name, names);
		throw new Error(`Unknown component "${name}".${close.length ? ` Did you mean ${close.join(', ')}?` : ''} \`components list --json\` lists every component.`);
	}
	if (existsSync(pkgPath('registry', 'docs', `${resolved}.md`))) {
		const item = fromSource(resolved);
		if (item) return item;
	}
	const stored = loadItemSync(resolved);
	if (stored) return fromRegistry(stored);
	throw new Error(`Component "${resolved}" is listed but its source could not be read.`);
}

let listCache: ReturnType<typeof listItems> | undefined;

function listItems() {
	const names = knownNames();
	return names.map((name) => {
		const item = loadLibraryItem(name);
		const parsed = componentSpecs(item.source);
		return {
			name: item.name,
			title: item.title,
			description: item.description,
			type: item.type,
			surface: item.surface,
			exports: parsed.exports.length ? parsed.exports : item.exports,
		};
	});
}

export function listComponents() {
	listCache ??= listItems();
	return { ok: true as const, items: listCache, count: listCache.length };
}

function primaryName(itemName: string, components: ComponentSpec[]) {
	const target = itemName.replace(/-/g, '').toLowerCase();
	return components.find((item) => item.exportName.toLowerCase() === target)?.exportName ?? components[0]?.exportName;
}

function exampleStates(example: string) {
	if (!example.trim()) return [];
	const ast = parseTs(example);
	const functions = functionsOf(ast);
	const order = exportedNames(ast).filter((name) => functions.has(name));
	return order.map((name) => {
		const node = functions.get(name)!;
		const code = example.slice(node.start ?? 0, node.end ?? 0);
		return { name, code };
	});
}

export function inspectComponent(name: string) {
	const item = loadLibraryItem(name);
	const parsed = componentSpecs(item.source);
	const states = exampleStates(item.example).map((state) => ({ name: state.name }));
	return {
		ok: true as const,
		name: item.name,
		title: item.title,
		description: item.description,
		type: item.type,
		surface: item.surface,
		useFor: item.useFor,
		constraints: item.constraints,
		reference: item.reference ?? null,
		exports: parsed.exports.length ? parsed.exports : item.exports,
		primary: primaryName(item.name, parsed.components) ?? null,
		components: parsed.components,
		states,
		note: 'Props are the variant enums, string unions and booleans declared in the component source. States are the exported example functions. DOM props that the source only spreads through are not listed.',
	};
}

function matchState(states: { name: string; code: string }[], requested: string | undefined) {
	if (!states.length) return undefined;
	if (!requested) return states.find((state) => state.name === 'Preview') ?? states[0];
	const exact = states.find((state) => state.name === requested);
	if (exact) return exact;
	const folded = states.find((state) => state.name.toLowerCase() === requested.toLowerCase());
	if (folded) return folded;
	throw new Error(`Unknown state "${requested}". Use ${states.map((state) => state.name).join(', ')}.`);
}

export type EmitOptions = { state?: string; set?: Record<string, string>; exportName?: string };

function usageJsx(exportName: string, props: { name: string; kind: 'enum' | 'boolean'; value: string }[]) {
	if (!props.length) return `<${exportName} />`;
	const attrs = props.map((prop) => (prop.kind === 'boolean' ? `${prop.name}={${prop.value}}` : `${prop.name}="${prop.value}"`)).join(' ');
	return `<${exportName} ${attrs} />`;
}

export function emitComponent(name: string, options: EmitOptions = {}) {
	const item = loadLibraryItem(name);
	const parsed = componentSpecs(item.source);
	const chosenName = options.exportName
		? parsed.components.find((component) => component.exportName.toLowerCase() === options.exportName!.toLowerCase())?.exportName
		: primaryName(item.name, parsed.components);
	if (options.exportName && !chosenName) {
		const names = parsed.components.map((component) => component.exportName);
		throw new Error(`Unknown export "${options.exportName}" on ${item.name}.${names.length ? ` Use ${names.join(', ')}.` : ''}`);
	}
	const component = parsed.components.find((entry) => entry.exportName === chosenName);
	const set = options.set ?? {};
	const ordered: { name: string; kind: 'enum' | 'boolean'; value: string }[] = [];
	for (const [key, value] of Object.entries(set)) {
		const prop = component?.props.find((item) => item.name === key);
		if (!prop) {
			const listed = component?.props.map((item) => item.name) ?? [];
			throw new Error(`Unknown prop "${key}" on ${chosenName ?? item.name}.${listed.length ? ` Props: ${listed.join(', ')}.` : ' This export declares no enumerated props.'}`);
		}
		if (!prop.values.includes(value)) {
			throw new Error(`Unknown ${key} "${value}" on ${chosenName ?? item.name}. Use ${prop.values.join(', ')}.`);
		}
	}
	for (const prop of component?.props ?? []) {
		if (set[prop.name] !== undefined) ordered.push({ name: prop.name, kind: prop.kind, value: set[prop.name] });
	}
	const states = exampleStates(item.example);
	const state = matchState(states, options.state);
	if (options.state && !state) throw new Error(`${item.name} has no example states.`);
	const imports = item.example
		.split('\n')
		.filter((line) => /^\s*import\s/.test(line))
		.join('\n');
	return {
		ok: true as const,
		name: item.name,
		export: chosenName ?? null,
		state: state?.name ?? null,
		code: state?.code ?? (item.example ? null : item.source || null),
		imports,
		usage: chosenName ? { jsx: usageJsx(chosenName, ordered), props: Object.fromEntries(ordered.map((prop) => [prop.name, prop.value])) } : null,
		states: states.map((item) => item.name),
		note: state
			? 'code is the example function, copied from the registry. usage only contains props you set that the component declares. Replace the example copy with the product\'s own words.'
			: 'This item has no example file. code is the registry source, unchanged.',
	};
}
