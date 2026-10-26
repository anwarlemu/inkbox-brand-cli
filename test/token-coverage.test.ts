import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { compile } from 'tailwindcss';
import { describe, expect, it } from 'vitest';
import { convertCss, newStats } from '../src/convert/css.js';
import { sitePalette } from '../src/convert/palette.js';

const ROOT = join(import.meta.dirname, '..');
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8');
const table = JSON.parse(read('build/tokens.json')).site as Record<string, string>;
const refs = (text: string) => [...text.matchAll(/var\((--ds-[\w-]+)/g)].map(m => m[1]);

describe('complete token output', () => {
  it('exports every token through the theme without dangling brand references', () => {
    const theme = read('build/theme.css');
    const exposed = new Set(refs(theme));
    expect(Object.keys(table).filter(name => !exposed.has(name))).toEqual([]);
    const sources = ['brand', 'registry'].flatMap(dir => readdirSync(join(ROOT, dir), { recursive: true }).map(file => `${dir}/${file}`).filter(file => /\.(?:css|tsx?|json)$/.test(file)));
    for (const file of ['build/theme.css', 'build/site.css', 'build/tokens.css', ...sources]) {
      expect(refs(read(file)).filter(name => !(name in table)), file).toEqual([]);
    }
    const visiting = new Set<string>();
    const visit = (name: string) => {
      expect(visiting.has(name), `circular token: ${name}`).toBe(false);
      visiting.add(name);
      for (const dependency of refs(table[name])) { expect(dependency in table).toBe(true); visit(dependency); }
      visiting.delete(name);
    };
    Object.keys(table).forEach(visit);
  });

  it('compiles spacing, weights, motion, layout and visual utilities to live token references', async () => {
    const compiler = await compile(`${read('build/theme.css')}\n@tailwind utilities;`);
    const output = compiler.build(['p-3.5', 'gap-2', 'pl-1.5', 'h-10', 'w-layout-rail', 'max-w-frame-column', 'font-normal', 'font-medium', 'text-body', 'leading-body', 'tracking-normal', 'rounded-panel', 'rounded-dialog', 'shadow-floating', 'bg-surface-brand', 'backdrop-blur-scrim', 'duration-150', 'duration-base', 'ease-out']);
    for (const token of ['space-3-5', 'space-2', 'space-1-5', 'space-10', 'layout-rail', 'frame-column', 'font-weight-regular', 'font-weight-medium', 'text-body', 'leading-body', 'tracking-normal', 'radius-panel', 'radius-dialog', 'shadow-floating', 'color-bg-brand', 'blur-scrim', 'duration-fast', 'duration-base', 'easing-out']) expect(output, token).toContain(`var(--ds-${token})`);
    expect(output).not.toMatch(/transition-duration:\s*150ms|font-weight:\s*(400|500)|padding:\s*14px/);
  });

  it('lets the converter use every fixed radius step while preserving explicit pills', () => {
    const out = convertCss('.detail { border-radius:6px } .panel { border-radius:16px } .card { border-radius:24px } .pill { border-radius:9999px }', sitePalette(''), newStats());
    for (const radius of ['xs', 'panel', 'dialog', 'pill']) expect(out).toContain(`var(--ds-radius-${radius})`);
  });

  it('keeps the smallest and largest type and spacing steps available to conversion', () => {
    const out = convertCss('.micro { font-size:11px; padding:1px } .display { font-size:32px }', sitePalette(''), newStats());
    for (const token of ['text-micro', 'text-display', 'space-px']) expect(out).toContain(`var(--ds-${token})`);
  });

  it('installs the full token set through init and add, and type-checks every installed component', () => {
    const root = mkdtempSync(join(tmpdir(), 'ds-complete-tokens-'));
    try {
      const index = JSON.parse(read('apps/www/public/r/index.json')).items as { name: string }[];
      const items = index.map(item => JSON.parse(read(`apps/www/public/r/${item.name}.json`)));
      const dependencies: Record<string, string> = { react: '19.2.8', 'react-dom': '19.2.8', tailwindcss: '4.3.3', '@chakra-ui/react': '^3.37.0', '@emotion/react': '^11.14.0' };
      for (const item of items) for (const dependency of item.packages ?? []) dependencies[dependency] ??= '*';
      writeFileSync(join(root, 'package.json'), JSON.stringify({ private: true, dependencies }));
      writeFileSync(join(root, 'tsconfig.json'), JSON.stringify({ compilerOptions: { target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler', jsx: 'react-jsx', strict: true, skipLibCheck: true, noEmit: true, esModuleInterop: true, paths: { '@/*': ['./src/*'] } }, include: ['src'] }));
      mkdirSync(join(root, 'src'));
      writeFileSync(join(root, 'src/index.css'), '@import "tailwindcss";\n:root { --existing-chart-color: #ff0033; }\n');
      writeFileSync(join(root, 'src/App.tsx'), 'export function App() { return <div>Existing content</div>; }');
      symlinkSync(join(ROOT, 'node_modules'), join(root, 'node_modules'), 'dir');
      const run = (...args: string[]) => JSON.parse(execFileSync(process.execPath, [join(ROOT, 'bin.js'), ...args, '--json', '--no-install'], { cwd: root, encoding: 'utf8', timeout: 60_000 }));
      run('init', '--dry-run');
      expect(existsSync(join(root, 'src/_inkbox-ds'))).toBe(false);
      run('init');
      const css = readFileSync(join(root, 'src/_inkbox-ds/brand.css'), 'utf8');
      const installed = new Set([...css.matchAll(/(--ds-[\w-]+)\s*:/g)].map(m => m[1]));
      expect(Object.keys(table).filter(name => !installed.has(name))).toEqual([]);
      expect(readFileSync(join(root, 'src/_inkbox-ds/theme.css'), 'utf8')).toBe(read('build/theme.css'));
      const added = run('add', ...index.map(item => item.name));
      expect(added.items).toHaveLength(items.length);
      const main = readFileSync(join(root, 'src/index.css'), 'utf8');
      expect(main).toContain('--existing-chart-color: #ff0033');
      expect(main.match(/_inkbox-ds\/brand.css/g)).toHaveLength(1);
      expect(main.match(/_inkbox-ds\/theme.css/g)).toHaveLength(1);
      expect(readFileSync(join(root, 'src/App.tsx'), 'utf8')).toContain('Existing content');
      try {
        execFileSync(process.execPath, [join(ROOT, 'node_modules/typescript/bin/tsc'), '-p', join(root, 'tsconfig.json')], { cwd: root, encoding: 'utf8', timeout: 60_000 });
      } catch (error) {
        // Show the compiler's diagnostics, not only the failed command.
        throw new Error(`installed components do not type-check (node_modules ${lstatSync(join(root, 'node_modules')).isSymbolicLink() ? 'linked' : 'replaced'}, files ${readdirSync(root).join(' ')}):\n${String((error as { stdout?: string }).stdout ?? error).slice(0, 1500)}`);
      }
    } finally { rmSync(root, { recursive: true, force: true }); }
  }, 90_000);
});
