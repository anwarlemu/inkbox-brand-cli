import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { Command } from 'commander';
import { review, snapshot } from './commands/review.js';
import { run } from './commands/run.js';
import { init } from './commands/init.js';
import { guide, show } from './commands/guide.js';
import { add, list } from './commands/add.js';
import { approve, check, done, look, skip, tokensCommand } from './commands/small.js';
import { type HookResult, cursorPreToolUse, cursorStop, preToolUse, sessionStart, stop, userPromptSubmit } from './hooks/handlers.js';
import { readHookInput } from './hooks/payload.js';
import { brand, cli, hasProduct } from './lib/brand.js';
import { findProjectRoot } from './lib/paths.js';

const program = new Command();
const b = brand();

program.name(b.bin).description(`Build ${b.name} pages and interfaces with the component library and design tokens. Use add, look, check and review during implementation.`);
// A brand with a site only styles every project as a site: no surface or theme to choose.
if (hasProduct())
	program
		.option('--surface <surface>', 'site (pages people read) or product (an app people work in); default: read from the project')
		.option('--theme <theme>', 'product only: light (default) or dark');
program
	.option('--redo', 'convert the project again (after an update, or after reverting)')
	.option('--dry-run', 'show what would change, write nothing')
	.option('--no-install', 'do not add the package to the project when run through npx')
	.option('--json', 'JSON output')
	.action((opts) => run(opts));

program.command('init').description('Install styles, fonts and agent instructions without converting existing UI').option('--dry-run', 'show planned changes').action((_opts, command) => init(command.optsWithGlobals()));
program.command('guide').description('Read the portable agent workflow').action((_opts, command) => guide(command.optsWithGlobals()));
program.command('show <item>').description('Read a component’s exports, examples, rules and exact source').action((item, _opts, command) => show(item, command.optsWithGlobals()));

program.command('add <items...>').description('Copy library components into a React + Tailwind project, with what they need').option('--overwrite', 'replace files that already exist').option('--dry-run', 'show what would be written').action((items, _opts, command) => add(items, command.optsWithGlobals()));
program.command('list').description(`Every component, ${hasProduct() ? 'block' : 'section'} and visual in the library`).option('--json', 'JSON output').action((_opts, command) => list(command.optsWithGlobals()));
program.command('review [url]').description('Screenshot a page at desktop and phone width and score it against the brand; a task is done when it passes').option('--threshold <n>', 'minimum score').option('--submit <dir>', 'record the scorecard an agent wrote itself (when no separate reviewer is available)').option('--all', 'review every task screen that is not done yet, at once (pass the app\'s address)').option('--any', 'review a page that is not a task').option('--json', 'JSON output').action((url, _opts, command) => review(url, command.optsWithGlobals()));
program.command('look [target]').description('The brand styling (CSS, Tailwind, states) for every element in a file, or for one element kind').option('--surface <surface>', 'site or product').option('--json', 'JSON output').action((target, _opts, command) => look(target, command.optsWithGlobals()));
program.command('check [files...]').description('Check that every style value is a brand token (used by hooks, pre-commit and CI)').option('--fix', 'replace exact matches with their token').option('--changed', 'only files changed in git').option('--json', 'JSON output').action((files, _opts, command) => check(files ?? [], command.optsWithGlobals()));
program.command('tokens [term]').description('Find a brand token by name or value').option('--json', 'JSON output').action((term, _opts, command) => tokensCommand(term, command.optsWithGlobals()));
program.command('approve').description('Approve ds-override comments (a person, in a terminal)').option('--all', 'approve every pending override').action((opts) => approve(opts));
program.command('snapshot [url]').description('Save how each main screen looks before hand edits (run once, with the app running); reviews compare against it').action((url) => snapshot(url));
program.command('skip <screen>').description('Leave a screen as it is when it cannot pass without changing words or elements; the person sees the reason').requiredOption('--reason <text>', 'why').action((id, opts) => skip(id, opts.reason));
program.command('done <screen>').description('Mark a native screen restyled (web screens are done when their review passes)').action((id) => done(id));

program
	.command('hook <event>')
	.description('Agent hook entry point (session-start, user-prompt-submit, pre-tool-use, stop); reads the event JSON on stdin')
	.option('--harness <name>', 'claude-code | cursor | codex', 'claude-code')
	.action((event: string, opts) => {
		const input = readHookInput();
		const root = findProjectRoot(input.cwd ?? process.env.CLAUDE_PROJECT_DIR ?? process.env.CURSOR_PROJECT_DIR ?? process.cwd());
		let result: HookResult = {};
		try {
			if (opts.harness === 'cursor') result = event === 'pre-tool-use' ? cursorPreToolUse(root, input) : event === 'stop' ? cursorStop(root, input) : {};
			else if (event === 'session-start') result = sessionStart(root, input);
			else if (event === 'user-prompt-submit') result = userPromptSubmit(root, input);
			else if (event === 'pre-tool-use') result = preToolUse(root, input);
			else if (event === 'stop') result = stop(root, input);
		} catch (error) {
			// Hooks fail open: a bug in the checker must never stop someone's work.
			process.stderr.write(`${b.bin} hook ${event} failed open: ${(error as Error).message}\n`);
			process.exit(0);
		}
		try {
			mkdirSync(join(root, '.ds'), { recursive: true });
			appendFileSync(join(root, '.ds', 'hooks.log'), `${JSON.stringify({ at: new Date().toISOString(), harness: opts.harness, event, blocked: result.exitCode === 2 || !!(result.json as any)?.decision || (result.json as any)?.permission === 'deny' })}\n`);
		} catch {}
		if (result.json) process.stdout.write(`${JSON.stringify(result.json)}\n`);
		else if (result.stdout) process.stdout.write(`${result.stdout}\n`);
		if (result.stderr) process.stderr.write(`${result.stderr}\n`);
		process.exit(result.exitCode ?? 0);
	});

program.parseAsync().catch((error: Error) => {
	if (program.opts().json || process.argv.includes('--json')) process.stdout.write(`${JSON.stringify({ ok: false, error: error.message })}\n`);
	else process.stderr.write(`${error.message}\n`);
	process.exit(1);
});
void cli;
