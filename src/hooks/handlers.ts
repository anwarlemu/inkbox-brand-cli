import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { changedFiles, checkable, checkText, formatFinding, newFindings, runCheck } from '../check/engine.js';
import { installPreCommit } from '../install/agents.js';
import { Writer } from '../install/files.js';
import { brand, cli, isOwnFile } from '../lib/brand.js';
import { elementsIn, renderElement } from '../plan/elements.js';
import { readState } from '../plan/state.js';
import { mainScreens, taskStatus } from '../plan/tasks.js';
import { surfaceOf } from '../project/surface.js';
import { type HookInput, promptOf, proposedWrites, sessionIdOf } from './payload.js';

// The hooks agents run on their own events. Writes that add off-brand values are blocked before they reach disk; the
// agent cannot finish while the files it changed fail the check; the brand styling for the elements it edits is shown
// once per session.

export type HookResult = { stdout?: string; stderr?: string; exitCode?: number; json?: Record<string, unknown> };

type Session = { startedAt: number; shown: string[]; stopBlocks: number; queueNudged?: boolean; updatedAt: number };
const sessionFile = (root: string) => join(root, '.ds', 'session.json');
function session(root: string, id: string) {
	let all: Record<string, Session> = {};
	try {
		all = JSON.parse(readFileSync(sessionFile(root), 'utf8'));
	} catch {}
	// A session the start hook never saw counts every change still uncommitted.
	const entry = all[id] ?? { startedAt: 0, shown: [], stopBlocks: 0, updatedAt: Date.now() };
	return {
		entry,
		save() {
			entry.updatedAt = Date.now();
			for (const [k, v] of Object.entries(all)) if (v.updatedAt < Date.now() - 7 * 86400000) delete all[k];
			all[id] = entry;
			mkdirSync(join(root, '.ds'), { recursive: true });
			writeFileSync(sessionFile(root), JSON.stringify(all));
		},
	};
}

export function sessionStart(root: string, input: HookInput = {}): HookResult {
	const s = session(root, sessionIdOf(input));
	s.entry.startedAt = Date.now();
	s.save();
	try {
		installPreCommit(new Writer(root));
	} catch {}
	const state = readState(root);
	const b = brand();
	if (!state) return { stdout: `${b.name} design system is installed here. Read .ds/agent-guide.md or run \`${cli()} guide\`, then inspect components with \`${cli()} show <name>\`. Build to the user’s brief; use the bare command only for a requested conversion.` };
	const screens = mainScreens(state);
	const done = screens.filter((sc, i) => taskStatus(root, state, sc, i).done).length;
	return { stdout: [`${b.name} design system is active (${state.surface}): ${done} of ${screens.length} screens done.`, done < screens.length ? `Continue with \`${cli()}\`: it prints the next task.` : 'Keep new work on the brand: style values are brand tokens; `look <file>` shows how each element is styled.', 'Writes with off-brand values are blocked; you cannot finish while the check fails.'].join('\n') };
}

const APPLY_BRAND = /\b(apply|applying|restyle|rebrand|re-brand|reskin|re-skin|theme)\b[\s\S]{0,80}\b(brand|design system|styl\w*|look|tokens?)\b|\b(brand|design system)\b[\s\S]{0,40}\b(onto|to (this|my|the|our))\b/i;

export function userPromptSubmit(root: string, input: HookInput): HookResult {
	const prompt = promptOf(input);
	if (!APPLY_BRAND.test(prompt)) return {};
	return { stdout: `${cli()}: read .ds/agent-guide.md first. For new interfaces, use init, show and add, then build to the user’s brief. For a requested restyle, preview with \`${cli()} --dry-run\`, run the bare command and complete its tasks while preserving existing content and behavior.` };
}

