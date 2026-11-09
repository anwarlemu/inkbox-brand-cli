/** The pictures committed under brand/imagery/samples. The render script and the tests share this list. */
export const imageSamples = [
	{ template: 'headline', size: 'og', eyebrow: 'For agents', headline: 'A mailbox for your agents' },
	{ template: 'statement', size: 'landscape', headline: 'Every agent gets an inbox', subtext: 'Email, phone and iMessage, each with its own identity.' },
	{ template: 'frame', size: 'square', headline: 'Mailboxes, ready when the agent is', subtext: 'Provisioned and removed with the agent.' },
	{ template: 'quote', size: 'portrait', quote: 'Give every agent a number, an inbox and a place to keep its own records.', attribution: 'Inkbox' },
	{ template: 'announcement', size: 'og', eyebrow: 'New', headline: 'Phone lines for agents', subtext: 'A number of their own, on the same quiet console.' },
] as const;
