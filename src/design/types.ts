// The design contract, the same file in every brand CLI (src/design/types.ts). Brand-free. Units: canvas pixels.
export type Rect = { x: number; y: number; w: number; h: number };
export type LayerKind = 'logo' | 'text' | 'art' | 'picture' | 'panel' | 'key';
export type Anchor = 'top-left' | 'top' | 'top-right' | 'left' | 'center' | 'right' | 'bottom-left' | 'bottom' | 'bottom-right';
export type DesignKind = 'image' | 'slide' | 'merch' | 'illustration' | 'video';
export type Format = 'png' | 'svg' | 'jpg' | 'webp' | 'pdf' | 'mp4' | 'gif';

/** What the engine actually drew. Reported by the drawing code itself, never estimated beside it. */
export type DrawnLayer = {
	id: string;               // logo, headline, body, badge, art, picture, footer, ... stable per template
	kind: LayerKind;
	box: Rect;                // full drawn bounds, before the canvas edge cuts it
	ink?: Rect[];             // tighter bounds (one per text line, one per run of dots), for overlap checks
	bleeds?: boolean;         // this layout runs it off the canvas on purpose (a pattern, a horizon)
	fades?: boolean;          // it fades into the ground before it leaves the canvas (checked in the pixels)
	over?: string[];          // layers it may sit on by design (text on a panel)
	// asked is the user's copy this layer draws, drawn is what reached the canvas. ground lists every color behind it.
	// bold: weight 600 or more (large text starts lower). own marks the brand's own words (its address) and numbering; sample marks copy filled in by --sample.
	text?: { asked: string; drawn: string; size: number; color: string; ground: string[]; bold?: boolean; sample?: boolean; own?: boolean };
	logo?: { clear: number; min: number };   // clear space in px at this size, minimum height in px (from brand/)
	can: { move?: boolean; scale?: [number, number]; align?: boolean; hide?: boolean; anchors?: Anchor[] };
};

/** A change to one layer, relative to where the template puts it. dx/dy are shares of the canvas. */
export type LayerEdit = { dx?: number; dy?: number; scale?: number; anchor?: Anchor; align?: 'left' | 'center' | 'right'; hidden?: boolean };

export type OptionValue = string | number | boolean;

/** Everything about a design that an edit can change (the fields undo restores). */
export type DesignState = {
	template: string;
	size: { id: string; width: number; height: number };
	theme?: string;
	copy: Record<string, string>;                      // only what the user wrote; nothing invented
	images: Record<string, string>;                    // slot -> file path, relative to the document (or one of the slot's values)
	seed?: number;
	options: Record<string, OptionValue>;
	layers: Record<string, LayerEdit>;
	allow?: string[];                                  // composition rules the person accepted (--allow)
	blocks?: ComposeBlock[];                           // compose designs: the blocks in drawing order (first is underneath)
	grid?: { cols: number; rows: number };             // compose designs: the grid (12 by 12 unless set)
};

/** A block of a compose design: a type the brand draws, at cells of the grid. Its words are copy["<id>.<slot>"], its
 * picture images["<id>"], its options options["<id>.<option>"]. */
export type ComposeBlock = { id: string; type: string; at: { col: number; row: number; cols: number; rows: number } };

/** A kind of block the brand draws in compose designs. */
export type BlockInfo = {
	type: string; names?: string[]; kind: LayerKind; description: string;
	copy: { id: string; required?: boolean }[];
	image?: { required?: boolean; values?: string[] };
	options?: { id: string; values?: string[]; range?: [number, number] }[];
	span: { cols: number; rows: number };                // the cells it takes when added without a place
	place?: Anchor;                                      // where it goes when added without a place
	under?: boolean;                                     // it may sit under other blocks (a panel, art, a pattern)
	sample?: Record<string, string>;                     // words that fit it, for tests and --sample
};

