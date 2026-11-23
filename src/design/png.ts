import { deflateSync, inflateSync } from 'node:zlib';

// Reads and writes PNG with nothing but Node, so the check can look at the pixels and tests can make pictures.

export type Pixels = { width: number; height: number; data: Uint8Array };   // straight RGBA

const SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Width and height from the header alone. */
export function pngSize(png: Uint8Array): { width: number; height: number } {
	if (!SIG.every((b, i) => png[i] === b)) throw new Error('Not a PNG file.');
	const v = new DataView(png.buffer, png.byteOffset, png.byteLength);
	return { width: v.getUint32(16), height: v.getUint32(20) };
}

/** Decodes an 8-bit, non-interlaced PNG (what every engine here writes). Undefined for any other kind. */
export function decodePng(png: Uint8Array): Pixels | undefined {
	const { width, height } = pngSize(png);
	const buf = Buffer.from(png.buffer, png.byteOffset, png.byteLength);
	if (buf[24] !== 8 || buf[28] !== 0) return undefined;
	const type = buf[25]!;
	const n = type === 6 ? 4 : type === 2 ? 3 : type === 4 ? 2 : type === 0 || type === 3 ? 1 : 0;
	if (!n) return undefined;
	const idat: Buffer[] = [];
	let palette: Buffer | undefined;
	let trns: Buffer | undefined;
	for (let at = 8; at + 8 <= buf.length;) {
		const len = buf.readUInt32BE(at);
		const name = buf.toString('latin1', at + 4, at + 8);
		const body = buf.subarray(at + 8, at + 8 + len);
		if (name === 'IDAT') idat.push(body);
		else if (name === 'PLTE') palette = body;
		else if (name === 'tRNS') trns = body;
		else if (name === 'IEND') break;
		at += 12 + len;
	}
	const raw = inflateSync(Buffer.concat(idat));
	const stride = width * n;
	const px = new Uint8Array(stride * height);
	for (let y = 0; y < height; y++) {
		const f = raw[y * (stride + 1)]!;
		for (let i = 0; i < stride; i++) {
			const v = raw[y * (stride + 1) + 1 + i]!;
			const a = i >= n ? px[y * stride + i - n]! : 0;
			const b = y ? px[(y - 1) * stride + i]! : 0;
			const c = i >= n && y ? px[(y - 1) * stride + i - n]! : 0;
			let p = 0;
			if (f === 1) p = a;
			else if (f === 2) p = b;
			else if (f === 3) p = (a + b) >> 1;
			else if (f === 4) {
				const e = a + b - c;
				const da = Math.abs(e - a);
				const db = Math.abs(e - b);
				const dc = Math.abs(e - c);
				p = da <= db && da <= dc ? a : db <= dc ? b : c;
			}
			px[y * stride + i] = (v + p) & 255;
		}
	}
	const data = new Uint8Array(width * height * 4);
	for (let i = 0; i < width * height; i++) {
		let r: number, g: number, b: number, al = 255;
		if (type === 3) {
			const k = px[i]!;
			[r, g, b] = [palette?.[k * 3] ?? 0, palette?.[k * 3 + 1] ?? 0, palette?.[k * 3 + 2] ?? 0];
			al = trns?.[k] ?? 255;
		} else if (n <= 2) {
			r = g = b = px[i * n]!;
			if (n === 2) al = px[i * 2 + 1]!;
		} else {
			[r, g, b] = [px[i * n]!, px[i * n + 1]!, px[i * n + 2]!];
			if (n === 4) al = px[i * 4 + 3]!;
		}
		data.set([r, g, b, al], i * 4);
	}
	return { width, height, data };
}

const TABLE = Array.from({ length: 256 }, (_, n) => {
	let c = n;
	for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
	return c >>> 0;
});

function chunk(name: string, body: Buffer): Buffer {
	const td = Buffer.concat([Buffer.from(name, 'latin1'), body]);
	let c = 0xffffffff;
	for (const b of td) c = TABLE[(c ^ b) & 255]! ^ (c >>> 8);
	const head = Buffer.alloc(4);
	head.writeUInt32BE(body.length);
	const tail = Buffer.alloc(4);
	tail.writeUInt32BE((c ^ 0xffffffff) >>> 0);
	return Buffer.concat([head, td, tail]);
}

/** Straight RGBA as a PNG. The same pixels give the same bytes. */
export function encodePng(p: Pixels): Uint8Array {
	const stride = p.width * 4;
	const raw = Buffer.alloc((stride + 1) * p.height);
	for (let y = 0; y < p.height; y++) raw.set(p.data.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(p.width, 0);
	ihdr.writeUInt32BE(p.height, 4);
	ihdr[8] = 8;
	ihdr[9] = 6;
	return new Uint8Array(Buffer.concat([Buffer.from(SIG), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 6 })), chunk('IEND', Buffer.alloc(0))]));
}
