import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import { isOwnFile } from '../lib/brand.js';
import type { Project } from './detect.js';
import { type Profile, type Surface, surfaceOf } from './surface.js';

// The screens of a project (its routes or pages) and the files each one is drawn from, so a task can name exactly
// what to restyle. The shared shell (layouts, header, footer, navigation) is the first task.

export type Screen = { id: string; url?: string; file: string; surface: Surface; files: string[] };

const ROUTE_FILES: [RegExp, (m: RegExpMatchArray) => string][] = [
	// Next app router: app/(group)/pricing/page.tsx is /pricing
	[/^(?:src\/)?app\/(.*?)\/?page\.(?:tsx|jsx|js|mdx)$/, (m) => `/${m[1]}`],
	// Next pages router, Nuxt, Astro: pages/pricing.tsx, src/pages/pricing.astro
	[/^(?:src\/)?pages\/(?!_|api\/)(.*?)\.(?:tsx|jsx|js|vue|astro|md|mdx|svelte)$/, (m) => `/${m[1].replace(/(^|\/)index$/, '')}`],
	// SvelteKit
	[/^src\/routes\/(.*?)\/?\+page\.svelte$/, (m) => `/${m[1]}`],
	// Plain sites: any page at the top or one folder down
	[/^((?:[^/]+\/)?[^/]+)\.html?$/, (m) => (/(^|\/)index$/.test(m[1]) ? `/${m[1].replace(/(^|\/)?index$/, '')}` : `/${m[1]}.html`)],
];

const tidy = (url: string) => (url.replace(/\/\([^)]*\)/g, '').replace(/\/+/g, '/').replace(/(.)\/$/, '$1') || '/');

