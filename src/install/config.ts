import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { getTsconfig } from 'get-tsconfig';
import { parse } from '@babel/parser';
import { brand, hasProduct } from '../lib/brand.js';
import type { Project } from '../project/detect.js';
import type { Writer } from './files.js';

export type ComponentConfig = {
	$schema?: string; style: string; rsc: boolean; tsx: boolean;
	tailwind: { config: string; css: string; baseColor: string; cssVariables: boolean; prefix?: string };
	aliases: { components: string; ui: string; utils: string; lib: string; hooks: string };
	registries?: Record<string, unknown>; [key: string]: unknown;
};

export const namespace = () => `@${brand().bin}`;
export const registryAddress = (surface = 'site') => `${brand().registryUrl}/r/${surface === 'product' && hasProduct() ? 'shadcn-product' : 'shadcn'}/{name}.json`;

export function readComponentConfig(root: string): ComponentConfig | undefined {
	const file = join(root, 'components.json');
	if (!existsSync(file)) return;
	let config: ComponentConfig;
	try { config = JSON.parse(readFileSync(file, 'utf8')); }
	catch { throw new Error('components.json is not valid JSON. Fix it before installing components.'); }
	if (!config.aliases?.components || !config.aliases?.utils || !config.tailwind?.css) throw new Error('components.json needs aliases.components, aliases.utils and tailwind.css.');
	return { ...config, aliases: { ...config.aliases, ui: config.aliases.ui ?? `${config.aliases.components}/ui`, lib: config.aliases.lib ?? dirname(config.aliases.utils), hooks: config.aliases.hooks ?? '@/hooks' } };
}

export function tsConfig(root: string) {
	return getTsconfig(root, existsSync(join(root, 'jsconfig.json')) && !existsSync(join(root, 'tsconfig.json')) ? 'jsconfig.json' : 'tsconfig.json');
}

export function componentConfig(root: string, project: Project): ComponentConfig {
	const existing = readComponentConfig(root);
	if (existing) return existing;
	const paths = tsConfig(root)?.config.compilerOptions?.paths ?? {};
	const prefix = Object.keys(paths).find(key => key === '@/*') ?? Object.keys(paths).find(key => key.endsWith('/*')) ?? '@/*';
	const alias = Object.keys(paths).length ? prefix.slice(0, -2) : project.srcDir ? './src' : '.';
	return {
		$schema: 'https://ui.shadcn.com/schema.json', style: 'new-york', rsc: project.framework === 'next', tsx: project.typescript,
		tailwind: { config: '', css: project.mainStylesheet ?? '', baseColor: 'neutral', cssVariables: true },
		aliases: { components: `${alias}/components`, ui: `${alias}/components/ui`, utils: `${alias}/lib/utils`, lib: `${alias}/lib`, hooks: `${alias}/hooks` },
	};
}

export function configureRegistry(w: Writer, project: Project, surface = w.json('.ds/config.json')?.surface ?? 'site') {
	const config = componentConfig(w.root, project);
	if (!config.tailwind.css || (project.tailwindMajor ?? 0) < 4) return config;
	config.registries = { ...config.registries, [namespace()]: registryAddress(surface) };
	w.write('components.json', `${JSON.stringify(config, null, 2)}\n`);
	return config;
}

export function resolveAlias(root: string, spec: string): string {
	const ts = tsConfig(root);
	const options = ts?.config.compilerOptions;
	const base = resolve(dirname(ts?.path ?? join(root, 'tsconfig.json')), options?.baseUrl ?? '.');
	for (const [key, values] of Object.entries(options?.paths ?? {}).sort(([a], [b]) => b.length - a.length)) {
		const star = key.indexOf('*');
		const matches = star < 0 ? key === spec : spec.startsWith(key.slice(0, star)) && spec.endsWith(key.slice(star + 1));
		if (!matches || !values[0]) continue;
		const rest = star < 0 ? '' : spec.slice(star, spec.length - (key.length - star - 1));
		return resolve(base, values[0].replace('*', rest));
	}
	if (spec.startsWith('.')) return resolve(root, spec);
	throw new Error(`Cannot resolve alias "${spec}". Configure it in tsconfig.json/jsconfig.json. For workspace package imports, use shadcn add ${namespace()}/<component>.`);
}

