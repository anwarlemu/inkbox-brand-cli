import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { checkText, runCheck } from '../src/check/engine.js';
import { applyComponentColors } from '../src/convert/components.js';
import { newStats } from '../src/convert/css.js';
import { preToolUse } from '../src/hooks/handlers.js';

const ROOT = join(import.meta.dirname, '..');
const roots: string[] = [];
function fixture(files: Record<string, string>) {
  const root = mkdtempSync(join(tmpdir(), 'ds-colors-')); roots.push(root);
  for (const [rel, content] of Object.entries(files)) { mkdirSync(dirname(join(root, rel)), { recursive: true }); writeFileSync(join(root, rel), content); }
  execFileSync('git', ['init', '-q'], { cwd: root });
  return root;
}
const apply = (rel: string, text: string, theme = true) => applyComponentColors(rel, text, 'site', newStats(), theme);
const cli = (root: string, ...args: string[]) => JSON.parse(execFileSync(process.execPath, [join(ROOT, 'bin.js'), ...args, '--json', '--no-install'], { cwd: root, encoding: 'utf8' }));
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });

describe('component color application', () => {
  it('maps CSS usage and states by component role, preserving shared variables and unrelated consumers', () => {
    const original = `:root { --accent: #ff0033; --ink: #123456; }
.btn-primary { background: var(--accent); color: white; }
.btn-primary:hover { background: #22aa33; }
.btn-primary:active { background: #112233; }
.btn-outline { border: 1px solid #ff0033; color: #ff0033; }
.input:focus-visible { border-color: #ff0033; }
.chart { fill: var(--accent); color: #123456; }
.unknown { background: #ff0033; }
.btn-primary, .unknown { background: #112233; }
.card { background: linear-gradient(#ff0033, #123456); }
`;
    const out = apply('page.css', original);
    expect(out).toContain(':root { --accent: #ff0033; --ink: #123456; }');
    expect(out).toContain('background: var(--ds-color-action-primary); color: var(--ds-color-action-primary-fg)');
    expect(out).toContain('.btn-primary:hover { background: var(--ds-color-action-primary-hover); }');
    expect(out).toContain('.btn-primary:active { background: var(--ds-color-action-primary-hover); }');
    expect(out).toContain('border: 1px solid var(--ds-color-border-field)');
    expect(out).toContain('.input:focus-visible { border-color: var(--ds-color-border-brand); }');
    for (const line of original.split('\n').filter((s) => /chart|unknown|gradient/.test(s))) expect(out).toContain(line);
    expect(apply('page.css', out)).toBe(out);
  });

  it('uses actual library variants and retains Tailwind states, opacity, layout and event handlers', () => {
    const source = `export function Page() { return <>
<button onClick={save} className="px-4 bg-red-500 text-white hover:bg-green-800 active:bg-blue-800">Save</button>
<Button variant="destructive" className="bg-blue-500 text-white hover:bg-blue-800" />
<Badge variant="success" className="border-red-500 bg-red-100 text-red-700" />
<input className="rounded-full bg-blue-100 text-black border-blue-500 focus-visible:border-red-500 aria-invalid:border-red-600 placeholder:text-gray-400" />
<Button variant={danger ? "destructive" : "default"} className="bg-red-500" />
<div className="bg-red-500 text-blue-500">An unrelated illustration</div>
<button className={cn("bg-blue-500", danger && "bg-red-500", selected ? "text-red-500" : "text-blue-500")} />
<svg><rect className="bg-red-500" fill="#ff0033" /></svg>
</>; }\nconst palette = { color: '#ff0033', backgroundColor: '#123456' };`;
    const out = apply('page.tsx', source);
    expect(out).toContain('onClick={save} className="px-4 bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-hover"');
    expect(out).toContain('variant="destructive" className="bg-danger text-white hover:bg-danger-strong"');
    expect(out).toContain('variant="success" className="border-success bg-surface text-success"');
    expect(out).toContain('rounded-full bg-surface text-fg border-line-field focus-visible:border-line-brand aria-invalid:border-danger placeholder:text-fg-subtle');
    expect(out).toContain('<div className="bg-red-500 text-blue-500">');
    expect(out).toContain('variant={danger ? "destructive" : "default"} className="bg-red-500"');
    expect(out).toContain('danger && "bg-red-500", selected ? "text-red-500" : "text-blue-500"');
    expect(out).toContain('const palette = { color: \'#ff0033\', backgroundColor: \'#123456\' }');
    expect(out).toContain('fill="#ff0033"');
    expect(apply('page.tsx', out)).toBe(out);
    expect(apply('x.tsx', '<button className="bg-red-500/50" />')).toContain('bg-primary/50');
    expect(apply('x.tsx', '<button className="bg-red-500" />', false)).toContain('bg-[var(--ds-color-action-primary)]');
  });

  it('handles HTML and inline styles, retaining artwork, content specimens and transparent colors', () => {
    const source = `<style>.card { border: 1px solid #123456; }</style>
<button style="background: var(--shared); color: white" onclick="save()">Save</button>
<input style="background:rgba(12,34,56,0.5);border-color:#123456" />
<div style="background:#ff0033">Art</div><svg><path fill="#ff0033" /></svg>
<button style="background:transparent">Quiet</button>
<div class="swatch" style="background:#123456">#123456</div>
<script>const palette = { color: '#ff0033' };</script>`;
    const out = apply('index.html', source);
    expect(out).toContain('background: var(--ds-color-action-primary); color: var(--ds-color-action-primary-fg)');
    expect(out).toContain('onclick="save()">Save</button>');
    expect(out).toContain('color-mix(in srgb, var(--ds-color-bg-default) 50%, transparent)');
    expect(out).toContain('<div style="background:#ff0033">Art</div><svg><path fill="#ff0033" /></svg>');
    expect(out).toContain('style="background:transparent"');
    expect(out).toContain('class="swatch" style="background:#123456">#123456');
    expect(out).toContain("const palette = { color: '#ff0033' }");
  });

  it('installs tokens, previews writes, preserves color data, and constrains subsequent fixes and hooks', () => {
    const css = ':root { --shared: #74629D; }\nbody { background:#0a0a0a;color:white; }\n.btn-primary { background:var(--shared);color:white; }\n.chart { color:#74629D;fill:var(--shared); }\n';
    const root = fixture({ 'index.html': '<html><head><link rel="stylesheet" href="style.css"></head><body><button class="btn-primary">Save</button><img src="logo.svg" alt="logo"></body></html>', 'style.css': css, 'logo.svg': '<svg><path fill="#ffffff"/></svg>', 'chart.js': 'const chart = { color: "#74629D", backgroundColor: "#ff0033" };' });
    const dry = cli(root, '--dry-run');
    expect(dry.converted.colors).toBeGreaterThan(0);
    expect(readFileSync(join(root, 'style.css'), 'utf8')).toBe(css);
    expect(existsSync(join(root, '.ds'))).toBe(false);
    cli(root);
    const applied = readFileSync(join(root, 'style.css'), 'utf8');
    expect(applied).toContain('--shared: #74629D');
    expect(applied).toContain('.chart { color:#74629D;fill:var(--shared); }');
    expect(applied).toContain('background:var(--ds-color-action-primary)');
    expect(readFileSync(join(root, '_inkbox-ds/brand.css'), 'utf8')).toContain('--ds-color-action-primary:');
    expect(readFileSync(join(root, 'chart.js'), 'utf8')).toBe('const chart = { color: "#74629D", backgroundColor: "#ff0033" };');
    expect(readFileSync(join(root, 'logo.svg'), 'utf8')).toBe('<svg><path fill="#ffffff"/></svg>');
    expect(JSON.parse(readFileSync(join(root, '.ds/state.json'), 'utf8')).colors).toBe('components');
    writeFileSync(join(root, 'usage.css'), '.btn-primary { background:#ff0033; } .chart { color:#74629D; }');
    const fixed = runCheck(root, { paths: ['usage.css'], fix: true });
    expect(fixed.findings).toEqual([]);
    expect(readFileSync(join(root, 'usage.css'), 'utf8')).toBe('.btn-primary { background:var(--ds-color-action-primary); } .chart { color:#74629D; }');
    const proposed = (content: string) => preToolUse(root, { tool_name: 'Write', tool_input: { file_path: join(root, 'new.css'), content } });
    expect(proposed('.chart { color:#f00; }').exitCode).not.toBe(2);
    expect(proposed('.btn-primary { background:#f00; }').exitCode).toBe(2);
    expect(checkText('x.css', '.unknown { color:#f00; }').findings).not.toEqual([]); // strict library validation stays available
    cli(root, '--redo');
    expect(readFileSync(join(root, 'style.css'), 'utf8')).toBe(applied);
  });
});
