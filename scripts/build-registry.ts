// Builds the component library from registry/: validates every item's docs, works out its files and dependencies from
// its imports, adds the theme (from brand/tokens.css via build/), writes one JSON file per item (with its files'
// content) and an index into apps/www/public/r, type-checks every item and runs the value check over them.
// usage: tsx scripts/build-registry.ts
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { z } from 'zod';
import ts from 'typescript';
import { agentGuide } from '../src/lib/guide.js';
import { cli } from '../src/lib/brand.js';

const ROOT = new URL('..', import.meta.url).pathname;
const REG = join(ROOT, 'registry');
const brand = JSON.parse(readFileSync(join(ROOT, 'brand', 'brand.json'), 'utf8')) as { name: string; registryUrl: string };
const problems: string[] = [];

const TYPES = ['ui', 'site', 'product', 'visual', 'block', 'hook', 'lib'] as const;
const docsSchema = z.object({
	name: z.string().regex(/^[a-z0-9-]+$/),
	title: z.string(),
	type: z.enum(TYPES),
	surface: z.enum(['site', 'product', 'both']),
	description: z.string(),
	kinds: z.array(z.string()).default([]),
	use_for: z.string(),
	never: z.array(z.string()).default([]),
	source: z.string().optional(),
	files: z.array(z.string()).optional(),
	dependencies: z.array(z.string()).default([]),
});
type Docs = z.infer<typeof docsSchema>;

const DIR: Record<Docs['type'], string> = { ui: 'components/ui', site: 'components/site', product: 'components/product', visual: 'components/visuals', block: 'components/blocks', hook: 'hooks', lib: 'lib' };
const elementKinds = new Set(Object.values(JSON.parse(readFileSync(join(ROOT, 'brand', 'elements.json'), 'utf8')) as Record<string, Record<string, unknown>>).flatMap((g) => Object.keys(g)));

const docs: (Docs & { body: string; paths: string[] })[] = [];
for (const file of readdirSync(join(REG, 'docs')).filter((f) => f.endsWith('.md')).sort()) {
	const text = readFileSync(join(REG, 'docs', file), 'utf8');
	const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
	if (!m) {
		problems.push(`docs/${file}: no frontmatter`);
		continue;
	}
	let raw: unknown;
	try {
		raw = parse(m[1]);
	} catch (error) {
		problems.push(`docs/${file}: ${(error as Error).message.split('\n')[0]} (quote values that contain ": ")`);
		continue;
	}
	const parsed = docsSchema.safeParse(raw);
	if (!parsed.success) {
		problems.push(`docs/${file}: ${parsed.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`);
		continue;
	}
	const d = parsed.data;
	if (`${d.name}.md` !== file) problems.push(`docs/${file}: name is ${d.name}`);
	for (const k of d.kinds) if (!elementKinds.has(k)) problems.push(`${d.name}: kind ${k} is not in brand/elements.json`);
	const ext = d.type === 'hook' || d.type === 'lib' ? 'ts' : 'tsx';
	const paths = d.files ?? [`${DIR[d.type]}/${d.name === 'utils' ? 'utils' : d.name}.${ext}`];
	for (const p of paths) if (!existsSync(join(REG, p))) problems.push(`${d.name}: missing registry/${p}`);
	docs.push({ ...d, body: m[2].trim(), paths });
}

const byPath = new Map(docs.flatMap((d) => d.paths.map((p) => [p.replace(/\.(tsx?|css)$/, ''), d.name] as const)));
const IGNORED = new Set(['react', 'react-dom']);
function importsOf(name: string, paths: string[]) {
	const internal = new Set<string>();
	const npm = new Set<string>();
	for (const p of paths) {
		const text = readFileSync(join(REG, p), 'utf8');
		for (const m of text.matchAll(/(?:from|import)\s+["']([^"']+)["']/g)) {
			const spec = m[1];
			if (spec.startsWith('@/')) {
				const dep = byPath.get(spec.slice(2));
				if (!dep) problems.push(`${name}: imports ${spec}, which is not a registry item`);
				else if (dep !== name) internal.add(dep);
			} else if (!spec.startsWith('.')) {
				const pkg = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0];
				if (!IGNORED.has(pkg)) npm.add(pkg);
			}
		}
	}
	return { internal: [...internal], npm: [...npm] };
}

