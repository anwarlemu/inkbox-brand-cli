import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fontFacts } from '../image/fonts.js';
import { brand, tokens } from '../lib/brand.js';
import { suggest } from '../lib/names.js';
import { pkgPath } from '../lib/paths.js';

const GROUP_ORDER = ['color', 'type', 'spacing', 'layout', 'radii', 'shadow', 'motion'] as const;
export type TokenGroup = (typeof GROUP_ORDER)[number];

const ALIASES: Record<string, TokenGroup> = {
	colour: 'color',
	colors: 'color',
	colours: 'color',
	typography: 'type',
	font: 'type',
	fonts: 'type',
	space: 'spacing',
	radius: 'radii',
	radiuses: 'radii',
	shadows: 'shadow',
	blur: 'shadow',
	easing: 'motion',
	duration: 'motion',
	animation: 'motion',
};

function groupOf(name: string): TokenGroup | undefined {
	if (name.startsWith('--ds-color-')) return 'color';
	if (/^--ds-(font|text|line|leading|tracking)-/.test(name)) return 'type';
	if (name.startsWith('--ds-space-') || name === '--ds-section-padding' || name === '--ds-component-padding') return 'spacing';
	if (name.startsWith('--ds-layout-') || name.startsWith('--ds-frame-')) return 'layout';
	if (name.startsWith('--ds-radius-')) return 'radii';
	if (name.startsWith('--ds-shadow-') || name.startsWith('--ds-blur-')) return 'shadow';
	if (name.startsWith('--ds-duration-') || name.startsWith('--ds-easing-')) return 'motion';
	return undefined;
}

export function tokenGroups() {
	const grouped = Object.fromEntries(GROUP_ORDER.map((id) => [id, {} as Record<string, string>])) as Record<TokenGroup, Record<string, string>>;
	const ungrouped: Record<string, string> = {};
	for (const [name, value] of Object.entries(tokens().site)) {
		const group = groupOf(name);
		if (group) grouped[group][name] = value;
		else ungrouped[name] = value;
	}
	return { groups: grouped, ungrouped };
}

function tokenIndex() {
	const { groups, ungrouped } = tokenGroups();
	const byName = new Map<string, { group: TokenGroup | 'ungrouped'; value: string }>();
	for (const [group, table] of Object.entries(groups) as [TokenGroup, Record<string, string>][]) {
		for (const [name, value] of Object.entries(table)) byName.set(name, { group, value });
	}
	for (const [name, value] of Object.entries(ungrouped)) byName.set(name, { group: 'ungrouped', value });
	return { groups, ungrouped, byName };
}

function normalizeToken(name: string) {
	const trimmed = name.trim();
	if (trimmed.startsWith('--ds-')) return trimmed;
	if (trimmed.startsWith('ds-')) return `--${trimmed}`;
	return undefined;
}

/** One group, or one exact token. An unknown name is an error, not a search. */
export function brandTokens(name?: string) {
	const { groups, ungrouped, byName } = tokenIndex();
	if (!name) {
		return {
			ok: true as const,
			kind: 'all' as const,
			groups: GROUP_ORDER.map((id) => ({ id, count: Object.keys(groups[id]).length })),
			tokens: groups,
			...(Object.keys(ungrouped).length ? { ungrouped } : {}),
		};
	}
	const key = name.trim().toLowerCase();
	const alias = ALIASES[key] ?? (GROUP_ORDER.includes(key as TokenGroup) ? (key as TokenGroup) : undefined);
	if (alias) return { ok: true as const, kind: 'group' as const, group: alias, tokens: groups[alias] };
	const exact = normalizeToken(name);
	if (exact && byName.has(exact)) {
		const found = byName.get(exact)!;
		return { ok: true as const, kind: 'token' as const, token: exact, group: found.group, value: found.value };
	}
	const known = [...byName.keys(), ...GROUP_ORDER];
	const close = suggest(exact ?? name, known);
	throw new Error(`Unknown token or group "${name}". Groups: ${GROUP_ORDER.join(', ')}.${close.length ? ` Did you mean ${close.join(', ')}?` : ''} Token names look like ds-color-ink.`);
}

function licenseFiles() {
	const dir = pkgPath('brand', 'fonts');
	return readdirSync(dir)
		.filter((file) => file.endsWith('.txt'))
		.sort()
		.map((file) => ({ file: `fonts/${file}`, bytes: statSync(join(dir, file)).size }));
}

