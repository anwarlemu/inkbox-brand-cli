import { adaptComponent } from '../src/library/adapt.js';
import { componentsIn } from '../src/library/components.js';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { parse } from '@babel/parser';
import { brand } from '../src/lib/brand.js';
import { closure, loadItem } from '../src/library/registry.js';

const bin = join(import.meta.dirname, '../bin.js');
const roots: string[] = [];
const put = (root: string, name: string, text: string) => { mkdirSync(dirname(join(root, name)), { recursive: true }); writeFileSync(join(root, name), text); };
async function fixture(js = false, alias = '~') {
 const root = mkdtempSync(join(tmpdir(), 'ds-workflow-')); roots.push(root);
 const dependencies: Record<string, string> = { react: '19.2.0', 'react-dom': '19.2.0', tailwindcss: '4.1.0', vite: '7.0.0', '@chakra-ui/react': '^3.37.0', '@emotion/react': '^11.14.0' };
 for (const item of await closure(['button', 'card'])) for (const dependency of item.packages ?? []) dependencies[dependency] = '*';
 put(root, 'package.json', JSON.stringify({ dependencies, type: 'module' }));
 put(root, js ? 'jsconfig.json' : 'tsconfig.json', JSON.stringify({ extends: './config/base.json', compilerOptions: { jsx: 'react-jsx' } }));
 put(root, 'config/base.json', `{// JSONC and inherited paths\n"compilerOptions":{"baseUrl":"..","paths":{"${alias}/*":["src/*"]}}}`);
 put(root, 'src/index.css', '@import "tailwindcss";\n.artwork { color: #fedcba; }\n');
 put(root, 'src/App.tsx', 'export const App = () => <button onClick={() => alert("Save")}>Original copy</button>;\n');
 put(root, 'src/helpers/utils.ts', 'export const existingHelper = () => 42;\n');
 put(root, 'components.json', JSON.stringify({ style: 'new-york', rsc: false, tsx: !js, tailwind: { css: 'src/index.css', config: '', baseColor: 'neutral', cssVariables: true }, aliases: { components: `${alias}/widgets`, ui: `${alias}/widgets/controls`, utils: `${alias}/helpers/utils`, lib: `${alias}/helpers`, hooks: `${alias}/hooks` }, registries: { '@existing': 'https://example.com/{name}.json' } }));
 return root;
}
const run = (root: string, ...args: string[]) => { const result = spawnSync(process.execPath, [bin, ...args, '--json', '--no-install'], { cwd: root, encoding: 'utf8' }); expect(result.status, result.stdout + result.stderr).toBe(0); return JSON.parse(result.stdout); };
const snapshot = (root: string) => Object.fromEntries(readdirSync(root, { recursive: true, withFileTypes: true }).filter(entry => entry.isFile()).map(entry => { const file = join(entry.parentPath, entry.name); return [file.slice(root.length), readFileSync(file, 'utf8')]; }));
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });

