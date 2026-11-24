import { readFileSync } from 'node:fs';
import type { Outline, SectionInfo } from '../design/index.js';
import { brand } from '../lib/brand.js';
import { pkgPath } from '../lib/paths.js';
import { drawable } from './glyphs.js';

// Pages from the library's site blocks, for `design page compose`: an outline (checked by the core) becomes a React page
// that imports the installed blocks (`add` them first), and a plain HTML page that needs only the brand stylesheet.
// Only the outline's words go on the page; links default to "#". Testimonials are a role at a company (Acme), never a
// made-up person.

export const SECTIONS: SectionInfo[] = [
	{ type: 'header', description: 'The site header: the lockup, links and a button.', copy: [{ id: 'action' }, { id: 'action-href' }], items: { count: [0, 7], copy: [{ id: 'label', required: true }, { id: 'href' }] } },
	{ type: 'hero', description: 'The first section: an eyebrow, the title, a line and up to two buttons.', copy: [{ id: 'title', required: true }, { id: 'eyebrow' }, { id: 'description' }, { id: 'primary' }, { id: 'primary-href' }, { id: 'secondary' }, { id: 'secondary-href' }] },
	{ type: 'text', description: 'A section heading with a paragraph.', copy: [{ id: 'title', required: true }, { id: 'label' }, { id: 'body' }] },
	{ type: 'logos', description: 'A row of customer names in type (Acme; never another company\'s logo).', copy: [{ id: 'label' }], items: { count: [2, 10], copy: [{ id: 'name', required: true }] } },
	{ type: 'features', description: 'The console\'s fact cards: a title and a line each.', copy: [{ id: 'title' }, { id: 'label' }, { id: 'description' }], items: { count: [2, 9], copy: [{ id: 'title', required: true }, { id: 'description', required: true }, { id: 'href' }] } },
	{ type: 'stats', description: 'Big figures with a line each.', copy: [{ id: 'title' }], items: { count: [1, 4], copy: [{ id: 'value', required: true }, { id: 'label', required: true }] } },
	{ type: 'testimonials', description: 'Quotes, each with a role and a company (Acme).', copy: [{ id: 'title' }], items: { count: [1, 6], copy: [{ id: 'quote', required: true }, { id: 'role', required: true }, { id: 'company', required: true }] } },
	{ type: 'pricing', description: 'Plans: a name, a price, a line, features (| between) and a button.', copy: [{ id: 'title' }, { id: 'description' }, { id: 'note' }], items: { count: [1, 4], copy: [{ id: 'name', required: true }, { id: 'price', required: true }, { id: 'cadence' }, { id: 'description', required: true }, { id: 'features', required: true }, { id: 'action', required: true }, { id: 'href' }, { id: 'featured' }] } },
	{ type: 'faq', description: 'Questions and answers in the accordion.', copy: [{ id: 'title' }, { id: 'description' }], items: { count: [1, 20], copy: [{ id: 'question', required: true }, { id: 'answer', required: true }] } },
	{ type: 'cta', description: 'The closing call to action.', copy: [{ id: 'title', required: true }, { id: 'description' }, { id: 'primary' }, { id: 'primary-href' }, { id: 'secondary' }, { id: 'secondary-href' }] },
	{ type: 'footer', description: 'The site footer: the lockup, a line, links and the legal line.', copy: [{ id: 'tagline' }, { id: 'legal', required: true }], items: { count: [0, 12], copy: [{ id: 'label', required: true }, { id: 'href' }] } },
];

type Section = Outline['sections'][number];
const js = (s: string) => JSON.stringify(s);
const jsx = (s: string) => `{${js(s)}}`;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const href = (v?: string) => v?.trim() || '#';
const list = (v?: string) => (v ? v.split('|').map((x) => x.trim()).filter(Boolean) : []);

function checkGlyphs(o: Outline) {
	for (const s of o.sections) {
		for (const [k, v] of Object.entries(s.copy ?? {})) drawable(`${s.type} ${k}`, v);
		for (const it of s.items ?? []) for (const [k, v] of Object.entries(it)) drawable(`${s.type} ${k}`, v);
	}
}

