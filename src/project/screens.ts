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
	for (const rel of files) {
		if (/(^|\/)(node_modules|public|dist|build|static)\//.test(rel) && !/^[^/]+\.html?$/.test(rel)) continue;
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