export function preToolUse(root: string, input: HookInput): HookResult {
	const writes = proposedWrites(input, root).filter((w) => checkable(w.relPath) && !isOwnFile(w.relPath));
	if (!writes.length) return {};
	const blocked: string[] = [];
	const notes: string[] = [];
	const state = readState(root);
	const s = session(root, sessionIdOf(input));
	for (const write of writes) {
		const colorSurface = state?.colors === 'components' ? surfaceOf(write.relPath, { surface: state.surface, mixed: state.mixed, product: 0, site: 0, reasons: [] }) : undefined;
		const after = checkText(write.relPath, write.after, colorSurface);
		const before = write.before ? checkText(write.relPath, write.before, colorSurface) : { findings: [], overrides: [] };
		const introduced = newFindings(before.findings, after.findings);
		if (introduced.length) {
			blocked.push(`${write.relPath}: ${introduced.length} off-brand value${introduced.length > 1 ? 's' : ''}`, ...introduced.slice(0, 25).map(formatFinding));
			continue;
		}
		// The brand styling for the elements this write touches, each kind once per session.
		if (state) {
			const surface = surfaceOf(write.relPath, { surface: state.surface, mixed: state.mixed, product: 0, site: 0, reasons: [] });
			const kinds = [...new Set(elementsIn(write.relPath, write.after, surface).map((h) => h.kind))].filter((k) => !s.entry.shown.includes(`${surface}:${k}`)).slice(0, 3);
			if (kinds.length) {
				s.entry.shown.push(...kinds.map((k) => `${surface}:${k}`));
				notes.push(`${brand().name} styling for elements in ${write.relPath} (\`${cli()} look ${write.relPath}\` for all):\n${kinds.map((k) => renderElement(k, surface, { tailwind: /\.(tsx|jsx)$/.test(write.relPath) })).join('\n\n')}`);
			}
		}
		const added = newFindings(before.overrides, after.overrides);
		if (added.length) notes.push(`ds-override added in ${write.relPath}: ${added.map((o) => `${o.rule} (${o.overridden})`).join('; ')}. It needs the user's approval (\`${cli()} approve\`); report it.`);
	}
	s.save();
	if (blocked.length) return { exitCode: 2, stderr: [`${cli()} blocked this write; nothing was written.`, ...blocked, 'Use the brand token each line names, and write again.'].join('\n') };
	return notes.length ? { json: { hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'allow', additionalContext: notes.join('\n\n') } } } : {};
}

export function stop(root: string, input: HookInput): HookResult {
	const s = session(root, sessionIdOf(input));
	const changed = changedFiles(root).filter((f) => checkable(f) && existsSync(join(root, f)) && statSync(join(root, f)).mtimeMs >= s.entry.startedAt);
	if (changed.length) {
		const result = runCheck(root, { paths: changed });
		const own = result.findings.filter((f) => f.rule !== 'override-approval');
		if (own.length) {
			s.entry.stopBlocks++;
			s.save();
			if (s.entry.stopBlocks > 5) return { stderr: `${cli()}: ${own.length} off-brand values remain after 5 tries. Stopping so a person can look; tell the user.` };
			return { json: { decision: 'block', reason: [`${cli()} check: ${own.length} values in files you changed are not brand tokens. You are not done.`, ...own.slice(0, 30).map(formatFinding), `Fix each (\`${cli()} check --fix\` applies safe token fixes), then finish.`].join('\n') } };
		}
		const approvals = result.findings.filter((f) => f.rule === 'override-approval');
		if (approvals.length) return { stdout: `${cli()}: ${approvals.length} ds-override(s) wait for the user's approval (\`${cli()} approve\`). List them in your summary.` };
	}
	// While applying the brand, finishing early is a miss: point at the next task once per session.
	const state = readState(root);
	if (state && !s.entry.queueNudged) {
		const screens = mainScreens(state);
		const open = screens.findIndex((sc, i) => !taskStatus(root, state, sc, i).done);
		if (open >= 0 && changed.length) {
			s.entry.queueNudged = true;
			s.save();
			return { json: { decision: 'block', reason: `${cli()}: the brand is not fully applied yet (${screens.length - open} screens left). Run \`${cli()}\` and do the next task, or, if the user asked you to stop here, say which screens are left.` } };
		}
	}
	return {};
}

export function cursorPreToolUse(root: string, input: HookInput): HookResult {
	const r = preToolUse(root, input);
	if (r.exitCode === 2) return { json: { permission: 'deny', agent_message: r.stderr, user_message: `${cli()} blocked a write with off-brand values.` } };
	return { json: { permission: 'allow' } };
}

export function cursorStop(root: string, input: HookInput): HookResult {
	const reason = (stop(root, input).json as { reason?: string } | undefined)?.reason;
	return reason ? { json: { followup_message: reason } } : {};
}