/** The page as React: one file that imports the library's blocks. */
function react(o: Outline): Record<string, string> {
	const imports = new Map<string, Set<string>>();
	const use = (file: string, ...names: string[]) => {
		const set = imports.get(file) ?? new Set<string>();
		for (const n of names) set.add(n);
		imports.set(file, set);
	};
	const button = (label: string | undefined, to: string | undefined, variant: 'default' | 'outline') => {
		if (!label) return '';
		use('@/components/ui/button', 'Button');
		return `<Button asChild${variant === 'outline' ? ' variant="outline"' : ''}><a href=${jsx(href(to))}>${jsx(label)}</a></Button>`;
	};
	const parts: string[] = [];
	for (const s of o.sections as Section[]) {
		const c = s.copy ?? {};
		const items = s.items ?? [];
		const head = (title?: string, label?: string, description?: string) => {
			if (!title) return '';
			use('@/components/blocks/section-head', 'SectionHead');
			return `<SectionHead title=${jsx(title)}${label ? ` label=${jsx(label)}` : ''}${description ? ` description=${jsx(description)}` : ''} />`;
		};
		switch (s.type) {
			case 'header':
				use('@/components/blocks/site-header', 'SiteHeader');
				use('@/components/site/lockup', 'Lockup');
				parts.push(`<SiteHeader logo={<Lockup />} links={${JSON.stringify(items.map((i) => ({ label: i.label, href: href(i.href) })))}}${c.action ? ` actions={${button(c.action, c['action-href'], 'default')}}` : ''} />`);
				break;
			case 'hero': {
				use('@/components/blocks/hero', 'Hero');
				const actions = [button(c.primary, c['primary-href'], 'default'), button(c.secondary, c['secondary-href'], 'outline')].filter(Boolean);
				parts.push(`<Hero title=${jsx(c.title!)}${c.eyebrow ? ` eyebrow=${jsx(c.eyebrow)}` : ''}${c.description ? ` description=${jsx(c.description)}` : ''}${actions.length ? ` actions={<>${actions.join('')}</>}` : ''} />`);
				break;
			}
			case 'text':
				parts.push(`<section className="mx-auto w-full max-w-5xl px-4 py-16">${head(c.title, c.label)}${c.body ? `<p className="mt-4 max-w-2xl text-body text-fg-muted">${jsx(c.body)}</p>` : ''}</section>`);
				break;
			case 'logos':
				use('@/components/blocks/logos-strip', 'LogosStrip');
				parts.push(`<LogosStrip${c.label ? ` label=${jsx(c.label)}` : ''} names={${JSON.stringify(items.map((i) => i.name))}} />`);
				break;
			case 'features':
				use('@/components/blocks/feature-grid', 'FeatureGrid');
				parts.push(`<FeatureGrid${c.title ? ` title=${jsx(c.title)}` : ''}${c.label ? ` label=${jsx(c.label)}` : ''}${c.description ? ` description=${jsx(c.description)}` : ''} features={${JSON.stringify(items.map((i) => ({ title: i.title, description: i.description, ...(i.href ? { href: i.href } : {}) })))}} />`);
				break;
			case 'stats':
				parts.push(`<section className="mx-auto w-full max-w-5xl px-4 py-16">${head(c.title)}<dl className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">${items.map((i) => `<div className="grid gap-1"><dd className="text-h1 text-fg-brand">${jsx(i.value!)}</dd><dt className="text-body text-fg-muted">${jsx(i.label!)}</dt></div>`).join('')}</dl></section>`);
				break;
			case 'testimonials':
				use('@/components/blocks/testimonial', 'Testimonial');
				parts.push(`<section className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-16">${head(c.title)}<div className="grid gap-6 md:grid-cols-2">${items.map((i) => `<Testimonial quote=${jsx(i.quote!)} role=${jsx(i.role!)} company=${jsx(i.company!)} />`).join('')}</div></section>`);
				break;
			case 'pricing':
				use('@/components/blocks/pricing-table', 'PricingTable');
				parts.push(`<PricingTable${c.title ? ` title=${jsx(c.title)}` : ''}${c.description ? ` description=${jsx(c.description)}` : ''}${c.note ? ` note=${jsx(c.note)}` : ''} plans={${JSON.stringify(items.map((i) => ({ name: i.name, price: i.price, ...(i.cadence ? { cadence: i.cadence } : {}), description: i.description, features: list(i.features), action: { label: i.action, href: href(i.href) }, ...(i.featured === 'true' ? { featured: true } : {}) })))}} />`);
				break;
			case 'faq':
				use('@/components/blocks/faq', 'Faq');
				parts.push(`<Faq${c.title ? ` title=${jsx(c.title)}` : ''}${c.description ? ` description=${jsx(c.description)}` : ''} questions={${JSON.stringify(items.map((i) => ({ question: i.question, answer: i.answer })))}} />`);
				break;
			case 'cta': {
				use('@/components/blocks/cta', 'Cta');
				const actions = [button(c.primary, c['primary-href'], 'default'), button(c.secondary, c['secondary-href'], 'outline')].filter(Boolean);
				parts.push(`<Cta title=${jsx(c.title!)}${c.description ? ` description=${jsx(c.description)}` : ''}${actions.length ? ` actions={<>${actions.join('')}</>}` : ''} />`);
				break;
			}
			case 'footer':
				use('@/components/blocks/site-footer', 'SiteFooter');
				use('@/components/site/lockup', 'Lockup');
				parts.push(`<SiteFooter logo={<Lockup />}${c.tagline ? ` tagline=${jsx(c.tagline)}` : ''} groups={[]} legal=${jsx(c.legal!)}${items.length ? ` legalLinks={${JSON.stringify(items.map((i) => ({ label: i.label, href: href(i.href) })))}}` : ''} />`);
				break;
		}
	}
	const head = [...imports].sort(([a], [b]) => (a < b ? -1 : 1)).map(([file, names]) => `import { ${[...names].sort().join(', ')} } from "${file}";`).join('\n');
	return { 'page.tsx': `${head}\n\n// Written by \`design page compose\`${o.title ? ` for "${o.title.replace(/"/g, "'")}"` : ''}. Install what it imports with \`add\` first.\nexport default function Page() {\n  return (\n    <main>\n${parts.map((p) => `      ${p}`).join('\n')}\n    </main>\n  );\n}\n` };
}

