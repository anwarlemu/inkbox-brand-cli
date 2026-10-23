import { readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const cache = new Map<string, RegExp>();

export function globToRegExp(glob: string): RegExp {
	const hit = cache.get(glob);
	if (hit) return hit;
	let re = '';
	for (let i = 0; i < glob.length; i++) {
		const c = glob[i];
		if (c === '*') {
			if (glob[i + 1] === '*') {
				const slash = glob[i + 2] === '/';
				re += slash ? '(?:.*/)?' : '.*';
				i += slash ? 2 : 1;
			} else re += '[^/]*';
		} else if (c === '?') re += '[^/]';
		else if (c === '{') {
			const end = glob.indexOf('}', i);
			re += `(?:${glob.slice(i + 1, end).split(',').map((p) => p.replace(/[.+^$()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*')).join('|')})`;
			i = end;
		} else re += c.replace(/[.+^$()|[\]\\]/g, '\\$&');
	}
	const out = new RegExp(`^${re}$`);
	cache.set(glob, out);
	return out;
}

export const matchesAny = (path: string, globs: string[]) => globs.some((g) => globToRegExp(g).test(path));

const ALWAYS_SKIP = new Set(['node_modules', '.git', '.next', 'dist', 'build', 'out', '.turbo', '.vercel', 'coverage', '.ds', 'Pods', 'DerivedData', 'vendor', 'target', 'venv', '__pycache__', 'bin', 'obj', 'Carthage']);

export function walkFiles(root: string, include: string[], exclude: string[]): string[] {
	const results: string[] = [];
	const visit = (dir: string) => {
		for (const entry of readdirSync(dir, { withFileTypes: true })) {
			// Hidden folders (.agents, .claude, .github...) hold tooling, never the site.
			if (ALWAYS_SKIP.has(entry.name) || entry.name.startsWith('.')) continue;
			const abs = join(dir, entry.name);
			const rel = relative(root, abs).split(sep).join('/');
			if (entry.isDirectory()) {
				if (!matchesAny(`${rel}/`, exclude)) visit(abs);
			} else if (matchesAny(rel, include) && !matchesAny(rel, exclude)) results.push(rel);
		}
	};
	visit(root);
	return results.sort();
}
