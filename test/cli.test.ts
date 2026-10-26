import { brand } from '../src/lib/brand.js';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { applyFixes, checkText, runCheck } from '../src/check/engine.js';
import { convertCss, newStats } from '../src/convert/css.js';
import { convertMarkup } from '../src/convert/markup.js';
import { convertNative } from '../src/convert/native.js';
import { sitePalette } from '../src/convert/palette.js';
import { convertClasses, convertScript, lineFamily } from '../src/convert/script.js';
import { convertSvgMark } from '../src/convert/svg.js';
import { cursorPreToolUse, preToolUse, stop } from '../src/hooks/handlers.js';
import { patchWrites } from '../src/hooks/payload.js';
import { runningHarness } from '../src/install/agents.js';
import { elements, tokens } from '../src/lib/brand.js';
import { elementsIn } from '../src/plan/elements.js';
import { adaptComponent, restyleRoot } from '../src/library/adapt.js';
import { componentsIn, identify } from '../src/library/components.js';
import { restyleOverlays } from '../src/library/overlay-styles.js';
import { applyComponents } from '../src/library/swap.js';
import { parse as parseTs } from '@babel/parser';
import { readState } from '../src/plan/state.js';
import { detectProject, styledFiles } from '../src/project/detect.js';
import { listScreens } from '../src/project/screens.js';
import { profile } from '../src/project/surface.js';
import { pickEngine, scorecardJsonSchema } from '../src/review/critique.js';
import { elementLayer } from '../src/install/layer.js';
import { accentSplit, addTouches } from '../src/install/touches.js';
import { groundAliases } from '../src/install/styles.js';
import { patchUtils } from '../src/library/swap.js';

const ROOT = join(import.meta.dirname, '..');
const BIN = join(ROOT, 'bin.js');

function project(files: Record<string, string>) {
	const dir = mkdtempSync(join(tmpdir(), 'ds-'));
	for (const [rel, text] of Object.entries(files)) {
		mkdirSync(dirname(join(dir, rel)), { recursive: true });
		writeFileSync(join(dir, rel), text);
	}
	execFileSync('git', ['init', '-q'], { cwd: dir });
	return dir;
}
const run = (dir: string, ...args: string[]) => execFileSync(process.execPath, [BIN, ...args, '--no-install'], { cwd: dir, encoding: 'utf8', env: { ...process.env, CLAUDECODE: '' } });

