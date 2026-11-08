import { existsSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { parse } from '@babel/parser';
import { walkFiles } from '../lib/glob.js';
import { brand } from '../lib/brand.js';
import { componentConfig, resolveAlias } from './config.js';
import type { Project } from '../project/detect.js';
import type { Writer } from './files.js';

const CHAKRA_PACKAGES = ['@chakra-ui/react', '@emotion/react'];
// The provider the CLI writes, named for the brand in brand.json (<Name>ChakraProvider).
const PROVIDER = () => `${brand().name.replace(/[^A-Za-z0-9]/g, '')}ChakraProvider`;
export const chakraPackages = () => CHAKRA_PACKAGES;
export const providerName = () => PROVIDER();

/** Next renders on the server: Emotion's styles are collected per render (@emotion/cache) so hydration matches. */
const packagesFor = (next: boolean) => (next ? [...CHAKRA_PACKAGES, '@emotion/cache'] : CHAKRA_PACKAGES);

export function missingChakraPackages(root: string, next = false) {
	let installed: Record<string, string> = {};
	try { const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')); installed = { ...pkg.dependencies, ...pkg.devDependencies }; } catch {}
	return packagesFor(next).filter(name => !installed[name] || (name === '@chakra-ui/react' && !/^(\^|~)?3\./.test(installed[name]))).map(name => `${name}${name === '@chakra-ui/react' ? '@3.37.0' : '@^11.14.0'}`);
}

/** The provider file: Chakra without its global reset, and in Next, an Emotion registry so server and client agree. */
function providerSource(tsx: boolean, next: boolean) {
	const t = (s: string) => (tsx ? s : '');
	if (!next) return `"use client";\n\nimport { ChakraProvider, createSystem, defaultConfig } from "@chakra-ui/react";\n\nconst brandSystem = createSystem(defaultConfig, { preflight: false });\n\nexport function ${PROVIDER()}({ children }${t(': { children: React.ReactNode }')}) {\n  return <ChakraProvider value={brandSystem}>{children}</ChakraProvider>;\n}\n`;
	return `"use client";

import * as React from "react";
import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import { ChakraProvider, createSystem, defaultConfig } from "@chakra-ui/react";
import { useServerInsertedHTML } from "next/navigation";

const brandSystem = createSystem(defaultConfig, { preflight: false });

// Chakra styles through Emotion, which writes <style> tags inline while the server renders and moves them on the
// client, so hydration would not match. Each server render's styles go to the head once, through Next.
function EmotionRegistry({ children }${t(': { children: React.ReactNode }')}) {
  const [registry] = React.useState(() => {
    const cache = createCache({ key: "ck" });
    cache.compat = true;
    const insert = cache.insert;
    let inserted${t(': string[]')} = [];
    cache.insert = (...args) => {
      const serialized = args[1];
      if (cache.inserted[serialized.name] === undefined) inserted.push(serialized.name);
      return insert(...args);
    };
    const flush = () => {
      const names = inserted;
      inserted = [];
      return names;
    };
    return { cache, flush };
  });
  useServerInsertedHTML(() => {
    const names = registry.flush();
    if (!names.length) return null;
    const styles = names.map((name) => registry.cache.inserted[name]).filter((style) => typeof style === "string").join("");
    return <style data-emotion={\`\${registry.cache.key} \${names.join(" ")}\`} dangerouslySetInnerHTML={{ __html: styles }} />;
  });
  return <CacheProvider value={registry.cache}>{children}</CacheProvider>;
}

export function ${PROVIDER()}({ children }${t(': { children: React.ReactNode }')}) {
  return (
    <EmotionRegistry>
      <ChakraProvider value={brandSystem}>{children}</ChakraProvider>
    </EmotionRegistry>
  );
}
`;
}

function moduleName(from: string, to: string) {
	const value = relative(dirname(from), to).split('\\').join('/');
	return value.startsWith('.') ? value : `./${value}`;
}

function addImport(source: string, spec: string) {
	if (source.includes(`from "${spec}"`) || source.includes(`from '${spec}'`)) return source;
	const imports = [...source.matchAll(/^import[\s\S]*?;\s*$/gm)];
	if (!imports.length) return `import { ${PROVIDER()} } from "${spec}";\n${source}`;
	const last = imports.at(-1)!;
	const end = last.index! + last[0].length;
	return `${source.slice(0, end)}\nimport { ${PROVIDER()} } from "${spec}";${source.slice(end)}`;
}

/** Set up Chakra once at the application root while leaving the app's Tailwind reset and theme in control. */
export function installChakraProvider(w: Writer, project: Project) {
	const config = componentConfig(w.root, project);
	const providerPath = `${relative(w.root, resolveAlias(w.root, `${config.aliases.ui}/provider`))}${config.tsx ? '.tsx' : '.jsx'}`;
	const existingProvider = w.read(providerPath);
	if (existingProvider && !existingProvider.includes(PROVIDER())) return { providerPath, warning: `${providerPath} already exists; merge ${PROVIDER()} into it before using Chakra components.` };
	// A provider this CLI wrote (any version) is brought up to date; one the app edited is kept as the app wrote it.
	const generated = [false, true].flatMap((next) => [providerSource(config.tsx, next), `"use client";\n\nimport { ChakraProvider, createSystem, defaultConfig } from "@chakra-ui/react";\n\nconst brandSystem = createSystem(defaultConfig, { preflight: false });\n\nexport function ${PROVIDER()}({ children }${config.tsx ? ': { children: React.ReactNode }' : ''}) {\n  return <ChakraProvider value={brandSystem}>{children}</ChakraProvider>;\n}\n`]);
	if (!existingProvider || generated.includes(existingProvider)) w.write(providerPath, providerSource(config.tsx, project.framework === 'next'));

	const layout = project.layouts.find(file => /\/layout\.(tsx|jsx|js)$/.test(`/${file}`));
	if (layout) {
		const source = w.read(layout) ?? '';
		const ast = parse(source, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
		let body: any;
		const visit = (node: any) => {
			if (!node || typeof node !== 'object') return;
			if (node.type === 'JSXElement' && node.openingElement.name?.type === 'JSXIdentifier' && node.openingElement.name.name === 'body' && node.closingElement) body = node;
			for (const [key, value] of Object.entries(node)) if (!['loc', 'comments', 'tokens'].includes(key)) {
				if (Array.isArray(value)) value.forEach(visit); else if (value && typeof value === 'object') visit(value);
			}
		};
		visit(ast);
		// Set up on an earlier run: nothing to wrap again.
		if (source.includes(PROVIDER())) return { providerPath, entry: layout };
		if (body) {
			const start = body.openingElement.end, end = body.closingElement.start;
			const wrapped = `${source.slice(0, start)}<${PROVIDER()}>${source.slice(start, end)}</${PROVIDER()}>${source.slice(end)}`;
			w.write(layout, addImport(wrapped, moduleName(layout, providerPath.replace(/\.(tsx|jsx)$/, ''))));
			return { providerPath, entry: layout };
		}
	}

	// Vite and React Router applications render their root from a createRoot(...).render(<App />) entry.
	const entries = walkFiles(w.root, ['**/*.{tsx,jsx,ts,js}'], ['**/node_modules/**', '**/.next/**', '**/dist/**', '**/build/**']);
	for (const entry of entries) {
		const source = w.read(entry);
		if (!source || !/createRoot\s*\(/.test(source) || !/\.render\s*\(/.test(source)) continue;
		const ast = parse(source, { sourceType: 'unambiguous', plugins: ['typescript', 'jsx'] });
		let root: any;
		const visit = (node: any) => {
			if (!node || typeof node !== 'object') return;
			if (node.type === 'CallExpression' && node.callee?.type === 'MemberExpression' && node.callee.property?.name === 'render') {
				const child = node.arguments?.[0];
				if (child?.type === 'JSXElement' || child?.type === 'JSXFragment') root = child;
			}
			for (const [key, value] of Object.entries(node)) if (!['loc', 'comments', 'tokens'].includes(key)) {
				if (Array.isArray(value)) value.forEach(visit); else if (value && typeof value === 'object') visit(value);
			}
		};
		visit(ast);
		if (source.includes(PROVIDER())) return { providerPath, entry };
		if (!root) continue;
		const wrapped = `${source.slice(0, root.start)}<${PROVIDER()}>${source.slice(root.start, root.end)}</${PROVIDER()}>${source.slice(root.end)}`;
		w.write(entry, addImport(wrapped, moduleName(entry, providerPath.replace(/\.(tsx|jsx)$/, ''))));
		return { providerPath, entry };
	}

	if (project.framework === 'astro') return { providerPath, warning: `Wrap the React island that uses ${brand().name} components in ${PROVIDER()}.` };
	if (existsSync(resolve(w.root, providerPath))) return { providerPath, warning: `Wrap the application root in ${PROVIDER()} to use Chakra components.` };
	return { providerPath, warning: `Add a React entry point, then wrap its root in ${PROVIDER()} to use Chakra components.` };
}