/** The page as plain HTML: semantic markup the brand stylesheet styles. */
function html(o: Outline): Record<string, string> {
	const css = `${readFileSync(pkgPath('build', 'tokens.css'), 'utf8')}\n${readFileSync(pkgPath('build', 'site.css'), 'utf8')}`;
	const out: string[] = [];
	const a = (label?: string, to?: string, cls = 'ds-button') => (label ? `<a class="${cls}" href="${esc(href(to))}">${esc(label)}</a>` : '');
	const h2 = (t?: string, label?: string) => `${label ? `<p class="ds-label">${esc(label)}</p>` : ''}${t ? `<h2>${esc(t)}</h2>` : ''}`;
	const name = esc(brand().name);
	for (const s of o.sections as Section[]) {
		const c = s.copy ?? {};
		const items = s.items ?? [];
		switch (s.type) {
			case 'header':
				out.push(`<header class="ds-row"><a class="ds-logo" href="/">${name}</a><nav>${items.map((i) => a(i.label, i.href, 'ds-link')).join('')}</nav>${a(c.action, c['action-href'])}</header>`);
				break;
			case 'hero':
				out.push(`<section class="ds-hero">${c.eyebrow ? `<p class="ds-badge">${esc(c.eyebrow)}</p>` : ''}<h1>${esc(c.title!)}</h1>${c.description ? `<p class="ds-muted">${esc(c.description)}</p>` : ''}<div class="ds-actions">${a(c.primary, c['primary-href'])}${a(c.secondary, c['secondary-href'], 'ds-button ds-button-outline')}</div></section>`);
				break;
			case 'text':
				out.push(`<section>${h2(c.title, c.label)}${c.body ? `<p class="ds-muted">${esc(c.body)}</p>` : ''}</section>`);
				break;
			case 'logos':
				out.push(`<section>${c.label ? `<p class="ds-label">${esc(c.label)}</p>` : ''}<ul class="ds-logos">${items.map((i) => `<li>${esc(i.name!)}</li>`).join('')}</ul></section>`);
				break;
			case 'features':
				out.push(`<section>${h2(c.title, c.label)}${c.description ? `<p class="ds-muted">${esc(c.description)}</p>` : ''}<div class="ds-grid">${items.map((i) => `<article class="ds-card"><h3>${esc(i.title!)}</h3><p class="ds-muted">${esc(i.description!)}</p>${i.href ? a('Read more', i.href, 'ds-link') : ''}</article>`).join('')}</div></section>`);
				break;
			case 'stats':
				out.push(`<section>${h2(c.title)}<dl class="ds-stats">${items.map((i) => `<div><dd>${esc(i.value!)}</dd><dt>${esc(i.label!)}</dt></div>`).join('')}</dl></section>`);
				break;
			case 'testimonials':
				out.push(`<section>${h2(c.title)}<div class="ds-grid">${items.map((i) => `<figure class="ds-card"><blockquote>${esc(i.quote!)}</blockquote><figcaption class="ds-muted">${esc(i.role!)}, ${esc(i.company!)}</figcaption></figure>`).join('')}</div></section>`);
				break;
			case 'pricing':
				out.push(`<section>${h2(c.title)}${c.description ? `<p class="ds-muted">${esc(c.description)}</p>` : ''}<div class="ds-grid">${items.map((i) => `<article class="ds-card${i.featured === 'true' ? ' ds-featured' : ''}"><h3>${esc(i.name!)}</h3><p class="ds-price">${esc(i.price!)}${i.cadence ? ` <span class="ds-muted">${esc(i.cadence)}</span>` : ''}</p><p class="ds-muted">${esc(i.description!)}</p><ul>${list(i.features).map((f) => `<li>${esc(f)}</li>`).join('')}</ul>${a(i.action, i.href)}</article>`).join('')}</div>${c.note ? `<p class="ds-muted">${esc(c.note)}</p>` : ''}</section>`);
				break;
			case 'faq':
				out.push(`<section>${h2(c.title)}${c.description ? `<p class="ds-muted">${esc(c.description)}</p>` : ''}${items.map((i) => `<details class="ds-card"><summary>${esc(i.question!)}</summary><p class="ds-muted">${esc(i.answer!)}</p></details>`).join('')}</section>`);
				break;
			case 'cta':
				out.push(`<section class="ds-hero">${h2(c.title)}${c.description ? `<p class="ds-muted">${esc(c.description)}</p>` : ''}<div class="ds-actions">${a(c.primary, c['primary-href'])}${a(c.secondary, c['secondary-href'], 'ds-button ds-button-outline')}</div></section>`);
				break;
			case 'footer':
				out.push(`<footer class="ds-row"><div><p class="ds-logo">${name}</p>${c.tagline ? `<p class="ds-muted">${esc(c.tagline)}</p>` : ''}</div><nav>${items.map((i) => a(i.label, i.href, 'ds-link')).join('')}</nav><p class="ds-muted">${esc(c.legal!)}</p></footer>`);
				break;
		}
	}
	const title = esc(o.title ?? brand().name);
	return { 'index.html': `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>${title}</title>\n<style>\n${css}\n${PAGE_CSS}</style>\n</head>\n<body>\n<main>\n${out.join('\n')}\n</main>\n</body>\n</html>\n` };
}

