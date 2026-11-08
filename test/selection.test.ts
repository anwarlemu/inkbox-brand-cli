import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { preToolUse } from '../src/hooks/handlers.js';
import { changedFiles } from '../src/check/engine.js';
import { scopeTheme, tokensOnly } from '../src/install/styles.js';
import { missingChakraPackages } from '../src/install/chakra.js';
import { binCommand } from '../src/install/agents.js';
import { adaptComponent, restyleRoot } from '../src/library/adapt.js';
import { componentsIn, identify } from '../src/library/components.js';
import { componentColorEdits } from '../src/convert/components.js';
import { brand } from '../src/lib/brand.js';
import { coverage, itemFor, kindsForItems, resolveTargets } from '../src/plan/scope.js';
import { readState } from '../src/plan/state.js';
import { detectProject, styledFiles } from '../src/project/detect.js';
import { listScreens } from '../src/project/screens.js';
import { profile } from '../src/project/surface.js';

// Applying to a selection: `apply button`, `apply /settings`, `apply PrimaryButton`, `apply button --pages /settings`.

const ROOT = join(import.meta.dirname, '..');
const BIN = join(ROOT, 'bin.js');
const bin = brand().bin;

function project(files: Record<string, string>) {
	const dir = mkdtempSync(join(tmpdir(), 'ds-scope-'));
	for (const [rel, text] of Object.entries(files)) {
		mkdirSync(dirname(join(dir, rel)), { recursive: true });
		writeFileSync(join(dir, rel), text);
	}
	execFileSync('git', ['init', '-q'], { cwd: dir });
	return dir;
}
const cli = (dir: string, ...args: string[]) => spawnSync(process.execPath, [BIN, ...args, '--no-install'], { cwd: dir, encoding: 'utf8', env: { ...process.env, CLAUDECODE: '' } });
const read = (dir: string, rel: string) => readFileSync(join(dir, rel), 'utf8');

// Everything the library's components import is already a dependency, so applying never reaches the network.
const DEPS = { next: '16.0.0', react: '19.0.0', 'react-dom': '19.0.0', tailwindcss: '4.1.0', '@chakra-ui/react': '^3.37.0', '@emotion/react': '^11.14.0', '@emotion/cache': '^11.14.0', 'radix-ui': '*', '@phosphor-icons/react': '*', clsx: '*', 'tailwind-merge': '*', 'class-variance-authority': '*' };
const BUTTON = `import type { ButtonHTMLAttributes, ReactNode } from "react";

type PrimaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger"; size?: "sm" | "md"; children: ReactNode };

export function PrimaryButton({ variant = "primary", size = "md", className = "", children, ...props }: PrimaryButtonProps) {
  const tone = variant === "primary" ? "bg-[#4f46e5] text-white hover:bg-[#4338ca]" : variant === "danger" ? "bg-[#dc2626] text-white" : "border border-[#cbd5e1] bg-white text-[#0f172a]";
  const scale = size === "sm" ? "px-3 py-1.5 text-sm" : "px-5 py-2.5 text-base";
  return (
    <button className={\`inline-flex items-center rounded-md font-semibold \${tone} \${scale} \${className}\`} {...props}>
      {children}
    </button>
  );
}
`;
const APP = {
	'package.json': JSON.stringify({ name: 'acme', private: true, dependencies: DEPS }),
	'tsconfig.json': JSON.stringify({ compilerOptions: { paths: { '@/*': ['./*'] } } }),
	'app/globals.css': '@import "tailwindcss";\n\n:root {\n  --background: #ffffff;\n}\n\nbody {\n  background: var(--background);\n  color: #171717;\n}\n',
	'app/layout.tsx': 'import "./globals.css";\nimport { SiteNav } from "@/components/site-nav";\n\nexport default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <html lang="en">\n      <body>\n        <SiteNav />\n        {children}\n      </body>\n    </html>\n  );\n}\n',
	'components/site-nav.tsx': 'import { PrimaryButton } from "@/components/primary-button";\n\nexport function SiteNav() {\n  return <header className="border-b border-[#e2e8f0] bg-white"><a href="/settings" className="text-sm text-[#334155]">Settings</a><PrimaryButton size="sm">Sign in</PrimaryButton></header>;\n}\n',
	'components/primary-button.tsx': BUTTON,
	'components/stat-card.tsx': 'export function StatCard({ label }: { label: string }) {\n  return <div className="rounded-xl border border-[#e2e8f0] bg-white p-6 text-[13px]">{label}</div>;\n}\n',
	'app/page.tsx': 'import { PrimaryButton } from "@/components/primary-button";\nimport { StatCard } from "@/components/stat-card";\n\nexport default function Home() {\n  return (\n    <main className="p-[13px]">\n      <h1 className="text-[#0f172a]">Acme</h1>\n      <PrimaryButton>Start</PrimaryButton>\n      <button type="button" className="rounded-md px-4 py-2 text-sm text-[#4f46e5] hover:bg-[#eef2ff]">Read the docs</button>\n      <StatCard label="Invoices" />\n    </main>\n  );\n}\n',
	'app/settings/page.tsx': 'import { PrimaryButton } from "@/components/primary-button";\nimport { ProfileForm } from "./profile-form";\n\nexport default function Settings() {\n  return (\n    <main className="p-[13px]">\n      <h1 className="text-[#0f172a]">Settings</h1>\n      <PrimaryButton variant="secondary">Export</PrimaryButton>\n      <ProfileForm />\n    </main>\n  );\n}\n',
	'app/settings/profile-form.tsx': 'export function ProfileForm() {\n  return (\n    <form className="rounded-xl border border-[#e2e8f0] p-[13px]">\n      <input className="rounded-md border border-[#cbd5e1] px-3 py-2" />\n      <button type="submit" className="rounded-md bg-[#4f46e5] px-4 py-2 text-white">Save</button>\n    </form>\n  );\n}\n',
	'app/team/page.tsx': 'import { StatCard } from "@/components/stat-card";\n\nexport default function Team() {\n  return (\n    <main className="p-[13px]">\n      <button type="button" className="rounded-md bg-[#0f172a] px-4 py-2 text-white">Invite</button>\n      <StatCard label="Members" />\n    </main>\n  );\n}\n',
};
const SHARED_SETUP = /^(\.ds\/|\.agents\/|\.claude\/|\.codex\/|\.cursor\/|\.github\/|AGENTS\.md|CLAUDE\.md|GEMINI\.md|components\.json|\.gitignore|app\/globals\.css|app\/layout\.tsx|app\/_[\w-]+\/|lib\/|components\/ds\/|package\.json)/;