function licenseFor(fontFile: string, licenses: { file: string }[]) {
	const base = fontFile.split('/').pop() ?? fontFile;
	for (const license of licenses) {
		const token = license.file.split('/').pop()?.split(/[-_.]/)[0] ?? '';
		if (token.length >= 3 && base.toLowerCase().startsWith(token.toLowerCase())) return license.file;
	}
	return null;
}

/** Faces that exist on disk, plus token weights that have no matching file. */
export function brandFonts() {
	const facts = fontFacts();
	const licenses = licenseFiles();
	const weights = new Set(facts.map((face) => face.weight));
	const declared = Object.entries(tokens().site)
		.filter(([name]) => name.startsWith('--ds-font-weight-'))
		.map(([name, value]) => ({ token: name, weight: Number.parseFloat(value) }));
	const missingWeights = declared.filter((item) => Number.isFinite(item.weight) && !weights.has(item.weight));
	const unshipped = unshippedFontWeights(facts);
	return {
		ok: true as const,
		faces: facts.map((face) => ({
			role: face.role,
			weight: face.weight,
			file: face.file,
			family: face.family,
			fileFamily: face.fileFamily,
			bytes: face.bytes,
			license: licenseFor(face.file, licenses),
		})),
		licenses,
		stylesheet: brand().fonts.css,
		missingWeights,
		unshipped,
		note: [
			missingWeights.length
				? `These weight tokens have no font file in brand/fonts: ${missingWeights.map((item) => `${item.token} (${item.weight})`).join(', ')}.`
				: 'Every weight token has a font file.',
			unshipped.length
				? `The stylesheet or next/font config also asks for ${unshipped.map((item) => `${item.family} ${item.weight}`).join(', ')}, and those files are not in brand/fonts.`
				: '',
			'Rendering uses the files listed above and does not invent the missing faces. A license file is attached when its name and the font file name start with the same letters.',
		]
			.filter(Boolean)
			.join(' '),
	};
}

function familyKey(name: string) {
	return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function expandWeights(spec: string) {
	const weights: number[] = [];
	for (const part of spec.split(';')) {
		const range = /^(\d+)\.\.(\d+)$/.exec(part);
		if (range) {
			for (let weight = Number(range[1]); weight <= Number(range[2]); weight += 100) weights.push(weight);
			continue;
		}
		if (/^\d+$/.test(part)) weights.push(Number(part));
	}
	return weights;
}

/** Weights named by the stylesheet or next/font config that have no file for that family. */
function unshippedFontWeights(facts: ReturnType<typeof fontFacts>) {
	const shipped = new Map<string, { family: string; weights: Set<number> }>();
	for (const face of facts) {
		const key = familyKey(face.family);
		const entry = shipped.get(key) ?? { family: face.family, weights: new Set<number>() };
		entry.weights.add(face.weight);
		shipped.set(key, entry);
	}
	const asked = new Map<string, { family: string; weight: number; requestedBy: string[] }>();
	const ask = (family: string, weight: number, source: string) => {
		const key = familyKey(family);
		const known = shipped.get(key);
		const label = known?.family ?? family;
		if (known?.weights.has(weight)) return;
		const id = `${label} ${weight}`;
		const row = asked.get(id) ?? { family: label, weight, requestedBy: [] };
		if (!row.requestedBy.includes(source)) row.requestedBy.push(source);
		asked.set(id, row);
	};
	for (const match of brand().fonts.css.matchAll(/family=([^:&]+):wght@([^&]+)/g)) {
		const family = decodeURIComponent(match[1].replace(/\+/g, ' '));
		for (const weight of expandWeights(match[2])) ask(family, weight, 'fonts.css');
	}
	for (const spec of brand().fonts.next ?? []) {
		const weights = spec.options?.weight;
		if (!Array.isArray(weights)) continue;
		for (const weight of weights) {
			const numeric = Number(weight);
			if (Number.isFinite(numeric)) ask(spec.import.replace(/_/g, ' '), numeric, 'fonts.next');
		}
	}
	return [...asked.values()].sort((a, b) => a.family.localeCompare(b.family) || a.weight - b.weight);
}

function pngSize(buf: Buffer) {
	if (buf.length < 24 || buf.toString('ascii', 1, 4) !== 'PNG') return undefined;
	return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function svgSize(text: string) {
	const box = text.match(/viewBox="([^"]+)"/)?.[1]?.split(/\s+/).map(Number);
	if (box && box.length === 4 && box.every((n) => Number.isFinite(n))) return { width: box[2], height: box[3] };
	const width = Number(text.match(/\bwidth="([^"]+)"/)?.[1]);
	const height = Number(text.match(/\bheight="([^"]+)"/)?.[1]);
	if (Number.isFinite(width) && Number.isFinite(height)) return { width, height };
	return undefined;
}

function logoMentions() {
	const hits: { source: string; text: string }[] = [];
	const principles = readFileSync(pkgPath('brand', 'principles.md'), 'utf8');
	for (const line of principles.split('\n')) {
		const text = line.replace(/^[-*]\s*/, '').trim();
		if (text && /\b(logo|logos|octopus|wordmark)\b/i.test(text)) hits.push({ source: 'brand/principles.md', text });
	}
	const file = JSON.parse(readFileSync(pkgPath('brand', 'elements.json'), 'utf8')) as { site?: Record<string, { rules?: string[]; source?: string }> };
	for (const [id, element] of Object.entries(file.site ?? {})) {
		for (const rule of element.rules ?? []) {
			if (/\b(logo|logos|octopus|wordmark)\b/i.test(rule)) hits.push({ source: `brand/elements.json#${id}`, text: rule });
		}
	}
	return hits;
}

function referencesTo(fileName: string) {
	const roots = ['src', 'registry', 'apps/www', 'brand'].map((dir) => pkgPath(dir)).filter((dir) => existsSync(dir));
	const found: string[] = [];
	const walk = (dir: string) => {
		for (const entry of readdirSync(dir, { withFileTypes: true })) {
			if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'logo') continue;
			const path = join(dir, entry.name);
			if (entry.isDirectory()) {
				walk(path);
				continue;
			}
			if (!/\.(ts|tsx|md|css|json)$/.test(entry.name)) continue;
			const text = readFileSync(path, 'utf8');
			if (text.includes(fileName)) found.push(path.slice(pkgPath().length + 1).split('\\').join('/'));
		}
	};
	for (const root of roots) walk(root);
	return found.sort();
}