/** A section a page can be built from. */
export type SectionInfo = {
	type: string; description: string;
	copy: { id: string; required?: boolean }[];
	items?: { count: [number, number]; copy: { id: string; required?: boolean }[] };
};

export type DesignDoc = DesignState & {
	version: 1;
	brand: string;            // the CLI's bin name; another brand's file is an error
	kind: DesignKind;
	history: { change: string; before: unknown }[];    // no timestamps: same inputs, same bytes
	future: { change: string; after: unknown }[];
};

export type TemplateInfo = {
	id: string; kind: DesignKind; description: string; sizes: string[]; themes: string[];
	copy: { id: string; required?: boolean; description?: string }[];
	images: { id: string; required?: boolean; values?: string[] }[];       // values: names that stand in for a file (none, a built-in picture)
	options: { id: string; values?: string[]; range?: [number, number]; description?: string }[];
	layers: { id: string; can: DrawnLayer['can'] }[];
	grounds?: Record<string, string>;                  // theme -> its ground as hex, so "darker theme" has an answer
	formats?: Format[];                                // default: png and svg
	reflows?: Record<string, string[]>;                // layer -> layers that may give way when it changes (art for a bigger headline)
	layouts?: string[];                                // short names people may call this template by
};

/** The one thing each brand implements (src/design/adapter.ts). Everything else in src/design/ is shared, byte for byte. */
export type Adapter = {
	brand: string;
	templates(): TemplateInfo[];
	defaults(template: string, size: string): Pick<DesignDoc, 'size' | 'theme' | 'seed' | 'options'>;
	/** Draws the document with its layer edits applied inside the real drawing code (text re-wraps, art re-flows).
	 * Throws an Error saying what to shorten when the words cannot be drawn whole. `notes` say where it did less than an
	 * edit asked ("the headline grew 12%, the most that fits, not 20%"); they are printed with the change. */
	render(doc: DesignDoc, dir: string, out: { formats: Format[]; scale: number }): Promise<{ files: Record<string, Uint8Array>; layers: DrawnLayer[]; notes?: string[] }>;
	/** The words of copy as they are drawn, for comparing: takes out the brand's own markup ("*accent*" marks). */
	words?(text: string): string;
	/** Sample copy for a template, only ever used when the person passes --sample. */
	sample?(template: string): Record<string, string>;
	/** Open composition: the blocks this brand draws. render() gets template "compose" with doc.blocks; blockRects(doc) gives each
	 * block's rect, and every block's DrawnLayer has the block's id. */
	compose?: {
		blocks(): BlockInfo[];
		themes: string[];
		grounds?: Record<string, string>;
		sizes?: string[];
		formats?: Format[];
		/** A template's design as blocks, to show any template can be recreated (conformance). */
		recipe?(template: string, size: string, copy: Record<string, string>): (Pick<DesignState, 'blocks' | 'copy'> & Partial<Pick<DesignState, 'grid' | 'theme' | 'layers'>>) | undefined;
	};
	/** Pages from sections: the outline is checked by the core, then written in each flavor the brand ships. */
	page?: {
		sections(): SectionInfo[];
		flavors: string[];
		write(outline: { title?: string; sections: { type: string; copy?: Record<string, string>; items?: Record<string, string>[] }[] }, flavor: string): Promise<Record<string, string>>;
	};
	/** Every color words may be drawn in or on, as hex. The check refuses any other. */
	colors?(): string[];
	/** The brand's own older names, mapped to the shared ids: sizes ("s-4x5": "portrait"), themes, templates, copy slots. */
	aliases?: { sizes?: Record<string, string>; themes?: Record<string, string>; templates?: Record<string, string>; copy?: Record<string, string>; layers?: Record<string, string> };
};

/** A finding of the check. `allowable` findings are about composition and can be accepted with --allow <rule>. */
export type Finding = { rule: string; severity: 'error' | 'warning'; allowable: boolean; layers: string[]; message: string };
