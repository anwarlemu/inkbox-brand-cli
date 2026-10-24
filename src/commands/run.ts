import { configureRegistry } from '../install/config.js';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { formatFinding, runCheck } from '../check/engine.js';
import { convertProject } from '../convert/project.js';
import { installAgents, runningHarness } from '../install/agents.js';
import { Writer } from '../install/files.js';
import { installElementLayer } from '../install/layer.js';
import { installTouches } from '../install/touches.js';
import { applyComponents, recordStyledSelectors } from '../library/swap.js';
import { installDots, installStyles } from '../install/styles.js';
import { brand, cli, hasProduct } from '../lib/brand.js';
import { color, emit } from '../lib/output.js';
import { PKG_ROOT, findProjectRoot } from '../lib/paths.js';
import { MARKUP, STYLES, detectProject, styledFiles } from '../project/detect.js';
import { listScreens, shellFiles } from '../project/screens.js';
import { type Surface, profile, surfaceOf } from '../project/surface.js';
import { type State, readState, writeState } from '../plan/state.js';
import { mainScreens, pickMain, renderBatch, renderTask, taskStatus, touchNote } from '../plan/tasks.js';

// The one command: the first run installs the brand and applies component colors and style scales; every run after that prints the
// next task, until each main screen passes its review and the whole project passes the check.

export type RunOptions = { colors?: 'components'; surface?: string; theme?: string; redo?: boolean; dryRun?: boolean; install?: boolean; json?: boolean };

export function run(opts: RunOptions) {
	const root = findProjectRoot();
	selfInstall(root, opts);
	const existing = readState(root);
	if (!existing || opts.redo || opts.surface || opts.theme) return setUp(root, opts, existing);
	return next(root, existing, opts);
}

/**
 * Run through npx, this copy lives in npx's cache; hooks need a copy in the project. The release is self-contained (its
 * code is one bundle), so it is copied into node_modules and recorded in package.json, with no install of the whole
 * project's dependencies; a teammate's next install fetches the same source.
 */
export function selfInstall(root: string, opts: RunOptions, handoff = true) {
	if (opts.install === false || opts.dryRun || !/[\\/]_npx[\\/]/.test(PKG_ROOT)) return;
	const b = { ...brand(), source: process.env.DS_SOURCE ?? brand().source };
	const pkgPath = join(root, 'package.json');
	// A plain site with no package.json gets a minimal private one, so the tool and its hooks have a home.
	const pkg = existsSync(pkgPath) ? JSON.parse(readFileSync(pkgPath, 'utf8')) : { name: root.split('/').pop()?.toLowerCase().replace(/[^a-z0-9-]/g, '-') || 'site', private: true };
	pkg.devDependencies = { ...(pkg.devDependencies ?? {}), [b.bin]: b.source };
	writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
	const target = join(root, 'node_modules', b.bin);
	rmSync(target, { recursive: true, force: true });
	mkdirSync(dirname(target), { recursive: true });
	cpSync(PKG_ROOT, target, { recursive: true, filter: (src) => !src.slice(PKG_ROOT.length).includes('node_modules') });
	// Screenshots for review need playwright-core; npx fetched it beside this package.
	const pw = join(dirname(PKG_ROOT), 'playwright-core');
	if (existsSync(pw) && !existsSync(join(root, 'node_modules', 'playwright-core'))) cpSync(pw, join(root, 'node_modules', 'playwright-core'), { recursive: true });
	const binDir = join(root, 'node_modules', '.bin');
	mkdirSync(binDir, { recursive: true });
	const binLink = join(binDir, b.bin);
	if (!existsSync(binLink)) symlinkSync(join('..', b.bin, 'bin.js'), binLink);
	const local = join(target, 'bin.js');
	process.stderr.write(`Added ${b.name}'s design system to this project (node_modules/${b.bin}, recorded in package.json).\n`);
	if (!handoff) return;
	const args = process.argv.slice(2).flatMap((arg, index, all) => arg === '--cwd' || arg === '-c' ? [] : index > 0 && ['--cwd', '-c'].includes(all[index - 1]) ? [] : arg.startsWith('--cwd=') ? [] : [arg]);
	const handOff = spawnSync(process.execPath, [local, ...args, '--no-install'], { cwd: process.cwd(), stdio: 'inherit' });
	process.exit(handOff.status ?? 1);
}

