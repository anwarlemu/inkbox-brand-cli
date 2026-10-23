import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

// Small file helpers shared by the installer: write only what changed, and record it for the summary.

export type Change = { file: string; action: 'wrote' | 'patched' };

export class Writer {
	changes: Change[] = [];
	constructor(readonly root: string, readonly dryRun = false) {}

	read(rel: string) {
		const abs = join(this.root, rel);
		return existsSync(abs) ? readFileSync(abs, 'utf8') : undefined;
	}

	write(rel: string, content: string) {
		const before = this.read(rel);
		if (before === content) return false;
		this.changes.push({ file: rel, action: before === undefined ? 'wrote' : 'patched' });
		if (!this.dryRun) {
			mkdirSync(dirname(join(this.root, rel)), { recursive: true });
			writeFileSync(join(this.root, rel), content);
		}
		return true;
	}

	json(rel: string) {
		const text = this.read(rel);
		if (!text) return undefined;
		try {
			return JSON.parse(text);
		} catch {
			throw new Error(`${rel} is not valid JSON. Fix it and run the command again.`);
		}
	}
}

/** Puts a block between markers, replacing an earlier one, so running again updates it instead of adding another. */
export function upsertBlock(existing: string, block: string, start: string, end: string) {
	const wrapped = `${start}\n${block}\n${end}`;
	if (existing.includes(start) && existing.includes(end)) return existing.replace(new RegExp(`${escape(start)}[\\s\\S]*?${escape(end)}`), wrapped);
	return existing.trim() ? `${existing.trimEnd()}\n\n${wrapped}\n` : `${wrapped}\n`;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
