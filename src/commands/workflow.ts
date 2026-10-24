import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Command } from 'commander';
import { pkgPath } from '../lib/paths.js';
import { add } from './add.js';
import { init } from './init.js';
import { run } from './run.js';
import { search, view, docs, info } from './catalog.js';
import { chakra, create, shadcn } from './interop.js';

const forwarded = (name: string) => process.argv.slice(process.argv.indexOf(name) + 1).filter((arg, index, all) => !['--cwd', '-c'].includes(arg) && !(index > 0 && ['--cwd', '-c'].includes(all[index - 1])) && !arg.startsWith('--cwd='));

export function workflow(program: Command) {
	program.version(JSON.parse(readFileSync(pkgPath('package.json'), 'utf8')).version);
	program.option('-c, --cwd <directory>', 'target application directory');
	program.hook('preAction', (_command, action) => { const cwd = action.optsWithGlobals().cwd; if (cwd) process.chdir(resolve(cwd)); });
	program.command('init [items...]').description('Set up tokens, registry configuration and agent instructions; optionally add components')
		.option('--surface <surface>', 'site or product; defaults to saved settings or project detection').option('--dry-run', 'preview without writing').option('-t, --template <template>', 'scaffold next, vite, start, react-router or astro').option('-n, --name <name>', 'new application directory').option('--monorepo', 'scaffold a shared UI workspace').option('-y, --yes', 'noninteractive setup')
		.action(async (items, _opts, cmd) => {
			const opts = cmd.optsWithGlobals();
			if (opts.template || opts.name) { await create(opts, items); return; }
			if (items.length) await add(items, opts); else init(opts);
		});
	program.command('create').description('Scaffold a framework using shadcn and install the brand workflow')
		.option('-t, --template <template>', 'next, vite, start, react-router or astro', 'vite').requiredOption('-n, --name <name>', 'new application directory').option('--surface <surface>', 'site or product').option('--monorepo', 'create a shared UI workspace').option('--dry-run', 'show the scaffold command without writing').option('-y, --yes', 'noninteractive setup')
		.action((_opts, cmd) => create(cmd.optsWithGlobals()));
	program.command('apply').description('Restyle an existing application; preserves its content and behavior').option('--surface <surface>', 'site or product').option('--redo', 'reapply conversion').option('--dry-run', 'preview conversion without writing').action((_opts, cmd) => run({ ...cmd.optsWithGlobals(), colors: 'components' }));
	for (const name of ['search', 'list']) program.command(`${name} [query]`).description('Search components by name, use, type and surface')
		.option('-q, --query <query>', 'search terms').option('-t, --type <type>', 'comma-separated component types').option('--surface <surface>', 'site or product').option('-l, --limit <count>', 'maximum results').option('-o, --offset <count>', 'results to skip')
		.action((query, _opts, cmd) => search(query, cmd.optsWithGlobals()));
	for (const name of ['view', 'show', 'inspect']) program.command(`${name} <items...>`).description('Read exact component APIs, examples, dependencies and source').action((names, _opts, cmd) => view(names, cmd.optsWithGlobals()));
	program.command('docs <items...>').description('Get component documentation and source addresses').action((names, _opts, cmd) => docs(names, cmd.optsWithGlobals()));
	program.command('info').description('Read project configuration, aliases, installed items and next commands').action((_opts, cmd) => info(cmd.optsWithGlobals()));
	program.command('add [items...]').description('Install components into the configured paths with their dependencies and agent guidance')
		.option('-o, --overwrite', 'replace differing local files after reviewing --diff').option('-a, --all', 'install every bundled registry item').option('-p, --path <path>', 'component output directory').option('--surface <surface>', 'site or product').option('--dry-run', 'show file actions without writing').option('--diff [path]', 'show proposed file diffs without writing').option('--view [path]', 'show proposed file contents without writing').option('-y, --yes', 'noninteractive installation')
		.action((names, _opts, cmd) => add(names, cmd.optsWithGlobals()));
	program.command('diff <items...>').description('Compare installed components with the registry without writing').action((names, _opts, cmd) => add(names, { ...cmd.optsWithGlobals(), diff: true }));
	for (const name of ['mcp', 'registry', 'preset', 'migrate', 'eject', 'build']) program.command(`${name} [args...]`).description(`Use shadcn's ${name} implementation with the configured brand registry`).helpOption(false).allowUnknownOption().allowExcessArguments().action(() => shadcn([name, ...forwarded(name)]));
	program.command('shadcn [args...]').description('Run the pinned upstream CLI for workspace installs, smart merges and ecosystem operations').helpOption(false).allowUnknownOption().allowExcessArguments().action(() => shadcn(forwarded('shadcn')));
	program.command('chakra [args...]').description('Run Chakra UI CLI 3.37.0 for snippets and theme type generation').helpOption(false).allowUnknownOption().allowExcessArguments().action(() => chakra(forwarded('chakra')));
}
