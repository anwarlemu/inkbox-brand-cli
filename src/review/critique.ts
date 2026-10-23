import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { z } from 'zod';
import { brand, hasFrame } from '../lib/brand.js';
import { runningHarness } from '../install/agents.js';
import { pkgPath } from '../lib/paths.js';
import type { Surface } from '../project/surface.js';
import type { Review } from '../plan/state.js';
import type { Shot } from './capture.js';

// The critique: screenshots of the restyled screen next to the brand's own pages (the reference screenshots), judged
// against the principles and the rubric. The previous punch list is given back so scores stay consistent.

export const scorecardSchema = z.object({
	purpose: z.string(),
	scores: z.object({ hierarchy: z.number(), coherence: z.number(), brand_voice: z.number(), detail_quality: z.number(), accessibility: z.number() }),
	punch_list: z.array(z.object({ viewport: z.string(), region: z.string(), issue: z.string(), fix: z.string(), severity: z.enum(['blocker', 'major', 'minor']) })),
	verdict: z.string(),
});
export type Scorecard = z.infer<typeof scorecardSchema>;

const SYSTEM = `You review a restyled screen for the {{brand}} design system before it ships. The project keeps its own
words, elements and purpose; only its look changed. The first images are the brand's own pages (the reference); the
rest are the restyled screen, top to bottom, at desktop and phone width. Compare them closely: does the screen read as
the same brand, with the same quality? Judge against the principles and the rubric, not general taste. Name exact
regions and give fixes that change styling only (never copy or which elements exist). Be consistent: the same problems
get the same scores. A first review lists every issue you see, complete and ordered by severity, so it can all be fixed
in one pass. A later review checks each earlier item and adds a new one only when it is a blocker or major; minor
issues never hold a score below 7.`;

function hasApiCredentials() {
	return !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_PROFILE || existsSync(join(homedir(), '.config', 'anthropic')));
}

export type Engine = 'api' | 'claude-code' | 'codex' | 'self';
const ENGINES: Engine[] = ['api', 'claude-code', 'codex', 'self'];
const installed = (bin: string) => spawnSync(bin, ['--version'], { encoding: 'utf8' }).status === 0;

/**
 * Who scores the screen: a separate reviewer when one is at hand (the running agent's own CLI first, so it runs on the
 * same subscription, then an API key, then any installed CLI), otherwise the agent itself from the saved screenshots.
 */
export function pickEngine(): Engine {
	const wanted = process.env.DS_REVIEW_ENGINE as Engine | undefined;
	if (wanted && ENGINES.includes(wanted)) return wanted;
	const running = runningHarness();
	if (running === 'codex' && installed('codex')) return 'codex';
	if (running === 'claude-code' && installed('claude')) return 'claude-code';
	if (hasApiCredentials()) return 'api';
	if (installed('claude')) return 'claude-code';
	if (installed('codex')) return 'codex';
	return 'self';
}

/** A reviewer CLI run without blocking, so several screens can be scored at once. */
function runCli(cmd: string, args: string[], input: string, env: NodeJS.ProcessEnv = process.env): Promise<{ status: number | null; stdout: string; stderr: string }> {
	return new Promise((resolve) => {
		const child = spawn(cmd, args, { env, stdio: ['pipe', 'pipe', 'pipe'] });
		let stdout = '';
		let stderr = '';
		const timer = setTimeout(() => child.kill(), 15 * 60 * 1000);
		child.stdout.on('data', (d) => (stdout += d));
		child.stderr.on('data', (d) => (stderr += d));
		child.on('error', (e) => {
			clearTimeout(timer);
			resolve({ status: 1, stdout, stderr: String(e) });
		});
		child.on('close', (status) => {
			clearTimeout(timer);
			resolve({ status, stdout, stderr });
		});
		child.stdin.end(input);
	});
}

/** OpenAI structured outputs need every property required and no extra properties. */
function strict(schema: any): any {
	if (Array.isArray(schema)) return schema.map(strict);
	if (!schema || typeof schema !== 'object') return schema;
	const out: any = {};
	for (const [k, v] of Object.entries(schema)) if (k !== '$schema') out[k] = strict(v);
	if (out.type === 'object' && out.properties) {
		out.required = Object.keys(out.properties);
		out.additionalProperties = false;
	}
	return out;
}
export const scorecardJsonSchema = () => strict(z.toJSONSchema(scorecardSchema));

const media = (path: string) => (/\.png$/.test(path) ? 'image/png' : 'image/jpeg') as 'image/png' | 'image/jpeg';

/** The screen as it was before any hand edits (`snapshot`), desktop slices, when it was taken. */
export function beforeShots(root: string, screenId: string) {
	const dir = join(root, '.ds', 'before', screenId.replace(/[^\w-]+/g, '_') || 'home');
	return existsSync(dir) ? readdirSync(dir).filter((f) => /^desktop-\d+\.(jpg|png)$/.test(f)).sort().slice(0, 2).map((f) => join(dir, f)) : [];
}

