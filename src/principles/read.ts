import { existsSync, readFileSync } from 'node:fs';
import { brandVoice } from '../brand/system.js';
import { brand, elements } from '../lib/brand.js';
import { pkgPath } from '../lib/paths.js';

export type Rule = { text: string; source: string };

type Section = { id: string; title: string; source: string; paragraphs: string[]; items: string[] };

function slug(title: string) {
	const lower = title.toLowerCase();
	if (lower.startsWith('the idea')) return 'the-idea';
	if (lower.startsWith('the console')) return 'the-console';
	if (lower.startsWith('always')) return 'always';
	if (lower.startsWith('refuse')) return 'refuse';
	if (lower.startsWith('voice')) return 'voice';
	if (lower.startsWith('same composition')) return 'composition';
	if (lower.startsWith('purpose')) return 'purpose';
	if (lower.startsWith('one system')) return 'one-system';
	if (lower.startsWith('reads as')) return 'brand-voice';
	if (lower.startsWith('common ux')) return 'common-ux-errors';
	if (lower.startsWith('interaction')) return 'interaction';
	if (lower.startsWith('accessibility')) return 'accessibility';
	return lower.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function parseMarkdown(path: string, file: string): Section[] {
	const text = readFileSync(path, 'utf8');
	const chunks = text.split(/^## /m).slice(1);
	return chunks.map((chunk) => {
		const [heading, ...rest] = chunk.split('\n');
		const body = rest.join('\n').trim();
		const paragraphs: string[] = [];
		const items: string[] = [];
		let item: string[] | undefined;
		let paragraph: string[] = [];
		const flushParagraph = () => {
			if (paragraph.length) paragraphs.push(paragraph.join(' '));
			paragraph = [];
		};
		const flushItem = () => {
			if (item?.length) items.push(item.join(' '));
			item = undefined;
		};
		for (const raw of body.split('\n')) {
			const line = raw.trim();
			if (!line) {
				flushParagraph();
				flushItem();
				continue;
			}
			if (/^[-*]\s+/.test(line)) {
				flushParagraph();
				flushItem();
				item = [line.replace(/^[-*]\s+/, '')];
				continue;
			}
			if (item) item.push(line);
			else paragraph.push(line);
		}
		flushParagraph();
		flushItem();
		return { id: slug(heading), title: heading.trim(), source: file, paragraphs, items };
	});
}

function rulesOf(sections: Section[], id: string, source: string): Rule[] {
	const section = sections.find((item) => item.id === id);
	if (!section) return [];
	return section.items.map((text) => ({ text, source }));
}

function elementRules() {
	return Object.entries(elements().site).map(([id, element]) => ({
		id,
		name: element.name,
		rules: element.rules,
		source: element.source,
	}));
}

export function principleTopics() {
	const sections = [
		...parseMarkdown(pkgPath('brand', 'principles.md'), 'brand/principles.md'),
		...parseMarkdown(pkgPath('brand', 'rubric.md'), 'brand/rubric.md'),
	];
	return ['product', 'website', 'voice', 'elements', ...sections.map((section) => section.id)];
}

/** Product and website both use the one look this brand defines. */
export function principleDocument() {
	const principlePath = pkgPath('brand', 'principles.md');
	const rubricPath = pkgPath('brand', 'rubric.md');
	const sections = parseMarkdown(principlePath, 'brand/principles.md');
	const rubric = existsSync(rubricPath) ? parseMarkdown(rubricPath, 'brand/rubric.md') : [];
	const voice = brandVoice();
	const doRules = [...rulesOf(sections, 'always', 'brand/principles.md#always'), ...rulesOf(rubric, 'accessibility', 'brand/rubric.md#accessibility')];
	const dontRules = [...rulesOf(sections, 'refuse', 'brand/principles.md#refuse'), ...rulesOf(rubric, 'common-ux-errors', 'brand/rubric.md#common-ux-errors')];
	const consoleRules = rulesOf(sections, 'the-console', 'brand/principles.md#the-console');
	const surfaces = brand().surfaces ?? ['site'];
	const summary = surfaces.includes('product')
		? 'This brand defines a product surface as well as site.'
		: 'brand.json lists one surface, site, and brand/ has no product.css. Product interfaces and website pages both use that console look. The rules below are that one set, not a second system.';
	const shared = {
		look: 'site' as const,
		summary,
		do: doRules,
		dont: dontRules,
		rules: consoleRules,
	};
	return {
		ok: true as const,
		schemaVersion: 1 as const,
		surfaces,
		summary,
		sources: ['brand/principles.md', 'brand/rubric.md', 'brand/elements.json', 'brand/brand.json'],
		product: { id: 'product', ...shared },
		website: { id: 'website', ...shared },
		voice,
		sections: [...sections, ...rubric].map((section) => ({
			id: section.id,
			title: section.title,
			source: section.source,
			paragraphs: section.paragraphs,
			items: section.items,
		})),
		elements: elementRules(),
	};
}

/** The full principles document. `principles(topic)` narrows it and rejects an unknown topic. */
export function principles(topic?: string) {
	const document = principleDocument();
	if (!topic) return document;
	const key = topic.trim().toLowerCase();
	if (key === 'product') return { ok: true as const, ...document.product };
	if (key === 'website' || key === 'site') return { ok: true as const, ...document.website };
	if (key === 'voice') return document.voice;
	if (key === 'elements') return { ok: true as const, elements: document.elements };
	const section = document.sections.find((item) => item.id === key);
	if (section) return { ok: true as const, ...section };
	throw new Error(`Unknown principles topic "${topic}". Use ${principleTopics().join(', ')}.`);
}
