import { tokens } from '../lib/brand.js';

function bezier(x1: number, y1: number, x2: number, y2: number) {
	const cx = 3 * x1;
	const bx = 3 * (x2 - x1) - cx;
	const ax = 1 - cx - bx;
	const cy = 3 * y1;
	const by = 3 * (y2 - y1) - cy;
	const ay = 1 - cy - by;
	const sample = (u: number, a: number, b: number, c: number) => ((a * u + b) * u + c) * u;
	const slope = (u: number) => (3 * ax * u + 2 * bx) * u + cx;
	return (t: number) => {
		if (t <= 0) return 0;
		if (t >= 1) return 1;
		let u = t;
		for (let i = 0; i < 8; i++) {
			const delta = sample(u, ax, bx, cx) - t;
			const dx = slope(u);
			if (Math.abs(delta) < 1e-6) break;
			if (Math.abs(dx) < 1e-6) break;
			u = Math.min(1, Math.max(0, u - delta / dx));
		}
		return sample(u, ay, by, cy);
	};
}

let curve: ((t: number) => number) | undefined;

/** The brand's `--ds-easing-out` curve. A non cubic-bezier value is an error. */
export function easeOut(t: number) {
	if (!curve) {
		const raw = tokens().site['--ds-easing-out'];
		const match = raw?.match(/^cubic-bezier\(\s*(-?[0-9.]+)\s*,\s*(-?[0-9.]+)\s*,\s*(-?[0-9.]+)\s*,\s*(-?[0-9.]+)\s*\)$/);
		if (!match) throw new Error(`Token --ds-easing-out must be a cubic-bezier() so video timing is fixed. It is "${raw ?? ''}".`);
		curve = bezier(Number(match[1]), Number(match[2]), Number(match[3]), Number(match[4]));
	}
	return curve(t);
}

/** Last two frames hold on the settled state. Earlier frames follow the brand ease. */
export function frameProgress(frame: number, count: number) {
	const settleAt = Math.max(1, count - 2);
	if (frame >= settleAt) return easeOut(1);
	return easeOut(frame / settleAt);
}