function changed(dir: string, base: Record<string, string>) {
	return Object.keys(base).filter((rel) => !existsSync(join(dir, rel)) || read(dir, rel) !== base[rel]);
}

describe('resolving what a person names', () => {
	const dir = project(APP);
	const p = detectProject(dir);
	const files = styledFiles(dir);
	const screens = listScreens(p, files, profile(dir, files));
	it('reads routes, files, globs, library items in any case and the app components', () => {
		const r = resolveTargets(dir, screens, files, { targets: ['/Settings/', 'app/team/page.tsx', 'Button', 'alert-dialog', 'AlertDialog', 'cards', 'PrimaryButton'] });
		expect(r.unresolved).toEqual([]);
		expect(r.spec.pages).toEqual(['/settings']);
		expect(r.spec.files).toEqual(['app/team/page.tsx']);
		expect(r.spec.items).toEqual(['button', 'alert-dialog', 'card']);
		expect(r.spec.own).toEqual([{ file: 'components/primary-button.tsx', name: 'PrimaryButton' }]);
		expect(resolveTargets(dir, screens, files, { targets: ['app/**/page.tsx'] }).spec.files).toEqual(['app/page.tsx', 'app/settings/page.tsx', 'app/team/page.tsx']);
		expect(itemFor('DropdownMenu')).toBe('dropdown-menu');
	});
	it('fails with the closest names when a target matches nothing', () => {
		const r = resolveTargets(dir, screens, files, { targets: ['buton', '/setings'], pages: ['button'] });
		expect(r.unresolved.map((u) => [u.target, u.suggestions[0]])).toEqual([['buton', 'button'], ['/setings', '/settings'], ['button', undefined]]);
	});
	it('maps a library item to the element kinds that stand for it', () => {
		expect(kindsForItems(['button'])).toEqual(expect.arrayContaining(['button', 'button-primary', 'button-secondary']));
		expect(kindsForItems(['badge'])).toContain('chip');
	});
	it('rmdir', () => rmSync(dir, { recursive: true }));
});