// The theme: the brand tokens and the Tailwind names that read them, so every item renders as the brand.
const tokensJson = JSON.parse(readFileSync(join(ROOT, 'build', 'tokens.json'), 'utf8')) as { site: Record<string, string>; product: Record<string, string>; dark: Record<string, string> };
const themeCss = readFileSync(join(ROOT, 'build', 'theme.css'), 'utf8');
const productOnly = Object.fromEntries(Object.entries(tokensJson.product).filter(([k, v]) => tokensJson.site[k] !== v));
const themeItem = {
	schemaVersion: 1,
	name: 'theme',
	type: 'theme',
	title: `${brand.name} theme`,
	description: `The ${brand.name} tokens and the Tailwind names that read them.`,
	surface: 'site',
	kinds: [] as string[],
	requires: [] as string[],
	packages: [] as string[],
	files: [
		{ path: 'styles/tokens.css', content: readFileSync(join(ROOT, 'build', 'tokens.css'), 'utf8') },
		{ path: 'styles/theme.css', content: themeCss },
	],
	tokens: { site: tokensJson.site, ...(Object.keys(productOnly).length ? { product: productOnly, dark: tokensJson.dark } : {}) },
};

function exportsOf(path: string, content: string) {
	const source = ts.createSourceFile(path, content, ts.ScriptTarget.Latest, true, path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
	const names = new Set<string>();
	for (const node of source.statements) {
		if (ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)) {
			for (const part of node.exportClause.elements) names.add(part.name.text);
		}
		if (ts.canHaveModifiers(node) && ts.getModifiers(node)?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
			if ('name' in node && node.name && ts.isIdentifier(node.name as ts.Node)) names.add((node.name as ts.Identifier).text);
			if (ts.isVariableStatement(node)) for (const decl of node.declarationList.declarations) if (ts.isIdentifier(decl.name)) names.add(decl.name.text);
		}
	}
	return [...names];
}

