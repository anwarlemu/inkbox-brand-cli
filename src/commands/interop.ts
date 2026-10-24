import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { brand, hasProduct } from '../lib/brand.js';
import { findProjectRoot } from '../lib/paths.js';
import { selfInstall } from './run.js';
import { init } from './init.js';
import { add } from './add.js';

// Advanced ecosystem operations use the upstream implementation, pinned to the validated version.
export const SHADCN_VERSION = '4.22.1';
export const CHAKRA_VERSION = '3.37.0';

export function shadcn(args: string[], cwd = findProjectRoot(), progressToStderr = false) {
	const result = spawnSync('npx', ['--yes', `shadcn@${SHADCN_VERSION}`, ...args], { cwd, stdio: ['inherit', progressToStderr ? 2 : 'inherit', 'inherit'] });
	if (result.status !== 0) throw new Error(`shadcn ${args[0] ?? ''} failed (${result.status ?? result.error?.message}). Review its output above.`);
}

export function chakra(args: string[], cwd = findProjectRoot()) {
	const result = spawnSync('npx', ['--yes', `@chakra-ui/cli@${CHAKRA_VERSION}`, ...args], { cwd, stdio: 'inherit' });
	if (result.status !== 0) throw new Error(`Chakra CLI ${args[0] ?? ''} failed (${result.status ?? result.error?.message}). Review its output above.`);
}

export async function create(opts: { template?: string; name?: string; surface?: string; dryRun?: boolean; json?: boolean; monorepo?: boolean }, items: string[] = ['button']) {
	if (!opts.name) throw new Error('Choose --name <directory> for the new application. Existing applications use init.');
	const root = process.cwd(), target = resolve(root, opts.name);
	if (existsSync(target)) throw new Error(`The target already exists: ${target}. Use init from that application.`);
	const args = ['init', '--template', opts.template ?? 'vite', '--name', opts.name, '--base', 'radix', '--preset', 'nova', '--yes', opts.monorepo ? '--monorepo' : '--no-monorepo'];
	const components = items.length ? items : ['button'];
	if (opts.dryRun) return console.log(JSON.stringify({ schemaVersion: 1, dryRun: true, engine: `shadcn@${SHADCN_VERSION}`, args, target, components }, null, 2));
	shadcn(args, root, opts.json);
	const previous = process.cwd();
	try {
		process.chdir(opts.monorepo ? resolve(target, 'apps/web') : target);
		selfInstall(process.cwd(), { install: true }, false);
		if (opts.monorepo) {
			// The upstream installer owns shared workspace routing and package-manager selection.
			const registry = `${brand().registryUrl}/r/${opts.surface === 'product' && hasProduct() ? 'shadcn-product' : 'shadcn'}`;
			shadcn(['add', `${registry}/theme.json`, ...components.map(name => `${registry}/${name}.json`), '--yes', '--overwrite'], process.cwd(), opts.json);
			init({ surface: opts.surface, install: false, json: opts.json });
		} else await add(components, { surface: opts.surface, install: false, overwrite: true, json: opts.json });
	} finally { process.chdir(previous); }
}
