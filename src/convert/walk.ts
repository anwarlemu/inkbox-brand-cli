// A small CSS walker: every rule's declarations with the rule's context (selector, theme, @font-face), joined back in
// place. Comments and strings are skipped; nothing is reformatted.

export type CssContext = { mode?: 'dark' | 'light'; selector: string; fontFace?: boolean };

const DARK_CONTEXT = /\.dark\b|\.theme-dark\b|\[data-(?:theme|mode|color-scheme|bs-theme)\s*=\s*["']?dark|prefers-color-scheme\s*:\s*dark/i;
const LIGHT_CONTEXT = /\.light\b|\.theme-light\b|\[data-(?:theme|mode|color-scheme|bs-theme)\s*=\s*["']?light|prefers-color-scheme\s*:\s*light/i;

export function walkCss(css: string, each: (decls: string, ctx: CssContext) => string) {
	let out = '';
	let segStart = 0;
	const stack: CssContext[] = [];
	const current = () => stack[stack.length - 1] ?? { selector: '' };
	const flush = (end: number) => {
		out += each(css.slice(segStart, end), current());
	};
	for (let i = 0; i < css.length; i++) {
		const ch = css[i];
		if (ch === '/' && css[i + 1] === '*') {
			const close = css.indexOf('*/', i + 2);
			i = close < 0 ? css.length : close + 1;
			continue;
		}
		if (ch === '"' || ch === "'") {
			const close = css.indexOf(ch, i + 1);
			i = close < 0 ? css.length : close;
			continue;
		}
		if (ch === '{') {
			let b = i - 1;
			while (b >= segStart && !';{}'.includes(css[b])) b--;
			flush(b + 1);
			const prelude = css.slice(b + 1, i);
			out += `${prelude}{`;
			const parent = current();
			// A comment before the rule (a section banner) is not part of its selector.
			const bare = prelude.replace(/\/\*[\s\S]*?\*\//g, '');
			stack.push({ mode: DARK_CONTEXT.test(bare) ? 'dark' : LIGHT_CONTEXT.test(bare) ? 'light' : parent.mode, selector: /^\s*@/.test(bare) ? parent.selector : bare.trim(), fontFace: /^\s*@font-face\b/.test(bare) });
			segStart = i + 1;
		} else if (ch === '}') {
			flush(i);
			out += '}';
			stack.pop();
			segStart = i + 1;
		}
	}
	flush(css.length);
	return out;
}
