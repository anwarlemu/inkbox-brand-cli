import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { brand, tokens } from '../lib/brand.js';
import { styledFiles, type Project } from '../project/detect.js';
import type { Surface } from '../project/surface.js';
import { adaptable, adaptComponent, libraryClasses, lookOf, restyleRoot, variantsFor } from './adapt.js';
import { restyleOverlays } from './overlay-styles.js';
import { type Identified, componentsIn, identify, usesIn } from './components.js';
import { itemName, loadIndexSync, loadItemSync, type RegistryItem } from './registry.js';

// Identify, then apply. Every component the app defines is identified (what it is, from its name, what it renders,
// its props and how it is used; see components.ts) and gets one of three outcomes:
//   swap: a library item covers it and its props map onto the library's, so its body renders the library component
//         (an adapter: the name, props type and every use stay as they are);
//   style: an item covers it but a swap would lose something, so the element it renders takes the item's look;
//   refine: nothing covers it, so its values are only converted to the brand's (the converter, after this).
// The library's files go into components/ds, apart from the app's own. The app is type-checked before and after; an
// adapter that introduces errors is put back and that component is styled instead. The decisions, with what each was
// based on, are written to .ds/components.json for the agent and `look`.

type Aliases = { components: string; ui: string; utils: string; lib: string; hooks: string };
export type Decision = { file: string; name: string; item?: string; confidence: number; signals: string[]; uses: number; action: 'swap' | 'style' | 'refine'; reason: string };
export type SwapResult = { swapped: string[]; styled: string[]; reverted: string[]; added: string[]; packages: string[]; utils?: string; checked: boolean; decisions: Decision[] };

function readJson(path: string) {
	try {
		return JSON.parse(readFileSync(path, 'utf8'));
	} catch {
		return undefined;
	}
}

/** Where the library's interface components go (components/ds, apart from the app's own), and the aliases they use. */
export function componentLayout(project: Project): { uiDir: string; aliases: Aliases } | undefined {
	if (!project.hasAlias) return undefined;
	const base = project.srcDir ? 'src/' : '';
	return { uiDir: `${base}components/ds`, aliases: { components: '@/components', ui: '@/components/ds', utils: '@/lib/utils', lib: '@/lib', hooks: '@/hooks' } };
}

/** The library's file, with its imports rewritten to the app's aliases. */
function retarget(content: string, a: Aliases) {
	return content
		.replaceAll('"@/components/ui/', `"${a.ui}/`)
		.replaceAll('"@/lib/utils"', `"${a.utils}"`)
		.replaceAll('"@/lib/', `"${a.lib}/`)
		.replaceAll('"@/hooks/', `"${a.hooks}/`)
		.replaceAll('"@/components/', `"${a.components}/`);
}

/** A tailwind-merge that knows the brand's scales, named from its tokens (--ds-text-*, --ds-radius-*, --ds-shadow-*). */
function brandMerge() {
	const names = (prefix: string) => Object.keys(tokens().site).filter((k) => k.startsWith(prefix)).map((k) => JSON.stringify(k.slice(prefix.length))).join(', ');
	return `import { extendTailwindMerge } from "tailwind-merge";

// The brand's scales have their own names (text-body-sm, rounded-card, shadow-floating): taught here so a merge keeps
// both text-body-sm and a text color, and a brand radius replaces a default one.
const twMerge = extendTailwindMerge<"brand-font-size">({
  extend: {
    theme: {
      leading: [${names('--ds-leading-')}],
      tracking: [${names('--ds-tracking-')}],
      radius: [${names('--ds-radius-')}],
      shadow: [${names('--ds-shadow-')}],
    },
    classGroups: {
      "brand-font-size": [{ text: [${names('--ds-text-')}] }],
    },
    conflictingClassGroups: {
      "brand-font-size": ["font-size"],
      "font-size": ["brand-font-size"],
    },
    conflictingClassGroupModifiers: { "brand-font-size": ["leading"] },
  },
});`;
}