function setUp(root: string, opts: RunOptions, previous?: State) {
	const project = detectProject(root);
	const files = styledFiles(root);
	const found = profile(root, files);
	if (opts.surface && !['site', 'product'].includes(opts.surface)) throw new Error('--surface is site or product.');
	if (opts.surface === 'product' && !hasProduct()) throw new Error(`${brand().name} has a site only: every project gets the site's look.`);
	const surface: Surface = (opts.surface as Surface | undefined) ?? previous?.surface ?? found.surface;
	const theme = opts.theme === 'dark' ? 'dark' : previous?.theme ?? 'light';
	const mixed = !opts.surface && found.mixed;
	// A React + Tailwind app's components are identified first and each swapped for the library's, styled as it, or left
	// to the converter (see library/swap.ts), so the type check before and after sees only those changes.
	const pkgJson = (() => {
		try {
			return JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
		} catch {
			return {};
		}
	})();
	const swap = (pkgJson.dependencies?.react || pkgJson.devDependencies?.react) && (project.tailwindMajor ?? 0) >= 4 ? applyComponents(project, (rel) => (mixed ? surfaceOf(rel, found) : surface), { dryRun: opts.dryRun }) : undefined;
	const converted = convertProject(project, files, mixed ? 'site' : surface, { dryRun: opts.dryRun, theme });
	const w = new Writer(root, opts.dryRun);
	const styleText = files.filter((f) => STYLES.test(f) || MARKUP.test(f)).map((f) => readFileSync(join(root, f), 'utf8')).join('\n');
	// Native apps have no stylesheet: their colors were converted in their own code; fonts are added as app fonts.
	const styles = project.framework === 'native' ? { stylesDir: '', brandCss: '', imported: undefined, linked: [], fonts: 'app fonts', notes: [`${brand().fonts.native}; sizes, radii and spacing are in \`tokens\`.`] } : installStyles(w, project, mixed ? 'site' : surface, styleText);
	// Every element the stylesheets name gets the brand's styling at once; the tasks refine from there.
	const layer = project.framework === 'native' ? { count: 0, files: [] as string[], styled: [] } : installElementLayer(w, styledFiles(root), (rel) => (mixed ? surfaceOf(rel, found) : surface));
	if (!opts.dryRun) recordStyledSelectors(root, layer.styled);
	const dots = project.framework !== 'native' && (surface === 'site' || mixed) && brand().touches.hero?.script ? installDots(w, project) : [];
	configureRegistry(w, project, surface);
	installAgents(w);
	const fixed = opts.dryRun ? 0 : runCheck(root, { fix: true, colorSurface: project.framework === 'native' ? undefined : surface }).fixed;
	const screens = listScreens(detectProject(root), styledFiles(root), { ...found, surface, mixed });
	const shell = shellFiles(project, files);
	const main = pickMain(root, screens, shell);
	// A site's home gets the brand's touches now (brand.json); the agent only checks them.
	const touched = !opts.dryRun && screens[0] && (surface === 'site' || mixed) && project.framework !== 'native' ? installTouches(new Writer(root), screens[0].files.filter((f) => !shell.includes(f) || /home|index/i.test(f))) : [];
	if (screens[0]) screens[0].files = [...new Set([...screens[0].files, ...shell])];
	const state: State = { version: 2, colors: project.framework === 'native' ? undefined : 'components', surface, mixed, theme, appliedAt: new Date().toISOString(), baseUrl: previous?.baseUrl, screens, main, marked: previous?.marked ?? [], skipped: previous?.skipped ?? {}, reviews: previous?.reviews ?? {} };
	if (!opts.dryRun) writeState(root, state);
	const left = opts.dryRun ? undefined : runCheck(root);
	const s = converted.stats;
	const values = s.colors + s.fonts + s.type + s.radius + s.spacing + s.motion + s.shadows;
	const harness = runningHarness();
	emit(opts, { surface, mixed, evidence: found.reasons, converted: { files: converted.written.length, ...s }, fixed, left: left?.findings.length, styles, dots, layer, swap, changes: w.changes, screens: screens.map((x) => x.id) }, () =>
		[
			color.bold(`${brand().name} design system ${opts.dryRun ? 'dry run (nothing written)' : previous ? 'applied again' : 'installed and applied'}.`),
			`  This is ${mixed ? 'a site with product screens (each route gets its own look)' : surface === 'product' ? 'a product: an app people work in' : 'a site: pages people read and act on'}. Evidence: ${found.reasons.slice(0, 4).join('; ') || 'none, so it is treated as a site'}.${opts.surface || !hasProduct() ? '' : ` Wrong? \`${cli()} --surface ${surface === 'site' ? 'product' : 'site'}\`.`}`,
			`  Converted ${values} style values in ${converted.written.length} files to brand tokens${converted.palette.mode === 'dark' && theme !== 'dark' ? ' (identified dark surfaces take the brand\'s light theme)' : ''}; ${fixed} additional token fixes.${left ? ` ${left.findings.length} left to change by hand, listed in the tasks.` : ''}`,
			...(project.framework === 'native' ? [] : ['  Color tokens apply to identified components and their states. Shared palettes, artwork, charts and unrelated colors are preserved.']),
			styles.brandCss ? `  Brand stylesheet: ${styles.brandCss}${styles.imported ? `, imported by ${styles.imported}` : styles.linked.length ? `, linked from ${styles.linked.length} pages` : ''}; fonts load ${styles.fonts === 'brand.css' ? 'with it' : `through ${styles.fonts}`}.${dots.length ? ` The hero script loads in ${dots.length} layout${dots.length > 1 ? 's' : ''}.` : ''}` : '  Native app: colors now use the brand values in its own code.',
			...(swap?.decisions.length ? [`  Identified ${swap.decisions.length} components: ${swap.swapped.length} now render the library's (same names and props), ${swap.styled.length} take a library item's look, ${swap.decisions.filter((d) => d.action === 'refine').length} keep their own with brand values. Each decision and why: .ds/components.json.${swap.utils ? ` ${swap.utils} now merges the brand's classes.` : ''}${swap.checked ? ' The app type-checks as before.' : ''}`] : []),
			...(swap?.reverted.length ? [color.yellow(`  Kept the app's own ${swap.reverted.map((f: string) => f.split('/').pop()!.replace(/\.(tsx|jsx)$/, '')).join(', ')}: the library's version did not type-check where it is used, so it is restyled instead.`)] : []),
			...(touched.length ? [`  ${touchNote().replace(/ (is|are)$/, '')}: added in ${touched.join(', ')}; check on the page.`] : []),
			...(layer.count ? [`  Styled ${layer.count} elements (buttons, cards, inputs, links, headings) the brand's way, in a ds:elements block at the end of ${layer.files.length} stylesheet${layer.files.length > 1 ? 's' : ''}; adjust them inside that block.`] : []),
			...(converted.marks.length ? [`  Redrew ${converted.marks.length} light one-color marks (logos, icons) for the white page: ${converted.marks.slice(0, 3).join(', ')}${converted.marks.length > 3 ? ', ...' : ''}`] : []),
			...(converted.rasterLogos.length ? [`  Logo images drawn for the dark site (not recolored): ${converted.rasterLogos.join(', ')}. Check each on white; a white one-color mark needs filter: brightness(0).`] : []),
			...styles.notes.map((n) => color.yellow(`  Note: ${n}`)),
			`  Agents are kept on it: the rules are in AGENTS.md and CLAUDE.md, and hooks check every write in Claude Code, Codex and Cursor, plus a git pre-commit check.${harness === 'codex' ? ' Tell the user: Codex runs the hooks once they trust them with /hooks.' : ''}`,
			`  ${screens.length} screens found; ${main.length} of them, chosen to cover every distinct layout and kind of element, are reviewed: ${main.join(', ')}. The rest share their styles and are covered by the check.`,
			'',
			...(opts.dryRun ? [] : [nextText(root, state)]),
		].join('\n'),
	);
}

