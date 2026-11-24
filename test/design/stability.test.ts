import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { adapter, paint } from '../../src/design/adapter.js';
import { runDesign } from '../../src/design/index.js';

// A revision changes what it was asked to change and nothing else: every other layer stays within 2% of the canvas.

type Layer = { id: string; box: { x: number; y: number; w: number; h: number } };
const WORDS = ['headline', 'badge', 'body', 'credit'];
const PHRASES: [string, string[]][] = [
	['darker theme', []],
	['bigger headline', WORDS],
	['headline a little smaller', WORDS],
	['smaller octopus', ['art']],
	['move the octopus left', ['art']],
	['hide the badge', WORDS],
	['logo top right', ['logo']],
];

async function run(cwd: string, ...argv: string[]) {
	const lines: string[] = [];
	const code = await runDesign([...argv, '--json'], adapter(), { cwd, bin: 'cli', out: (s) => lines.push(s), err: () => {}, paint });
	return { code, data: JSON.parse(lines.join('')) as { layers?: Layer[] } };
}

describe('design revisions keep what they were not asked to change', () => {
	for (const [template, size] of [['tile', 'x-banner'], ['outline', 'x-banner'], ['announce', 'og'], ['hatch', 'og'], ['reef', 'square']] as const) {
		it(`${template} at ${size}`, async () => {
			const cwd = mkdtempSync(join(tmpdir(), 'ds-stable-'));
			const made = await run(cwd, 'new', template, '--size', size, '--headline', 'Every agent gets an inbox', '--badge', 'New', '--body', 'Email, phone and calendars', '-o', 'a.design.json', '--format', 'png');
			expect(made.code).toBe(0);
			const W = { 'x-banner': [1500, 500], og: [1200, 630], square: [1080, 1080] }[size];
			const problems: string[] = [];
			for (const [phrase, asked] of PHRASES) {
				const r = await run(cwd, 'revise', 'a.design.json', phrase, '--dry-run');
				if (r.code !== 0) continue;
				/* Words the moved part now stands on have to make room; anything else stays. */
				const moved = r.data.layers!.filter((l) => asked.includes(l.id));
				const was = made.data.layers!.filter((l) => WORDS.includes(l.id));
				const meets = (a: Layer['box'], b: Layer['box']) => a.x < b.x + b.w + 20 && b.x < a.x + a.w + 20 && a.y < b.y + b.h + 20 && b.y < a.y + a.h + 20;
				const displaced = moved.some((m) => !WORDS.includes(m.id) && was.some((w) => meets(m.box, w.box)));
				for (const before of made.data.layers!) {
					if (asked.includes(before.id) || (displaced && WORDS.includes(before.id))) continue;
					const after = r.data.layers!.find((l) => l.id === before.id);
					if (!after) continue;
					const dx = Math.abs(after.box.x - before.box.x) / W[0]!;
					const dy = Math.abs(after.box.y - before.box.y) / W[1]!;
					if (dx > 0.02 || dy > 0.02) problems.push(`${template}: "${phrase}" moved the ${before.id} by ${(dx * 100).toFixed(1)}% across, ${(dy * 100).toFixed(1)}% down`);
				}
			}
			expect(problems).toEqual([]);
		}, 120_000);
	}
});