/** The layout a plain page needs beyond the brand stylesheet: a column, sections, a grid, the pill and the card. Tokens only. */
const PAGE_CSS = `body{margin:0;background:var(--ds-color-bg-page);color:var(--ds-color-text-default);font-family:var(--ds-font-sans)}
main{max-width:72rem;margin:0 auto;padding:0 1rem}
section,header,footer{padding:4rem 0;border-bottom:1px solid var(--ds-color-border-subtle)}
.ds-row{display:flex;flex-wrap:wrap;gap:1.5rem;align-items:center;justify-content:space-between;padding:1rem 0}
nav{display:flex;flex-wrap:wrap;gap:1rem}
.ds-logo{font-weight:600;color:var(--ds-color-ink);text-decoration:none}
.ds-hero{text-align:center}.ds-hero p{margin-inline:auto;max-width:40rem}
.ds-badge{display:inline-block;border-radius:var(--ds-radius-pill);padding:.25rem .75rem;background:var(--ds-color-lilac);color:var(--ds-color-ink);font-size:.8rem}
.ds-label{color:var(--ds-color-text-label);font-size:.85rem}
.ds-muted{color:var(--ds-color-text-secondary)}
.ds-actions{display:flex;flex-wrap:wrap;gap:.75rem;justify-content:center;margin-top:1.5rem}
.ds-button{display:inline-flex;align-items:center;border-radius:var(--ds-radius-pill);padding:.6rem 1.2rem;background:var(--ds-color-action-primary);color:var(--ds-color-action-primary-fg);text-decoration:none;transition:background-color 150ms var(--ds-easing-out, ease-out)}
.ds-button:hover{background:var(--ds-color-action-primary-hover)}
.ds-button-outline{background:var(--ds-color-white);color:var(--ds-color-text-brand);box-shadow:inset 0 0 0 1px var(--ds-color-border-field)}
.ds-button-outline:hover{background:var(--ds-color-lilac)}
.ds-link{color:var(--ds-color-text-brand)}
.ds-grid{display:grid;gap:1rem;grid-template-columns:repeat(auto-fit,minmax(16rem,1fr));margin-top:2rem}
.ds-card{background:var(--ds-color-white);border-radius:var(--ds-radius-dialog);padding:1.5rem;box-shadow:var(--ds-shadow-card)}
.ds-featured{box-shadow:inset 0 0 0 2px var(--ds-color-brand)}
.ds-price{font-size:2rem;font-weight:600;color:var(--ds-color-ink)}
.ds-logos{display:flex;flex-wrap:wrap;gap:2rem;padding:0;list-style:none;color:var(--ds-color-text-muted);font-weight:600}
.ds-stats{display:grid;gap:1.5rem;grid-template-columns:repeat(auto-fit,minmax(12rem,1fr))}.ds-stats dd{margin:0;font-size:2.5rem;font-weight:600;color:var(--ds-color-text-brand)}
@media (prefers-reduced-motion:reduce){.ds-button{transition:none}}
`;

export async function writePage(o: Outline, flavor: string): Promise<Record<string, string>> {
	checkGlyphs(o);
	return flavor === 'react' ? react(o) : html(o);
}