function nextText(root: string, state: State) {
	const screens = mainScreens(state);
	const statuses = screens.map((s, i) => taskStatus(root, state, s, i));
	const open = statuses.filter((s) => !s.done);
	// Native screens cannot be reviewed in a browser: one at a time, marked by hand.
	if (open.some((s) => !s.screen.url)) {
		const i = statuses.indexOf(open.find((s) => !s.screen.url)!);
		return renderTask(root, state, statuses[i], i, screens.length + 1);
	}
	// Task 1: the shared shell and every chosen screen at once, scored together by one parallel review.
	if (open.length) return renderBatch(root, state, open, statuses.length - open.length, statuses.length);
	const total = 2;
	// The final sweep: every file in the project passes the check.
	const all = runCheck(root);
	if (all.findings.length) {
		const byFile = new Map<string, number>();
		for (const f of all.findings) byFile.set(f.file, (byFile.get(f.file) ?? 0) + 1);
		return [
			color.bold(`Task ${total} of ${total}: the rest of the project (${all.findings.length} values in ${byFile.size} files are not brand tokens yet).`),
			...[...byFile].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([f, n]) => `    ${String(n).padStart(4)}  ${f}`),
			`  \`${cli()} check <file>\` lists each value with the token to use. Then run \`${cli()}\` again.`,
			...all.findings.slice(0, 3).map((f) => color.dim(`  e.g. ${formatFinding(f)}`)),
		].join('\n');
	}
	const selfScored = screens.filter((s) => state.reviews[s.id]?.by === 'self').map((s) => s.id);
	const skipped = Object.entries(state.skipped ?? {}).filter(([id]) => screens.some((s) => s.id === id));
	return [
		color.bold(skipped.length ? `Done: every main screen passed its review or was skipped, and the whole project passes the check.` : `Done: every main screen passed its review and the whole project passes the check.`),
		...(skipped.length ? [color.yellow(`  Skipped (tell the person each one and why):`), ...skipped.map(([id, why]) => color.yellow(`    ${id}: ${why}`))] : []),
		...screens.flatMap((s) => {
			const r = state.reviews[s.id];
			const left = r?.passed && (r.rounds ?? 0) >= 2 ? r.punch.filter((p) => p.severity === 'major') : [];
			return left.length ? [color.yellow(`  ${s.id} passed at its second review with these left (tell the person): ${left.map((p) => p.issue).join('; ').slice(0, 300)}`)] : [];
		}),
		...(selfScored.length ? [color.yellow(`  Scored by the agent itself, with no separate reviewer (tell the person): ${selfScored.join(', ')}`)] : []),
		`  Show the person the result (desktop and phone) before committing. From now on the hooks keep new work on the brand.`,
	].join('\n');
}

function next(root: string, state: State, opts: RunOptions) {
	const screens = mainScreens(state);
	const done = screens.filter((s, i) => taskStatus(root, state, s, i).done).length;
	const text = nextText(root, state);
	emit(opts, { done, total: screens.length + 1 }, () => [color.dim(`${brand().name} design system: ${done} of ${screens.length} screens done.`), text].join('\n'));
}
