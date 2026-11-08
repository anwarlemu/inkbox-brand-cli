import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, posix, relative } from 'node:path';
import { type NextFont, brand, tokens } from '../lib/brand.js';
import { pkgPath } from '../lib/paths.js';
import type { Project } from '../project/detect.js';
import type { Surface } from '../project/surface.js';
import { upsertBlock, type Writer } from './files.js';

// The brand stylesheet: one file in the project's styles folder (tokens plus the site or product layer), imported once
// by the project's main stylesheet, or linked from each page when there is none. Fonts load with it (next/font in Next).

export type StyleInstall = { stylesDir: string; brandCss: string; imported?: string; linked: string[]; fonts: string; notes: string[] };

// The brand stylesheet folder starts with an underscore: Next's app router ignores such folders as routes, and the
// name cannot collide with a project's own page (an app may have a route named like this tool). Older installs used
// the bare name; both are recognized so a rerun moves them.
const STYLE_DIR = (bin: string) => `_${bin}`;
const IMPORT_RE = (bin: string) => new RegExp(`@import\\s+["']\\./_?${bin}/(?:brand|theme)\\.css["'];\\n?`, 'g');

/**
 * The brand stylesheet for a selection (plan/scope.ts): its tokens, keyframes, fonts and its own ds- classes, without
 * the base layer and the global rules that restyle every element on every page (body type, headings, links, focus,
 * motion), so only the named components and pages change.
 */