/** Logo files on disk, their pixel or viewBox size, and the lines that mention them. */
export function brandLogos() {
	const dir = pkgPath('brand', 'logo');
	const files = readdirSync(dir)
		.filter((file) => !file.startsWith('.'))
		.sort()
		.map((file) => {
			const abs = join(dir, file);
			const buf = readFileSync(abs);
			const ext = file.split('.').pop()?.toLowerCase() ?? '';
			const size = ext === 'png' ? pngSize(buf) : ext === 'svg' ? svgSize(buf.toString('utf8')) : undefined;
			return {
				file,
				format: ext || 'unknown',
				bytes: buf.length,
				width: size?.width ?? null,
				height: size?.height ?? null,
				referencedBy: referencesTo(file),
			};
		});
	return {
		ok: true as const,
		files,
		usage: logoMentions(),
		clearSpace: null,
		note: 'Logo files do not state a numeric clear-space or minimum size. usage is every logo, octopus or wordmark line in the principles and element rules. referencedBy lists source files that name each logo file. No other logo files are invented.',
	};
}

/** Writing voice, taken from the Voice section of the principles. */
export function brandVoice() {
	const text = readFileSync(pkgPath('brand', 'principles.md'), 'utf8');
	const section = text.split(/^## /m).find((part) => part.startsWith('Voice'));
	if (!section) throw new Error('brand/principles.md has no Voice section.');
	const body = section.replace(/^Voice[^\n]*\n/, '').trim();
	const avoid = [...body.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
	const rules = body
		.replace(/Never\b[\s\S]*$/, '')
		.split(/(?<=\.)\s+/)
		.map((line) => line.replace(/\s+/g, ' ').trim())
		.filter((line) => line && !line.startsWith('Never'));
	return {
		ok: true as const,
		source: 'brand/principles.md#voice',
		text: body.replace(/\s+/g, ' ').trim(),
		rules,
		avoid,
	};
}

export function brandSummary() {
	const fonts = brandFonts();
	const logos = brandLogos();
	const voice = brandVoice();
	const { groups } = tokenGroups();
	return {
		ok: true as const,
		name: brand().name,
		surfaces: brand().surfaces ?? ['site'],
		groups: GROUP_ORDER.map((id) => ({ id, count: Object.keys(groups[id]).length })),
		fonts: fonts.faces.map((face) => ({ role: face.role, file: face.file, weight: face.weight })),
		missingWeights: fonts.missingWeights,
		logos: logos.files.map((file) => file.file),
		clearSpace: logos.clearSpace,
		voice: { source: voice.source, avoid: voice.avoid },
		read: ['brand tokens', 'brand fonts', 'brand logos', 'brand voice', 'principles', 'manifest'],
	};
}