it('discovers components and honors cwd without writing', async () => {
 const root = await fixture(), before = snapshot(root);
 expect(run(root, 'info').registry.namespace).toBe(`@${brand().bin}`);
 expect(run(root, 'search', 'button').some((item: any) => item.name === 'button')).toBe(true);
 expect(run(root, '--cwd', root, 'view', `@${brand().bin}/button`).name).toBe('button');
 expect(run(root, 'docs', 'button')[0].source).toMatch(/button.json$/);
 expect(snapshot(root)).toEqual(before);
});
it('resolves inherited aliases, preserves helpers, and installs agent guidance from add alone', async () => {
 const root = await fixture();
 const original = readFileSync(join(root, 'src/App.tsx'), 'utf8');
 run(root, 'add', 'button', 'card');
 expect(existsSync(join(root, 'src/widgets/controls/button.tsx'))).toBe(true);
 expect(readFileSync(join(root, 'src/widgets/controls/button.tsx'), 'utf8')).toContain(`~/helpers/${brand().bin}-utils`);
 expect(readFileSync(join(root, 'src/helpers/utils.ts'), 'utf8')).toBe('export const existingHelper = () => 42;\n');
 expect(readFileSync(join(root, 'src/App.tsx'), 'utf8')).toBe(original);
 expect(readFileSync(join(root, '.agents/skills', brand().bin, 'SKILL.md'), 'utf8')).not.toContain('{{');
 expect(existsSync(join(root, '.ds/agent-guide.md'))).toBe(true);
 const config = JSON.parse(readFileSync(join(root, 'components.json'), 'utf8'));
 expect(config.registries['@existing']).toBe('https://example.com/{name}.json');
 const before = snapshot(root); run(root, 'add', 'button', 'card'); expect(snapshot(root)).toEqual(before);
});
it('emits JavaScript that parses without TypeScript extensions', async () => {
 const root = await fixture(true); run(root, 'init', 'button');
 const content = readFileSync(join(root, 'src/widgets/controls/button.jsx'), 'utf8');
 expect(() => parse(content, { sourceType: 'module', plugins: ['jsx'] })).not.toThrow();
 expect(existsSync(join(root, 'src/helpers', `${brand().bin}-utils.js`))).toBe(true);
});
it('previews exact diffs, preserves edits, and overwrites only when requested', async () => {
 const root = await fixture(); const initial = snapshot(root);
 run(root, 'add', 'button', '--dry-run'); expect(snapshot(root)).toEqual(initial);
 run(root, 'add', 'button');
 const file = 'src/widgets/controls/button.tsx'; put(root, file, '// local modification\n');
 const before = snapshot(root), diff = run(root, 'add', 'button', '--diff', file);
 expect(diff.files[0].diff).toContain('-// local modification'); expect(snapshot(root)).toEqual(before);
 expect(run(root, 'add', 'button').conflicts).toContain(file);
 expect(readFileSync(join(root, file), 'utf8')).toBe('// local modification\n');
 run(root, 'add', 'button', '--overwrite'); expect(readFileSync(join(root, file), 'utf8')).toContain('Button');
});
it('supports relative imports without a configured alias and custom component output paths', async () => {
 const root = await fixture(); rmSync(join(root, 'components.json')); rmSync(join(root, 'tsconfig.json'));
 run(root, 'add', 'button', '--path', 'src/custom');
 const content = readFileSync(join(root, 'src/custom/button.jsx'), 'utf8');
 expect(content).toContain(`../lib/${brand().bin}-utils`);
});
it('uses local registry addresses and rejects dependency cycles', async () => {
 const root = await fixture();
 put(root, 'local/button.json', JSON.stringify({ name: 'button', type: 'ui', files: [{ path: 'components/ui/button.tsx', content: 'export const custom = true;' }], requires: [] }));
 expect((await loadItem(join(root, 'local/button.json'))).files?.[0].content).toBe('export const custom = true;');
 put(root, 'local/a.json', JSON.stringify({ name: 'a', type: 'ui', files: [], requires: ['b'] }));
 put(root, 'local/b.json', JSON.stringify({ name: 'b', type: 'ui', files: [], requires: ['a'] }));
 await expect(closure([join(root, 'local/a.json')])).rejects.toThrow('Circular registry dependency');
});

it('does not replace component content, local state, custom handlers or accessibility attributes', () => {
 const bodies = [
  '<button onClick={onClick}>Save changes</button>',
  '<button onClick={() => onClick()}>Save</button>',
  '<button aria-label="Save" onClick={onClick} />',
  '<button onClick={onClick}><span>Save</span></button>',
 ];
 for (const body of bodies) {
  const text = `export function ActionButton({onClick}:{onClick:()=>void}) { return ${body}; }`;
  const [component] = componentsIn('button.tsx', text);
  expect(adaptComponent(text, component, 'button', 'site', '@/components/ds/button', {})).toBeUndefined();
 }
 const text = 'export function ActionButton({children}: {children: React.ReactNode}) { const [open,setOpen]=useState(false); return <button>{children}</button>; }';
 expect(adaptComponent(text, componentsIn('button.tsx', text)[0], 'button', 'site', '@/components/ds/button', {})).toBeUndefined();
});

it('explicit apply preserves artwork, shared palette data and custom button copy', async () => {
 const root = await fixture();
 put(root, 'src/App.tsx', 'export function ActionButton({onClick}:{onClick:()=>void}) { return <button className="rounded-md bg-red-500 text-white" onClick={onClick}>Save changes</button>; }');
 put(root, 'src/index.css', '@import "tailwindcss";\n:root { --shared-palette: #f0007a; }\n.artwork { color: #f0007a; }\n.btn-primary { background: #ff0000; }\n');
 run(root, 'apply', '--surface', 'site');
 expect(readFileSync(join(root, 'src/App.tsx'), 'utf8')).toContain('Save changes');
 expect(readFileSync(join(root, 'src/App.tsx'), 'utf8')).toContain('onClick={onClick}');
 const css = readFileSync(join(root, 'src/index.css'), 'utf8');
 expect(css).toContain('--shared-palette: #f0007a');
 expect(css).toContain('.artwork { color: #f0007a; }');
 expect(css).toContain('var(--ds-color-action-primary)');
});