export function tokensOnly(css: string): string {
	const blocks: string[] = [];
	let depth = 0;
	let start = 0;
	for (let i = 0; i < css.length; i++) {
		const c = css[i];
		if (c === '/' && css[i + 1] === '*') {
			const end = css.indexOf('*/', i + 2);
			i = end < 0 ? css.length : end + 1;
			continue;
		}
		if (c === '{') depth++;
		else if (c === '}' && --depth === 0) {
			blocks.push(css.slice(start, i + 1));
			start = i + 1;
		} else if (c === ';' && depth === 0) {
			blocks.push(css.slice(start, i + 1));
			start = i + 1;
		}
	}
	const keep = (block: string) => {
		const head = block.replace(/\/\*[\s\S]*?\*\//g, '').trim().split('{')[0].trim();
		if (/^@(import|charset|font-face|keyframes|-webkit-keyframes|property|theme)\b/.test(head)) return true;
		if (/^:root\b/.test(head)) return true;
		if (/^\.ds-[\w-]+(\s*,\s*\.ds-[\w-]+)*$/.test(head)) return true;
		// A media query that only re-declares tokens (a system dark theme).
		if (/^@media\b/.test(head)) return !block.slice(block.indexOf('{') + 1, block.lastIndexOf('}')).replace(/\/\*[\s\S]*?\*\//g, '').replace(/:root\s*\{[^{}]*\}/g, '').trim();
		return false;
	};
	return `${blocks.filter(keep).map((b) => b.trim()).join('\n\n')}\n`;
}

// shadcn's theme roles and the brand theme names they take (build/theme.css), for restyling an app built on shadcn.
const SHADCN_ROLES: [string, string][] = [
	['background', 'page'], ['foreground', 'fg'], ['card', 'surface'], ['card-foreground', 'fg'], ['popover', 'surface'], ['popover-foreground', 'fg'],
	['primary-foreground', 'on-primary'], ['secondary', 'subtle'], ['secondary-foreground', 'fg'], ['muted', 'subtle'], ['muted-foreground', 'fg-muted'],
	['accent', 'subtle'], ['accent-foreground', 'fg'], ['destructive', 'danger'], ['border', 'line'], ['input', 'line-field'], ['ring', 'line-ring'],
];
const SHADCN_RADII: [string, string][] = [['md', 'control'], ['lg', 'control'], ['xl', 'panel'], ['2xl', 'panel'], ['3xl', 'dialog'], ['4xl', 'dialog']];

/** The shadcn theme variables mapped to the brand's values, read from the brand theme's own aliases. */
export function shadcnBridge(aliases: string) {
	const value = (name: string) => aliases.match(new RegExp(`(?:^|\\n)\\s*${name}:\\s*([^;]+);`))?.[1].trim();
	const out: [string, string][] = [];
	for (const [role, theme] of SHADCN_ROLES) { const v = value(`--color-${theme}`); if (v) out.push([`--color-${role}`, v]); }
	for (const [size, theme] of SHADCN_RADII) { const v = value(`--radius-${theme}`); if (v) out.push([`--radius-${size}`, v]); }
	return out;
}

/** The stylesheet with every `@layer base { ... }` replaced by its rules. */
export function unlayer(css: string): string {
	let out = '';
	let i = 0;
	for (const m of css.matchAll(/@layer\s+base\s*\{/g)) {
		if (m.index! < i) continue;
		let depth = 1;
		let j = m.index! + m[0].length;
		for (; j < css.length && depth; j++) {
			if (css[j] === '{') depth++;
			else if (css[j] === '}') depth--;
		}
		out += css.slice(i, m.index) + css.slice(m.index! + m[0].length, j - 1).replace(/^\t/gm, '');
		i = j;
	}
	return out + css.slice(i);
}

/** The `--name: value` declarations of a CSS text's @theme blocks (Tailwind's own, or an app's). */
export function themeDeclarations(css: string): Map<string, string> {
	const out = new Map<string, string>();
	const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
	for (const m of text.matchAll(/@theme\b[^{;]*\{/g)) {
		// The block's own declarations, without nested ones (@keyframes inside Tailwind's theme).
		let depth = 1;
		let body = '';
		for (let i = m.index! + m[0].length; i < text.length && depth; i++) {
			if (text[i] === '{') depth++;
			else if (text[i] === '}') depth--;
			else if (depth === 1) body += text[i];
		}
		for (const d of body.matchAll(/(--[\w.\\-]+)\s*:\s*([^;]+);/g)) out.set(d[1], d[2].replace(/\s+/g, ' ').trim());
	}
	return out;
}

/**
 * The theme for a selection. Where the brand's theme renames a key Tailwind or the app already has (font-sans,
 * font-bold, leading-tight, rounded-sm), the key points at a scoped variable: the app's own value on its pages, the
 * brand's inside the library's components (every one carries data-slot). So a swapped button is the brand's, and the
 * pages around it keep their type, weights and corners.
 */
export function scopeTheme(theme: string, appTheme: Map<string, string>, defaults: Map<string, string>): { theme: string; css: string; scoped: Map<string, string> } {
	const scoped = new Map<string, string>();
	const app: string[] = [];
	const lib: string[] = [];
	const name = (key: string) => `--ds-scope-${key.slice(2).replace(/[^\w-]/g, '-')}`;
	const out = theme.replace(/@theme inline\s*\{([^{}]*)\}/, (block) =>
		block.replace(/^(\s*)(--[\w.\\-]+)\s*:\s*([^;]+);/gm, (line, pad: string, key: string, value: string) => {
			// Without the key Tailwind computes the value (p-2.5 is 2.5 steps of --spacing, duration-150 is 150ms).
			const step = key.match(/^--spacing-(\d+(?:\\?\.\d+)?)$/)?.[1]?.replace('\\', '');
			const ms = key.match(/^--transition-duration-(\d+)$/)?.[1];
			const computed = step ? `calc(${appTheme.get('--spacing') ?? defaults.get('--spacing') ?? '0.25rem'} * ${step})` : ms ? `${ms}ms` : undefined;
			const own = appTheme.get(key) ?? defaults.get(key) ?? (defaults.size ? computed : undefined);
			if (own === undefined || own.trim() === value.trim()) return line;
			scoped.set(key, `var(${name(key)})`);
			app.push(`\t${name(key)}: ${own};`);
			lib.push(`\t${name(key)}: ${value.trim()};`);
			return `${pad}${key}: var(${name(key)});`;
		}),
	);
	const css = scoped.size ? `\n/* Theme keys the app has too: its own value on its pages, the brand's inside the library's components and named pages. */\n:root {\n${app.join('\n')}\n}\n\n:where([data-slot], .ds-page) {\n${lib.join('\n')}\n}\n` : '';
	return { theme: out, css, scoped };
}

/** Tailwind's default theme, from the app's own copy of tailwindcss. */
function tailwindDefaults(root: string): Map<string, string> {
	try {
		return themeDeclarations(readFileSync(createRequire(join(root, 'package.json')).resolve('tailwindcss/theme.css'), 'utf8'));
	} catch {
		return new Map();
	}
}

export function installStyles(w: Writer, project: Project, surface: Surface, styleText: string, { scoped = false, restyle = false } = {}): StyleInstall {
	const bin = brand().bin;
	const notes: string[] = [];
	const main = project.mainStylesheet;
	const stylesDir = main ? dirname(main) : project.framework === 'static' ? '.' : project.srcDir ? 'src/styles' : 'styles';
	const dir = posix.join(stylesDir, STYLE_DIR(bin));
	const next = project.framework === 'next';
	const tailwind4 = (project.tailwindMajor ?? 0) >= 4;
	let css = readFileSync(pkgPath('build', surface === 'product' ? 'product.css' : 'site.css'), 'utf8');
	// A product whose dark theme follows the system setting gets the brand's dark values the same way.
	if (surface === 'product' && /prefers-color-scheme\s*:\s*dark/.test(styleText)) {
		const dark = Object.entries(tokens().dark).map(([k, v]) => `\t\t${k}: ${v};`).join('\n');
		css += `\n@media (prefers-color-scheme: dark) {\n\t:root {\n${dark}\n\t}\n}\n`;
	}
	// A selection: the theme's renamed keys follow the app outside the library's components (see scopeTheme).
	const appTheme = themeDeclarations(styleText.replace(/\/\* [\w-]+:theme:start \*\/[\s\S]*?\/\* [\w-]+:theme:end \*\//g, ''));
	let themeCss = readFileSync(pkgPath('build', 'theme.css'), 'utf8');
	let scopedKeys = new Map<string, string>();
	let scopeCss = '';
	if (scoped && tailwind4) {
		const s = scopeTheme(themeCss, appTheme, tailwindDefaults(project.root));
		themeCss = s.theme;
		scopedKeys = s.scoped;
		scopeCss = s.css;
	}
	// Tailwind 3 compiles each imported stylesheet on its own and rejects an @layer base without its @tailwind base:
	// the defaults go unlayered there, imported before the app's own rules (which still win, as later rules).
	if (project.tailwindMajor && project.tailwindMajor < 4) css = unlayer(css);
	// A page named in a selection (apply /settings) carries .ds-page on its root element: the brand's type and ground
	// there, in the base layer so the page's own classes still win.
	const pageCss = `\n/* A page named in a selection: its root element carries .ds-page. */\n@layer base {\n\t.ds-page {\n\t\tfont-family: var(--ds-font-sans);\n\t\tfont-size: var(--ds-text-body);\n\t\tline-height: var(--ds-leading-body);\n\t\tcolor: var(--ds-color-text-default);\n\t\tbackground-color: var(--ds-color-bg-page);\n\t}\n}\n`;
	if (scoped) scopeCss += project.tailwindMajor && project.tailwindMajor < 4 ? unlayer(pageCss) : pageCss;
	if (scoped) css = `/* Tokens, theme and fonts for the library's components; no base layer, so the app's own pages keep their look. Applying the whole app (apply with no targets) adds it. */\n${tokensOnly(css)}${scopeCss}`;
	else css += groundAliases(styleText);
	// Next self-hosts the fonts through next/font; everything else loads them at the top of the brand stylesheet.
	if (!next && (!main || !tailwind4)) css = `${readFileSync(pkgPath('build', 'fonts.css'), 'utf8').split('\n').filter((l) => l.startsWith('@import')).join('\n')}\n${css}`;
	w.write(`${dir}/brand.css`, css);
	if (tailwind4) w.write(`${dir}/theme.css`, themeCss);

	let imported: string | undefined;
	const linked: string[] = [];
	if (main) {
		const before = w.read(main) ?? '';
		let after = before.replace(IMPORT_RE(bin), '');
		const lines = [`@import "./${STYLE_DIR(bin)}/brand.css";`, ...(tailwind4 ? [`@import "./${STYLE_DIR(bin)}/theme.css";`] : [])];
		const tw = after.match(/@import\s+["']tailwindcss["'][^;]*;/);
		if (tw) after = after.replace(tw[0], `${tw[0]}\n${lines.join('\n')}`);
		else {
			// @import must come first: after a @charset and leading comments, before any rule.
			const lead = after.match(/^(?:\s*(?:@charset[^;]*;|\/\*[\s\S]*?\*\/|@import(?:[^;"']|"[^"]*"|'[^']*')*;))*/)?.[0] ?? '';
			after = `${lead}${lead && !lead.endsWith('\n') ? '\n' : ''}${lines.join('\n')}\n${after.slice(lead.length).replace(/^\n/, '')}`;
		}
		if (!next && tailwind4) {
			const imports = readFileSync(pkgPath('build', 'fonts.css'), 'utf8').split('\n').filter(line => line.startsWith('@import'));
			for (const line of imports) after = after.replaceAll(line + '\n', '').replaceAll(line, '');
			const charset = after.match(/^\s*@charset[^;]*;\s*/)?.[0] ?? '';
			after = `${charset}${imports.join('\n')}\n${after.slice(charset.length)}`;
		}
		if (tailwind4) {
			// Existing shadcn themes can otherwise override brand font, color and radius aliases after imports.
			const start = `/* ${bin}:theme:start */`, end = `/* ${bin}:theme:end */`;
			const previous = after.indexOf(start), finish = after.indexOf(end);
			if (previous >= 0 && finish >= previous) after = after.slice(0, previous).trimEnd() + after.slice(finish + end.length);
			const aliases = readFileSync(pkgPath('build', 'theme.css'), 'utf8').match(/@theme inline\s*\{([^}]+)\}/)?.[1] ?? '';
			const overrides = aliases.split('\n').filter(line => { const key = line.match(/(--[\w.-]+):/)?.[1]; return key && after.includes(`${key}:`); }).map(line => { const key = line.match(/(--[\w.-]+):/)![1]; return scopedKeys.has(key) ? line.replace(/:.*$/, `: ${scopedKeys.get(key)};`) : line; });
			// Restyling a whole shadcn app: its theme's roles point at the brand's, so every shadcn component takes the
			// brand. A selection leaves them: they would restyle every shadcn component outside it.
			if (restyle && !scoped) {
				const own = new Set(overrides.map(line => line.match(/(--[\w.-]+):/)?.[1]));
				for (const [key, value] of shadcnBridge(aliases)) if (!own.has(key) && new RegExp(`${key}\\s*:`).test(after)) overrides.push(`\t${key}: ${value};`);
			}
			if (overrides.length) after = upsertBlock(after, `@theme inline {\n${overrides.join('\n')}\n}`, start, end);
		}
		if (w.write(main, after)) imported = main;
		else if (before.includes(`./${STYLE_DIR(bin)}/brand.css`)) imported = main;
	} else {
		// No global stylesheet: every page links the brand stylesheet in its <head>.
		for (const rel of project.layouts.filter((l) => !/\.(tsx|jsx|js)$/.test(l))) {
			const text = w.read(rel) ?? '';
			if (text.includes(`${STYLE_DIR(bin)}/brand.css`)) {
				linked.push(rel);
				continue;
			}
			const href = posix.relative(posix.dirname(rel), `${dir}/brand.css`) || 'brand.css';
			if (w.write(rel, text.replace(/<\/head>/i, `<link rel="stylesheet" href="${href.startsWith('.') ? href : `./${href}`}">\n</head>`))) linked.push(rel);
		}
		if (!linked.length) notes.push(`No global stylesheet or page <head> found: load ${dir}/brand.css from the base layout.`);
	}
	const fonts = next ? wireNextFonts(w, project) : project.native ? 'app fonts' : 'brand.css';
	if (project.native) notes.push(`${brand().fonts.native}.`);
	return { stylesDir, brandCss: `${dir}/brand.css`, imported, linked, fonts, notes };
}

/**
 * A blue ground (the hero, a ds-on-blue band) re-points the brand's color tokens. A project's own variables that
 * alias them at the root (`--fg: var(--ds-color-text-default)`) were resolved there, so they are declared again on
 * the ground and resolve against it: the project's text turns white inside the hero like the brand's own does.
 */
export function groundAliases(styleText: string) {
	const hero = brand().touches.hero;
	if (!hero) return '';
	const vars = new Map<string, string>();
	// Comments first: a comment that mentions a token would otherwise read as part of a declaration.
	const css = styleText.replace(/\/\*[\s\S]*?\*\//g, '');
	// Tailwind 4's @theme variables compile to the root too; @theme inline ones are written into the utilities, so they
	// already follow the ground.
	for (const block of css.matchAll(/(^|[}\s])((?::root|html|body|@theme(?!\s+inline))[^{}]*)\{([^{}]*)\}/g)) {
		for (const d of block[3].matchAll(/(--(?!ds-)[\w-]+)\s*:\s*([^;{}]*);/g)) vars.set(d[1], d[2].trim());
	}
	// Every root variable that leads to a brand color, directly or through other variables (--text: var(--palette-white),
	// --palette-white: var(--ds-color-text-default)): each was resolved at the root, so each is declared again.
	const aliases = new Map<string, string>();
	const leads = (v: string) => /var\(--ds-color-/.test(v) || [...v.matchAll(/var\((--[\w-]+)/g)].some((m) => aliases.has(m[1]));
	for (let grew = true; grew; ) {
		grew = false;
		for (const [k, v] of vars) if (!aliases.has(k) && leads(v)) aliases.set(k, v), (grew = true);
	}
	if (!aliases.size) return '';
	const decls = [...aliases].map(([k, v]) => `\t${k}: ${v};`).join('\n');
	return `\n/* The project's own color variables, declared again on the blue ground so they take its colors. */\n:where([${hero.attribute}], [data-ds-ground="blue"], .ds-on-blue) {\n${decls}\n}\n`;
}

/** Next: a next/font loader for the brand's Google typefaces (brand.json), added to the root layout's <html> className. */
function wireNextFonts(w: Writer, project: Project) {
	const libDir = project.srcDir && !project.appDir?.startsWith('app') ? 'src/lib' : 'lib';
	const loader = `${libDir}/ds-fonts.${project.typescript ? 'ts' : 'js'}`;
	const families = brand().fonts.next;
	const local = (f: NextFont) => f.import.charAt(0).toLowerCase() + f.import.slice(1).replace(/_(\w)/g, (_m, c: string) => c.toUpperCase());
	const opts = (f: NextFont) => JSON.stringify({ subsets: ['latin'], ...f.options, variable: f.variable }).replace(/"(\w+)":/g, '$1: ').replace(/"/g, "'").replace(/,/g, ', ');
	w.write(
		loader,
		`import { ${families.map((f) => f.import).sort().join(', ')} } from 'next/font/google';\n\n${families.map((f) => `const ${local(f)} = ${f.import}(${opts(f)});`).join('\n')}\n\nexport const dsFontVariables = \`${families.map((f) => `\${${local(f)}.variable}`).join(' ')}\`;\n`,
	);
	const layout = project.layouts.find((l) => /\/layout\.(tsx|jsx|js)$/.test(l));
	if (!layout) return loader;
	const text = w.read(layout) ?? '';
	if (text.includes('dsFontVariables')) return layout;
	const from = relative(dirname(layout), `${libDir}/ds-fonts`).split('\\').join('/').replace(/^(?!\.)/, './');
	let next = text.replace(/<html\b([^>]*?)\bclassName=(\{`([^`]*)`\}|\{([^}]+)\}|"([^"]*)")/, (all, pre: string, _v: string, tpl?: string, expr?: string, str?: string) => {
		const inner = tpl !== undefined ? tpl : expr !== undefined ? `\${${expr.trim()}}` : str;
		return `<html${pre}className={\`\${dsFontVariables} ${inner}\`}`;
	});
	if (next === text) next = text.replace(/<html\b/, '<html className={dsFontVariables}');
	if (next === text) return loader;
	// The end of the last import statement, with or without semicolons (a bare `[^;]+` would run on into a comment).
	const lastImport = [...next.matchAll(/^import[\s\S]*?from\s+["'][^"']+["'];?[^\n]*\n|^import\s+["'][^"']+["'];?[^\n]*\n/gm)].pop();
	const line = `import { dsFontVariables } from '${from}';\n`;
	next = lastImport ? next.slice(0, lastImport.index! + lastImport[0].length) + line + next.slice(lastImport.index! + lastImport[0].length) : line + next;
	w.write(layout, next);
	return layout;
}

/** The brand's hero script (brand.json touches.hero.script), served as a static file and loaded by every base layout. */
export function installDots(w: Writer, project: Project) {
	const bin = brand().bin;
	const script = brand().touches.hero?.script;
	if (!project.publicDir || !script) return [];
	w.write(posix.join(project.publicDir, bin, script), readFileSync(pkgPath('brand', script), 'utf8'));
	const url = project.publicDir === '.' ? `./${bin}/${script}` : `/${bin}/${script}`;
	const wired: string[] = [];
	for (const rel of project.layouts) {
		const text = w.read(rel) ?? '';
		if (text.includes(`${bin}/${script}`)) {
			wired.push(rel);
			continue;
		}
		const jsx = /\.(tsx|jsx|js)$/.test(rel);
		const close = jsx ? '</body>' : '</head>';
		if (!text.includes(close)) continue;
		// React hoists and dedupes an async script; Astro would try to bundle a script without is:inline.
		const local = posix.relative(posix.dirname(rel), `${bin}/${script}`) || `${bin}/${script}`;
		const src = project.publicDir === '.' ? (local.startsWith('.') ? local : `./${local}`) : url;
		const tag = jsx ? `<script src="${url}" async />` : `<script${rel.endsWith('.astro') ? ' is:inline' : ''} src="${src}" defer></script>`;
		if (w.write(rel, text.replace(close, `${tag}\n${close}`))) wired.push(rel);
	}
	return wired;
}
