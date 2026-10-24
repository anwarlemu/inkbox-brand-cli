import { brand } from '../src/lib/brand.js';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { agentGuide } from '../src/lib/guide.js';
import { closure, loadItem } from '../src/library/registry.js';

const ROOT = join(import.meta.dirname, '..');
const BIN = join(ROOT, 'bin.js');
const roots: string[] = [];
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'ds-agent-'));
  roots.push(root);
  const files = {
    'package.json': JSON.stringify({ name: 'consumer', private: true, dependencies: { react: '^19.0.0', tailwindcss: '^4.0.0' } }),
    'tsconfig.json': JSON.stringify({ compilerOptions: { paths: { '@/*': ['./src/*'] } } }),
    'src/index.css': '@import "tailwindcss";\n',
    'src/App.tsx': 'export function App() { return <h1>Keep this page</h1>; }\n',
    'AGENTS.md': '# Project instructions\nKeep the existing business rules.\n',
    'GEMINI.md': 'Use the project test runner.\n',
    '.github/copilot-instructions.md': 'Keep the API client.\n',
  };
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}
function run(root: string, args: string[], env = process.env) {
  const result = spawnSync(process.execPath, [BIN, ...args, '--no-install'], { cwd: root, env, encoding: 'utf8' });
  return { ...result, data: JSON.parse(result.stdout) };
}
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });

describe('portable agent workflow', () => {
  it('returns structured read-only references with global flags before or after the command', () => {
    const root = fixture();
    for (const args of [['--json', 'show', 'select'], ['show', 'select', '--json']]) {
      const result = run(root, args);
      expect(result.status).toBe(0);
      expect(result.data.exports).toContain('SelectTrigger');
      expect(result.data.useFor).toContain('FormData');
      expect(result.data.examples[0].content).toContain('onValueChange');
      expect(result.data.examples[0].requires).toContain('button');
      expect(result.data.files.find((f: {path: string}) => f.path.endsWith('/select.tsx')).content).toBe(readFileSync(join(ROOT, 'registry/components/ui/select.tsx'), 'utf8'));
    }
    expect(run(root, ['guide', '--json']).data.instructions).toBe(agentGuide());
    expect(run(root, ['list', '--json']).data.some((item: {name: string}) => item.name === 'utils')).toBe(true);
    expect(run(root, ['check', 'src/App.tsx', '--json']).data.findings).toEqual([]);
    const missing = run(root, ['show', 'does-not-exist', '--json'], { ...process.env, DS_REGISTRY: 'http://127.0.0.1:1' });
    expect(missing.status).toBe(1);
    expect(missing.data).toMatchObject({ ok: false, error: expect.stringContaining('does-not-exist') });
    expect(existsSync(join(root, '.ds'))).toBe(false);
  });

  it('prepares new work without converting screens, preserves instructions, and can be repeated', () => {
    const root = fixture();
    const before = readFileSync(join(root, 'src/App.tsx'), 'utf8');
    const dry = run(root, ['init', '--dry-run', '--json']);
    expect(dry.status).toBe(0);
    expect(dry.data.changes.some((c: {file: string}) => c.file === '.ds/agent-guide.md')).toBe(true);
    expect(existsSync(join(root, '.ds'))).toBe(false);
    const result = run(root, ['init', '--json']);
    expect(result.status).toBe(0);
    expect(readFileSync(join(root, 'src/App.tsx'), 'utf8')).toBe(before);
    expect(existsSync(join(root, '.ds/state.json'))).toBe(false);
    expect(readFileSync(join(root, '.ds/agent-guide.md'), 'utf8').trim()).toBe(agentGuide());
    expect(agentGuide()).toContain('data-ds-motion="instant"');
    expect(agentGuide()).toContain('pointer-down');
    const styles = readFileSync(join(root, 'src/_inkbox-ds/brand.css'), 'utf8');
    expect(styles).toContain('touch-action: manipulation');
    expect(styles).toContain('transition-duration: 0s !important');
    expect(styles).toContain('[data-ds-motion="instant"]');
    expect(readFileSync(join(root, 'AGENTS.md'), 'utf8')).toContain('Keep the existing business rules.');
    expect(readFileSync(join(root, 'GEMINI.md'), 'utf8')).toContain('Use the project test runner.');
    expect(readFileSync(join(root, '.github/copilot-instructions.md'), 'utf8')).toContain('Keep the API client.');
    expect(run(root, ['init', '--json']).data.changes).toEqual([]);
  });

  it('reports planned writes and installs the exact registry source with dependencies', async () => {
    const root = fixture();
    const dry = run(root, ['add', 'select', '--dry-run', '--json']);
    expect(dry.status).toBe(0);
    expect(dry.data.items).toEqual(expect.arrayContaining(['theme', 'utils', 'surface', 'select']));
    expect(existsSync(join(root, 'src/components'))).toBe(false);
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    for (const item of await closure(['select'])) for (const name of item.packages ?? []) pkg.dependencies[name] = '*';
    writeFileSync(join(root, 'package.json'), JSON.stringify(pkg));
    const added = run(root, ['add', 'select', '--json']);
    expect(added.status).toBe(0);
    const source = (await loadItem('select')).files!.find(f => f.path.endsWith('/select.tsx'))!.content;
    expect(readFileSync(join(root, 'src/components/ui/select.tsx'), 'utf8')).toBe(source.replaceAll('@/lib/utils', `@/lib/${brand().bin}-utils`));
    const repeated = run(root, ['add', 'select', '--json']);
    expect(repeated.data.kept).toContain('src/components/ui/select.tsx');
  });

  it('returns a nonzero structured error when dependency installation fails', () => {
    const root = fixture();
    const fakeBin = join(root, 'fake-bin');
    mkdirSync(fakeBin);
    writeFileSync(join(fakeBin, 'npm'), '#!/bin/sh\nexit 42\n');
    chmodSync(join(fakeBin, 'npm'), 0o755);
    const result = run(root, ['add', 'select', '--json'], { ...process.env, PATH: `${fakeBin}:${process.env.PATH}` });
    expect(result.status).toBe(1);
    expect(result.data).toMatchObject({ ok: false, error: expect.stringContaining('Could not install the packages') });
    expect(result.stderr).toContain('Installing');
    expect(existsSync(join(root, '.ds/installed.json'))).toBe(false);
    expect(existsSync(join(root, 'src/components/ui/select.tsx'))).toBe(false);
  });
});