/** Teaches the app's cn the brand's scales, keeping every other export of its utils file. */
export function patchUtils(text: string): string | undefined {
	if (/extendTailwindMerge/.test(text) && /"brand-font-size"/.test(text)) return undefined;
	// Upgrade the older generated merge without replacing the app's other utility exports.
	if (/extendTailwindMerge/.test(text) && /"font-size": \[\{ text: \[/.test(text) && /"body"/.test(text)) {
		const declaration = /const twMerge = extendTailwindMerge\(\{[\s\S]*?\n\}\);/;
		if (declaration.test(text)) return text.replace(declaration, brandMerge().replace(/^import[^\n]+\n\n/, ''));
	}
	const importRe = /import\s*\{\s*twMerge\s*\}\s*from\s*["']tailwind-merge["'];?/;
	if (importRe.test(text)) return text.replace(importRe, brandMerge());
	// A utils file that re-exports cn from a package gets the brand-aware cn instead, the same clsx plus tailwind-merge.
	const reexport = /export\s*\{\s*cn\s*\}\s*from\s*["'][^"']+["'];?/;
	if (reexport.test(text)) return text.replace(reexport, `import { type ClassValue, clsx } from "clsx";\n${brandMerge()}\n\nexport function cn(...inputs: ClassValue[]) {\n  return twMerge(clsx(inputs));\n}`);
	return undefined;
}

function typeErrors(root: string): Set<string> | undefined {
	if (!existsSync(join(root, 'tsconfig.json')) || !existsSync(join(root, 'node_modules', 'typescript'))) return undefined;
	const run = spawnSync(process.execPath, [join(root, 'node_modules', 'typescript', 'bin', 'tsc'), '--noEmit', '-p', 'tsconfig.json'], { cwd: root, encoding: 'utf8', timeout: 180_000 });
	return new Set(`${run.stdout}`.split('\n').filter((l) => /error TS\d+/.test(l)));
}

const pascal = (name: string) => name.replace(/(^|-)([a-z])/g, (_, __, c: string) => c.toUpperCase());

const SWAP_FLOOR = 0.55;
// Items whose look is one element's classes; larger items (a hero, a sidebar) are left to the element layer and the agent.
const ROOT_STYLED = new Set(['button', 'badge', 'card', 'input', 'textarea', 'label', 'kbd', 'separator', 'skeleton']);
// Framework route files: their component is the page itself, never a library item.
const ROUTE_FILE = /(^|\/)(page|layout|template|loading|error|not-found|default|_app|_document|root)\.(tsx|jsx)$/;
const LIBRARY_DIR = /(^|\/)components\/ds\//;

export function applyComponents(project: Project, surfaceOf: (rel: string) => Surface, { dryRun = false } = {}): SwapResult | undefined {
	const root = project.root;
	const layout = componentLayout(project);
	const index = loadIndexSync();
	if (!index.length) return undefined;
	const kindsOf = (item: string) => index.find((i) => i.name === item)?.kinds ?? [];
	const overlayFiles = styledFiles(root).filter((f) => /\.(tsx|jsx)$/.test(f) && !LIBRARY_DIR.test(f));
	const files = overlayFiles.filter((f) => !ROUTE_FILE.test(f));
	const texts = new Map(overlayFiles.map((f) => [f, readFileSync(join(root, f), 'utf8')]));

	// Find and identify every component, and how the app uses each.
	const found = files.flatMap((f) => componentsIn(f, texts.get(f)!));
	const names = new Set(found.filter((c) => c.exported).map((c) => c.name));
	const uses = new Map<string, { count: number; values: Record<string, string[]> }>();
	for (const f of files) {
		for (const [name, u] of usesIn(texts.get(f)!, names)) {
			const prev = uses.get(name) ?? { count: 0, values: {} };
			prev.count += u.count;
			for (const [k, v] of Object.entries(u.values)) prev.values[k] = [...new Set([...(prev.values[k] ?? []), ...v])];
			uses.set(name, prev);
		}
	}
	const identified: Identified[] = found.map((c) => {
		const u = uses.get(c.name) ?? { count: 0, values: {} };
		return { ...c, ...identify(c, surfaceOf(c.file), kindsOf), uses: u.count, useValues: u.values };
	});

	const result: SwapResult = { swapped: [], styled: [], reverted: [], added: [], packages: [], checked: false, decisions: [] };
	const canAdapt = !!layout && project.typescript;
	const backups = new Map<string, string | undefined>();
	const current = new Map(texts);
	const write = (rel: string, content: string) => {
		if (!backups.has(rel)) backups.set(rel, existsSync(join(root, rel)) ? readFileSync(join(root, rel), 'utf8') : undefined);
		current.set(rel, content);
		if (dryRun) return;
		mkdirSync(dirname(join(root, rel)), { recursive: true });
		writeFileSync(join(root, rel), content);
	};
	const pkg = readJson(join(root, 'package.json')) ?? {};
	const installed = { ...pkg.dependencies, ...pkg.devDependencies } as Record<string, string>;
	const packages = new Set<string>();
	const seen = new Set<string>();
	const base = project.srcDir ? 'src/' : '';
	// The library item and what it needs, into components/ds (the app's lib/utils is patched, never replaced).
	const install = (item: RegistryItem) => {
		if (!layout || seen.has(item.name)) return;
		seen.add(item.name);
		for (const d of item.packages ?? []) if (!installed[d]) packages.add(d);
		for (const dep of item.requires ?? []) {
			const d = loadItemSync(itemName(dep));
			if (d && d.type !== 'theme') install(d);
		}
		for (const f of item.files ?? []) {
			const rel = f.path.startsWith('components/ui/') ? `${layout.uiDir}/${f.path.slice('components/ui/'.length)}` : `${base}${f.path}`;
			const exists = existsSync(join(root, rel));
			if (f.path === 'lib/utils.ts' && exists) {
				const patched = patchUtils(readFileSync(join(root, rel), 'utf8'));
				if (patched) {
					write(rel, patched);
					result.utils = rel;
					for (const d of ['clsx', 'tailwind-merge']) if (!installed[d]) packages.add(d);
				}
				continue;
			}
			if (!exists) {
				write(rel, retarget(f.content ?? '', layout.aliases));
				result.added.push(rel);
			}
		}
	};
	const exportNameOf = new Map<string, string>();
	const decide = (c: Identified): Decision => {
		const d = { file: c.file, name: c.name, item: c.item, confidence: Math.round(c.confidence * 100) / 100, signals: c.signals, uses: c.uses };
		if (!c.item) return { ...d, action: 'refine', reason: 'no library item covers it' };
		const item = loadItemSync(c.item);
		const surface = surfaceOf(c.file);
		const values = { ...c.values };
		for (const [k, v] of Object.entries(c.useValues)) values[k] = [...new Set([...(values[k] ?? []), ...v])];
		if (canAdapt && item && c.confidence >= SWAP_FLOOR && c.exported && adaptable(c.item)) {
			const adapted = adaptComponent(current.get(c.file)!, c, c.item, surface, `${layout!.aliases.ui}/${c.item}`, values);
			if (adapted) {
				install(item);
				write(c.file, adapted);
				exportNameOf.set(c.file, c.name);
				result.swapped.push(c.file);
				return { ...d, action: 'swap', reason: `renders the library's ${c.item}, its props mapped` };
			}
		}
		const content = item?.files?.[0]?.content;
		if (item && content && ROOT_STYLED.has(c.item) && c.root?.literals.length) {
			const look = lookOf(c.root.classes);
			const pick = (vs: string[]) => {
				const v = variantsFor(surface);
				const want = c.item === 'button' ? { filled: v.filled, outlined: v.outlined, quiet: v.quiet }[look] : c.item === 'card' ? v.card : 'default';
				return vs.includes(want) ? want : vs[0];
			};
			const classes = libraryClasses(content, c.name, pick);
			const restyled = classes ? restyleRoot(current.get(c.file)!, c, c.item, classes) : undefined;
			if (restyled) {
				write(c.file, restyled);
				result.styled.push(c.file);
				return { ...d, action: 'style', reason: `its element takes the library's ${c.item} look${canAdapt && adaptable(c.item) ? ' (a swap would drop some of its props)' : ''}` };
			}
		}
		return { ...d, action: 'refine', reason: `a ${c.item}, styled by the element layer and the converter` };
	};
	// One decision per component, most confident first; a file is changed by one decision at a time (components are
	// re-read from the file as it now stands, so offsets stay right).
	const byFile = new Map<string, Identified[]>();
	for (const c of identified) byFile.set(c.file, [...(byFile.get(c.file) ?? []), c]);
	for (const [file, list] of byFile) {
		for (const first of [...list].sort((a, b) => b.confidence - a.confidence)) {
			const fresh = componentsIn(file, current.get(file)!).find((x) => x.name === first.name);
			if (!fresh) continue;
			result.decisions.push(decide({ ...first, ...fresh }));
		}
	}
	// Compound primitives have several styled parts under a portal; a root-only pass cannot reach them.
	for (const file of overlayFiles) {
		const styled = restyleOverlays(current.get(file)!, surfaceOf(file));
		if (!styled.parts.length) continue;
		if (styled.text !== current.get(file)) write(file, styled.text);
		if (!result.styled.includes(file)) result.styled.push(file);
		for (const name of styled.parts) result.decisions.push({ file, name, confidence: 1, signals: ['Radix primitive import'], uses: 0, action: 'style', reason: 'its panel or row takes the brand styling, preserving the existing interaction' });
	}
	result.packages = [...packages];
	if (dryRun) return result;
	writeInventory(root, result.decisions);
	if (!result.swapped.length && !result.styled.length) return result;
	if (packages.size) {
		const pm = project.packageManager;
		spawnSync(pm, pm === 'npm' ? ['install', ...packages] : ['add', ...packages], { cwd: root, stdio: 'ignore' });
	}
	// An adapter that introduces type errors goes back: that component is restyled instead.
	const before = typeErrorsOf(root, backups);
	if (before) {
		result.checked = true;
		const after = typeErrors(root) ?? new Set<string>();
		const fresh = [...after].filter((l) => !before.has(l));
		if (fresh.length) {
			const textOf = (f: string) => {
				try {
					return readFileSync(join(root, f), 'utf8');
				} catch {
					return '';
				}
			};
			const errorLines = fresh.map((l) => {
				const m = l.match(/^(.*?)\((\d+),\d+\)/);
				return m ? { file: m[1].trim(), text: textOf(m[1].trim()).split('\n')[Number(m[2]) - 1] ?? '' } : { file: l, text: '' };
			});
			const named = (text: string, name: string) => new RegExp(`\\b${name}\\b`).test(text);
			for (const rel of result.swapped) {
				const name = exportNameOf.get(rel)!;
				const stem = rel.split('/').pop()!.replace(/\.(tsx|jsx)$/, '');
				const implicated = errorLines.some((e) => e.file === rel || (new RegExp(`/${stem}["']`).test(textOf(e.file)) && named(e.text, name)));
				if (!implicated) continue;
				const original = backups.get(rel);
				if (original !== undefined) writeFileSync(join(root, rel), original);
				result.reverted.push(rel);
				const decision = result.decisions.find((x) => x.file === rel && x.name === name);
				if (decision) Object.assign(decision, { action: 'refine', reason: `the library's ${decision.item} did not type-check where it is used, so it is kept and restyled` });
			}
			result.swapped = result.swapped.filter((r) => !result.reverted.includes(r));
			writeInventory(root, result.decisions);
		}
	}
	return result;
}

/**
 * The type errors the app had before any change: the files are put back for a moment, checked, and rewritten. Cheaper
 * than checking twice only when nothing changed, so it runs only when something did.
 */
function typeErrorsOf(root: string, backups: Map<string, string | undefined>): Set<string> | undefined {
	if (!existsSync(join(root, 'tsconfig.json'))) return undefined;
	const changed = new Map<string, string>();
	for (const [rel, original] of backups) {
		changed.set(rel, readFileSync(join(root, rel), 'utf8'));
		if (original === undefined) writeFileSync(join(root, rel), '');
		else writeFileSync(join(root, rel), original);
	}
	const errors = typeErrors(root);
	for (const [rel, text] of changed) writeFileSync(join(root, rel), text);
	return errors;
}

/**
 * Adds the element layer's work to the inventory: each stylesheet selector it recognized (in any stack) and styled as
 * a brand element, so the agent and `look` see every decision in one place.
 */
export function recordStyledSelectors(root: string, styled: { file: string; selector: string; kind: string }[]) {
	let decisions: Decision[] = [];
	try {
		decisions = JSON.parse(readFileSync(join(root, '.ds', 'components.json'), 'utf8')).components ?? [];
	} catch {}
	const kept = decisions.filter((d) => !d.file.match(/\.(css|scss|less)$/));
	const added = styled.map((x): Decision => ({ file: x.file, name: x.selector, item: x.kind, confidence: 1, signals: [`class names a ${x.kind}`], uses: 0, action: 'style', reason: `its CSS takes the brand's ${x.kind} styling (the element layer)` }));
	if (kept.length || added.length) writeInventory(root, [...kept, ...added]);
}

/** The decisions, for the agent's tasks and `look`: what each component is, what was done, and why. */
function writeInventory(root: string, decisions: Decision[]) {
	const dir = join(root, '.ds');
	mkdirSync(dir, { recursive: true });
	writeFileSync(join(dir, 'components.json'), `${JSON.stringify({ tool: brand().bin, components: decisions }, null, 2)}\n`);
}
