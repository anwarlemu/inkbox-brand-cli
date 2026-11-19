import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, relative } from 'node:path';

// Shared by the asset commands: names checked against what exists (an unknown name exits 1 with the closest ones),
// numbers in range, and files written.

const normalize = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');

function distance(a: string, b: string) {
	const row = Array.from({ length: b.length + 1 }, (_, i) => i);
	for (let i = 1; i <= a.length; i++) {
		let prev = i - 1;
		row[0] = i;
		for (let j = 1; j <= b.length; j++) {
			const cur = row[j]!;
			row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
			prev = cur;
		}
	}
	return row[b.length]!;
}

/** The closest names to what was typed, best first. */
export function suggest(typed: string, pool: string[], max = 3): string[] {
	const t = normalize(typed);
	return [...new Set(pool)]
		.map((name) => {
			const n = normalize(name);
			return { name, d: n && (n.includes(t) || t.includes(n)) ? Math.abs(n.length - t.length) * 0.3 : distance(t, n) };
		})
		.filter((s) => s.d <= Math.max(2, t.length * 0.4))
		.sort((a, b) => a.d - b.d || a.name.length - b.name.length)
		.slice(0, max)
		.map((s) => s.name);
}

/** The error for a name that is not in `pool`: the closest names, then every name. */
export function unknown(what: string, typed: string, pool: string[]): Error {
	const near = suggest(typed, pool);
	return new Error(`Unknown ${what} \`${typed}\`.${near.length ? ` Did you mean ${near.map((n) => `\`${n}\``).join(' or ')}?` : ''} Choose from: ${pool.join(', ')}.`);
}

/** `typed` matched against `pool` without regard to case; unknown names throw. */
export function pick<T extends string>(what: string, typed: string, pool: readonly T[]): T {
	const hit = pool.find((p) => p.toLowerCase() === typed.trim().toLowerCase());
	if (!hit) throw unknown(what, typed, [...pool]);
	return hit;
}

/** A number flag in range (undefined when not passed). */
export function num(name: string, value: unknown, min: number, max: number, opts: { integer?: boolean } = {}): number | undefined {
	if (value === undefined || value === null || value === '') return undefined;
	const n = typeof value === 'number' ? value : Number(value);
	if (!Number.isFinite(n) || (opts.integer && !Number.isInteger(n))) throw new Error(`--${name} takes a ${opts.integer ? 'whole ' : ''}number, not \`${String(value)}\`.`);
	if (n < min || n > max) throw new Error(`--${name} takes ${min} to ${max}, not ${n}.`);
	return n;
}

export function write(path: string, data: Buffer | string) {
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, data);
}

/** A path as the person sees it: relative to where they ran the command when it is inside it. */
export function display(cwd: string, path: string): string {
	const rel = relative(cwd, path);
	return !rel || rel.startsWith('..') || isAbsolute(rel) ? path : rel;
}

/** The written files, as every asset command reports them. */
export type OutFile = { path: string; format: string; width: number; height: number; [key: string]: unknown };
