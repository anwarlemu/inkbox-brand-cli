import { readFileSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { suggest } from '../assets/io.js';

// The `--content` file the asset commands read: a JSON object whose keys are the command's own flags (camelCase or
// kebab-case). Flags win over the file. Unknown keys and values that are not text, numbers or true/false fail instead
// of being ignored, with the closest key named.

const camel = (k: string) => k.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase());

export function readContent(path: string | undefined, keys: string[], cwd = process.cwd()): Record<string, string | number | boolean> {
	if (!path) return {};
	const file = isAbsolute(path) ? path : resolve(cwd, path);
	let raw: unknown;
	try {
		raw = JSON.parse(readFileSync(file, 'utf8'));
	} catch (error) {
		throw new Error(`Could not read --content ${path}: ${(error as Error).message}`);
	}
	if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('--content must be a JSON object.');
	const allowed = new Set(keys.map(camel));
	const out: Record<string, string | number | boolean> = {};
	for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
		const key = camel(k);
		if (!allowed.has(key)) {
			const near = suggest(k, [...allowed]);
			throw new Error(`--content has an unknown field "${k}".${near.length ? ` Did you mean ${near.map((n) => `"${n}"`).join(' or ')}?` : ''} Fields: ${[...allowed].join(', ')}.`);
		}
		if (typeof v !== 'string' && typeof v !== 'number' && typeof v !== 'boolean') throw new Error(`--content "${k}" must be text, a number or true/false.`);
		out[key] = v;
	}
	return out;
}
