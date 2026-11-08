// Names people type for things with exact names: Button, alert-dialog, AlertDialog and buttons are the item button
// or alert-dialog; a near miss gets the closest names.

export const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** The name in `names` that `typed` means, ignoring case, dashes, spaces and a plural; undefined when none. */
export function matchName(typed: string, names: string[]): string | undefined {
	const n = norm(typed);
	return names.find((x) => norm(x) === n) ?? names.find((x) => norm(x) === n.replace(/(es|s)$/, '') || `${norm(x)}s` === n);
}

function distance(a: string, b: string) {
	const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
	for (let j = 1; j <= b.length; j++) d[0][j] = j;
	for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
	return d[a.length][b.length];
}

/** Up to three names closest to what was typed. */
export function suggest(target: string, pool: string[]) {
	const n = norm(target);
	return pool
		.map((p) => ({ p, d: norm(p).includes(n) || (n.length > 2 && n.includes(norm(p)) && norm(p).length > 2) ? 0.5 : distance(n, norm(p)) }))
		.filter((x) => x.d <= Math.max(2, Math.floor(n.length / 3)))
		.sort((a, b) => a.d - b.d || a.p.length - b.p.length)
		.slice(0, 3)
		.map((x) => x.p);
}