const MAIN_REFERENCES = ['home', 'overview', 'usage'];
const rank = (f: string) => {
	const i = MAIN_REFERENCES.findIndex((n) => f.includes(`-${n}-`));
	return i < 0 ? MAIN_REFERENCES.length : i;
};

/** The brand pages to compare against: the site's home and a use-case page, or the product's overview and usage pages. */
export function references(surface: Surface) {
	const dir = pkgPath('brand', 'reference');
	return readdirSync(dir)
		.filter((f) => f.startsWith(surface === 'product' ? 'product-' : 'site-') && /desktop\.jpg$/.test(f))
		.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
		.slice(0, 2)
		.map((f) => join(dir, f));
}

/** Measured facts the reviewer must take as given (fonts, sizes, the column check). */
export const factsText = (facts: string[]): string =>
	facts.length
		? `\n\n# Measured on the page (true; do not contradict from the pixels)\n${facts.map((f) => `- ${f}`).join('\n')}${hasFrame() ? '\n- Nothing crosses the column lines (measured). The header, its logo and its buttons sit inside the lines on purpose.' : ''}\n- The before images are taken after the automatic conversion: fonts and colors are already the brand's there, so the same letter shapes in both are expected.${hasFrame() ? ' Containers and the header moving onto the column lines is intended, not a composition break.' : ' Containers moving onto the brand\'s content column is intended, not a composition break.'}`
		: '';

function guide(surface: Surface, previous?: Review) {
	const read = (f: string) => readFileSync(pkgPath('brand', f), 'utf8');
	const prior = previous ? `\n\n# Previous review of this screen (scores ${JSON.stringify(previous.scores)})\nCheck each item first and say if it is fixed:\n${previous.punch.map((p) => `- [${p.severity}] ${p.where}: ${p.issue}`).join('\n')}` : '';
	return `# principles.md\n${read('principles.md')}\n\n# rubric.md\n${read('rubric.md')}\n\nThis screen is a ${surface === 'product' ? 'product screen: compare with the product reference' : 'site page: compare with the site reference'}.${prior}`;
}

