import { deflateSync } from 'node:zlib';

// A minimal PDF writer: one page per image (8-bit RGB, Flate), no metadata dates, so the same pages give the same
// bytes. Pages are sized in points from the image's pixel size and a physical width.

export type PdfPage = { rgb: Buffer; width: number; height: number };

export function imagesToPdf(pages: PdfPage[], pageWidthPt: number): Buffer {
	if (!pages.length) throw new Error('A PDF needs at least one page.');
	const objects: Buffer[] = [];
	const add = (body: Buffer | string) => {
		objects.push(typeof body === 'string' ? Buffer.from(body, 'latin1') : body);
		return objects.length;
	};
	// 1: catalog, 2: pages (filled in after the page objects exist).
	add('<< /Type /Catalog /Pages 2 0 R >>');
	add('');
	const kids: number[] = [];
	for (const page of pages) {
		const ptW = pageWidthPt;
		const ptH = Math.round((pageWidthPt * page.height) / page.width * 100) / 100;
		const data = deflateSync(page.rgb, { level: 6 });
		const img = add(Buffer.concat([Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ${data.length} >>\nstream\n`, 'latin1'), data, Buffer.from('\nendstream', 'latin1')]));
		const content = `q ${ptW} 0 0 ${ptH} 0 0 cm /Im0 Do Q`;
		const contents = add(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
		kids.push(add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ptW} ${ptH}] /Resources << /XObject << /Im0 ${img} 0 R >> >> /Contents ${contents} 0 R >>`));
	}
	objects[1] = Buffer.from(`<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(' ')}] /Count ${kids.length} >>`, 'latin1');
	const parts: Buffer[] = [Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n', 'latin1')];
	const offsets: number[] = [];
	let at = parts[0]!.length;
	objects.forEach((body, i) => {
		const head = Buffer.from(`${i + 1} 0 obj\n`, 'latin1');
		const tail = Buffer.from('\nendobj\n', 'latin1');
		offsets.push(at);
		parts.push(head, body, tail);
		at += head.length + body.length + tail.length;
	});
	const xref = [`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`, ...offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`)].join('');
	parts.push(Buffer.from(`${xref}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${at}\n%%EOF\n`, 'latin1'));
	return Buffer.concat(parts);
}
