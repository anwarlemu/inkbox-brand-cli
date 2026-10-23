import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, join, relative, sep } from 'node:path';

export type HookInput = Record<string, any>;

export function readHookInput(): HookInput {
	try {
		const raw = readFileSync(0, 'utf8');
		return raw.trim() ? JSON.parse(raw) : {};
	} catch {
		return {};
	}
}

export const sessionIdOf = (input: HookInput) => String(input.session_id ?? input.sessionId ?? input.conversation_id ?? input.generation_id ?? 'default');
export const promptOf = (input: HookInput) => String(input.prompt ?? input.user_prompt ?? input.userPrompt ?? '');

export type ProposedWrite = { relPath: string; before: string; after: string };

function applyEdit(text: string, oldString: string, newString: string, replaceAll?: boolean) {
	if (!oldString) return newString + text;
	if (replaceAll) return text.split(oldString).join(newString);
	const i = text.indexOf(oldString);
	return i < 0 ? text : text.slice(0, i) + newString + text.slice(i + oldString.length);
}

// Codex edits files with apply_patch: one patch text (tool_input.command) that adds, updates or deletes any number of
// files. Each update hunk is context (' '), removed ('-') and added ('+') lines, applied in order to the current file.
export function patchWrites(patch: string, root: string, cwd = root): ProposedWrite[] {
	const writes: ProposedWrite[] = [];
	const sections = patch.split(/^\*\*\* (?=(?:Add|Update|Delete) File: )/m).slice(1);
	for (const section of sections) {
		const [header, ...body] = section.split('\n');
		const m = header.match(/^(Add|Update|Delete) File: (.+)$/);
		if (!m || m[1] === 'Delete') continue;
		const lines = body.filter((l) => !/^\*\*\* (End Patch|End of File)/.test(l));
		const moveTo = lines.find((l) => l.startsWith('*** Move to: '))?.slice(13).trim();
		const target = moveTo ?? m[2].trim();
		const abs = isAbsolute(target) ? target : join(cwd, target);
		const relPath = relative(root, abs).split(sep).join('/');
		if (relPath.startsWith('..')) continue;
		const source = isAbsolute(m[2].trim()) ? m[2].trim() : join(cwd, m[2].trim());
		const before = existsSync(source) ? readFileSync(source, 'utf8') : '';
		if (m[1] === 'Add') {
			writes.push({ relPath, before: '', after: lines.filter((l) => l.startsWith('+')).map((l) => l.slice(1)).join('\n') });
			continue;
		}
		let after = before;
		let from = 0;
		const hunks: string[][] = [[]];
		for (const l of lines) {
			if (l.startsWith('*** Move to: ')) continue;
			if (l.startsWith('@@')) hunks.push([]);
			else hunks[hunks.length - 1].push(l);
		}
		for (const hunk of hunks.filter((h) => h.some((l) => /^[+-]/.test(l)))) {
			const oldText = hunk.filter((l) => !l.startsWith('+')).map((l) => l.slice(1)).join('\n');
			const newText = hunk.filter((l) => !l.startsWith('-')).map((l) => l.slice(1)).join('\n');
			const i = oldText ? after.indexOf(oldText, from) : after.length;
			if (i < 0) continue;
			after = after.slice(0, i) + newText + after.slice(i + oldText.length);
			from = i + newText.length;
		}
		writes.push({ relPath, before, after });
	}
	return writes;
}

/** Every file a tool call would write, with its content before and after: Claude Code, Codex (apply_patch) and Cursor. */
export function proposedWrites(input: HookInput, root: string): ProposedWrite[] {
	const tool = String(input.tool_name ?? input.toolName ?? '');
	const ti = input.tool_input ?? input.toolInput ?? {};
	const patch = typeof ti === 'string' ? ti : (ti.command ?? ti.patch ?? ti.input);
	if (/apply_patch/i.test(tool) || (typeof patch === 'string' && patch.includes('*** Begin Patch'))) return typeof patch === 'string' ? patchWrites(patch, root, input.cwd ?? root) : [];
	const one = proposedWrite(input, root);
	return one ? [one] : [];
}

export function proposedWrite(input: HookInput, root: string): ProposedWrite | undefined {
	const tool = String(input.tool_name ?? input.toolName ?? '');
	const ti = input.tool_input ?? input.toolInput ?? input;
	const path = ti.file_path ?? ti.filePath ?? ti.path ?? ti.target_file ?? ti.file;
	if (!path || typeof path !== 'string') return undefined;
	const abs = isAbsolute(path) ? path : join(root, path);
	const relPath = relative(root, abs).split(sep).join('/');
	if (relPath.startsWith('..')) return undefined;
	const before = existsSync(abs) ? readFileSync(abs, 'utf8') : '';
	let after = before;
	if (typeof ti.content === 'string' && /write/i.test(tool)) after = ti.content;
	else if (Array.isArray(ti.edits)) for (const e of ti.edits) after = applyEdit(after, e.old_string ?? e.oldString ?? '', e.new_string ?? e.newString ?? '', e.replace_all);
	else if (typeof ti.old_string === 'string' || typeof ti.new_string === 'string') after = applyEdit(after, ti.old_string ?? '', ti.new_string ?? '', ti.replace_all);
	else if (typeof ti.content === 'string') after = ti.content;
	else if (typeof ti.contents === 'string') after = ti.contents;
	else if (typeof ti.text === 'string') after = ti.text;
	else return undefined;
	return { relPath, before, after };
}
