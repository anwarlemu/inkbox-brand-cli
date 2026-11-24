import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createCanvas } from '@napi-rs/canvas';
import { designOf, picturesFor, renderDesign } from '../../src/assets/image.js';
import { renderSlide } from '../../src/assets/deck.js';
import { adapter, paint } from '../../src/design/adapter.js';
import { designConformance } from './conformance.js';

const dir = mkdtempSync(join(tmpdir(), 'ds-adapter-'));
const shot = join(dir, 'shot.png');
const c = createCanvas(1200, 700);
c.getContext('2d').fillRect(0, 0, 1200, 700);
writeFileSync(shot, c.toBuffer('image/png'));

const ITEMS = 'Its own address | A phone number | An open card';
const copy = (long: boolean) => (t: { id: string; kind: string; copy: { id: string }[] }) =>
	Object.fromEntries(
		t.copy
			.filter((x) => x.id !== 'partner' || !long)
			.map((x) => {
				const head = long ? 'Everything your agents need to search, buy and reply in one place' : 'Ship your next idea today';
				const of: Record<string, string> = { headline: head, title: head, quote: head, body: long ? 'A second line that says a little more about it' : 'One line about it', badge: 'New', credit: '@acme', partner: 'Acme', stat: long ? '1,000,000+' : '42%', number: '01', items: ITEMS, url: 'acme.com', attribution: 'Head of operations, Acme', data: 'Email 42 | Phone 31 | Cards 27', left: 'Before', right: 'After', 'left-items': 'Shared inboxes | Manual replies', 'right-items': 'An address per agent | Replies in seconds' };
				if (x.id === 'items' && t.id === 'slide-team') of.items = 'Your name - Founder | A colleague - Engineer';
				return [x.id, of[x.id] ?? 'One line'];
			}),
	);

designConformance(adapter(), {
	paint,
	picture: shot,
	short: copy(false),
	long: copy(true),
	timeout: 300_000,
	async plain(doc) {
		if (doc.kind === 'image') {
			const d = designOf({ template: doc.template, size: doc.size.id, theme: doc.theme, headline: doc.copy.headline, body: doc.copy.body, badge: doc.copy.badge, credit: doc.copy.credit, partner: doc.copy.partner });
			return (await renderDesign(d, await picturesFor(null))).png;
		}
		if (doc.kind === 'slide') return (await renderSlide({ type: doc.template.replace('slide-', ''), theme: doc.theme, ...doc.copy })).png;
		return undefined;
	},
});
