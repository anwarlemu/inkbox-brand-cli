import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readState } from '../plan/state.js';
import { type Project, styledFiles } from '../project/detect.js';
import { listScreens } from '../project/screens.js';
import { profile } from '../project/surface.js';

// Whether the brand stylesheet carries its base layer (the page's type, colors, headings, links and focus on every
// element) or only what the library's components need (tokens, theme, fonts and brand values inside [data-slot]).
// The base layer restyles every page, so it comes only with a decision to brand the whole app:
//   - `apply` with no targets (the whole app);
//   - `create`, or `init` in an app with no pages of its own yet (nothing exists to keep);
//   - an app set up that way before (.ds/config.json records it), so a later `add` never takes it away.
// `add`, and `init` in an app that already has pages, install components without changing those pages; a selection
// (`apply button`, `apply /settings`) never brings it.

export type BaseLayer = { full: boolean; why: string };

const savedBase = (root: string): boolean | undefined => {
	try {
		return JSON.parse(readFileSync(join(root, '.ds', 'config.json'), 'utf8')).baseLayer;
	} catch {
		return undefined;
	}
};

/** The app's own pages: its routes, or plain pages, not counting a CLI's files. */
export function hasPages(project: Project) {
	const files = styledFiles(project.root);
	return listScreens(project, files, profile(project.root, files)).length > 0;
}

export function baseLayerFor(project: Project, command: 'add' | 'init' | 'apply', { fresh = false, whole = false } = {}): BaseLayer {
	const root = project.root;
	const state = readState(root);
	if (whole || (state && !state.scope)) return { full: true, why: 'the whole app is applied' };
	if (savedBase(root)) return { full: true, why: 'the app was set up with the base layer' };
	if (fresh) return { full: true, why: 'a new app' };
	if (state?.scope) return { full: false, why: 'a selection is applied' };
	if (command === 'init' && !hasPages(project)) return { full: true, why: 'the app has no pages yet' };
	return { full: false, why: 'the app has pages of its own' };
}