describe('brand data', () => {
	it('every element style uses only brand tokens and follows the motion rules', () => {
		const known = new Set(Object.keys(tokens().site));
		for (const surface of ['site'] as const) {
			for (const [id, el] of Object.entries(elements()[surface])) {
				const values = [...Object.values(el.css), ...Object.values(el.states ?? {}).flatMap((o) => Object.values(o))];
				for (const v of values) {
					for (const m of v.matchAll(/var\((--ds-[\w-]+)/g)) expect(known.has(m[1]), `${id}: ${m[1]}`).toBe(true);
					const raw = v.replace(/var\([^)]*\)/g, '').replace(/color-mix\(in srgb,\s*,?/g, '');
					expect(raw, `${id}: ${v}`).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i);
					expect(raw.replace(/\b[12]px\b|4px\b/g, ''), `${id}: ${v}`).not.toMatch(/\d(px|rem|ms)\b/);
					expect(v, `${id}`).not.toMatch(/\bease-in\b(?!-)|transition:\s*all/);
				}
				expect(el.rules.length, id).toBeGreaterThan(0);
				expect(el.source, id).toBeTruthy();
			}
		}
	});
	it('text tokens are readable on the page: AA contrast for primary copy', () => {
		const hex = (n: string) => tokens().site[n];
		const lum = (h: string) => {
			const c = [1, 3, 5].map((i) => Number.parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
			return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
		};
		const ratio = (a: string, b: string) => {
			const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
			return (x + 0.05) / (y + 0.05);
		};
		for (const t of ['text-default', 'text-secondary', 'text-nav', 'text-brand']) expect(ratio(hex(`--ds-color-${t}`), '#FFFFFF'), t).toBeGreaterThanOrEqual(4.5);
		// The design's muted purples (table heads, dates, placeholders) are kept as measured, near 3:1; the guidance keeps
		// them to secondary information (ASSUMPTIONS.md). Guard against them getting any lighter.
		for (const t of ['text-muted', 'text-subtle']) expect(ratio(hex(`--ds-color-${t}`), '#FFFFFF'), t).toBeGreaterThanOrEqual(2.8);
	});
});

describe('convert', () => {
	const stats = newStats;
	it('turns a dark site into the brand light one by role', () => {
		const css = 'body { background: #0b0b0c; color: #f5f5f5; }\n.card { background: #18181b; border: 1px solid rgba(255,255,255,.08); }\n.muted { color: #a1a1aa; }\n.cta { background: #7c3aed; color: #fff; }';
		const out = convertCss(css, sitePalette(css), stats());
		expect(out).toContain('body { background: var(--ds-color-bg-default); color: var(--ds-color-text-default)');
		expect(out).toContain('.cta { background: var(--ds-color-bg-brand); color: var(--ds-color-text-on-brand)');
		expect(out).toMatch(/\.muted \{ color: var\(--ds-color-text-(muted|subtle)\)/);
	});
	it('maps dark inks to black, warm paper to white, and red only where it means an error', () => {
		const css = ':root { --ink: #2b1a1f; --wine: #5c1a2c; --paper: #fbf6f0; }\nbody { background: var(--paper); color: var(--ink); }\n.btn { background: var(--wine); }\n.rose { color: #b85566; }\n.err { color: #dc2626; }';
		const out = convertCss(css, sitePalette(css), stats());
		expect(out).toContain('--ink: var(--ds-color-text-default)');
		expect(out).toContain('--paper: var(--ds-color-bg-default)');
		expect(out).toContain('.rose { color: var(--ds-color-text-brand)');
		expect(out).toContain('.err { color: var(--ds-color-status-danger)');
	});
	it('keeps fonts, fluid type, long animations and @font-face intact where it must', () => {
		const css = "/* fonts */\n@font-face { font-family: 'X'; font-weight: 700; }\nh1 { font-size: clamp(40px, 6vw, 72px); font-weight: 700; letter-spacing: -0.04em; }\n.m { animation: scroll 48s linear infinite; transition: all .3s ease-in; }";
		const out = convertCss(css, sitePalette(''), stats());
		expect(out).toContain("@font-face { font-family: 'X'; font-weight: 700; }");
		expect(out).toMatch(/font-size: clamp\(var\(--ds-text-[\w-]+\), 6vw, var\(--ds-text-[\w-]+\)\)/);
		expect(out).toContain('font-weight: var(--ds-font-weight-heading)');
		expect(out).toContain('h1 { font-size: clamp(');
		expect(convertCss('h2 { font-family: Georgia, serif } p { font-family: Lato }', sitePalette(''), stats())).toBe('h2 { font-family: var(--ds-font-display) } p { font-family: var(--ds-font-sans) }');
		expect(out).toContain('letter-spacing: var(--ds-tracking-tight)');
		expect(out).toContain('animation: scroll 48s linear infinite');
		expect(out).toMatch(/transition: color, background-color, border-color, box-shadow, opacity, transform var\(--ds-duration-slow\) var\(--ds-easing-out\)/);
	});
	it('reads channel triplets and a comment above :root does not flip the theme', () => {
		const css = '/* same under prefers-color-scheme: dark */\n:root { --black: 0 0 0; --bg: #ffffff; }\nbody { background: var(--bg); }\n.x { background: rgb(var(--black) / 0.5); }';
		const out = convertCss(css, sitePalette(css), stats());
		expect(out).toContain('--bg: var(--ds-color-bg-default)');
		expect(out).toMatch(/\.x \{ background: color-mix\(in srgb, var\(--ds-color-(text-default|black)\) 50%/);
	});
	it('converts Tailwind classes, style objects, chart literals and native colors', () => {
		const pal = sitePalette('body { background: #fff; color: #111; }');
		expect(convertClasses('bg-white text-gray-500 hover:bg-blue-600 border-zinc-200', pal, stats(), true)).toBe('bg-surface text-fg-muted hover:bg-surface-brand border-line-subtle');
		expect(convertScript("const s = { color: '#ff0000', marginTop: 16 }; const series = ['#22c55e', '#f59e0b', '#8b5cf6'];", pal, stats(), {})).toMatch(/marginTop: 'var\(--ds-space-4\)'.*#74629D.*#F9B1B5/s);
		expect(convertNative('val bg = Color(0xFF0B0B0C)\nText(color = Color(0xFFF5F5F5))', sitePalette('body{background:#0b0b0c;color:#f5f5f5}'), stats(), 'site')).toContain('Color(0xFFFFFFFF)');
	});
	it('reads a text color by its property, not by the words in the line', () => {
		expect(lineFamily('Text("Your cards").foregroundColor(Color(hex: "#A1A1AA"))')).toBe('text');
		expect(lineFamily('RoundedRectangle(cornerRadius: 12).fill(Color(hex: "#18181B"))')).toBe('surface');
	});
	it('puts wide containers on the ruled column, on a site only', () => {
		const css = ':root { --max-w: 1200px; --measure: 640px } .wrap { max-width: 1280px } .form { max-width: 480px }';
		const out = convertCss(css, { ...sitePalette(''), column: true }, stats());
		expect(out).toContain('--max-w: var(--ds-frame-column)');
		expect(out).toContain('.wrap { max-width: var(--ds-frame-column) }');
		expect(out).toContain('--measure: 640px');
		expect(out).toContain('max-width: 480px');
		expect(convertCss(css, sitePalette(''), stats())).not.toContain('frame-column');
		expect(convertClasses('mx-auto max-w-7xl px-6', { ...sitePalette(''), column: true }, stats(), true)).toBe('mx-auto max-w-(--ds-frame-column) px-6');
	});
	it('flips plain white drawn in code for a dark page, keeps real colors, and converts inline scripts', () => {
		const dark = sitePalette('body{background:#08090a;color:#fff}');
		const trail = "const ctx = c.getContext('2d');\nctx.fillStyle = 'rgba(255,255,255,' + a + ')';\nconst glow = 'rgba(255, 255, 255, 0.2)';\nconst sea = '#1a4fd0';";
		const out = convertScript(trail, dark, stats(), {});
		expect(out).toContain("'rgba(62,42,83,' + a");
		expect(out).toContain("'rgba(62, 42, 83, 0.2)'");
		expect(out).toContain("'#1a4fd0'");
		expect(convertMarkup('<script>const s = { color: "#ffffff" };</script>', dark, stats())).not.toContain('#ffffff');
		expect(convertMarkup('<script type="application/ld+json">{"color":"#ffffff"}</script>', dark, stats())).toContain('#ffffff');
	});
	it('converts bare spacing numbers only in inline styles, not in settings objects', () => {
		const out = convertScript('const design = { gap: 3.8, dot: 7 };\nconst el = <div style={{ gap: 6, marginTop: 16 }} />;', sitePalette(''), stats(), {});
		expect(out).toContain('gap: 3.8');
		expect(out).toMatch(/style=\{\{ gap: 'var\(--ds-space-/);
	});
	it('leaves the colors of a 3D or canvas scene alone', () => {
		const scene = "import * as THREE from 'three';\nconst sea = new THREE.Color('#1a4fd0');\nconst style = { color: '#ff6600' };";
		const out = convertScript(scene, sitePalette(''), stats(), {});
		expect(out).toContain("'#1a4fd0'");
	});
	it('keeps style guide swatches and redraws only light one-color marks for a dark site', () => {
		expect(convertMarkup('<div style="background:#ff6600"></div><span>#ff6600</span>', sitePalette(''), stats())).toContain('background:#ff6600');
		const dark = sitePalette('body{background:#000;color:#fff}');
		expect(convertSvgMark('<svg><path fill="#ffffff"/></svg>', dark)).toContain('fill="#3E2A53"');
		expect(convertSvgMark('<svg><path fill="#ff0000"/><path fill="#fff"/></svg>', dark)).toContain('#ff0000');
	});
});

describe('project', () => {
	it('styles every project as a site (the brand has a site only), and lists screens home first', () => {
		const p = project({ 'package.json': '{"name":"acme-admin","dependencies":{"next":"15"}}', 'app/(dashboard)/page.tsx': "import { LineChart } from 'recharts'; export default () => <table/>", 'app/settings/page.tsx': '<div/>', 'app/login/page.tsx': '<form/>' });
		expect(profile(p, styledFiles(p))).toMatchObject({ surface: 'site', mixed: false });
		const s = project({ 'index.html': '<section class="hero"><h1>Hi</h1></section><footer></footer>', 'about.html': '<h1>About</h1>', 'pricing.html': '<p>pricing</p>', '404.html': '<h1>Lost</h1>', 'styles.css': 'body{}' });
		const found = profile(s, styledFiles(s));
		expect(found.surface).toBe('site');
		expect(listScreens(detectProject(s), styledFiles(s), found).map((x) => x.url)).toEqual(['/', '/about.html', '/pricing.html', '/404.html']);
		// A project route that shares the CLI's name is still the project's; only the files the CLI writes are skipped.
		const n = project({ 'src/app/inkbox-ds/page.tsx': '<div style={{ color: "#ff0000" }} />', 'src/app/_inkbox-ds/brand.css': ':root{}' });
		expect(styledFiles(n)).toEqual(['src/app/inkbox-ds/page.tsx']);
		rmSync(n, { recursive: true });
		for (const d of [p, s]) rmSync(d, { recursive: true });
	});
});

describe('check', () => {
	it('flags raw values with the token to use, and fixes exact matches', () => {
		const css = '.a { color: #74629d; padding: 16px; font-weight: 700; transition: all 300ms ease-in; font-family: Inter; }';
		const r = checkText('a.css', css);
		expect(r.findings.map((f) => f.rule)).toEqual(expect.arrayContaining(['raw-color', 'off-scale', 'font', 'motion']));
		expect(r.findings.find((f) => f.rule === 'raw-color')?.hint).toContain('var(--ds-color-brand)');
		const fixed = applyFixes(css, r.findings.map((f) => f.fix).filter((f): f is NonNullable<typeof f> => !!f)).text;
		expect(fixed).toContain('color: var(--ds-color-brand)');
		expect(fixed).toContain('padding: var(--ds-space-4)');
	});
	it('checks Tailwind classes, style objects and template styles, and accepts brand values', () => {
		expect(checkText('a.tsx', 'export const A = () => <p className="text-red-500 p-[13px] font-bold text-sm">x</p>;').findings.map((f) => f.rule)).toEqual(['raw-color', 'off-scale', 'off-scale']);
		expect(checkText('a.tsx', 'export const A = () => <p style={{ color: "#ff0000" }}>x</p>;').findings[0].rule).toBe('raw-color');
		expect(checkText('a.astro', '<p style="color: #ff0000">x</p><style>.a { gap: 13px }</style>').findings.map((f) => f.rule)).toEqual(['raw-color', 'off-scale']);
		expect(checkText('a.tsx', 'export const A = () => <p className="bg-surface text-fg-muted p-4 rounded-control" style={{ color: "var(--ds-color-brand)" }}>x</p>;').findings).toEqual([]);
		expect(checkText('a.css', '.a { color: var(--ds-color-nope); }').findings[0].rule).toBe('unknown-token');
	});
	it('allows only the brand icon set', () => {
		const rules = (path: string, text: string) => checkText(path, text).findings.map((f) => f.rule);
		expect(rules('a.tsx', 'import { Mail } from "lucide-react";\nimport { XMarkIcon } from "@heroicons/react/24/solid";')).toEqual(['icon-pack', 'icon-pack']);
		expect(checkText('a.tsx', 'import { Mail } from "lucide-react";').findings[0]).toMatchObject({ line: 1, snippet: 'lucide-react' });
		expect(rules('a.vue', '<script setup>\nimport { Mail } from "lucide-vue-next";\n</script>\n<template><Mail /></template>')).toEqual(['icon-pack']);
		expect(rules('a.js', 'const { Feather } = require("@expo/vector-icons");')).toEqual(['icon-pack']);
		expect(rules('a.tsx', 'import { Horse } from "phosphor-react";')).toEqual(['icon-pack']);
		expect(rules('a.tsx', 'import { TrayIcon } from "@phosphor-icons/react/ssr";\nimport { House } from "phosphor-react-native";\nimport { cn } from "@/lib/utils";')).toEqual([]);
	});
	it('accepts a swatch that prints its own value', () => {
		expect(checkText('brand.html', '<div style="background:#08090A"></div><code>#08090A</code>').findings).toHaveLength(0);
		expect(checkText('page.html', '<div style="background:#08090A"></div><p>Hello</p>').findings.length).toBeGreaterThan(0);
	});
	it('a folder stands for the styled files inside it', () => {
		const p = project({ 'ui/a.css': '.a { color: #ff0000; }', 'ui/b.tsx': 'export const B = () => <p className="text-fg">x</p>;', 'other/c.css': '.c { color: #00ff00; }' });
		const r = runCheck(p, { paths: ['ui'] });
		expect(r.files).toBe(2);
		expect(r.findings.map((f) => f.file)).toEqual(['ui/a.css']);
		rmSync(p, { recursive: true });
	});
	it('a ds-override counts only once a person approves it', () => {
		const p = project({ 'a.css': '.a { color: #ff0000; } /* ds-override: partner logo color */' });
		const r = runCheck(p);
		expect(r.findings.map((f) => f.rule)).toEqual(['override-approval']);
		rmSync(p, { recursive: true });
	});
});

describe('element layer', () => {
	it('styles only elements whose class says what they are, skin only, with gated hover and reduced motion', () => {
		const css = '.btn-primary { padding: 10px; display: grid } .hw-msg-main { color: red } .plan-card { width: 300px } button { color: red } .nav-links > a { color: red }';
		const { block, count } = elementLayer('styles.css', css, 'site');
		expect(block).toMatch(/\.btn-primary \{[^}]*background-color: var\(--ds-color-action-primary\)/);
		expect(block).not.toContain('.hw-msg-main');
		expect(block).toMatch(/\.plan-card \{/);
		expect(block).not.toMatch(/^button/m);
		expect(block).not.toMatch(/display:|width:/);
		expect(block).toContain('@media (hover: hover) and (pointer: fine)');
		expect(block).toContain('prefers-reduced-motion: reduce');
		expect(count).toBeGreaterThanOrEqual(2);
	});
});

describe('swap', () => {
	it("teaches an app's cn the brand's scales, keeping its other exports", () => {
		const old = 'import { clsx, type ClassValue } from "clsx";\nimport { twMerge } from "tailwind-merge";\n\nexport function cn(...inputs: ClassValue[]) {\n  return twMerge(clsx(inputs));\n}\nexport const formatDate = () => "";\n';
		const patched = patchUtils(old)!;
		expect(patched).toContain('extendTailwindMerge');
		expect(patched).toContain('"body-sm"');
		expect(patched).toContain('export const formatDate');
		expect(patchUtils(patched)).toBeUndefined();
		expect(patchUtils('export { cn } from "cn"\n')).toContain('export function cn(');
	});
});

describe('touches', () => {
	it('marks the hero with the brand\'s attribute and leaves headings and words as they are', () => {
		const html = '<section class="hero"><h1>All your tasks, sales and clients \u2014 in one workspace</h1></section><h2>Built for agencies of every size</h2><h2>Our <b>team</b> today</h2>';
		const out = addTouches(html, false);
		// Inkbox has no touches: the home page is left exactly as it is.
		expect(out).toBe(html);
		expect(out.replace(/<[^>]+>/g, '')).toBe(html.replace(/<[^>]+>/g, ''));
		expect(addTouches(out, false)).toBe(out);
		expect(accentSplit('All your tasks, sales and clients \u2014 in one workspace')?.[1]).toBe('in one workspace');
	});
});

describe('blue ground', () => {
	it('declares nothing when the brand has no hero ground', () => {
		const css = groundAliases(':root { --fg: var(--ds-color-text-default); --gap: 4px; --ds-x: var(--ds-color-brand) }\n.card { --tint: var(--ds-color-bg-tint) }');
		// Inkbox has no blue ground, so nothing is declared again.
		expect(css).toBe('');
	});
});

describe('elements', () => {
	it('reads a stylesheet with long comments quickly, with the right line numbers', () => {
		const css = `/* ${'note '.repeat(20000)}\n${'more\n'.repeat(50)} */\n.btn-primary { color: red }`;
		const t = Date.now();
		const hits = elementsIn('a.css', css.repeat(4), 'site');
		expect(Date.now() - t).toBeLessThan(2000);
		expect(hits[0]).toMatchObject({ kind: 'button-primary', line: 53 });
	});
	it('recognizes buttons, headings, cards and nav links', () => {
		const html = '<header><nav><a href="/">Docs</a><a class="btn btn-primary">Start</a></nav></header><section class="hero"><h1>Title</h1></section><section><h2 class="title">Features</h2><div class="feature-card"><h3>One</h3></div><a class="btn-outline">More</a></section>';
		const kinds = elementsIn('index.html', html, 'site').map((h) => h.kind);
		expect(kinds).toEqual(expect.arrayContaining(['header', 'nav-link', 'header-action', 'hero', 'hero-title', 'section-heading', 'card', 'button-secondary']));
		const app = elementsIn('page.tsx', '<div class="window"><div class="titlebar">team.dir</div></div><table><th>Name</th></table><button className="btn-primary">Create</button>', 'site').map((h) => h.kind);
		expect(app).toEqual(expect.arrayContaining(['window', 'window-bar', 'table', 'button-primary']));
	});
});

describe('hooks', () => {
	it('blocks a write that adds an off-brand value, for Claude Code, Codex and Cursor', () => {
		const p = project({ 'package.json': '{}', 'a.tsx': 'export const A = () => null;' });
		const bad = 'export const A = () => <p style={{ color: "#ff0000" }}>x</p>;';
		expect(preToolUse(p, { tool_name: 'Write', tool_input: { file_path: join(p, 'b.tsx'), content: bad } }).exitCode).toBe(2);
		const patch = ['*** Begin Patch', '*** Add File: c.tsx', `+${bad}`, '*** End Patch'].join('\n');
		expect(patchWrites(patch, p)[0].relPath).toBe('c.tsx');
		expect(preToolUse(p, { tool_name: 'apply_patch', cwd: p, tool_input: { command: patch } }).exitCode).toBe(2);
		expect(cursorPreToolUse(p, { tool_name: 'Write', tool_input: { file_path: join(p, 'd.tsx'), contents: bad } }).json).toMatchObject({ permission: 'deny' });
		expect(preToolUse(p, { tool_name: 'Write', tool_input: { file_path: join(p, 'e.tsx'), content: 'export const A = () => <p className="text-fg">x</p>;' } }).exitCode).toBeUndefined();
		rmSync(p, { recursive: true });
	});
	it('does not block for errors that were already there, and blocks finishing while changed files fail', () => {
		const p = project({ 'package.json': '{}', 'a.css': '.a { color: #ff0000; }\n' });
		expect(preToolUse(p, { tool_name: 'Edit', tool_input: { file_path: join(p, 'a.css'), old_string: '.a', new_string: '.b' } }).exitCode).toBeUndefined();
		expect((stop(p, { session_id: 's' }).json as any)?.decision).toBe('block');
		rmSync(p, { recursive: true });
	});
	it('knows which agent runs it', () => {
		expect(runningHarness({ CODEX_THREAD_ID: '1', CLAUDECODE: '1' })).toBe('codex');
		expect(runningHarness({ CLAUDECODE: '1' })).toBe('claude-code');
	});
});

describe('review', () => {
	it('runs on whatever agent is at hand, or lets the agent score it itself', () => {
		const keep = { ...process.env };
		for (const k of ['ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN', 'ANTHROPIC_PROFILE', 'CODEX_THREAD_ID', 'CLAUDECODE']) delete process.env[k];
		process.env.PATH = '/nonexistent';
		process.env.HOME = '/nonexistent';
		try {
			expect(pickEngine()).toBe('self');
			process.env.DS_REVIEW_ENGINE = 'codex';
			expect(pickEngine()).toBe('codex');
		} finally {
			process.env = keep;
		}
		const schema = scorecardJsonSchema();
		expect(schema.additionalProperties).toBe(false);
		expect(schema.properties.punch_list.items.required).toEqual(['viewport', 'region', 'issue', 'fix', 'severity']);
	});
});

describe('next fonts', () => {
	it('wires the brand fonts after the last import, in a layout without semicolons', () => {
		const p = project({
			'package.json': JSON.stringify({ name: 'site', dependencies: { next: '16.0.0', react: '19.0.0' } }),
			'app/globals.css': 'body { color: #111; }',
			'app/layout.tsx': 'import type { Metadata } from "next"\nimport "./globals.css"\n\n/* A note; with a semicolon,\n   over two lines */\nexport default function RootLayout({ children }: { children: React.ReactNode }) {\n  return <html lang="en" className="h-full"><body>{children}</body></html>\n}\n',
			'app/page.tsx': 'export default function Page() { return <main><h1>Hi</h1></main> }',
		});
		run(p);
		const layout = readFileSync(join(p, 'app/layout.tsx'), 'utf8');
		expect(layout).toContain('import "./globals.css"\nimport { dsFontVariables }');
		expect(layout).toContain('/* A note; with a semicolon,\n   over two lines */');
		expect(layout).toContain('className={`${dsFontVariables} h-full`}');
		rmSync(p, { recursive: true });
	});
});

describe('the one command', () => {
	it('installs, converts and prints the first task on a plain HTML site; runs again with the next task', () => {
		const p = project({
			'index.html': '<!doctype html><html><head><link rel="stylesheet" href="/styles.css"></head><body><section class="hero"><h1>Fast sites</h1><a class="btn btn-primary">Start</a></section><section><h2 class="title">Features</h2></section></body></html>',
			'about.html': '<!doctype html><html><head><link rel="stylesheet" href="/styles.css"></head><body><h1>About</h1></body></html>',
			'styles.css': "/* site */\n@font-face { font-family: 'Brand'; src: url(b.woff2); }\nbody { background: #0a0a0a; color: #fafafa; font-family: 'Brand', sans-serif; }\n.btn-primary { background: #7c3aed; padding: 13px 22px; border-radius: 6px; }",
		});
		const first = run(p);
		expect(first).toMatch(/installed and applied/);
		expect(first).toMatch(/Task 1 of 2: 2 main screens and the shared shell/);
		const css = readFileSync(join(p, 'styles.css'), 'utf8');
		expect(css.startsWith('/* site */\n@import "./_inkbox-ds/brand.css";')).toBe(true);
		expect(css).toContain("@font-face { font-family: 'Brand'; src: url(b.woff2); }");
		expect(css).toContain('background: var(--ds-color-bg-default)');
		expect(readFileSync(join(p, '_inkbox-ds/brand.css'), 'utf8')).toMatch(/^@import url\("https:\/\/fonts\.googleapis\.com\/css2\?family=Inter/);
		expect(readFileSync(join(p, 'index.html'), 'utf8')).not.toContain('<script');
		expect(readFileSync(join(p, 'AGENTS.md'), 'utf8')).toContain('ds:contract:start');
		expect(JSON.parse(readFileSync(join(p, '.claude/settings.json'), 'utf8')).hooks.PreToolUse[0].hooks[0].command).toMatch(/hook pre-tool-use/);
		expect(existsSync(join(p, '.git/hooks/pre-commit'))).toBe(true);
		expect(readState(p)?.screens.map((s) => s.url)).toEqual(['/', '/about.html']);
		const again = run(p);
		expect(again).toMatch(/0 of 2 screens done/);
		expect(readFileSync(join(p, 'index.html'), 'utf8')).toContain('<section class="hero">');
		expect(again).not.toMatch(/Add data-ds-hero/);
		expect(again).not.toMatch(/Wrap the closing words/);
		run(p, 'skip', '/', '--reason', 'needs a database');
		const skipped = run(p);
		expect(skipped).toMatch(/1 of 2 screens done/);
		expect(skipped).toMatch(/Task 1 of 2: the main screen \(1 of 2 done\)/);
		expect(skipped).toMatch(/\/about\.html \(about\.html\)/);
		expect(skipped).toMatch(/review --all/);
		expect(readState(p)?.skipped).toEqual({ '/': 'needs a database' });
		const refused = (() => {
			try {
				return run(p, 'review', 'http://localhost:9/missing.html');
			} catch (e) {
				return String((e as { stdout?: string }).stdout);
			}
		})();
		expect(refused).toMatch(/not one of the tasks/);
		// An agent with no separate reviewer scores the screen itself and submits it; the person is told.
		const dir = '.ds/review/manual';
		mkdirSync(join(p, dir), { recursive: true });
		writeFileSync(join(p, dir, 'meta.json'), JSON.stringify({ url: 'http://localhost:9/about.html', screen: '/about.html' }));
		writeFileSync(join(p, dir, 'scorecard.json'), JSON.stringify({ purpose: 'About', scores: { hierarchy: 8, coherence: 8, brand_voice: 8, detail_quality: 8, accessibility: 8 }, punch_list: [], verdict: 'ok' }));
		expect(run(p, 'review', '--submit', dir)).toMatch(/Passed/);
		expect(readState(p)?.reviews['/about.html']).toMatchObject({ passed: true, by: 'self' });
		rmSync(p, { recursive: true });
	});
	it('every command answers --help', () => {
		for (const c of ['review', 'look', 'check', 'tokens', 'approve', 'done', 'skip', 'snapshot', 'hook']) expect(execFileSync(process.execPath, [BIN, c, '--help'], { encoding: 'utf8' })).toMatch(/Usage/);
	});
});

describe('component pass', () => {
	const BUTTON = `import * as React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger"; size?: "small" | "large"; loading?: boolean };

export function Button({ variant = "primary", size, loading, className, children, ...rest }: ButtonProps) {
  return <button className={"rounded-lg px-4 py-2 bg-indigo-600 text-white font-semibold " + (className ?? "")} disabled={loading} {...rest}>{children}</button>;
}
`;
	it('identifies components by name, structure and props', () => {
		const [button] = componentsIn('components/Button.tsx', BUTTON);
		expect(identify(button, 'product')).toMatchObject({ item: 'button' });
		expect(button.values.variant).toEqual(['primary', 'secondary', 'danger']);
		const toggle = componentsIn('Toggle.tsx', 'export const Toggle = ({ checked }: { checked: boolean }) => <button role="switch" aria-checked={checked} />;')[0];
		expect(identify(toggle, 'product').item).toBe('switch');
		const pill = componentsIn('StatusPill.tsx', 'export function StatusPill({ tone }: { tone: "ok" | "bad" }) { return <span className="rounded-full px-2 text-xs">{tone}</span>; }')[0];
		expect(identify(pill, 'product').item).toBe('badge');
		const nav = componentsIn('Navbar.tsx', 'export function Navbar() { return <header className="site-nav"><nav /></header>; }')[0];
		expect(identify(nav, 'site').item).toBe('site-header');
		const odd = componentsIn('Weather.tsx', 'export function WeatherWidget() { return <div>sunny</div>; }')[0];
		expect(identify(odd, 'site').item).toBeUndefined();
	});
	it('adapts a component to the library one, mapping its props, and refuses when a prop would be lost', () => {
		const [button] = componentsIn('components/Button.tsx', BUTTON);
		const out = adaptComponent(BUTTON, button, 'button', 'site', '@/components/ds/button', button.values)!;
		expect(out).toContain('import { Button as DsButton } from "@/components/ds/button";');
		expect(out).toContain('"primary": "default"');
		expect(out).toContain('"danger": "outline"');
		expect(out).toContain('"small": "sm"');
		expect(out).toContain('type ButtonProps');
		expect(out).toContain('disabled={!!rest.disabled || !!loading}');
		expect(() => parseTs(out, { sourceType: 'module', plugins: ['jsx', 'typescript'] })).not.toThrow();
		const withTooltip = BUTTON.replace('loading, className', 'loading, tooltip, className').replace('loading?: boolean', 'loading?: boolean; tooltip?: string');
		const [b2] = componentsIn('components/Button.tsx', withTooltip);
		expect(adaptComponent(withTooltip, b2, 'button', 'site', '@/components/ds/button', b2.values)).toBeUndefined();
	});
	it('restyles a root element: the look becomes the library item, the layout stays', () => {
		const text = 'export function Tag({ children }: { children: React.ReactNode }) { return <span className="inline-flex ml-2 rounded-full bg-green-100 px-2 text-xs font-bold text-green-800 hover:bg-green-200">{children}</span>; }';
		const [tag] = componentsIn('Tag.tsx', text);
		const out = restyleRoot(text, tag, 'badge', 'rounded-control border border-line text-fg-subtle')!;
		expect(out).toContain('className="inline-flex ml-2 rounded-control border border-line text-fg-subtle"');
	});
	it('decides for every component and records why, without touching files on a dry run', () => {
		const dir = project({
			'package.json': JSON.stringify({ dependencies: { react: '19.0.0', tailwindcss: '4.1.0' } }),
			'tsconfig.json': JSON.stringify({ compilerOptions: { paths: { '@/*': ['./*'] } } }),
			'components/Button.tsx': BUTTON,
			'components/Weather.tsx': 'export function WeatherWidget() { return <div className="p-4">sunny</div>; }',
		});
		const result = applyComponents(detectProject(dir), () => 'site', { dryRun: true })!;
		expect(result.decisions.map((d) => [d.name, d.action])).toEqual([
			['Button', 'swap'],
			['WeatherWidget', 'refine'],
		]);
		expect(readFileSync(join(dir, 'components/Button.tsx'), 'utf8')).toBe(BUTTON);
		rmSync(dir, { recursive: true });
	});
});

describe('overlay styling', () => {
  const menu = `import * as Menu from "@radix-ui/react-dropdown-menu";
import { Content as PopoverPanel } from "@radix-ui/react-popover";
export function DropdownMenuContent({ className, children, ...props }: any) {
  return <Menu.Portal><Menu.Content sideOffset={9} onEscapeKeyDown={props.onEscapeKeyDown} className={cn("z-50 min-w-48 rounded-xl bg-purple-900 p-3 text-white shadow-lg", className)} {...props}>{children}</Menu.Content></Menu.Portal>;
}
export function DropdownMenuItem({ danger, children, ...props }: any) {
  return <Menu.Item onSelect={props.onSelect} className={cn("relative flex pr-8 rounded-xl p-3 text-white focus:bg-purple-800", danger === "danger" && "text-red-500")} {...props}>{children}</Menu.Item>;
}
export function Help({ children, ...props }: any) { return <PopoverPanel className="w-80 bg-black rounded-xl p-8 text-white" {...props}>{children}</PopoverPanel>; }
`;
  it('styles portalled parts without replacing refs, state, handlers, placement or variant conditions', () => {
    const out = restyleOverlays(menu, 'site');
    expect(out.parts).toEqual(['dropdown-menu.Content', 'dropdown-menu.Item', 'popover.Content']);
    expect(out.text).toContain('rounded-panel bg-surface');
    expect(out.text).toContain('shadow-floating');
    expect(out.text).toContain('data-[highlighted]:bg-subtle');
    expect(out.text).toContain('max-h-(--radix-dropdown-menu-content-available-height)');
    expect(out.text).toContain('danger === "danger" && "text-red-500"');
    expect(out.text).toContain('onSelect={props.onSelect}');
    expect(out.text).toContain('sideOffset={9} onEscapeKeyDown={props.onEscapeKeyDown}');
    expect(out.text).toContain('pr-8');
    expect(out.text).toContain('w-80');
    expect(out.text).not.toMatch(/bg-purple|rounded-xl|bg-black/);
    expect(() => parseTs(out.text, { sourceType: 'module', plugins: ['jsx', 'typescript'] })).not.toThrow();
    expect(restyleOverlays(out.text, 'site').text).toBe(out.text);
    expect(restyleOverlays(menu.replaceAll('@radix-ui/react-', 'custom-'), 'site').text).toBe(menu.replaceAll('@radix-ui/react-', 'custom-'));
  });
  it('styles Select fields and menus consistently while preserving value, refs and keyboard handlers', () => {
    const source = `import * as Select from "@radix-ui/react-select";
export function Picker(props: any) { return <Select.Root name="card" value={props.value} onValueChange={props.onValueChange} required><Select.Trigger ref={props.ref} className="flex h-10 rounded-xl bg-black text-white px-4"><Select.Value /></Select.Trigger><Select.Portal><Select.Content position="popper" className="w-full min-w-20 rounded-xl bg-black text-white font-display text-body-sm"><Select.Viewport><Select.Item value="travel" disabled={props.disabled} onKeyDown={props.onKeyDown} className="py-2 font-display text-body-sm focus:bg-purple-500"><Select.ItemText>Travel</Select.ItemText></Select.Item></Select.Viewport></Select.Content></Select.Portal></Select.Root>; }`;
    const out = restyleOverlays(source, 'site');
    expect(out.parts).toEqual(['select.Trigger', 'select.Content', 'select.Item']);
    expect(out.text).toContain('rounded-control');
    expect(out.text).toContain('font-sans text-body');
    expect(out.text).toContain('w-[max(11rem,var(--radix-select-trigger-width))]');
    expect(out.text).toContain('max-w-(--radix-select-content-available-width)');
    expect(out.text).toContain('data-[highlighted]:bg-subtle');
    expect(out.text).toContain('value={props.value} onValueChange={props.onValueChange} required');
    expect(out.text).toContain('ref={props.ref}');
    expect(out.text).toContain('disabled={props.disabled} onKeyDown={props.onKeyDown}');
    expect(restyleOverlays(out.text, 'site').text).toBe(out.text);
  });
  it('includes compound styles in CLI apply, retaining dry-run behavior', () => {
    const dir = project({ 'package.json': JSON.stringify({ dependencies: { react: '19.0.0', tailwindcss: '4.1.0' } }), 'components/dropdown-menu.tsx': menu, 'app/page.tsx': menu.replaceAll('DropdownMenu', 'PageMenu') });
    try {
      const dry = applyComponents(detectProject(dir), () => 'site', { dryRun: true })!;
      expect(dry.styled).toContain('components/dropdown-menu.tsx');
      expect(readFileSync(join(dir, 'components/dropdown-menu.tsx'), 'utf8')).toBe(menu);
      run(dir);
      const applied = readFileSync(join(dir, 'components/dropdown-menu.tsx'), 'utf8');
      expect(applied).toContain('shadow-floating');
      expect(applied).toContain('data-[highlighted]:bg-subtle');
      expect(applied).toContain('onSelect={props.onSelect}');
      expect(readFileSync(join(dir, 'app/page.tsx'), 'utf8')).toContain('shadow-floating');
    } finally { rmSync(dir, { recursive: true }); }
  });
  it('styles explicit CSS menu names without restyling generic navigation or containers', () => {
    const css = '.dropdown-menu { position: absolute } .menu-item { display: flex } .glass-menu { width: 240px } .glass-menu-item { display: grid } .popover-content { color: red } .menu { display: flex }';
    const out = elementLayer('menu.css', css, 'site');
    expect(out.styled).toEqual([{selector:'.dropdown-menu',kind:'menu-panel'},{selector:'.menu-item',kind:'menu-item'},{selector:'.glass-menu',kind:'glass-menu'},{selector:'.glass-menu-item',kind:'glass-menu-item'},{selector:'.popover-content',kind:'popover-panel'}]);
    expect(out.block).toContain('var(--ds-shadow-floating)');
    expect(out.block).toContain('var(--ds-radius-pill)');
    expect(out.block).not.toMatch(/position:|display:|width:/);
    expect(elementLayer('select.css', '.select-content { color: red } .select-item { color: red }', 'site').styled).toEqual([{selector:'.select-content',kind:'menu-panel'},{selector:'.select-item',kind:'menu-item'}]);
  });
  it('CLI add ships the corrected components, dependencies and theme', () => {
    const dir = project({ 'package.json': JSON.stringify({ dependencies: { react: '19.0.0', 'react-dom': '19.0.0', tailwindcss: '4.1.0', '@chakra-ui/react': '^3.37.0', '@emotion/react': '^11.14.0', 'radix-ui': '*', '@phosphor-icons/react': '*', clsx: '*', 'tailwind-merge': '*', 'class-variance-authority': '*' } }), 'tsconfig.json': JSON.stringify({compilerOptions:{paths:{'@/*':['./*']}}}), 'app/globals.css': '@import "tailwindcss";' });
    try {
      run(dir, 'add', 'dropdown-menu', 'select', 'popover', 'input', 'textarea', 'progress');
      for (const name of ['select', 'input', 'textarea', 'progress']) {
        expect(readFileSync(join(dir, `components/ui/${name}.tsx`), 'utf8')).toBe(readFileSync(join(ROOT, `registry/components/ui/${name}.tsx`), 'utf8').replaceAll('@/lib/utils', `@/lib/${brand().bin}-utils`));
      }
      const installed = readFileSync(join(dir, 'components/ui/dropdown-menu.tsx'), 'utf8');
      expect(installed).toBe(readFileSync(join(ROOT, 'registry/components/ui/dropdown-menu.tsx'), 'utf8').replaceAll('@/lib/utils', `@/lib/${brand().bin}-utils`));
      expect(installed).toContain('usePortalContainer');
      expect(installed).toContain('shadow-floating');
      expect(existsSync(join(dir, 'lib/surface.tsx'))).toBe(true);
      expect(readFileSync(join(dir, `lib/${brand().bin}-utils.ts`), 'utf8')).toContain('"floating"');
      expect(readFileSync(join(dir, 'app/_inkbox-ds/brand.css'), 'utf8')).toContain('--ds-shadow-floating');
    } finally { rmSync(dir, { recursive: true }); }
  });
});
