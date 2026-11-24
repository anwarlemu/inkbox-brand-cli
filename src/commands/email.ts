import { join, resolve } from 'node:path';
import type { Command } from 'commander';
import { email, EMAILS, emailTakes, type EmailCopy } from '../assets/email.js';
import { display, write, type OutFile } from '../assets/io.js';
import { cli } from '../lib/brand.js';
import { helpRow } from '../lib/help-row.js';
import { emit } from '../lib/output.js';

// `email`: emails as plain HTML tables that mail clients keep, with the logo beside them.

type Opts = Record<string, string | boolean | undefined> & { json?: boolean };
const KEYS: (keyof EmailCopy)[] = ['headline', 'body', 'button', 'url', 'items', 'total', 'name', 'role', 'email', 'footer'];

export function emailCommand(program: Command) {
	program
		.command('email [kind]')
		.description(`Emails as HTML tables every mail client keeps (${EMAILS.join(', ')}), in the brand's colors and type, with the logo`)
		.option('--headline <text>', 'the heading')
		.option('--body <text>', 'the message; a blank line starts a paragraph')
		.option('--button <text>', 'the button\'s words (with --url)')
		.option('--url <url>', 'where the button goes; a signature\'s address')
		.option('--items <text>', 'receipt: lines separated by |, each "what - amount"')
		.option('--total <text>', 'receipt: the total')
		.option('--name <text>', 'signature: the person\'s name')
		.option('--role <text>', 'signature: the role')
		.option('--email <text>', 'signature: the email address')
		.option('--footer <text>', 'small print under the message')
		.option('--logo-url <url>', 'where the logo will be hosted (default: logo.png beside the HTML)')
		.option('-o, --out <dir>', 'output directory (default email/)')
		.option('--list', 'kinds and what each takes')
		.option('--json', 'JSON output')
		.action(async (kind: string | undefined, _o, cmd: Command) => runEmail(kind, cmd.optsWithGlobals() as Opts))
		.addHelpText('after', () => ['', 'Examples:', helpRow(`${cli()} email announcement --headline "Agent Cards are here" --button "Read more" --url https://acme.com`, '', 60), helpRow(`${cli()} email signature --name "Your name" --role "Your role" --url acme.com`, '', 60)].join('\n'));
}

async function runEmail(kind: string | undefined, o: Opts) {
	const cwd = process.cwd();
	if (o.list) {
		const rows = EMAILS.map((k) => ({ kind: k, ...emailTakes(k) }));
		emit(o, { emails: rows }, () => rows.map((r) => helpRow(r.kind, `takes ${r.takes.join(', ')}; needs ${r.needs.join(', ')}`, 16)).join('\n'));
		return;
	}
	if (!kind) throw new Error(`Name an email: ${cli()} email announcement (one of ${EMAILS.join(', ')}).`);
	const copy: EmailCopy = {};
	for (const k of KEYS) if (typeof o[k] === 'string') copy[k] = (o[k] as string).replace(/\\n/g, '\n');
	const logo = typeof o.logoUrl === 'string' ? o.logoUrl : 'logo.png';
	const r = await email(kind, copy, logo);
	const dir = resolve(cwd, typeof o.out === 'string' ? o.out : 'email');
	const files: OutFile[] = [];
	write(join(dir, `${kind}.html`), r.html);
	files.push({ path: display(cwd, join(dir, `${kind}.html`)), format: 'html', width: 600, height: 0 });
	if (logo === 'logo.png') {
		write(join(dir, 'logo.png'), r.logoFile);
		files.push({ path: display(cwd, join(dir, 'logo.png')), format: 'png', width: 0, height: 52 });
	}
	emit(o, { files }, () => files.map((f) => f.path).join('\n'));
}