describe('apply to a selection', () => {
	it('names nothing it cannot find, and writes nothing then', () => {
		const dir = project(APP);
		try {
			const out = cli(dir, 'apply', 'buton');
			expect(out.status).toBe(1);
			expect(out.stderr).toContain('buton: did you mean button?');
			expect(changed(dir, APP)).toEqual([]);
			expect(existsSync(join(dir, '.ds'))).toBe(false);
		} finally {
			rmSync(dir, { recursive: true });
		}
	});

	it('stops with the fix in a folder with no app, writing nothing', () => {
		const dir = project({ 'README.md': '# Acme' });
		try {
			const out = cli(dir, 'apply');
			expect(out.status).toBe(1);
			expect(out.stderr).toContain('No app to restyle');
			expect(out.stderr).toContain('--cwd');
			expect(existsSync(join(dir, '.ds'))).toBe(false);
			expect(existsSync(join(dir, 'AGENTS.md'))).toBe(false);
		} finally {
			rmSync(dir, { recursive: true });
		}
	});

	it('stops at a monorepo root and names the apps to run it for', () => {
		const dir = project({ 'package.json': JSON.stringify({ private: true, workspaces: ['apps/*'] }), ...Object.fromEntries(Object.entries(APP).map(([k, v]) => [`apps/web/${k}`, v])) });
		try {
			for (const args of [['apply'], ['apply', 'button'], ['add', 'button']]) {
				const out = cli(dir, ...args);
				expect(out.status).toBe(1);
				expect(out.stderr).toContain(`--cwd apps/web`);
			}
			expect(existsSync(join(dir, '.ds'))).toBe(false);
			expect(cli(dir, 'apply', 'button', '--cwd', 'apps/web').status).toBe(0);
			expect(readState(join(dir, 'apps/web'))?.scope?.parts[0].items).toEqual(['button']);
			// The repository's pre-commit checks the app from its own folder, and sees the app's changed files.
			const hook = read(dir, '.git/hooks/pre-commit');
			expect(hook).toContain('(cd "apps/web" && node ');
			const page = join(dir, 'apps/web/app/team/page.tsx');
			writeFileSync(page, readFileSync(page, 'utf8').replace('rounded-md bg-primary', 'rounded-md bg-[#ff0000]'));
			expect(changedFiles(join(dir, 'apps/web'))).toContain('app/team/page.tsx');
			expect(spawnSync('sh', ['.git/hooks/pre-commit'], { cwd: dir, encoding: 'utf8' }).status).toBe(1);
		} finally {
			rmSync(dir, { recursive: true });
		}
	});

	it('hook commands find a CLI hoisted to the monorepo root by a path relative to the app', () => {
		const dir = project({ 'package.json': '{}', [`node_modules/${bin}/bin.js`]: '', 'apps/web/package.json': '{}' });
		try {
			expect(binCommand(join(dir, 'apps/web'), 'claude-code')).toBe(`node "$CLAUDE_PROJECT_DIR/../../node_modules/${bin}/bin.js"`);
			expect(binCommand(join(dir, 'apps/web'), 'other')).toBe(`node ../../node_modules/${bin}/bin.js`);
			expect(binCommand(dir, 'claude-code')).toBe(`node "$CLAUDE_PROJECT_DIR/node_modules/${bin}/bin.js"`);
			expect(binCommand(dir, 'other')).toBe(`node node_modules/${bin}/bin.js`);
			expect(binCommand(join(dir, 'apps/web'), 'codex')).toContain(`--show-toplevel 2>/dev/null || pwd)/node_modules/${bin}/bin.js`);
		} finally {
			rmSync(dir, { recursive: true });
		}
	});

	it('a dry run lists every file with the reason and the changes, and writes nothing', () => {
		const dir = project(APP);
		try {
			const out = JSON.parse(cli(dir, 'apply', 'button', '--dry-run', '--json').stdout);
			expect(changed(dir, APP)).toEqual([]);
			const byFile = Object.fromEntries(out.files.map((f: { file: string; reason: string; changes: number }) => [f.file, f]));
			expect(byFile['components/primary-button.tsx'].reason).toContain('PrimaryButton');
			expect(byFile['app/team/page.tsx'].reason).toContain('colors of the selected elements');
			expect(byFile['app/team/page.tsx'].changes).toBeGreaterThan(0);
			expect(out.files.every((f: { reason: string; changes: number }) => f.reason && f.changes > 0)).toBe(true);
			expect(out.scope.items).toEqual(['button']);
		} finally {
			rmSync(dir, { recursive: true });
		}
	});

	it('`apply button` changes the buttons and their component only; the rest stays byte for byte', () => {
		const dir = project(APP);
		try {
			expect(cli(dir, 'apply', 'button').status).toBe(0);
			const touched = changed(dir, APP).filter((f) => !SHARED_SETUP.test(f));
			expect(touched.sort()).toEqual(['app/page.tsx', 'app/settings/profile-form.tsx', 'app/team/page.tsx', 'components/primary-button.tsx']);
			// The buttons take the brand; every other value in those files is the app's own.
			expect(read(dir, 'app/team/page.tsx')).toContain('bg-primary');
			expect(read(dir, 'app/team/page.tsx')).toContain('p-[13px]');
			expect(read(dir, 'app/settings/profile-form.tsx')).toContain('border-[#cbd5e1]');
			expect(read(dir, 'components/primary-button.tsx')).toContain(`components/ds/button`);
			expect(read(dir, 'app/page.tsx')).toContain('text-[#0f172a]');
			// No base layer while a selection is applied, so other pages keep their type and colors.
			const brandCss = read(dir, `app/_${bin}/brand.css`);
			expect(brandCss).toContain('--ds-color');
			expect(brandCss).not.toContain('@layer base');
			expect(readState(dir)?.scope?.parts.map((p) => p.items)).toEqual([['button']]);
			// The check, the hooks and the pre-commit enforce only the selection.
			const check = cli(dir, 'check');
			expect(check.status).toBe(0);
			expect(cli(dir, 'check', '--all').status).toBe(1);
			// Applying the same selection again (and a card, restyled at its root) changes nothing the second time.
			expect(cli(dir, 'apply', 'card').status).toBe(0);
			const again = [...changed(dir, APP), '.ds/components.json', '.ds/state.json'];
			const snapshot = Object.fromEntries(again.map((f) => [f, read(dir, f)]));
			expect(cli(dir, 'apply', 'card').status).toBe(0);
			expect(cli(dir, 'apply', 'button').status).toBe(0);
			expect(Object.fromEntries(again.map((f) => [f, read(dir, f)]))).toEqual(snapshot);
		} finally {
			rmSync(dir, { recursive: true });
		}
	});

	it('`apply /settings` changes that page and its own form, and names the shared files it left out', () => {
		const dir = project(APP);
		try {
			const out = cli(dir, 'apply', '/settings');
			expect(out.status).toBe(0);
			expect(out.stdout).toContain('Left out, shared with other pages: components/primary-button.tsx');
			expect(changed(dir, APP).filter((f) => !SHARED_SETUP.test(f)).sort()).toEqual(['app/settings/page.tsx', 'app/settings/profile-form.tsx']);
			const state = readState(dir)!;
			expect(state.main).toEqual(['/settings']);
			expect(coverage(state.scope, 'app/settings/profile-form.tsx')).toBe('full');
			expect(coverage(state.scope, 'app/team/page.tsx')).toBe('none');
			// --with-shared takes the shared component too.
			const shared = project(APP);
			try {
				cli(shared, 'apply', '/settings', '--with-shared');
				expect(changed(shared, APP)).toContain('components/primary-button.tsx');
			} finally {
				rmSync(shared, { recursive: true });
			}
		} finally {
			rmSync(dir, { recursive: true });
		}
	});

	it('`apply button --pages /settings` is the buttons on that page only', () => {
		const dir = project(APP);
		try {
			expect(cli(dir, 'apply', 'button', '--pages', '/settings').status).toBe(0);
			expect(changed(dir, APP).filter((f) => !SHARED_SETUP.test(f)).sort()).toEqual(['app/settings/profile-form.tsx']);
			const form = read(dir, 'app/settings/profile-form.tsx');
			expect(form).toContain('bg-primary');
			expect(form).toContain('border-[#cbd5e1]');
		} finally {
			rmSync(dir, { recursive: true });
		}
	});

	it('a later apply widens the selection, --redo repeats it, and a bare apply takes the whole app', () => {
		const dir = project(APP);
		try {
			cli(dir, 'apply', '/settings');
			cli(dir, 'apply', 'button');
			let state = readState(dir)!;
			expect(state.scope?.parts.map((p) => [p.pages, p.items])).toEqual([[['/settings'], []], [[], ['button']]]);
			// Buttons everywhere and all of /settings: not only the buttons on /settings.
			expect(coverage(state.scope, 'app/settings/profile-form.tsx')).toBe('full');
			expect(coverage(state.scope, 'app/team/page.tsx')).toBe('kinds');
			const out = cli(dir, 'apply', '--redo');
			expect(out.stdout).toContain('/settings; button');
			expect(readState(dir)?.scope?.parts).toHaveLength(2);
			// The legacy bare command prints the next task; it never widens.
			cli(dir);
			expect(readState(dir)?.scope).toBeDefined();
			cli(dir, 'apply');
			state = readState(dir)!;
			expect(state.scope).toBeUndefined();
			expect(read(dir, `app/_${bin}/brand.css`)).toContain('@layer base');
		} finally {
			rmSync(dir, { recursive: true });
		}
	});

	it('the write hook blocks off-brand values inside the selection only', () => {
		const dir = project(APP);
		try {
			cli(dir, 'apply', '/settings');
			const write = (rel: string, content: string) => preToolUse(dir, { session_id: 't', cwd: dir, hook_event_name: 'PreToolUse', tool_name: 'Write', tool_input: { file_path: join(dir, rel), content } } as never);
			expect(write('app/team/page.tsx', read(dir, 'app/team/page.tsx').replace('p-[13px]', 'rounded-[7px]')).exitCode).toBeUndefined();
			expect(write('app/settings/page.tsx', read(dir, 'app/settings/page.tsx').replace('<main', '<main data-x').replace('className="', 'className="rounded-[7px] ')).exitCode).toBe(2);
		} finally {
			rmSync(dir, { recursive: true });
		}
	});
});