const index: Record<string, unknown>[] = [];
const items = [
	themeItem,
	...docs.map((d) => {
		const { internal, npm } = importsOf(d.name, d.paths);
		for (const dep of d.dependencies) if (!docs.some((x) => x.name === dep)) problems.push(`${d.name}: unknown dependency ${dep}`);
		const deps = [...new Set([...internal, ...d.dependencies])];
		const example = join(REG, 'examples', `${d.name}.tsx`);
		const exampleText = existsSync(example) ? readFileSync(example, 'utf8') : '';
		if (d.type !== 'lib' && d.type !== 'hook' && !exampleText) problems.push(`${d.name}: no registry/examples/${d.name}.tsx`);
		const exampleExports = exportsOf(example, exampleText);
		const exampleDeps = exampleText ? importsOf(d.name, [`examples/${d.name}.tsx`]) : { internal: [], npm: [] };
		const files = d.paths.map(p => ({ path: p, content: readFileSync(join(REG, p), 'utf8') }));
		const exports = [...new Set(files.flatMap(f => exportsOf(f.path, f.content)))];
		const client = files.some(f => /^['"]use client['"];?/m.test(f.content));
		index.push({ ...d, exports, client, dependencies: deps, npm, examples: exampleExports });
		return {
			schemaVersion: 1,
			name: d.name,
			useFor: d.use_for,
			constraints: d.never,
			documentation: d.body,
			source: d.source,
			exports, client,
			docsUrl: `${brand.registryUrl}/${d.type === "lib" || d.type === "hook" ? `r/${d.name}.md` : `components/${d.name}`}`,
			markdownUrl: `${brand.registryUrl}/r/${d.name}.md`,
			examples: exampleText ? [{ path: `examples/${d.name}.tsx`, content: exampleText, exports: exampleExports, requires: [d.name, ...exampleDeps.internal], packages: exampleDeps.npm, previews: exampleExports.map(name => ({ name, url: `${brand.registryUrl}/preview/${d.name}/${name}` })) }] : [],
			type: d.type,
			title: d.title,
			description: d.description,
			surface: d.surface,
			kinds: d.kinds,
			requires: [...(d.type === 'lib' ? [] : ['theme']), ...deps],
			packages: npm,
			files,
		};
	}),
];

if (problems.length) {
	console.error(problems.join('\n'));
	process.exit(1);
}
// One file per item with its content, and an index of them all, served by the docs site at /r.
const out = join(ROOT, 'apps', 'www', 'public', 'r');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const item of items) writeFileSync(join(out, `${item.name}.json`), `${JSON.stringify(item, null, 2)}\n`);
writeFileSync(
	join(out, 'index.json'),
	`${JSON.stringify({ schemaVersion: 1, name: brand.name, homepage: brand.registryUrl, guide: `${brand.registryUrl}/agents.md`, items: items.map(({ files: _files, ...item }) => { const { examples: _examples, documentation: _docs, ...entry } = item as typeof item & { examples?: unknown; documentation?: string }; return entry; }) }, null, 2)}\n`,
);
// Serve the same usage rules, examples and source to readers that cannot execute JavaScript.
const publicDir = join(ROOT, 'apps', 'www', 'public');
const guide = agentGuide();
writeFileSync(join(out, "audit.json"), readFileSync(join(ROOT, "brand/component-audit.json"), "utf8"));
writeFileSync(join(publicDir, 'agents.md'), `${guide}\n`);
writeFileSync(join(out, 'guide.json'), `${JSON.stringify({ schemaVersion: 1, name: brand.name, instructions: guide }, null, 2)}\n`);
const references = items.map(item => {
	const detail = item as typeof items[number] & { useFor?: string; constraints?: string[]; documentation?: string; exports?: string[]; client?: boolean; examples?: { path: string; content: string; requires: string[]; packages: string[]; previews: { name: string; url: string }[] }[] };
	const text = [
		`# ${item.title}`, item.description, '', `Install: ${cli()} add ${item.name}`,
		`Requires: ${item.requires.join(', ') || 'none'}`, `Packages: ${item.packages.join(', ') || 'none'}`,
		`Exports: ${detail.exports?.join(', ') || 'See source'}`, `Client boundary: ${detail.client ? 'yes' : 'not required by this entry file'}`,
		...(item.source ? [`Reference: ${item.source}`, ''] : []),
		'', '## Usage', detail.useFor ?? '', ...(detail.constraints ?? []).map(rule => `- Avoid: ${rule}`), detail.documentation ?? '',
		...(detail.examples?.length ? ['\n## Examples', ...detail.examples.flatMap(e => [`Example components: ${cli()} add ${e.requires.join(' ')}`, ...(e.packages.length ? [`Example packages: ${e.packages.join(', ')}`] : []), e.previews.map(p => `[${p.name}](${p.url})`).join(' | '), `\n${e.path}\n\n\`\`\`tsx\n${e.content}\n\`\`\``])] : []),
		'\n## Source', ...item.files.map(f => `\n${f.path}\n\n\`\`\`${f.path.endsWith('.css') ? 'css' : 'tsx'}\n${f.content}\n\`\`\``),
	].join('\n');
	writeFileSync(join(out, `${item.name}.md`), `${text}\n`);
	return text;
});
const catalog = `# ${brand.name} design system\n\n> Components, tokens and instructions for building ${brand.name} interfaces.\n\n## Start here\n\n- [Agent instructions](${brand.registryUrl}/agents.md): setup, choosing components, composing pages and verification.\n- [Registry JSON](${brand.registryUrl}/r/index.json): complete inventory including dependencies.\n- [Complete reference](${brand.registryUrl}/llms-full.txt): guide, examples and source for every item. Prefer individual references when possible.\n\n## Components and tokens\n\n${items.map(i => `- [${i.title}](${brand.registryUrl}/r/${i.name}.md): ${i.description}`).join('\n')}\n`;
writeFileSync(join(publicDir, 'llms.txt'), catalog);
writeFileSync(join(publicDir, 'llms-full.txt'), `${guide}\n\n${references.join('\n\n')}\n`);
writeFileSync(join(publicDir, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /preview/\nSitemap: ${brand.registryUrl}/sitemap.xml\n`);
const routes = ['', '/theme', '/components', ...docs.filter(d => d.type !== 'lib' && d.type !== 'hook').map(d => `/components/${d.name}`)];
writeFileSync(join(publicDir, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes.map(route => `<url><loc>${brand.registryUrl}${route}</loc></url>`).join('')}</urlset>\n`);
mkdirSync(join(ROOT, 'apps', 'www', 'lib'), { recursive: true });
writeFileSync(join(ROOT, 'apps', 'www', 'lib', 'registry-index.json'), `${JSON.stringify({ name: brand.name, url: brand.registryUrl, items: index }, null, 2)}\n`);
// The docs render every example from source: one static import per item that has one.
const withExamples = docs.filter((d) => existsSync(join(REG, 'examples', `${d.name}.tsx`)));
const ident = (n: string) => `ex_${n.replace(/-/g, '_')}`;
writeFileSync(
	join(ROOT, 'apps', 'www', 'lib', 'examples.generated.ts'),
	`// Written by scripts/build-registry.ts. Do not edit.\nimport type { ComponentType } from "react";\n\n${withExamples.map((d) => `import * as ${ident(d.name)} from "@/examples/${d.name}";`).join('\n')}\n\nexport const examples: Record<string, Record<string, ComponentType>> = {\n${withExamples.map((d) => `  "${d.name}": ${ident(d.name)},`).join('\n')}\n};\n`,
);

const run = (cmd: string, args: string[]) => spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8' });
const types = run('npx', ['tsc', '-p', 'tsconfig.registry.json']);
if (types.status !== 0) problems.push(`type errors in registry:\n${types.stdout}${types.stderr}`);
const check = run(process.execPath, ['bin.js', 'check', ...docs.flatMap((d) => d.paths.map((p) => `registry/${p}`)), ...readdirSync(join(REG, 'examples')).map((f) => `registry/examples/${f}`)]);
if (check.status !== 0) problems.push(`values that are not brand tokens:\n${check.stdout}${check.stderr}`);

if (problems.length) {
	console.error(problems.join('\n'));
	process.exit(1);
}
console.log(`registry: ${items.length} items (theme + ${docs.length}), types clean, every value a brand token. Wrote apps/www/public/r`);
