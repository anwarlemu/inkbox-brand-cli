/** The clips committed under brand/video/samples. The render script and the tests share this list. */
export const videoSamples = [
	{ template: 'social', size: 'square', eyebrow: 'For agents', headline: 'A mailbox for your agents' },
	{ template: 'announce', size: 'vertical', eyebrow: 'New', headline: 'Phone lines for agents', subtext: 'A number of their own, on the same quiet console.' },
	{ template: 'product', size: 'landscape', headline: 'Every agent gets an inbox', subtext: 'Email, phone and iMessage, each with its own identity.' },
] as const;