export async function critique(shots: Shot[], url: string, surface: Surface, previous?: Review, before: string[] = [], facts: string[] = []): Promise<{ card: Scorecard; model: string }> {
	const system = SYSTEM.replaceAll('{{brand}}', brand().name);
	const refs = references(surface);
	const engine = pickEngine();
	if (engine === 'self') throw new Error('self review: call brief() and record the agent\'s own scorecard');
	if (engine === 'codex') {
		const work = join(dirname(shots[0].path), 'codex');
		mkdirSync(work, { recursive: true });
		writeFileSync(join(work, 'schema.json'), JSON.stringify(scorecardJsonSchema()));
		const prompt = [
			system,
			'',
			guide(surface, previous) + factsText(facts),
			`\n# Screen\n${url}\n`,
			`The first ${refs.length} attached images are the reference (the brand's own pages);${before.length ? ` the next ${before.length} are this screen before hand edits (desktop, top down);` : ''} the rest are the restyled screen: ${shots.map((s) => `${s.viewport} slice ${s.index + 1}`).join(', ')}.`,
			'Do not run commands or edit files. Return the scorecard and the punch list.',
		].join('\n');
		const args = ['exec', '--ephemeral', '--skip-git-repo-check', '-s', 'read-only', '-C', work, '--output-schema', join(work, 'schema.json'), '-o', join(work, 'out.json'), ...[...refs, ...before, ...shots.map((s) => s.path)].map((f) => `--image=${f}`)];
		if (process.env.DS_REVIEW_MODEL) args.push('-m', process.env.DS_REVIEW_MODEL);
		const run = await runCli('codex', args, prompt);
		if (run.status !== 0 || !existsSync(join(work, 'out.json'))) throw new Error(`codex exec failed (exit ${run.status}): ${(run.stderr || run.stdout).slice(-400)}`);
		const text = readFileSync(join(work, 'out.json'), 'utf8');
		return { card: scorecardSchema.parse(JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1))), model: 'codex' };
	}
	if (engine === 'claude-code') {
		// Every image goes in the one message (no tool calls to open them one by one): a single turn, about a minute.
		const block = (path: string, media: 'image/png' | 'image/jpeg') => ({ type: 'image', source: { type: 'base64', media_type: media, data: readFileSync(path).toString('base64') } });
		const content = [
			{ type: 'text', text: `${guide(surface, previous) + factsText(facts)}\n\n# Screen\n${url}\n\nReference: the brand's own pages.` },
			...refs.map((r) => block(r, 'image/jpeg')),
			...(before.length ? [{ type: 'text', text: 'Before: this screen right after the automatic conversion, before any hand edits (desktop, top down). Compare the composition.' }, ...before.map((b) => block(b, media(b)))] : []),
			{ type: 'text', text: `Restyled screen: ${shots.map((s) => `${s.viewport} slice ${s.index + 1}`).join(', ')}, in that order.` },
			...shots.map((s) => block(s.path, media(s.path))),
			{ type: 'text', text: 'Return the scorecard and the punch list.' },
		];
		const input = `${JSON.stringify({ type: 'user', message: { role: 'user', content } })}\n`;
		const schema = (({ $schema, ...rest }) => rest)(z.toJSONSchema(scorecardSchema) as Record<string, unknown>);
		const args = ['-p', '--input-format', 'stream-json', '--output-format', 'stream-json', '--verbose', '--json-schema', JSON.stringify(schema), '--tools', '', '--effort', process.env.DS_REVIEW_EFFORT ?? 'medium', '--append-system-prompt', system];
		if (process.env.DS_REVIEW_MODEL) args.push('--model', process.env.DS_REVIEW_MODEL);
		const env = { ...process.env };
		delete env.CLAUDECODE;
		delete env.CLAUDE_CODE_ENTRYPOINT;
		const run = await runCli('claude', args, input, env);
		const last = run.stdout.trim().split('\n').reverse().find((l) => l.includes('"type":"result"'));
		if (run.status !== 0 || !last) throw new Error(`claude -p failed (exit ${run.status}): ${(run.stderr || run.stdout).slice(-400)}`);
		const out = JSON.parse(last) as { structured_output?: unknown; result?: string; is_error?: boolean; modelUsage?: Record<string, unknown> };
		if (out.is_error) throw new Error(`claude -p returned an error: ${out.result?.slice(0, 400)}`);
		return { card: scorecardSchema.parse(out.structured_output ?? JSON.parse(out.result ?? '{}')), model: `claude-code (${Object.keys(out.modelUsage ?? {}).join(', ') || 'default'})` };
	}
	const client = new Anthropic();
	const image = (path: string, type: 'image/png' | 'image/jpeg'): Anthropic.Beta.BetaContentBlockParam => ({ type: 'image', source: { type: 'base64', media_type: type, data: readFileSync(path).toString('base64') } });
	const content: Anthropic.Beta.BetaContentBlockParam[] = [{ type: 'text', text: guide(surface, previous) + factsText(facts) }, { type: 'text', text: 'Reference: the brand\'s own pages.' }];
	for (const r of refs) content.push(image(r, 'image/jpeg'));
	if (before.length) {
		content.push({ type: 'text', text: 'Before: this screen right after the automatic conversion, before any hand edits (desktop, top down). Compare the composition.' });
		for (const b of before) content.push(image(b, media(b)));
	}
	content.push({ type: 'text', text: `Restyled screen: ${url}` });
	for (const shot of shots) {
		content.push({ type: 'text', text: `${shot.viewport}, slice ${shot.index + 1}` });
		content.push(image(shot.path, media(shot.path)));
	}
	content.push({ type: 'text', text: 'Return the scorecard and the punch list.' });
	const response = await client.beta.messages.parse({
		model: process.env.DS_REVIEW_MODEL ?? brand().reviewModel,
		max_tokens: 16000,
		system,
		thinking: { type: 'adaptive' },
		output_config: { effort: 'high', format: betaZodOutputFormat(scorecardSchema) },
		messages: [{ role: 'user', content }],
	});
	if (!response.parsed_output) throw new Error(`The review model returned no scorecard (stop_reason ${response.stop_reason}).`);
	return { card: response.parsed_output, model: response.model };
}

/**
 * For an agent with no separate reviewer (Cursor, Hermes, any other): everything needed to score the screen itself,
 * written next to the screenshots. The agent opens every image, fills scorecard.json and submits it.
 */
export function brief(shots: Shot[], url: string, surface: Surface, previous?: Review, before: string[] = [], facts: string[] = []): string {
	const dir = dirname(shots[0].path);
	const text = [
		`# Review of ${url}`,
		'',
		SYSTEM.replaceAll('{{brand}}', brand().name),
		'',
		guide(surface, previous) + factsText(facts),
		'',
		'# Images (open every one before scoring)',
		"Reference (the brand's own pages):",
		...references(surface).map((r) => `- ${r}`),
		...(before.length ? ['Before (this screen right after the automatic conversion, before hand edits; compare the composition):', ...before.map((b) => `- ${b}`)] : []),
		'Restyled screen:',
		...shots.map((s) => `- ${s.path} (${s.viewport}, slice ${s.index + 1})`),
		'',
		'# Answer',
		`Write ${join(dir, 'scorecard.json')} with this JSON shape (scores 1 to 10):`,
		JSON.stringify({ purpose: 'what the screen is for', scores: { hierarchy: 0, coherence: 0, brand_voice: 0, detail_quality: 0, accessibility: 0 }, punch_list: [{ viewport: 'desktop', region: '', issue: '', fix: '', severity: 'major' }], verdict: '' }, null, 2),
	].join('\n');
	writeFileSync(join(dir, 'brief.md'), `${text}\n`);
	return dir;
}
