import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { brand, cli } from '../lib/brand.js';
import { findProjectRoot, pkgPath } from '../lib/paths.js';
import { loadIndex, loadItem } from '../library/registry.js';
import { detectProject } from '../project/detect.js';
import { componentConfig, namespace, registryAddress } from '../install/config.js';

type Options = { json?: boolean; query?: string; type?: string; surface?: string; limit?: string; offset?: string };
const output = (value: unknown, opts: Options, text: () => string) => console.log(opts.json ? JSON.stringify(value, null, 2) : text());

export async function search(query: string | undefined, opts: Options) {
	if (opts.type && opts.type.split(',').some(type => !['ui', 'product', 'site', 'visual', 'block', 'hook', 'lib', 'theme'].includes(type))) throw new Error('Unknown component type. Use ui, product, site, visual, block, hook, lib or theme.');
	if (opts.surface && !['site', 'product', 'both'].includes(opts.surface)) throw new Error('--surface is site, product or both.');
	const words = (opts.query ?? query ?? '').toLowerCase().split(/\s+/).filter(Boolean);
	const all = await loadIndex();
	const filtered = all.filter((item: any) => (!opts.type || opts.type.split(',').includes(item.type)) && (!opts.surface || item.surface === opts.surface || item.surface === 'both') && words.every(word => JSON.stringify([item.name, item.title, item.description, item.usage, item.useFor, item.kinds]).toLowerCase().includes(word)));
	const offset = Number(opts.offset ?? 0), limit = Number(opts.limit ?? filtered.length);
	if (!Number.isInteger(offset) || offset < 0 || !Number.isInteger(limit) || limit < 0) throw new Error('--offset and --limit must be nonnegative integers.');
	const items = filtered.slice(offset, offset + limit);
	output(items, opts, () => [...items.map(i => `${i.name.padEnd(28)} ${i.description ?? ''}`), `${items.length} of ${filtered.length} matching items. Read ${cli()} view <name> --json before adding.`].join('\n'));
}

export async function view(names: string[], opts: Options) {
	const items = await Promise.all(names.map(loadItem));
	output(items.length === 1 ? items[0] : items, opts, () => items.map((item: any) => [
		`${item.title ?? item.name}\n${item.description ?? ''}`, `Install: ${cli()} add ${item.name}`, `Usage: ${item.usage ?? item.useFor ?? ''}`,
		`Dependencies: ${(item.requires ?? []).join(', ')}`, `Packages: ${(item.packages ?? []).join(', ')}`,
		...((item.api ?? []).map((file: any) => `${file.path}\n${file.content}`)),
		...((item.exampleFiles ?? item.examples ?? []).filter((file: any) => file.content).map((file: any) => `${file.path}\n${file.content}`)),
		...((item.files ?? []).map((file: any) => `${file.path}\n${file.content}`)),
	].join('\n\n')).join('\n\n'));
}

export async function docs(names: string[], opts: Options) {
	const items = await Promise.all(names.map(loadItem));
	const entries = items.map((item: any) => ({ name: item.name, docs: `${brand().registryUrl}/components/${item.name}`, reference: `${brand().registryUrl}${existsSync(pkgPath('apps', 'www', 'public', 'components', `${item.name}.md`)) || item.documentation?.includes('/components/') ? '/components' : '/r'}/${item.name}.md`, source: `${brand().registryUrl}/r/${item.name}.json`, inspect: `${cli()} view ${item.name} --json`, examples: (item.examples ?? []).filter((e: any) => e.url).map((e: any) => e.url) }));
	output(entries, opts, () => entries.map(e => `${e.name}\n  docs ${e.docs}\n  reference ${e.reference}\n  source ${e.source}\n  offline ${e.inspect}`).join('\n\n'));
}

export function info(opts: Options) {
	const root = findProjectRoot(), project = detectProject(root), config = componentConfig(root, project);
	const read = (path: string) => existsSync(join(root, path)) ? JSON.parse(readFileSync(join(root, path), 'utf8')) : undefined;
	const installed = read('.ds/installed.json') ?? {};
	const data = { schemaVersion: 1, brand: brand().name, version: JSON.parse(readFileSync(pkgPath('package.json'), 'utf8')).version, project, config, surface: read('.ds/config.json')?.surface, installed: Object.keys(installed), registry: { namespace: namespace(), url: registryAddress(read('.ds/config.json')?.surface) }, agentGuide: existsSync(join(root, '.ds/agent-guide.md')) ? '.ds/agent-guide.md' : existsSync(join(root, '.ds/guide.md')) ? '.ds/guide.md' : undefined, next: [`${cli()} search <term> --json`, `${cli()} view <name> --json`, `${cli()} add <name> --dry-run --json`] };
	output(data, opts, () => JSON.stringify(data, null, 2));
}
