import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { brand, type BrandTheme } from '../lib/brand.js';
import { walkFiles } from '../lib/glob.js';
import { ANDROID_XML, MARKUP, NATIVE, type Project, SCRIPT, STYLES, THEME_DATA } from '../project/detect.js';
import type { Surface } from '../project/surface.js';
import { type Stats, convertCss, newStats } from './css.js';
import { convertMarkup } from './markup.js';
import { convertNative, readNativeColor } from './native.js';
import { type Palette, classPalette, nativePalette, sitePalette } from './palette.js';
import { convertClasses, convertScript, tailwindColor } from './script.js';
import { convertSvgMark } from './svg.js';

// Converts every style value in a project to the brand, in place: stylesheets, templates, scripts and native code.

export type ConvertResult = { written: string[]; stats: Stats; palette: Palette; marks: string[]; rasterLogos: string[] };

export function convertProject(project: Project, files: string[], surface: Surface, { dryRun = false, theme = 'light' as 'light' | 'dark' } = {}): ConvertResult {
	const root = project.root;
	const read = (rel: string) => readFileSync(join(root, rel), 'utf8');
	const styleFiles = files.filter((rel) => STYLES.test(rel) || MARKUP.test(rel));
	const styleText = [project.mainStylesheet && existsSync(join(root, project.mainStylesheet)) ? read(project.mainStylesheet) : '', ...styleFiles.map(read)].join('\n');
	const nativeFiles = files.filter((rel) => NATIVE.test(rel) || ANDROID_XML.test(rel));
	const css = sitePalette(styleText);
	const base: Palette = { ...(css.found || !nativeFiles.length ? css : nativePalette(nativeFiles.map(read), readNativeColor)), target: surface === 'product' && theme === 'dark' ? 'dark' : 'light', column: surface !== 'product' };
	const brandTheme: BrandTheme = surface === 'product' ? (theme === 'dark' ? 'product-dark' : 'product') : 'site';

	// A page that styles itself apart from the rest (a dark case study inside a light site) is read against its own
	// colors, and so are the files beside its stylesheet.
	const own = new Map<string, Palette>();
	for (const rel of files.filter((f) => STYLES.test(f) && f !== project.mainStylesheet)) {
		const local = sitePalette(read(rel));
		if (local.found && local.mode !== base.mode) own.set(dirname(rel), { ...base, mode: local.mode, bg: local.bg, fg: local.fg, vars: new Map([...(base.vars ?? []), ...(local.vars ?? [])]) });
	}
	const paletteFor = (rel: string) => {
		for (let dir = dirname(rel); dir && dir !== '.'; dir = dirname(dir)) if (own.has(dir)) return own.get(dir)!;
		return base;
	};
	const tailwind = project.tailwindMajor ? ((project.tailwindMajor ?? 0) >= 4 ? 'theme' : 'arbitrary') : undefined;
	const layout = project.layouts.find((l) => /\/layout\.(tsx|jsx|js)$/.test(l));
	const layoutPalette = layout ? classPalette(read(layout), base, tailwindColor) : base;

	const stats = newStats();
	const written: string[] = [];
	for (const rel of files) {
		const before = read(rel);
		const pal = paletteFor(rel);
		let after = before;
		if (STYLES.test(rel)) after = convertCss(before, /\.(sass|styl)$/.test(rel) ? { ...pal, lines: true } : pal, stats);
		else if (MARKUP.test(rel)) {
			after = convertMarkup(before, pal, stats);
			if (tailwind) after = after.replace(/(\sclass(?:Name)?\s*=\s*)(["'])([^"']*)\2/g, (all, head: string, q: string, cls: string) => `${head}${q}${convertClasses(cls, pal, stats, tailwind === 'theme')}${q}`);
		} else if (SCRIPT.test(rel)) after = convertScript(before, tailwind ? classPalette(before, pal === base ? layoutPalette : pal, tailwindColor) : pal, stats, { tailwind, theme: brandTheme });
		else if (NATIVE.test(rel) || ANDROID_XML.test(rel) || THEME_DATA.test(rel)) after = convertNative(before, pal, stats, brandTheme, rel.endsWith('.xml') || rel.endsWith('.xaml'));
		if (after !== before) {
			written.push(rel);
			if (!dryRun) writeFileSync(join(root, rel), after);
		}
	}

	// Marks drawn light for a dark site would vanish on the brand's white page: one-color SVGs the pages draw are
	// redrawn in brand text; raster logos are listed for the agent to check, since they cannot be recolored in code.
	const marks: string[] = [];
	const rasterLogos: string[] = [];
	if (base.mode === 'dark' && brandTheme !== 'product-dark') {
		const drawn = files.filter((rel) => MARKUP.test(rel) || SCRIPT.test(rel) || STYLES.test(rel)).map(read).join('\n');
		const isDrawn = (name: string) => new RegExp(`(src(set)?\\s*=\\s*["'{][^"'}]*|url\\(\\s*["']?[^)]*|import[^;]*|:\\s*["'][^"']*)${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(drawn);
		for (const rel of walkFiles(root, ['**/*.svg'], ['**/node_modules/**'])) {
			const name = rel.split('/').pop()!;
			// A file named for its color (logo-white.svg) is a variant someone chose, often offered for download.
			if (!isDrawn(name) || /[-_.](white|black|light|dark|inverse|inverted|mono|reversed)\b/i.test(name)) continue;
			const before = read(rel);
			const after = convertSvgMark(before, base);
			if (after === before) continue;
			marks.push(rel);
			if (!dryRun) writeFileSync(join(root, rel), after);
		}
		for (const m of drawn.matchAll(/<img\b[^>]*>/gi)) {
			if (!/(logo|wordmark|lockup|brand-mark)/i.test(m[0])) continue;
			const src = m[0].match(/src=["']([^"']+\.(?:png|webp|jpe?g|gif|avif))["']/i)?.[1];
			if (src && !rasterLogos.includes(src)) rasterLogos.push(src);
		}
	}
	return { written, stats, palette: base, marks, rasterLogos: rasterLogos.slice(0, 8) };
}