export function mapImport(spec: string, config: ComponentConfig) {
	if (spec === '@/lib/utils') return `${config.aliases.lib}/${brand().bin}-utils`;
	for (const [from, to] of [['@/components/ui', config.aliases.ui], ['@/components', config.aliases.components], ['@/lib', config.aliases.lib], ['@/hooks', config.aliases.hooks]]) {
		if (spec === from || spec.startsWith(`${from}/`)) return to + spec.slice(from.length);
	}
	return spec;
}

let toJavaScript: ((content: string, path: string) => string) | undefined;

/** Load the transformer only for JavaScript installs; discovery and TypeScript installs stay lightweight. */
export async function prepareTransforms(config: ComponentConfig) {
 if (config.tsx || toJavaScript) return;
 const [{ transformSync }, { default: stripTypes }] = await Promise.all([import('@babel/core'), import('@babel/plugin-transform-typescript')]);
 toJavaScript = (content, path) => transformSync(content, { filename: path, configFile: false, babelrc: false, plugins: [[stripTypes, { isTSX: path.endsWith('.tsx'), allowDeclareFields: true }]] })?.code ?? content;
}

export function componentFile(root: string, file: { path: string; content: string }, config: ComponentConfig, outputPath?: string) {
	if (!/^(components|lib|hooks)\//.test(file.path) || file.path.split(/[\\/]/).includes('..')) throw new Error(`Invalid component path: ${file.path}`);
	const spec = mapImport(`@/${file.path.replace(/\.[jt]sx?$/, '')}`, config);
	let target = resolveAlias(root, spec) + (file.path.endsWith('.tsx') ? '.tsx' : '.ts');
	if (outputPath && file.path.startsWith('components/')) target = resolve(root, outputPath, file.path.replace(/^components\/(?:ui\/)?/, ''));
	const rel = relative(root, target);
	if (isAbsolute(rel) || rel === '..' || rel.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`)) throw new Error('This component targets a shared workspace. Use the shadcn registry command so its dependencies are installed in the correct workspace.');
	let content = file.content;
	const ast = parse(content, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
	const edits: { start: number; end: number; value: string }[] = [];
	const visit = (node: any) => {
		if (!node || typeof node !== 'object') return;
		let source: any;
		if (['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration'].includes(node.type)) source = node.source;
		if (node.type === 'CallExpression' && (node.callee?.type === 'Import' || node.callee?.name === 'require')) source = node.arguments?.[0];
		if (source?.type === 'StringLiteral') {
			let mapped = mapImport(source.value, config);
			if (mapped.startsWith('.') && source.value.startsWith('@/')) {
				const destination = resolveAlias(root, mapped);
				mapped = relative(dirname(target), destination).split('\\').join('/');
				if (!mapped.startsWith('.')) mapped = `./${mapped}`;
			}
			if (outputPath && source.value.startsWith('@/components/')) {
				const destination = resolve(root, outputPath, source.value.replace(/^@\/components\/(?:ui\/)?/, ''));
				mapped = relative(dirname(target), destination).split('\\').join('/');
				if (!mapped.startsWith('.')) mapped = `./${mapped}`;
			}
			if (mapped !== source.value) edits.push({ start: source.start, end: source.end, value: JSON.stringify(mapped) });
		}
		for (const [key, value] of Object.entries(node)) if (!['loc', 'comments', 'tokens'].includes(key)) {
			if (Array.isArray(value)) value.forEach(visit); else if (value && typeof value === 'object') visit(value);
		}
	};
	visit(ast);
	for (const edit of edits.sort((a, b) => b.start - a.start)) content = content.slice(0, edit.start) + edit.value + content.slice(edit.end);
	if (!config.tsx) {
		// Import the plugin explicitly so the compiled release never resolves it from the consuming app.
		if (!toJavaScript) throw new Error('Prepare JavaScript transforms before resolving component files.');
		content = toJavaScript(content, file.path);
	}
	return { path: config.tsx ? rel : rel.replace(/\.tsx$/, '.jsx').replace(/\.ts$/, '.js'), content: `${content.trimEnd()}\n` };
}

