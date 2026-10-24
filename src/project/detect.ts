import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { isOwnFile } from '../lib/brand.js';
import { walkFiles } from '../lib/glob.js';
import { readComponentConfig, tsConfig } from '../install/config.js';

// What kind of project this is, read from its files: stack, styling, where its main stylesheet and base layouts are.

export type Project = {
	root: string;
	framework: 'next' | 'astro' | 'nuxt' | 'sveltekit' | 'vite' | 'react' | 'static' | 'native' | 'other';
	typescript: boolean;
	tailwindMajor?: number;
	native?: string;
	packageManager: 'npm' | 'pnpm' | 'yarn' | 'bun';
	appDir?: string;
	srcDir: boolean;
	hasAlias: boolean;
	/** The stylesheet every page loads (where the brand stylesheet is imported). */
	mainStylesheet?: string;
	/** Files that wrap every page (<html> or <head>), where fonts and the dots script are loaded. */
	layouts: string[];
	/** Where static files are served from. */
	publicDir?: string;
};

export const STYLES = /\.(css|scss|sass|less|styl|pcss|postcss)$/;
export const MARKUP = /\.(astro|vue|svelte|html?|erb|php|hbs|handlebars|mustache|liquid|njk|jinja2?|j2|twig|ejs|cshtml|razor|heex|eex|gohtml|tmpl|jsp)$/;
export const SCRIPT = /\.(tsx|jsx|ts|js|mjs|cjs)$/;
export const NATIVE = /\.(swift|kt|kts|java|dart|xaml|cs|py|rb|go|rs|ex|exs|lua|m|mm)$/;
export const ANDROID_XML = /(^|\/)res\/(values[^/]*|layout[^/]*|drawable[^/]*|color[^/]*)\/[^/]+\.xml$/;
export const THEME_DATA = /(^|\/)[^/]*(theme|colou?rs|palette|tokens)[^/]*\.(json|ya?ml|toml)$/i;
const SKIP = /(^|\/)(\.?[\w-]+\.config\.[cm]?[jt]s|package(-lock)?\.json|tsconfig[^/]*\.json|[^/]*\.(min|d)\.[jt]s|[^/]*\.(test|spec|stories)\.[jt]sx?|[^/]*\.min\.css)$/;

export function nativePlatform(root: string) {
	const entries = readdirSync(root);
	if (existsSync(join(root, 'pubspec.yaml'))) return 'Flutter';
	if (existsSync(join(root, 'Package.swift')) || entries.some((f) => f.endsWith('.xcodeproj'))) return 'iOS (Swift)';
	if (['build.gradle', 'build.gradle.kts', 'settings.gradle', 'settings.gradle.kts'].some((f) => existsSync(join(root, f)))) return 'Android';
	if (entries.some((f) => /\.(csproj|sln)$/.test(f))) return '.NET';
	return undefined;
}

export function detectProject(root: string): Project {
	const pkg = existsSync(join(root, 'package.json')) ? JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) : {};
	const deps = { ...pkg.dependencies, ...pkg.devDependencies } as Record<string, string>;
	const native = nativePlatform(root);
	const framework: Project['framework'] = deps.next ? 'next' : deps.astro ? 'astro' : deps.nuxt ? 'nuxt' : deps['@sveltejs/kit'] ? 'sveltekit' : deps.vite ? 'vite' : deps.react ? 'react' : native ? 'native' : existsSync(join(root, 'index.html')) || readdirSync(root).some((f) => f.endsWith('.html')) ? 'static' : 'other';
	const tw = deps.tailwindcss ?? deps['@tailwindcss/postcss'] ?? deps['@tailwindcss/vite'];
	let tailwindMajor = tw ? Number(tw.match(/(\d+)/)?.[1]) || undefined : undefined;
	if (tw && !tailwindMajor) {
		try { tailwindMajor = Number(createRequire(join(root, 'package.json'))('tailwindcss/package.json').version.split('.')[0]); } catch {}
	}
	const config = readComponentConfig(root);
	const compiler = tsConfig(root);
	const appDir = ['src/app', 'app'].find((d) => existsSync(join(root, d)));
	const publicDir = ['public', 'static'].find((d) => existsSync(join(root, d))) ?? (existsSync(join(root, 'index.html')) ? '.' : undefined);
	const project: Project = {
		root,
		framework,
		typescript: config?.tsx ?? existsSync(join(root, 'tsconfig.json')),
		tailwindMajor,
		native,
		packageManager: /^(npm|pnpm|yarn|bun)@/.test(pkg.packageManager ?? '') ? pkg.packageManager.split('@')[0] : existsSync(join(root, 'pnpm-lock.yaml')) ? 'pnpm' : existsSync(join(root, 'yarn.lock')) ? 'yarn' : existsSync(join(root, 'bun.lockb')) || existsSync(join(root, 'bun.lock')) ? 'bun' : 'npm',
		appDir,
		srcDir: existsSync(join(root, 'src')),
		hasAlias: Object.keys(compiler?.config.compilerOptions?.paths ?? {}).length > 0,
		layouts: [],
		publicDir,
	};
	project.mainStylesheet = config?.tailwind.css || findMainStylesheet(root);
	project.layouts = findLayouts(root, project);
	return project;
}