describe('apply in a Vite app with react-router', () => {
	it('reads its routes from the router, not from the pages folder', () => {
		const dir = project({
			'package.json': JSON.stringify({ dependencies: { vite: '7.0.0', react: '19.0.0', 'react-router-dom': '7.0.0', tailwindcss: '4.1.0' } }),
			'index.html': '<!doctype html><html><head></head><body><div id="root"></div></body></html>',
			'src/App.tsx': 'import { BrowserRouter, Route, Routes } from "react-router-dom";\nimport Home from "./pages/Home";\nimport Settings from "./pages/Settings";\nexport default function App() { return <BrowserRouter><Routes><Route path="/" element={<Home />} /><Route path="/settings" element={<Settings />} /></Routes></BrowserRouter>; }\n',
			'src/pages/Home.tsx': 'export default function Home() { return <main className="p-4">Home</main>; }\n',
			'src/pages/Settings.tsx': 'import { ProfileForm } from "./settings/ProfileForm";\nexport default function Settings() { return <main><ProfileForm /></main>; }\n',
			'src/pages/settings/ProfileForm.tsx': 'export function ProfileForm() { return <form className="p-4" />; }\n',
		});
		try {
			const p = detectProject(dir);
			const files = styledFiles(dir);
			const screens = listScreens(p, files, profile(dir, files));
			expect(screens.map((s) => [s.url, s.file])).toEqual([['/', 'src/pages/Home.tsx'], ['/settings', 'src/pages/Settings.tsx']]);
			const r = resolveTargets(dir, screens, files, { targets: ['/settings'] });
			expect(r.spec.pages).toEqual(['/settings']);
		} finally {
			rmSync(dir, { recursive: true });
		}
	});
});

