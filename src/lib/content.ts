import { readFileSync } from 'node:fs';
import { z } from 'zod';

const imageContentSchema = z.strictObject({
	template: z.string().optional(),
	size: z.string().optional(),
	ground: z.string().optional(),
	headline: z.string().optional(),
	subtext: z.string().optional(),
	eyebrow: z.string().optional(),
	quote: z.string().optional(),
	attribution: z.string().optional(),
	image: z.string().optional(),
	out: z.string().optional(),
	export: z.string().optional(),
});

const videoContentSchema = z.strictObject({
	template: z.string().optional(),
	size: z.string().optional(),
	ground: z.string().optional(),
	headline: z.string().optional(),
	subtext: z.string().optional(),
	eyebrow: z.string().optional(),
	out: z.string().optional(),
});

export type ImageContent = z.infer<typeof imageContentSchema>;
export type VideoContent = z.infer<typeof videoContentSchema>;

function issueText(issue: { path: PropertyKey[]; message: string; code: string; keys?: string[] }): string {
	if (issue.code === 'unrecognized_keys') {
		const keys = issue.keys?.length ? issue.keys.map((key) => `"${key}"`).join(', ') : 'an unknown field';
		return `unknown field ${keys}`;
	}
	const path = issue.path.map(String).filter(Boolean).join('.');
	return path ? `${path} ${issue.message}` : issue.message;
}

function parseFile<T>(path: string | undefined, schema: z.ZodType<T>, label: string): T {
	if (!path) return {} as T;
	let raw: unknown;
	try {
		raw = JSON.parse(readFileSync(path, 'utf8'));
	} catch (error) {
		throw new Error(`Could not read ${label} ${path}: ${(error as Error).message}`);
	}
	if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error(`${label} must be a JSON object.`);
	const parsed = schema.safeParse(raw);
	if (!parsed.success) {
		const detail = parsed.error.issues.map((issue) => issueText(issue as { path: PropertyKey[]; message: string; code: string; keys?: string[] })).join('; ');
		throw new Error(`${label} ${detail}.`);
	}
	return parsed.data;
}

/** Image `--content` file. Unknown keys and non-strings fail instead of being ignored. */
export function readImageContent(path: string | undefined): ImageContent {
	return parseFile(path, imageContentSchema, '--content');
}

/** Video `--content` file. Unknown keys and non-strings fail instead of being ignored. */
export function readVideoContent(path: string | undefined): VideoContent {
	return parseFile(path, videoContentSchema, '--content');
}