/** The project's global stylesheet: the usual names, else the one holding its variables, else the one its pages link. */
export function findMainStylesheet(root: string): string | undefined {
	for (const p of ['src/app/globals.css', 'app/globals.css', 'src/styles/globals.css', 'src/styles/global.css', 'styles/globals.css', 'styles/global.css', 'src/index.css', 'src/styles.css', 'src/assets/main.css', 'src/app.css', 'assets/css/main.css']) if (existsSync(join(root, p))) return p;
	let best: { rel: string; vars: number } | undefined;
	for (const rel of walkFiles(root, ['**/*.{css,scss}'], ['**/node_modules/**'])) {
		if (rel.split('/').length > 5 || isOwnFile(rel)) continue;
		const css = readFileSync(join(root, rel), 'utf8');
		const vars = css.includes(':root') ? (css.match(/--[\w-]+\s*:/g) ?? []).length : 0;
		if (vars && (!best || vars > best.vars)) best = { rel, vars };
	}
	if (best) return best.rel;
	// A plain site: the stylesheet its pages link most (index.html counts double), wherever it lives.
	const linked = new Map<string, number>();
	for (const page of readdirSync(root).filter((f) => /\.html?$/.test(f))) {
		for (const m of readFileSync(join(root, page), 'utf8').matchAll(/<link\b[^>]*rel=["']?stylesheet[^>]*>/gi)) {
			const href = m[0].match(/href=["']([^"']+)["']/)?.[1];
			if (!href || /^(https?:)?\/\//.test(href)) continue;
			const rel = href.replace(/^\.?\//, '').split(/[?#]/)[0];
			if (!isOwnFile(rel) && existsSync(join(root, rel))) linked.set(rel, (linked.get(rel) ?? 0) + (page === 'index.html' ? 2 : 1));
		}
	}
	return [...linked].sort((a, b) => b[1] - a[1])[0]?.[0];
}

/** Base layouts: the Next root layout, and any template with a <head> (Astro layouts, plain pages, index.html). */
function findLayouts(root: string, project: Project): string[] {
	const out: string[] = [];
	if (project.appDir) for (const ext of ['tsx', 'jsx', 'js']) if (existsSync(join(root, `${project.appDir}/layout.${ext}`))) out.push(`${project.appDir}/layout.${ext}`);
	for (const doc of ['src/pages/_document.tsx', 'pages/_document.tsx', 'src/pages/_document.jsx', 'pages/_document.jsx']) if (existsSync(join(root, doc))) out.push(doc);
	for (const rel of walkFiles(root, ['**/*'], ['**/node_modules/**'])) {
		if (!MARKUP.test(rel) || SKIP.test(rel)) continue;
		if (/<\/head>/i.test(readFileSync(join(root, rel), 'utf8'))) out.push(rel);
	}
	return [...new Set(out)];
}

/** Every file whose styling the engine converts, in any language; the CLI's own files and tooling are left out. */
export function styledFiles(root: string): string[] {
	return walkFiles(root, ['**/*'], ['**/node_modules/**'])
		.filter((rel) => STYLES.test(rel) || MARKUP.test(rel) || SCRIPT.test(rel) || NATIVE.test(rel) || ANDROID_XML.test(rel) || THEME_DATA.test(rel))
		.filter((rel) => !isOwnFile(rel) && !SKIP.test(rel) && !/(^|\/)(scripts|tests?|__tests__|e2e|cypress|playwright|docs?\/ops|migrations?|seeds?)\//.test(rel));
}
