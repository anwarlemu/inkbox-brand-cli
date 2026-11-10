import { crc32 } from 'node:zlib';

type Chunk = { type: string; data: Buffer };

function chunk(type: string, data: Buffer) {
	const body = Buffer.concat([Buffer.from(type), data]);
	const len = Buffer.alloc(4);
	len.writeUInt32BE(data.length);
	const sum = Buffer.alloc(4);
	sum.writeUInt32BE(crc32(body) >>> 0);
	return Buffer.concat([len, body, sum]);
}

function chunksOf(png: Buffer): Chunk[] {
	if (png.length < 8 || png.toString('ascii', 1, 4) !== 'PNG') throw new Error('A video frame was not a PNG.');
	const out: Chunk[] = [];
	let offset = 8;
	while (offset + 12 <= png.length) {
		const len = png.readUInt32BE(offset);
		const type = png.toString('ascii', offset + 4, offset + 8);
		const data = Buffer.from(png.subarray(offset + 8, offset + 8 + len));
		out.push({ type, data });
		if (type === 'IEND') break;
		offset += 12 + len;
	}
	return out;
}

function idat(parts: Chunk[]) {
	const data = parts.filter((part) => part.type === 'IDAT').map((part) => part.data);
	if (!data.length) throw new Error('A video frame PNG had no image data.');
	return Buffer.concat(data);
}

/**
 * Pack full-frame PNGs into one APNG. Frame 0 is the default image.
 * Delay is 1/fps for every frame, and the clip plays once.
 */
export function encodeApng(frames: Buffer[], fps: number): Buffer {
	if (!frames.length) throw new Error('A video needs at least one frame.');
	if (!Number.isInteger(fps) || fps < 1 || fps > 60) throw new Error(`Video fps must be an integer from 1 to 60. Got ${fps}.`);
	const first = chunksOf(frames[0]);
	const ihdr = first.find((part) => part.type === 'IHDR');
	if (!ihdr || ihdr.data.length < 13) throw new Error('A video frame PNG had no header.');
	const width = ihdr.data.readUInt32BE(0);
	const height = ihdr.data.readUInt32BE(4);
	const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
	const actl = Buffer.alloc(8);
	actl.writeUInt32BE(frames.length, 0);
	actl.writeUInt32BE(1, 4);
	const parts = [signature, chunk('IHDR', ihdr.data), chunk('acTL', actl)];
	let sequence = 0;
	for (let index = 0; index < frames.length; index++) {
		const parsed = index === 0 ? first : chunksOf(frames[index]);
		const header = parsed.find((part) => part.type === 'IHDR');
		if (!header || header.data.readUInt32BE(0) !== width || header.data.readUInt32BE(4) !== height) {
			throw new Error(`Video frame ${index + 1} is not ${width}x${height}.`);
		}
		const control = Buffer.alloc(26);
		control.writeUInt32BE(sequence++, 0);
		control.writeUInt32BE(width, 4);
		control.writeUInt32BE(height, 8);
		control.writeUInt16BE(1, 20);
		control.writeUInt16BE(fps, 22);
		control[24] = 0;
		control[25] = 0;
		parts.push(chunk('fcTL', control));
		const pixels = idat(parsed);
		if (index === 0) parts.push(chunk('IDAT', pixels));
		else {
			const seq = Buffer.alloc(4);
			seq.writeUInt32BE(sequence++, 0);
			parts.push(chunk('fdAT', Buffer.concat([seq, pixels])));
		}
	}
	parts.push(chunk('IEND', Buffer.alloc(0)));
	return Buffer.concat(parts);
}
