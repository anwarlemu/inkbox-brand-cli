import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The package's own folder (the one holding brand/), found by walking up: the release bundles the code into one file. */
export const PKG_ROOT = (() => {
	let dir = dirname(fileURLToPath(import.meta.url));
	while (!existsSync(join(dir, 'brand', 'brand.json')) && dirname(dir) !== dir) dir = dirname(dir);
	return dir;
})();
export const pkgPath = (...parts: string[]) => join(PKG_ROOT, ...parts);

/** The project the command runs in: the nearest folder up with a package.json, a .git or a plain index.html. */
export function findProjectRoot(start = process.cwd()): string {
	let dir = resolve(start);
	while (true) {
		if (existsSync(join(dir, 'package.json')) || existsSync(join(dir, '.git')) || existsSync(join(dir, 'index.html'))) return dir;
		const parent = dirname(dir);
		if (parent === dir) return resolve(start);
		dir = parent;
	}
}
