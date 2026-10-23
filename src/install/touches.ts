import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { brand } from '../lib/brand.js';
import type { Writer } from './files.js';

// The home page's touches (brand.json), made by the CLI so agents do not redo them in every run: the brand's attribute on
// the hero, and, when the brand has one, the closing words of the hero headline and of each section heading in
// <span class="ds-accent">. Only plain-text headings are touched, and only by wrapping words that are already there.

const MARKUP = /\.(html?|astro|tsx|jsx|vue|svelte|erb|php|hbs|liquid|njk|twig)$/;

/** The closing words of a heading: after its last dash, colon or comma in the second half, else its last third. */
export function accentSplit(text: string): [string, string] | undefined {
	const words = text.trim().split(/\s+/);
	if (words.length < 3) return undefined;
	const trimmed = text.replace(/\s+$/, '');
	const sep = Math.max(trimmed.lastIndexOf(' \u2014 '), trimmed.lastIndexOf(' \u2013 '), trimmed.lastIndexOf(': '), trimmed.lastIndexOf(', '));
	if (sep > trimmed.length / 2) {
		const cut = trimmed.indexOf(' ', sep + 2) + 1;
		if (cut > 0 && cut < trimmed.length) return [text.slice(0, cut), trimmed.slice(cut)];
	}
	const n = Math.min(4, Math.max(1, Math.round(words.length / 3)));
	const tail = words.slice(-n).join(' ');
	const at = trimmed.lastIndexOf(tail);
	return at > 0 ? [text.slice(0, at), trimmed.slice(at)] : undefined;
}

export function addTouches(text: string, jsx: boolean, heroDone = false) {
	const cls = jsx ? 'className' : 'class';
	const { hero, accent } = brand().touches;
	let out = text;
	// The hero: the first section or header whose class names it, once across the home page's files.
	if (hero && !heroDone && !new RegExp(`\\b${hero.attribute}\\b`).test(out)) out = out.replace(/<(section|header|div)\b([^>]*\bclass(?:Name)?=["'][^"']*\bhero\b[^"']*["'][^>]*)>/i, (all, tag: string, attrs: string) => `<${tag}${attrs} ${hero.attribute}>`);
	if (!accent || /\bds-accent\b/.test(out)) return out;
	let h1 = false;
	return out.replace(/<(h1|h2)\b([^>]*)>([^<>{}]+)<\/\1>/gi, (all, tag: string, attrs: string, inner: string) => {
		if (tag.toLowerCase() === 'h1') {
			if (h1) return all;
			h1 = true;
		}
		const split = accentSplit(inner);
		return split ? `<${tag}${attrs}>${split[0]}<span ${cls}="ds-accent">${split[1]}</span>${inner.slice(split[0].length + split[1].length)}</${tag}>` : all;
	});
}

/** Adds the touches to the home page's own files (not the shared shell). Returns the files changed. */
export function installTouches(w: Writer, files: string[]) {
	const changed: string[] = [];
	const attribute = brand().touches.hero?.attribute;
	const marked = (t: string) => !!attribute && new RegExp(`\\b${attribute}\\b`).test(t);
	const texts = files.filter((f) => MARKUP.test(f)).map((rel) => [rel, readFileSync(join(w.root, rel), 'utf8')] as const);
	let heroDone = texts.some(([, t]) => marked(t));
	for (const [rel, text] of texts) {
		const next = addTouches(text, /\.(tsx|jsx)$/.test(rel), heroDone);
		heroDone ||= marked(next);
		if (next !== text) {
			w.write(rel, next);
			changed.push(rel);
		}
	}
	return changed;
}
