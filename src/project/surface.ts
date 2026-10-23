import { readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { brand, hasProduct } from '../lib/brand.js';

// Whether a project is a product (a dashboard, an admin, an app people work in) or a site (pages people read and act
// on), read from its files with the evidence kept. A product gets the product layer and elements; a site the site's.

export type Surface = 'site' | 'product';
export type Profile = { surface: Surface; product: number; site: number; reasons: string[]; mixed: boolean };

const SIGNALS: { surface: Surface; label: string; path?: RegExp; text?: RegExp; weight: number }[] = [
	{ surface: 'product', label: 'dashboard, admin or settings routes', path: /(^|\/)(\(?dash(board)?\)?|admin|console|settings|account|billing|workspace|\((app|shell|main|authenticated|protected|private)\)|portal)(\/|$)/i, weight: 3 },
	{ surface: 'product', label: 'a sign-in screen', path: /(^|\/)(login|signin|sign-in|auth)(\/|\.|$)/i, weight: 2 },
	{ surface: 'product', label: 'data tables', text: /<(table|DataGrid|DataTable|Table)\b|\bTable\(|\bLazyColumn\b|\bUITableView\b|\bList\s*\{/, weight: 2 },
	{ surface: 'product', label: 'charts', text: /from ['"](recharts|chart\.js|react-chartjs-2|d3|@visx|apexcharts|echarts|@nivo|victory|lightweight-charts)|\b(LineChart|BarChart|AreaChart|Sparkline|TrendChart)\b/, weight: 3 },
	{ surface: 'product', label: 'an app shell (sidebar layout, tab view)', text: /\b(app-shell|AppShell|SidebarProvider|SidebarInset|dashboard-layout|TabView|NavigationView|NavigationSplitView|BottomNavigation|Scaffold)\b/, weight: 2 },
	{ surface: 'product', label: 'filters, periods and pagination', text: /\b(date-range|DateRange|pagination|paginate|Pagination)\b|<(select|input)[^>]*\b(filter|period)\b/i, weight: 1 },
	{ surface: 'product', label: 'metrics and status badges', text: /\b(metric|kpi|delta|status-badge|uptime|usage)\b/i, weight: 1 },
	{ surface: 'product', label: 'a native app (SwiftUI, Compose, Flutter, Android)', text: /\bimport SwiftUI\b|androidx\.compose|package:flutter\/|\bimport UIKit\b|<LinearLayout\b|<ConstraintLayout\b/, weight: 5 },
	{ surface: 'site', label: 'a hero section', text: /\bhero\b/i, weight: 3 },
	{ surface: 'site', label: 'pricing, testimonials or FAQ', text: /\b(pricing|testimonial|faq|logo-cloud|logos|case-stud(y|ies))\b/i, weight: 2 },
	{ surface: 'site', label: 'calls to action (get started, book a demo, sign up)', text: /(get started|book a demo|start free|sign up free|try it free|request a demo|join the waitlist)/i, weight: 2 },
	{ surface: 'site', label: 'blog, changelog or docs pages', path: /(^|\/)(blog|changelog|posts|articles|docs|legal|privacy|terms)(\/|$)/i, weight: 2 },
	{ surface: 'site', label: 'a footer with link columns', text: /<footer\b/i, weight: 1 },
	{ surface: 'site', label: 'about, contact, careers or locations pages', path: /(^|\/)(about|contact|careers|locations|services|press|menu|wholesale|story)(\/|\.|$)/i, weight: 2 },
];

/** Route files say what a project is; a notes folder or a library file named "changelog" does not. */
export const ROUTE = /(^|\/)(app|pages|routes|views|screens|templates)\/.*\.(tsx|jsx|ts|js|astro|vue|svelte|mdx?|html|erb|php|hbs|liquid|njk|twig|cshtml)$|^[^/]+\.html?$|(Screen|View|Page|Activity|Fragment)\.(swift|kt|dart)$/;
const TEXT_FILE = /\.(tsx|jsx|js|ts|astro|vue|svelte|html|swift|kt|dart|xml|erb|php|hbs|liquid|njk|twig|cshtml|razor|ejs)$/;
const PRODUCT_PATH = SIGNALS[0].path!;

export function profile(root: string, files: string[]): Profile {
	if (!hasProduct()) return { surface: 'site', product: 0, site: 1, reasons: [`${brand().name} has a site only`], mixed: false };
	const score = { product: 0, site: 0 };
	const routes = { product: 0, site: 0 };
	const hits = new Map<string, [Surface, number]>();
	const sample = files.slice(0, 800);
	const text = new Map<string, string>();
	const read = (rel: string) => {
		if (!text.has(rel)) {
			try {
				text.set(rel, readFileSync(join(root, rel), 'utf8'));
			} catch {
				text.set(rel, '');
			}
		}
		return text.get(rel)!;
	};
	for (const signal of SIGNALS) {
		let n = 0;
		for (const rel of sample) {
			if (signal.path?.test(rel) && ROUTE.test(rel)) {
				n++;
				routes[signal.surface]++;
			} else if (signal.text && TEXT_FILE.test(rel) && signal.text.test(read(rel))) n++;
		}
		if (!n) continue;
		// Each kind of evidence counts a few times at most, so one big folder cannot decide on its own.
		score[signal.surface] += signal.weight * Math.min(n, 3);
		hits.set(signal.label, [signal.surface, n]);
	}
	let name = basename(root);
	try {
		name = String(JSON.parse(read('package.json')).name ?? name);
	} catch {}
	if (/(admin|dashboard|console|portal|app$|-app\b|backoffice|crm|studio)/i.test(name)) {
		score.product += 4;
		hits.set(`the project is named "${name}"`, ['product', 1]);
	}
	if (/(site|website|landing|www|marketing|homepage)/i.test(name)) {
		score.site += 4;
		hits.set(`the project is named "${name}"`, ['site', 1]);
	}
	const surface: Surface = score.product > score.site ? 'product' : 'site';
	const reasons = [...hits].filter(([, [s]]) => s === surface).map(([label, [, n]]) => (n > 1 ? `${label} (${n} files)` : label));
	// Both kinds in one project (an app with its own marketing pages) only when each has its own routes.
	const mixed = routes.product > 0 && routes.site > 0 && Math.min(score.product, score.site) / Math.max(score.product, score.site) > 0.6;
	return { surface, product: score.product, site: score.site, reasons, mixed };
}

/** The surface of one route in a mixed project: product routes by their path, everything else the project's. */
export const surfaceOf = (rel: string, project: Profile): Surface => (project.mixed ? (PRODUCT_PATH.test(rel) ? 'product' : 'site') : project.surface);
