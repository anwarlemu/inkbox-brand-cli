// Builds the release tree apps install from: compiled, no dev dependencies, no source or intake. Installing a git
// branch otherwise clones the whole repo and compiles it on every machine, which takes minutes.
// usage: node scripts/make-release.mjs <out-dir>
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { build } from 'esbuild';

const root = new URL('..', import.meta.url).pathname;
const out = process.argv[2];
if (!out) throw new Error('usage: node scripts/make-release.mjs <out-dir>');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const p of ['bin.js', 'build', 'brand', 'README.md']) cpSync(join(root, p), join(out, p), { recursive: true });
// The component library's registry items, so `add` works offline and without the docs site.
cpSync(join(root, 'apps', 'www', 'public', 'r'), join(out, 'r'), { recursive: true });
// The code and its dependencies in one file, so installing the release fetches almost nothing. playwright-core
// (screenshots for review) stays a package: it is large and loads its own files.
await build({
	entryPoints: [join(root, 'dist', 'cli.js')],
	outfile: join(out, 'dist', 'cli.js'),
	bundle: true,
	platform: 'node',
	format: 'esm',
	target: 'node20',
	external: ['playwright-core'],
	banner: { js: "import { createRequire as __ds_require } from 'node:module'; const require = __ds_require(import.meta.url);" },
	logLevel: 'warning',
});
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
delete pkg.devDependencies;
delete pkg.dependencies;
delete pkg.workspaces;
pkg.scripts = {};
writeFileSync(join(out, 'package.json'), `${JSON.stringify(pkg, null, 2)}\n`);
console.log(`release tree in ${out}`);
