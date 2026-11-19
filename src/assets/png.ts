import { deflateSync } from 'node:zlib';

// A small PNG writer: 8-bit RGBA or RGB, filter type 0 per row, zlib from node. The same pixels always give the
// same bytes (no time chunk, fixed compression level).

const CRC = (() => {
	const table = new Uint32Array(256);
	for (let n = 0; n < 256; n++) {
		let c = n;
		for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		table[n] = c >>> 0;
	}
	return table;
})();

function crc32(buf: Buffer): number {
	let c = 0xffffffff;
	for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]!) & 0xff]! ^ (c >>> 8);
	return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
	const len = Buffer.alloc(4);
	len.writeUInt32BE(data.length);
	const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
	const crc = Buffer.alloc(4);
	crc.writeUInt32BE(crc32(td));
	return Buffer.concat([len, td, crc]);
}

/** Encodes straight (not premultiplied) pixels. `channels` is 4 (RGBA) or 3 (RGB). `dpi` writes a pHYs chunk. */
export function encodePng(pixels: Buffer, width: number, height: number, channels: 3 | 4 = 4, dpi?: number): Buffer {
	const stride = width * channels;
	const raw = Buffer.alloc((stride + 1) * height);
	for (let y = 0; y < height; y++) pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(width, 0);
	ihdr.writeUInt32BE(height, 4);
	ihdr[8] = 8;
	ihdr[9] = channels === 4 ? 6 : 2;
	const parts = [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr)];
	if (dpi) {
		const phys = Buffer.alloc(9);
		const ppm = Math.round(dpi / 0.0254);
		phys.writeUInt32BE(ppm, 0);
		phys.writeUInt32BE(ppm, 4);
		phys[8] = 1;
		parts.push(chunk('pHYs', phys));
	}
	parts.push(chunk('IDAT', deflateSync(raw, { level: 6 })), chunk('IEND', Buffer.alloc(0)));
	return Buffer.concat(parts);
}

/** Crops premultiplied RGBA pixels (as resvg renders them) and returns straight RGBA. */
export function cropStraight(pixels: Buffer, width: number, x: number, y: number, w: number, h: number): Buffer {
	const out = Buffer.alloc(w * h * 4);
	for (let j = 0; j < h; j++) {
		for (let i = 0; i < w; i++) {
			const s = ((y + j) * width + (x + i)) * 4;
			const d = (j * w + i) * 4;
			const a = pixels[s + 3]!;
			if (a === 255 || a === 0) {
				out[d] = a ? pixels[s]! : 0;
				out[d + 1] = a ? pixels[s + 1]! : 0;
				out[d + 2] = a ? pixels[s + 2]! : 0;
			} else {
				out[d] = Math.min(255, Math.round((pixels[s]! * 255) / a));
				out[d + 1] = Math.min(255, Math.round((pixels[s + 1]! * 255) / a));
				out[d + 2] = Math.min(255, Math.round((pixels[s + 2]! * 255) / a));
			}
			out[d + 3] = a;
		}
	}
	return out;
}

/** Drops the alpha channel (for an opaque image, as a PDF page wants it). */
export function rgbOf(straight: Buffer): Buffer {
	const n = straight.length / 4;
	const out = Buffer.alloc(n * 3);
	for (let i = 0; i < n; i++) {
		out[i * 3] = straight[i * 4]!;
		out[i * 3 + 1] = straight[i * 4 + 1]!;
		out[i * 3 + 2] = straight[i * 4 + 2]!;
	}
	return out;
}
