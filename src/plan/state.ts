import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Screen } from '../project/screens.js';
import type { Surface } from '../project/surface.js';

// The project's progress, in .ds/state.json (committed, so a teammate or a new session picks up where it stopped).

export type Scores = { hierarchy: number; coherence: number; brand_voice: number; detail_quality: number; accessibility: number };
export type Review = { at: string; url: string; scores: Scores; passed: boolean; punch: { severity: string; where: string; issue: string; fix: string }[]; verdict: string; by?: string; files?: string; rounds?: number };

export type State = {
	version: 2;
	/** Component colors are applied locally; unrelated palettes/content keep their own colors. */
	colors?: 'components';
	surface: Surface;
	mixed: boolean;
	theme: 'light' | 'dark';
	appliedAt?: string;
	/** Where the running app was last reviewed (http://localhost:4321), so later tasks can name full URLs. */
	baseUrl?: string;
	screens: Screen[];
	/** The screens that are tasks, one per distinct layout (see pickMain). */
	main?: string[];
	/** Screens the agent marked done where no review is possible (native apps). */
	marked: string[];
	/** Screens left as they are, with the reason; listed for the person in the final summary. */
	skipped: Record<string, string>;
	reviews: Record<string, Review>;
};

const path = (root: string) => join(root, '.ds', 'state.json');

export function readState(root: string): State | undefined {
	if (!existsSync(path(root))) return undefined;
	try {
		const s = JSON.parse(readFileSync(path(root), 'utf8'));
		return s.version === 2 ? { marked: [], skipped: {}, reviews: {}, ...s } : undefined;
	} catch {
		return undefined;
	}
}

export function writeState(root: string, state: State) {
	mkdirSync(join(root, '.ds'), { recursive: true });
	writeFileSync(path(root), `${JSON.stringify(state, null, 2)}\n`);
}

/** Whether an older version left its config behind (it used .ds/config.json with modes); v2 starts over cleanly. */
export const hasOldConfig = (root: string) => existsSync(join(root, '.ds', 'config.json')) && !existsSync(path(root));
