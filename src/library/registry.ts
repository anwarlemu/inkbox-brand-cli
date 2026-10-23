import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { brand } from '../lib/brand.js';
import { pkgPath } from '../lib/paths.js';

// The component library's items: from a folder (the copy bundled with the CLI, the docs build in this repo, or
// DS_REGISTRY) or fetched from the hosted library. Each item is one JSON file: its files with their content, the
// items it requires and the npm packages it imports.

export type ItemType = 'ui' | 'product' | 'site' | 'visual' | 'block' | 'hook' | 'lib' | 'theme';
export type RegistryFile = { path: string; content: string };
export type RegistryItem = {
	schemaVersion?: number;
	name: string;
	type: ItemType;
	useFor?: string;
	constraints?: string[];
	documentation?: string;
	exports?: string[];
	client?: boolean;
	docsUrl?: string;
	markdownUrl?: string;
	source?: string;
	examples?: (RegistryFile & { exports: string[]; requires: string[]; packages: string[]; previews: { name: string; url: string }[] })[];
	title?: string;
	description?: string;
	surface?: string;
	kinds?: string[];
	requires?: string[];
	packages?: string[];
	files?: RegistryFile[];
};
export type IndexEntry = Omit<RegistryItem, 'files' | 'examples' | 'documentation'>;

function sources() {
	const env = process.env.DS_REGISTRY;
	const dirs = [env && !/^https?:/.test(env) ? (isAbsolute(env) ? env : join(process.cwd(), env)) : undefined, pkgPath('r'), pkgPath('apps', 'www', 'public', 'r')].filter((d): d is string => !!d && existsSync(d));
	const url = env && /^https?:/.test(env) ? env.replace(/\/$/, '') : `${(brand() as { registryUrl?: string }).registryUrl ?? ''}/r`;
	return { dirs, url };
}

/** The name an item is known by, from a bare name or its URL (https://…/r/button.json). */
export const itemName = (ref: string) => ref.replace(/^.*\//, '').replace(/\.json$/, '');

export async function loadItem(name: string): Promise<RegistryItem> {
	const { dirs, url } = sources();
	for (const dir of dirs) {
		const file = join(dir, `${name}.json`);
		if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'));
	}
	const res = await fetch(`${url}/${name}.json`).catch(() => undefined);
	if (!res?.ok) throw new Error(`No library item "${name}". \`${'list'}\` shows every item.`);
	return (await res.json()) as RegistryItem;
}

export async function loadIndex(): Promise<IndexEntry[]> {
	const { dirs, url } = sources();
	for (const dir of dirs) {
		const file = join(dir, 'index.json');
		if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8')).items;
	}
	const res = await fetch(`${url}/index.json`).catch(() => undefined);
	if (!res?.ok) throw new Error('The component library could not be reached.');
	return ((await res.json()) as { items: IndexEntry[] }).items;
}

/** Every item the given ones need, dependencies first. */
export async function closure(names: string[]): Promise<RegistryItem[]> {
	const seen = new Map<string, RegistryItem>();
	const visit = async (name: string) => {
		if (seen.has(name)) return;
		const item = await loadItem(name);
		seen.set(name, item);
		for (const dep of item.requires ?? []) await visit(itemName(dep));
	};
	for (const n of names) await visit(itemName(n));
	// Dependencies before the items that need them.
	const order: RegistryItem[] = [];
	const placed = new Set<string>();
	const place = (item: RegistryItem) => {
		if (placed.has(item.name)) return;
		placed.add(item.name);
		for (const dep of item.requires ?? []) {
			const d = seen.get(itemName(dep));
			if (d) place(d);
		}
		order.push(item);
	};
	for (const item of seen.values()) place(item);
	return order;
}

/** The same, synchronously, from a local copy only (the one bundled with the CLI or this repo's docs build). */
export function loadItemSync(name: string): RegistryItem | undefined {
	for (const dir of sources().dirs) {
		const file = join(dir, `${name}.json`);
		if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'));
	}
	return undefined;
}

export function loadIndexSync(): IndexEntry[] {
	for (const dir of sources().dirs) {
		const file = join(dir, 'index.json');
		if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8')).items;
	}
	return [];
}