/** The project's screens, home first, then by depth; dynamic routes ([slug]) count once. */
export function listScreens(project: Project, files: string[], profileResult: Profile): Screen[] {
	const out: Screen[] = [];
	// A Vite or plain React app routes in code (react-router): its pages/ folder and index.html are not routes.
	const routed = ['vite', 'react'].includes(project.framework) ? codeRoutes(project, files) : [];
	for (const r of routed) out.push({ id: r.url, url: r.url, file: r.file, surface: surfaceOf(r.file, profileResult), files: [] });
	const spa = ['vite', 'react'].includes(project.framework);
	for (const rel of files) {
		if (/(^|\/)(node_modules|public|dist|build|static)\//.test(rel) && !/^[^/]+\.html?$/.test(rel)) continue;
		if (spa && (routed.length || /(^|\/)pages\//.test(rel)) && (/\.html?$/.test(rel) || /(^|\/)pages\//.test(rel))) continue;
		for (const [re, url] of ROUTE_FILES) {
			const m = rel.match(re);
			if (!m) continue;
			const path = tidy(url(m));
			if (out.some((s) => s.url === path)) break;
			out.push({ id: path, url: path, file: rel, surface: surfaceOf(rel, profileResult), files: [] });
			break;
		}
		if (/(Screen|View|Page)\.(swift|kt|dart)$/.test(rel)) out.push({ id: rel.split('/').pop()!.replace(/\.\w+$/, ''), file: rel, surface: surfaceOf(rel, profileResult), files: [] });
	}
	// A Next app whose home is a rewrite (source '/' to destination '/x') starts from that page.
	const config = ['next.config.ts', 'next.config.js', 'next.config.mjs'].map((f) => join(project.root, f)).find(existsSync);
	const home = config ? readFileSync(config, 'utf8').match(/source:\s*["']\/["'][^}]*?destination:\s*["'](\/[^"']*)["']/)?.[1] : undefined;
	// Error pages (404, 500, error) come last: they are rarely what a person judges a restyle by.
	const isError = (s: Screen) => /(^|\/)(404|500|_?error|not-found)(\.html?)?$/i.test(s.url ?? s.id);
	const depth = (s: Screen) => (s.url === '/' || (home && s.url === home) ? -1 : (isError(s) ? 100 : 0) + (s.url ?? s.id).split('/').length + ((s.url ?? '').includes('[') ? 2 : 0));
	out.sort((a, b) => depth(a) - depth(b) || a.id.localeCompare(b.id));
	for (const s of out) s.files = drawnFrom(project, s.file, files).filter((f) => !isOwnFile(f));
	return out;
}

const IMPORT = /(?:import\s[^'"]*?from\s*|import\s*\(?\s*|require\(\s*|@import\s+(?:url\()?\s*|<link[^>]*href=|src=|\bfrom\s+)["']([^"']+)["']/g;

/** A screen's file and the local files it imports (components, partials, its stylesheets), two levels deep. */
export function drawnFrom(project: Project, entry: string, files: string[], depth = 2): string[] {
	const known = new Set(files);
	const seen = new Set<string>([entry]);
	let frontier = [entry];
	for (let level = 0; level < depth; level++) {
		const next: string[] = [];
		for (const rel of frontier) {
			let text = '';
			try {
				text = readFileSync(join(project.root, rel), 'utf8');
			} catch {
				continue;
			}
			for (const m of text.matchAll(IMPORT)) {
				const target = resolveImport(project, rel, m[1].split(/[?#]/)[0], known);
				if (target && !seen.has(target)) {
					seen.add(target);
					next.push(target);
				}
			}
		}
		frontier = next;
	}
	return [...seen];
}

function resolveImport(project: Project, from: string, spec: string, known: Set<string>): string | undefined {
	let base: string | undefined;
	if (spec.startsWith('.')) base = normalize(join(dirname(from), spec));
	else if (spec.startsWith('@/') || spec.startsWith('~/')) base = `${project.srcDir ? 'src/' : ''}${spec.slice(2)}`;
	else if (spec.startsWith('/')) base = spec.slice(1);
	// A page's href="styles.css" or src="app.js" is relative to the page (a script's bare import is a package).
	else if (/\.(html?|astro|vue|svelte|erb|php|hbs|liquid|njk|twig)$/.test(from) && !/^[a-z][\w+.-]*:|^#/i.test(spec)) base = normalize(join(dirname(from), spec));
	if (!base) return undefined;
	const candidates = [base, ...['.tsx', '.ts', '.jsx', '.js', '.astro', '.vue', '.svelte', '.css', '.scss', '.html'].map((e) => base + e), ...['/index.tsx', '/index.ts', '/index.jsx', '/index.js'].map((e) => base + e)];
	if (project.publicDir && spec.startsWith('/')) candidates.push(join(project.publicDir, base));
	return candidates.map((c) => c.split('\\').join('/')).find((c) => known.has(c) || (c.endsWith('.css') && existsSync(join(project.root, c))));
}

/** The shared shell: base layouts and the header, footer, navigation and sidebar components. */
export function shellFiles(project: Project, files: string[]): string[] {
	const named = files.filter((rel) => /(^|\/)(layout|layouts\/[^/]+|_app|_document|app|App)\.\w+$|(^|\/)[^/]*(header|footer|nav|navbar|navigation|sidebar|topbar|top-bar|menu|shell)[^/]*\.(tsx|jsx|vue|svelte|astro|html|erb|php|hbs|liquid|twig)$/i.test(rel));
	// On a plain site every page has its own <head>: those are screens, not the shell.
	const layouts = project.layouts.filter((l) => !/^[^/]+\.html?$/.test(l) || l === 'index.html');
	return [...new Set([...layouts, ...named, ...(project.mainStylesheet ? [project.mainStylesheet] : [])])];
}

/** Routes the app declares in code (react-router's <Route path element> and route objects), for apps without file routes. */
export function codeRoutes(project: Project, files: string[]): { url: string; file: string }[] {
	const out: { url: string; file: string }[] = [];
	const known = new Set(files);
	for (const rel of files.filter((f) => /\.(tsx|jsx|ts|js)$/.test(f) && !isOwnFile(f))) {
		let text = '';
		try {
			text = readFileSync(join(project.root, rel), 'utf8');
		} catch {
			continue;
		}
		if (!/\b(Route|createBrowserRouter|createHashRouter|createMemoryRouter|useRoutes|RouteObject)\b/.test(text) || !/\bpath\b/.test(text)) continue;
		// Where each name the file uses comes from.
		const from = new Map<string, string>();
		for (const m of text.matchAll(/import\s+(?:(\w+)\s*,?\s*)?(?:\{([^}]*)\})?\s*from\s*["']([^"']+)["']/g)) {
			if (m[1]) from.set(m[1], m[3]);
			for (const part of (m[2] ?? '').split(',')) {
				const [orig, alias] = part.trim().split(/\s+as\s+/);
				if (orig) from.set((alias ?? orig).trim(), m[3]);
			}
		}
		for (const m of text.matchAll(/(?:const|let)\s+(\w+)\s*=\s*(?:React\.)?lazy\(\s*\(\)\s*=>\s*import\(\s*["']([^"']+)["']/g)) from.set(m[1], m[2]);
		const fileOf = (name: string) => {
			const spec = from.get(name);
			return spec ? drawnFrom(project, rel, files, 1).find((f) => f !== rel && importMatches(rel, spec, f, project)) : undefined;
		};
		const add = (path: string, component: string | undefined) => {
			const file = component ? fileOf(component) : undefined;
			if (file && known.has(file) && !out.some((r) => r.url === path)) out.push({ url: path, file });
		};
		// JSX routes, nested: a child's path is relative to its parent's.
		const stack: { depth: number; path: string }[] = [];
		const tags = [...text.matchAll(/<(\/?)Route\b((?:[^>"'{]|"[^"]*"|'[^']*'|\{(?:[^{}]|\{[^{}]*\})*\})*?)(\/?)>/g)];
		let depth = 0;
		for (const t of tags) {
			if (t[1]) {
				depth--;
				while (stack.length && stack[stack.length - 1].depth >= depth) stack.pop();
				continue;
			}
			const attrs = t[2];
			const own = attrs.match(/\bpath\s*=\s*(?:\{\s*)?["']([^"']*)["']/)?.[1];
			const index = /\bindex\b(?!\s*=\s*\{\s*false)/.test(attrs);
			const parent = stack.length ? stack[stack.length - 1].path : '';
			const path = own === undefined ? parent || '/' : own.startsWith('/') ? own : `${parent}/${own}`;
			const element = attrs.match(/\belement\s*=\s*\{\s*<\s*([A-Z]\w*)/)?.[1] ?? attrs.match(/\bComponent\s*=\s*\{\s*([A-Z]\w*)/)?.[1];
			if (own !== undefined || index) add(tidy(path === '' ? '/' : path), element);
			if (!t[3]) {
				stack.push({ depth, path: own === undefined ? parent : path });
				depth++;
			}
		}
		// Route objects: { path: "settings", element: <Settings /> } or Component: Settings.
		for (const m of text.matchAll(/\{\s*path\s*:\s*["']([^"']*)["']\s*,\s*(?:element\s*:\s*<\s*([A-Z]\w*)|Component\s*:\s*([A-Z]\w*))/g)) {
			add(tidy(m[1].startsWith('/') ? m[1] : `/${m[1]}`), m[2] ?? m[3]);
		}
	}
	return out;
}

function importMatches(from: string, spec: string, file: string, project: Project) {
	const stem = file.replace(/\.(tsx|jsx|ts|js)$/, '').replace(/\/index$/, '');
	const tail = spec.replace(/^(\.\.?\/)+/, '').replace(/^[@~]\//, '').replace(/\.(tsx|jsx|ts|js)$/, '');
	void from;
	void project;
	return stem.endsWith(tail);
}