describe('bugs found applying to real apps', () => {
	it('a button with no fill of its own takes the quiet look, not white text on the page', () => {
		const text = 'export function A() { return <button type="button" className="rounded-md px-4 py-2 text-sm text-[#4f46e5]">Docs</button>; }';
		const edits = componentColorEdits('a.tsx', text, 'site');
		expect(edits.map((e) => e.text)).not.toContain('text-on-primary');
		expect(edits.length).toBe(1);
	});
	it('swaps a button whose body only computes its classes in constants', () => {
		const [c] = componentsIn('components/primary-button.tsx', BUTTON);
		const id = identify(c, 'site');
		const out = adaptComponent(BUTTON, c, id.item!, 'site', '@/components/ds/button', c.values);
		expect(out).toContain('<DsButton');
		expect(out).not.toContain('const tone');
		// A body that does more than pick classes keeps its own button.
		const stateful = BUTTON.replace('const scale =', 'const [open] = useState(false);\n  const scale =');
		const [s] = componentsIn('components/primary-button.tsx', stateful);
		expect(adaptComponent(stateful, s, 'button', 'site', '@/components/ds/button', s.values)).toBeUndefined();
	});
	it('a stat card is a card, and its restyle takes the look but keeps its own layout', () => {
		const text = 'export function StatCard({ label }: { label: string }) { return <div className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm">{label}</div>; }';
		const [card] = componentsIn('stat-card.tsx', text);
		expect(identify(card, 'site').item).toBe('card');
		const out = restyleRoot(text, card, 'card', 'group/card flex flex-col gap-3 rounded-dialog py-3.5 text-fg border border-line-field bg-surface')!;
		expect(out).toContain('className="p-6 rounded-dialog text-fg border border-line-field bg-surface"');
	});
	it('a root restyle leaves the separators between class expressions alone', () => {
		const text = 'export function Tag({ className }: { className?: string }) { return <span className={["rounded-full bg-green-100", className].join(" ")}>x</span>; }';
		const [tag] = componentsIn('Tag.tsx', text);
		const out = restyleRoot(text, tag, 'badge', 'rounded-control border');
		expect(out).toContain('.join(" ")');
	});
	it('a swap sets up the provider its library components render in, with server-rendered styles in Next', () => {
		const dir = project(APP);
		try {
			expect(cli(dir, 'apply', 'button').status).toBe(0);
			const layout = read(dir, 'app/layout.tsx');
			expect(layout).toMatch(/<\w+ChakraProvider>/);
			const provider = read(dir, 'components/ui/provider.tsx');
			expect(provider).toContain('useServerInsertedHTML');
			expect(provider).toContain('@emotion/cache');
			const bare = project({ 'package.json': JSON.stringify({ dependencies: { '@chakra-ui/react': '^3.37.0', '@emotion/react': '^11.14.0' } }) });
			expect(missingChakraPackages(bare, true)).toEqual(['@emotion/cache@^11.14.0']);
			expect(missingChakraPackages(bare, false)).toEqual([]);
			rmSync(bare, { recursive: true });
		} finally {
			rmSync(dir, { recursive: true });
		}
	});
	it('a selection theme keeps the app value for keys it shares with Tailwind, and the brand value inside library components', () => {
		const theme = '@theme inline {\n\t--font-sans: var(--ds-font-sans);\n\t--spacing-2\\.5: var(--ds-space-2-5);\n\t--transition-duration-150: var(--ds-duration-fast);\n\t--color-fg: var(--ds-color-text-default);\n}\n@theme {\n\t--animate-x: x 1s;\n}\n';
		const out = scopeTheme(theme, new Map([['--font-sans', 'var(--font-geist-sans)']]), new Map([['--font-sans', 'ui-sans-serif'], ['--spacing', '0.25rem']]));
		expect(out.theme).toContain('--font-sans: var(--ds-scope-font-sans);');
		expect(out.theme).toContain('--color-fg: var(--ds-color-text-default);');
		expect(out.css).toMatch(/:root \{[^}]*--ds-scope-font-sans: var\(--font-geist-sans\);[^}]*--ds-scope-spacing-2--5: calc\(0\.25rem \* 2\.5\);[^}]*--ds-scope-transition-duration-150: 150ms;/);
		expect(out.css).toMatch(/:where\(\[data-slot\]\) \{[^}]*--ds-scope-font-sans: var\(--ds-font-sans\);/);
		expect(out.theme).toContain('--animate-x: x 1s;');
	});
	it('the selection stylesheet keeps tokens and drops the base layer', () => {
		const css = ':root {\n\t--ds-color-x: #fff;\n}\n@layer base {\n\tbody { color: red; }\n}\n:where(button) { touch-action: manipulation; }\n.ds-label { color: var(--ds-color-x); }\n@media (prefers-reduced-motion: reduce) {\n\t* { transition: none; }\n}\n@media (prefers-color-scheme: dark) {\n\t:root { --ds-color-x: #000; }\n}\n';
		const out = tokensOnly(css);
		expect(out).toContain('--ds-color-x: #fff');
		expect(out).toContain('.ds-label');
		expect(out).toContain('--ds-color-x: #000');
		expect(out).not.toMatch(/@layer base|touch-action|transition: none/);
	});
});
