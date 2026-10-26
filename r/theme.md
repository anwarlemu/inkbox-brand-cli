# Inkbox theme
The Inkbox tokens and the Tailwind names that read them.

Install: npx inkbox-ds add theme
Requires: none
Packages: none
Exports: See source
Client boundary: not required by this entry file

## Usage



## Source

styles/tokens.css

```css
/* Written by inkbox-ds from its brand files. Do not edit; run the CLI again to update. */
:root {
	/* Core: deep purple ink, the action purple, the lilac wash, the pink accent, and white. */
	--ds-color-brand: #74629D;
	--ds-color-black: #000000;
	--ds-color-white: #FFFFFF;
	--ds-color-ink: #3E2A53;
	--ds-color-lilac: #F4F2F6;
	--ds-color-pink: #F9B1B5;
	/* The pink's dark partner: the glyph on a pink channel tile, and an agent handle in a table. */
	--ds-color-rose: #8C5659;
	/* An avatar's initial tile. */
	--ds-color-avatar: #5063B1;

	/* Surfaces: white panels on a white page; the lilac for the second rail, a selected row, a table's head and foot,
	   a field's well and a channel card. */
	--ds-color-bg-default: #FFFFFF;
	--ds-color-bg-page: #FFFFFF;
	--ds-color-bg-subtle: #F4F2F6;
	/* The lilac under the pointer or pressed: the wash a step deeper (not in the design; derived for hover). */
	--ds-color-bg-subtle-hover: #ECE9F0;
	--ds-color-bg-frame: #F4F2F6;
	--ds-color-bg-canvas: #F4F2F6;
	--ds-color-bg-tint: #F4F2F6;
	--ds-color-bg-brand: #74629D;
	--ds-color-bg-inverse: #3E2A53;
	--ds-color-bg-dark: #3E2A53;
	/* Code: the light editor theme of the event catalog (a gray head over an off-white body). */
	--ds-color-bg-code: #FFFFFE;
	--ds-color-bg-code-head: #F0F0F0;
	/* The page behind a dialog: the ink at 12 percent, over a light blur. */
	--ds-color-bg-scrim: rgb(62 42 83 / 0.12);
	/* A switch that is off, and a disabled control's fill. */
	--ds-color-bg-off: #B1ADBB;

	/* Text: the ink, and four lighter purples (secondary for body copy under a title, muted for table heads, dates and
	   descriptions, subtle for placeholders, faint for a close glyph); the action purple for links and labels. */
	--ds-color-text-default: #3E2A53;
	--ds-color-text-secondary: #70637E;
	--ds-color-text-muted: #998EA5;
	--ds-color-text-subtle: #9E94A9;
	--ds-color-text-nav: #3E2A53;
	--ds-color-text-faint: #BCB3C5;
	--ds-color-text-inverse: #FFFFFF;
	--ds-color-text-brand: #74629D;
	--ds-color-text-on-brand: #FFFFFF;
	--ds-color-text-label: #74629D;
	/* Icons: the ink for nav glyphs, a softer purple for row actions and empty-state orbits. */
	--ds-color-icon-default: #3E2A53;
	--ds-color-icon-secondary: #5B4C6A;
	/* Code: the editor theme's keys, strings, line numbers, braces and plain text. */
	--ds-color-code-key: #A31515;
	--ds-color-code-string: #0451A5;
	--ds-color-code-line: #237893;
	--ds-color-code-brace: #F8CC5E;
	--ds-color-code-text: #1A202C;
	--ds-color-code-punct: #0431FA;
	--ds-color-code-line-active: #0B216F;
	--ds-color-code-head-fg: #4A4A4A;
	/* The rest of the same editor theme (Light+), for code other than JSON: keywords, comments, numbers, functions,
	   types, markup tags and attributes. */
	--ds-color-code-keyword: #0000FF;
	--ds-color-code-comment: #008000;
	--ds-color-code-number: #098658;
	--ds-color-code-function: #795E26;
	--ds-color-code-type: #267F99;
	--ds-color-code-tag: #800000;
	--ds-color-code-attr: #E50000;

	/* Lines: a field's edge, the rail and header rules, and the two shared styles (Line/S Bottom under a table row,
	   Shadow/S's ring around a raised white panel). */
	--ds-color-border-default: #D2C9DB;
	--ds-color-border-subtle: #F3F1F5;
	--ds-color-border-strong: #B1ADBB;
	--ds-color-border-field: #D2C9DB;
	--ds-color-border-row: rgb(102 102 99 / 0.12);
	--ds-color-border-ring: rgb(23 47 41 / 0.12);
	/* Shadow/S's drop, for a raised panel drawn without box-shadow (a table body built from cells). */
	--ds-color-shadow-drop: rgb(23 47 41 / 0.08);
	--ds-color-border-brand: #74629D;
	--ds-color-border-pink: #F9B1B5;
	/* A code block's edge, its head's rule and its indent guides (the editor theme's gray). */
	--ds-color-border-code: #E0E0E0;
	--ds-color-wash-hover: rgb(62 42 83 / 0.04);
	--ds-color-ring-tint: rgb(116 98 157 / 0.24);

	/* Actions and states. The main action is the purple pill. */
	--ds-color-action-primary: #74629D;
	--ds-color-action-primary-hover: #67568E;
	--ds-color-action-primary-fg: #FFFFFF;
	--ds-color-focus-ring: #74629D;
	/* Success: the Included pill and its checks, and the Active status well. */
	--ds-color-status-success: #1CA721;
	--ds-color-status-success-bg: #C6F6D5;
	/* Warning: the copy-this-key banner (its fill, title ink, glyph and note). */
	--ds-color-status-warning: #8A581D;
	--ds-color-status-warning-bg: #F6E8C9;
	--ds-color-status-warning-fg: #4A2F0B;
	--ds-color-status-warning-muted: #8E7045;
	/* Danger: a field that failed (its edge and message) and the error glyph inside it. */
	--ds-color-status-danger: #BD5557;
	--ds-color-status-danger-strong: #A71C1F;
	/* Info: the zero-knowledge note (fill, ink, glyph), and the blue tag and status well. */
	--ds-color-status-info: #1C7390;
	--ds-color-status-info-bg: #C9EBF6;
	--ds-color-status-info-fg: #0D4152;
	--ds-color-tag-blue: #BEE3F8;
	--ds-color-tag-blue-fg: #2A4365;
	--ds-color-tag-purple: #E9D8FD;
	--ds-color-tag-purple-fg: #6D5C9B;
	--ds-color-tag-gray: #EDF2F7;
	--ds-color-chart-series-1: #74629D;
	--ds-color-chart-series-2: #F9B1B5;
	--ds-color-chart-series-3: #5063B1;
	--ds-color-chart-series-4: #1C7390;
	--ds-color-chart-series-5: #1CA721;

	/* Type: Inter for everything, IBM Plex Mono for keys, hosts and IDs, the system monospace in code blocks. Body copy is 14px regular; medium for
	   tabs and card titles; bold only for an empty state's title. No tracking. */
	--ds-font-sans: var(--font-inter, "Inter"), ui-sans-serif, system-ui, sans-serif;
	--ds-font-display: var(--font-inter, "Inter"), ui-sans-serif, system-ui, sans-serif;
	--ds-font-mono: var(--font-plex-mono, "IBM Plex Mono"), ui-monospace, SFMono-Regular, Menlo, monospace;
	/* Code blocks (the event catalog's JSON) use the system monospace, as the editor theme does. */
	--ds-font-code: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
	--ds-font-weight-regular: 400;
	--ds-font-weight-medium: 500;
	--ds-font-weight-semibold: 600;
	--ds-font-weight-bold: 700;
	--ds-font-weight-heading: 400;
	/* Page and dialog titles are 20px regular; an empty state's title 22px bold; the rest 11 to 16px. */
	--ds-text-display: 2rem;
	--ds-text-h1: 1.5rem;
	--ds-text-h2: 1.375rem;
	--ds-text-h3: 1.25rem;
	--ds-text-h4: 1rem;
	--ds-text-body-lg: 1rem;
	--ds-text-body: 0.875rem;
	--ds-text-body-sm: 0.8125rem;
	--ds-text-caption: 0.75rem;
	--ds-text-micro: 0.6875rem;
	--ds-leading-tight: 1.2;
	--ds-leading-heading: 1.4;
	--ds-leading-display: 1.25;
	--ds-leading-snug: 1.25;
	--ds-leading-body: 1.5;
	--ds-leading-relaxed: 1.6;
	--ds-leading-code: 1.5;
	--ds-tracking-normal: 0;
	/* Nothing is tracked; the engine's heading tracking resolves to none. */
	--ds-tracking-tight: 0;
	--ds-tracking-caps: 0.02em;

	/* Space (rem, so it follows the root); the design's spacing variables are 4, 8, 12, 16 and 24. */
	--ds-space-0: 0;
	--ds-space-px: 1px;
	--ds-space-0-5: 0.125rem;
	--ds-space-1: 0.25rem;
	--ds-space-1-5: 0.375rem;
	--ds-space-2: 0.5rem;
	--ds-space-2-5: 0.625rem;
	--ds-space-3: 0.75rem;
	--ds-space-3-5: 0.875rem;
	--ds-space-4: 1rem;
	--ds-space-5: 1.25rem;
	--ds-space-6: 1.5rem;
	--ds-space-7: 1.75rem;
	--ds-space-8: 2rem;
	--ds-space-9: 2.25rem;
	--ds-space-9-5: 2.375rem;
	--ds-space-10: 2.5rem;
	--ds-space-10-5: 2.625rem;
	--ds-space-12: 3rem;
	--ds-space-14: 3.5rem;
	--ds-space-16: 4rem;
	--ds-space-20: 5rem;
	--ds-space-24: 6rem;

	/* Layout: a 288px rail, a 288px second rail, a 64px page head with 24px gutters. */
	--ds-layout-column: 75rem;
	--ds-layout-gutter: 1.5rem;
	--ds-layout-text: 42.5rem;
	--ds-layout-heading: 42rem;
	--ds-layout-header: 4rem;
	--ds-layout-rail: 18rem;
	--ds-frame-column: min(100% - 2 * var(--ds-layout-gutter), var(--ds-layout-column));

	/* Shape: pill buttons and compact controls, 6px details, 8px tiles, 12px content panels,
	   16px popup panels, table heads and banners, and 24px cards and multi-select fields. */
	--ds-radius-xs: 0.375rem;
	--ds-radius-sm: 0.5rem;
	--ds-radius-control: 0.75rem;
	--ds-radius-panel: 1rem;
	--ds-radius-dialog: 1.5rem;
	--ds-radius-pill: 9999px;
	/* Shadow/S: a raised white panel (a selected tab, a table's body, a select, a menu): a 1px ring and a short drop. */
	--ds-shadow-s: 0 2px 4px rgb(23 47 41 / 0.08), 0 0 0 1px rgb(23 47 41 / 0.12);
	/* A card: the same raised panel. */
	--ds-shadow-card: 0 2px 4px rgb(23 47 41 / 0.08), 0 0 0 1px rgb(23 47 41 / 0.12);
	/* Line/S Bottom: the rule under a table row. */
	--ds-shadow-line: 0 1px 0 rgb(102 102 99 / 0.12);
	/* A floating panel (a menu, a popover, a toast): Shadow/S with a softer, longer drop. */
	--ds-shadow-floating: 0 0 0 1px rgb(23 47 41 / 0.12), 0 2px 4px rgb(23 47 41 / 0.08), 0 12px 24px -8px rgb(62 42 83 / 0.16);
	/* A dialog sits on the scrim with no drop of its own; a sheet gets one where it meets the page. */
	--ds-shadow-dialog: 0 24px 48px -16px rgb(62 42 83 / 0.16);
	--ds-shadow-knob: 0 1px 2px rgb(62 42 83 / 0.24), 0 0 0 0.5px rgb(62 42 83 / 0.12);
	--ds-shadow-focus: 0 0 0 3px rgb(116 98 157 / 0.24);
	--ds-blur-scrim: 4px;

	/* Motion: a strong ease-out for every hover, press and entrance; in-out only for what travels on screen (a tab
	   thumb, a switch knob). Never ease-in. */
	--ds-duration-fast: 150ms;
	--ds-duration-base: 200ms;
	--ds-duration-moderate: 250ms;
	--ds-duration-slow: 300ms;
	--ds-easing-out: cubic-bezier(0.23, 1, 0.32, 1);
	--ds-easing-in-out: cubic-bezier(0.77, 0, 0.175, 1);
	--ds-easing-drawer: cubic-bezier(0.32, 0.72, 0, 1);
}

```

styles/theme.css

```css
/* Written by inkbox-ds from its brand files. Do not edit; run the CLI again to update. */
@theme inline {
	--color-brand: var(--ds-color-brand);
	--color-black: var(--ds-color-black);
	--color-white: var(--ds-color-white);
	--color-primary: var(--ds-color-action-primary);
	--color-primary-hover: var(--ds-color-action-primary-hover);
	--color-on-primary: var(--ds-color-action-primary-fg);
	--color-focus-ring: var(--ds-color-focus-ring);
	--color-surface: var(--ds-color-bg-default);
	--color-surface-brand: var(--ds-color-bg-brand);
	--color-subtle: var(--ds-color-bg-subtle);
	--color-frame: var(--ds-color-bg-frame);
	--color-canvas: var(--ds-color-bg-canvas);
	--color-tint: var(--ds-color-bg-tint);
	--color-inverse: var(--ds-color-bg-inverse);
	--color-dark: var(--ds-color-bg-dark);
	--color-code: var(--ds-color-bg-code);
	--color-scrim: var(--ds-color-bg-scrim);
	--color-fg: var(--ds-color-text-default);
	--color-fg-secondary: var(--ds-color-text-secondary);
	--color-fg-muted: var(--ds-color-text-muted);
	--color-fg-subtle: var(--ds-color-text-subtle);
	--color-fg-faint: var(--ds-color-text-faint);
	--color-fg-nav: var(--ds-color-text-nav);
	--color-fg-inverse: var(--ds-color-text-inverse);
	--color-fg-brand: var(--ds-color-text-brand);
	--color-on-brand: var(--ds-color-text-on-brand);
	--color-line: var(--ds-color-border-default);
	--color-line-subtle: var(--ds-color-border-subtle);
	--color-line-strong: var(--ds-color-border-strong);
	--color-success: var(--ds-color-status-success);
	--color-warning: var(--ds-color-status-warning);
	--color-danger: var(--ds-color-status-danger);
	--color-ink: var(--ds-color-ink);
	--color-lilac: var(--ds-color-lilac);
	--color-pink: var(--ds-color-pink);
	--color-rose: var(--ds-color-rose);
	--color-avatar: var(--ds-color-avatar);
	--color-page: var(--ds-color-bg-page);
	--color-subtle-hover: var(--ds-color-bg-subtle-hover);
	--color-code-head: var(--ds-color-bg-code-head);
	--color-off: var(--ds-color-bg-off);
	--color-fg-label: var(--ds-color-text-label);
	--color-icon-default: var(--ds-color-icon-default);
	--color-icon-secondary: var(--ds-color-icon-secondary);
	--color-code-key: var(--ds-color-code-key);
	--color-code-string: var(--ds-color-code-string);
	--color-code-line: var(--ds-color-code-line);
	--color-code-brace: var(--ds-color-code-brace);
	--color-code-text: var(--ds-color-code-text);
	--color-code-punct: var(--ds-color-code-punct);
	--color-code-line-active: var(--ds-color-code-line-active);
	--color-code-head-fg: var(--ds-color-code-head-fg);
	--color-code-keyword: var(--ds-color-code-keyword);
	--color-code-comment: var(--ds-color-code-comment);
	--color-code-number: var(--ds-color-code-number);
	--color-code-function: var(--ds-color-code-function);
	--color-code-type: var(--ds-color-code-type);
	--color-code-tag: var(--ds-color-code-tag);
	--color-code-attr: var(--ds-color-code-attr);
	--color-line-field: var(--ds-color-border-field);
	--color-line-row: var(--ds-color-border-row);
	--color-line-ring: var(--ds-color-border-ring);
	--color-shadow-drop: var(--ds-color-shadow-drop);
	--color-line-brand: var(--ds-color-border-brand);
	--color-line-pink: var(--ds-color-border-pink);
	--color-line-code: var(--ds-color-border-code);
	--color-wash-hover: var(--ds-color-wash-hover);
	--color-ring-tint: var(--ds-color-ring-tint);
	--color-success-bg: var(--ds-color-status-success-bg);
	--color-warning-bg: var(--ds-color-status-warning-bg);
	--color-warning-fg: var(--ds-color-status-warning-fg);
	--color-warning-muted: var(--ds-color-status-warning-muted);
	--color-danger-strong: var(--ds-color-status-danger-strong);
	--color-info: var(--ds-color-status-info);
	--color-info-bg: var(--ds-color-status-info-bg);
	--color-info-fg: var(--ds-color-status-info-fg);
	--color-tag-blue: var(--ds-color-tag-blue);
	--color-tag-blue-fg: var(--ds-color-tag-blue-fg);
	--color-tag-purple: var(--ds-color-tag-purple);
	--color-tag-purple-fg: var(--ds-color-tag-purple-fg);
	--color-tag-gray: var(--ds-color-tag-gray);
	--color-series-1: var(--ds-color-chart-series-1);
	--color-series-2: var(--ds-color-chart-series-2);
	--color-series-3: var(--ds-color-chart-series-3);
	--color-series-4: var(--ds-color-chart-series-4);
	--color-series-5: var(--ds-color-chart-series-5);
	--font-sans: var(--ds-font-sans);
	--font-display: var(--ds-font-display);
	--font-mono: var(--ds-font-mono);
	--font-code: var(--ds-font-code);
	--font-weight-normal: var(--ds-font-weight-regular);
	--font-weight-medium: var(--ds-font-weight-medium);
	--font-weight-semibold: var(--ds-font-weight-semibold);
	--font-weight-bold: var(--ds-font-weight-bold);
	--font-weight-heading: var(--ds-font-weight-heading);
	--spacing: var(--ds-space-1);
	--spacing-0: var(--ds-space-0);
	--spacing-px: var(--ds-space-px);
	--spacing-0\.5: var(--ds-space-0-5);
	--spacing-1: var(--ds-space-1);
	--spacing-1\.5: var(--ds-space-1-5);
	--spacing-2: var(--ds-space-2);
	--spacing-2\.5: var(--ds-space-2-5);
	--spacing-3: var(--ds-space-3);
	--spacing-3\.5: var(--ds-space-3-5);
	--spacing-4: var(--ds-space-4);
	--spacing-5: var(--ds-space-5);
	--spacing-6: var(--ds-space-6);
	--spacing-7: var(--ds-space-7);
	--spacing-8: var(--ds-space-8);
	--spacing-9: var(--ds-space-9);
	--spacing-9\.5: var(--ds-space-9-5);
	--spacing-10: var(--ds-space-10);
	--spacing-10\.5: var(--ds-space-10-5);
	--spacing-12: var(--ds-space-12);
	--spacing-14: var(--ds-space-14);
	--spacing-16: var(--ds-space-16);
	--spacing-20: var(--ds-space-20);
	--spacing-24: var(--ds-space-24);
	--spacing-layout-column: var(--ds-layout-column);
	--spacing-layout-gutter: var(--ds-layout-gutter);
	--spacing-layout-text: var(--ds-layout-text);
	--spacing-layout-heading: var(--ds-layout-heading);
	--spacing-layout-header: var(--ds-layout-header);
	--spacing-layout-rail: var(--ds-layout-rail);
	--container-frame-column: var(--ds-frame-column);
	--blur-scrim: var(--ds-blur-scrim);
	--transition-duration-fast: var(--ds-duration-fast);
	--transition-duration-150: var(--ds-duration-fast);
	--transition-duration-base: var(--ds-duration-base);
	--transition-duration-200: var(--ds-duration-base);
	--transition-duration-moderate: var(--ds-duration-moderate);
	--transition-duration-250: var(--ds-duration-moderate);
	--transition-duration-slow: var(--ds-duration-slow);
	--transition-duration-300: var(--ds-duration-slow);
	--default-transition-duration: var(--ds-duration-fast);
	--default-transition-timing-function: var(--ds-easing-out);
	--text-display: var(--ds-text-display);
	--text-h1: var(--ds-text-h1);
	--text-h2: var(--ds-text-h2);
	--text-h3: var(--ds-text-h3);
	--text-h4: var(--ds-text-h4);
	--text-body-lg: var(--ds-text-body-lg);
	--text-body: var(--ds-text-body);
	--text-body-sm: var(--ds-text-body-sm);
	--text-caption: var(--ds-text-caption);
	--text-micro: var(--ds-text-micro);
	--leading-tight: var(--ds-leading-tight);
	--leading-heading: var(--ds-leading-heading);
	--leading-display: var(--ds-leading-display);
	--leading-snug: var(--ds-leading-snug);
	--leading-body: var(--ds-leading-body);
	--leading-relaxed: var(--ds-leading-relaxed);
	--leading-code: var(--ds-leading-code);
	--tracking-normal: var(--ds-tracking-normal);
	--tracking-tight: var(--ds-tracking-tight);
	--tracking-caps: var(--ds-tracking-caps);
	--radius-xs: var(--ds-radius-xs);
	--radius-sm: var(--ds-radius-sm);
	--radius-control: var(--ds-radius-control);
	--radius-panel: var(--ds-radius-panel);
	--radius-dialog: var(--ds-radius-dialog);
	--radius-pill: var(--ds-radius-pill);
	--shadow-s: var(--ds-shadow-s);
	--shadow-card: var(--ds-shadow-card);
	--shadow-line: var(--ds-shadow-line);
	--shadow-floating: var(--ds-shadow-floating);
	--shadow-dialog: var(--ds-shadow-dialog);
	--shadow-knob: var(--ds-shadow-knob);
	--shadow-focus: var(--ds-shadow-focus);
	--ease-out: var(--ds-easing-out);
	--ease-in-out: var(--ds-easing-in-out);
	--ease-drawer: var(--ds-easing-drawer);
}

@theme {
	--animate-pop-in: ds-pop-in var(--ds-duration-base) var(--ds-easing-out);
	--animate-pop-out: ds-pop-out var(--ds-duration-fast) var(--ds-easing-out) forwards;
	--animate-fade-in: ds-fade-in var(--ds-duration-fast) var(--ds-easing-out);
	--animate-fade-out: ds-fade-out var(--ds-duration-fast) var(--ds-easing-out) forwards;
	--animate-dialog-in: ds-dialog-in var(--ds-duration-moderate) var(--ds-easing-out);
	--animate-dialog-out: ds-dialog-out var(--ds-duration-fast) var(--ds-easing-out) forwards;
	--animate-sheet-in-right: ds-sheet-in-right var(--ds-duration-slow) var(--ds-easing-drawer);
	--animate-sheet-out-right: ds-sheet-out-right var(--ds-duration-base) var(--ds-easing-drawer) forwards;
	--animate-sheet-in-left: ds-sheet-in-left var(--ds-duration-slow) var(--ds-easing-drawer);
	--animate-sheet-out-left: ds-sheet-out-left var(--ds-duration-base) var(--ds-easing-drawer) forwards;
	--animate-sheet-in-top: ds-sheet-in-top var(--ds-duration-slow) var(--ds-easing-drawer);
	--animate-sheet-out-top: ds-sheet-out-top var(--ds-duration-base) var(--ds-easing-drawer) forwards;
	--animate-sheet-in-bottom: ds-sheet-in-bottom var(--ds-duration-slow) var(--ds-easing-drawer);
	--animate-sheet-out-bottom: ds-sheet-out-bottom var(--ds-duration-base) var(--ds-easing-drawer) forwards;
	--animate-content-in: ds-content-in var(--ds-duration-base) var(--ds-easing-out);
	--animate-accordion-down: ds-accordion-down var(--ds-duration-base) var(--ds-easing-out);
	--animate-accordion-up: ds-accordion-up var(--ds-duration-fast) var(--ds-easing-out);
	--animate-collapsible-down: ds-collapsible-down var(--ds-duration-base) var(--ds-easing-out);
	--animate-collapsible-up: ds-collapsible-up var(--ds-duration-fast) var(--ds-easing-out);
	--animate-pulse-soft: ds-pulse-soft 1.6s var(--ds-easing-in-out) infinite;
	--animate-spin-steady: spin 0.8s linear infinite;
	--animate-caret-blink: ds-caret-blink 1.1s steps(1) infinite;
	--animate-chart-line: ds-chart-line 700ms var(--ds-easing-out) backwards;
	--animate-chart-bar: ds-chart-bar 400ms var(--ds-easing-out) backwards;

	@keyframes ds-pop-in {
		from {
			opacity: 0;
			transform: scale(0.96);
		}
	}

	@keyframes ds-pop-out {
		to {
			opacity: 0;
			transform: scale(0.96);
		}
	}

	@keyframes ds-fade-in {
		from {
			opacity: 0;
		}
	}

	@keyframes ds-fade-out {
		to {
			opacity: 0;
		}
	}

	@keyframes ds-dialog-in {
		from {
			opacity: 0;
			transform: scale(0.96);
		}
	}

	@keyframes ds-dialog-out {
		to {
			opacity: 0;
			transform: scale(0.97);
		}
	}

	@keyframes ds-sheet-in-right {
		from {
			transform: translateX(100%);
		}
	}

	@keyframes ds-sheet-out-right {
		to {
			transform: translateX(100%);
		}
	}

	@keyframes ds-sheet-in-left {
		from {
			transform: translateX(-100%);
		}
	}

	@keyframes ds-sheet-out-left {
		to {
			transform: translateX(-100%);
		}
	}

	@keyframes ds-sheet-in-top {
		from {
			transform: translateY(-100%);
		}
	}

	@keyframes ds-sheet-out-top {
		to {
			transform: translateY(-100%);
		}
	}

	@keyframes ds-sheet-in-bottom {
		from {
			transform: translateY(100%);
		}
	}

	@keyframes ds-sheet-out-bottom {
		to {
			transform: translateY(100%);
		}
	}

	@keyframes ds-content-in {
		from {
			opacity: 0;
			transform: translateY(4px);
		}
	}

	@keyframes ds-accordion-down {
		from {
			height: 0;
			opacity: 0;
		}
		to {
			height: var(--radix-accordion-content-height);
		}
	}

	@keyframes ds-accordion-up {
		from {
			height: var(--radix-accordion-content-height);
		}
		to {
			height: 0;
			opacity: 0;
		}
	}

	@keyframes ds-collapsible-down {
		from {
			height: 0;
			opacity: 0;
		}
		to {
			height: var(--radix-collapsible-content-height);
		}
	}

	@keyframes ds-collapsible-up {
		from {
			height: var(--radix-collapsible-content-height);
		}
		to {
			height: 0;
			opacity: 0;
		}
	}

	@keyframes ds-pulse-soft {
		50% {
			opacity: 0.55;
		}
	}

	@keyframes ds-caret-blink {
		50% {
			opacity: 0;
		}
	}

	@keyframes ds-chart-line {
		from {
			stroke-dashoffset: 1;
		}
	}

	@keyframes ds-chart-bar {
		from {
			transform: scaleY(0.04);
		}
	}
}

@media (prefers-reduced-motion: reduce) {
	@keyframes ds-pop-in {
		from {
			opacity: 0;
		}
	}

	@keyframes ds-pop-out {
		to {
			opacity: 0;
		}
	}

	@keyframes ds-dialog-in {
		from {
			opacity: 0;
		}
	}

	@keyframes ds-dialog-out {
		to {
			opacity: 0;
		}
	}

	@keyframes ds-content-in {
		from {
			opacity: 0;
		}
	}

	@keyframes ds-sheet-in-right {
		from {
			opacity: 0;
		}
	}

	@keyframes ds-sheet-out-right {
		to {
			opacity: 0;
		}
	}

	@keyframes ds-sheet-in-left {
		from {
			opacity: 0;
		}
	}

	@keyframes ds-sheet-out-left {
		to {
			opacity: 0;
		}
	}

	@keyframes ds-sheet-in-top {
		from {
			opacity: 0;
		}
	}

	@keyframes ds-sheet-out-top {
		to {
			opacity: 0;
		}
	}

	@keyframes ds-sheet-in-bottom {
		from {
			opacity: 0;
		}
	}

	@keyframes ds-sheet-out-bottom {
		to {
			opacity: 0;
		}
	}

	@keyframes ds-chart-line {
		from {
			opacity: 0;
		}
	}

	@keyframes ds-chart-bar {
		from {
			opacity: 0;
		}
	}
}

/* Shared interaction rules for installed CSS and the component theme. */
@layer base {
 :where(button, [role="button"], a[href], input, select, textarea, summary) {
  touch-action: manipulation;
 }
}

/* Press feedback is immediate; the action still activates through the native click/keyboard path. */
:where(button, [role="button"], a[href], summary):active {
 transition-duration: 0s !important;
 transition-delay: 0s !important;
}

/* Keyboard feedback and explicitly high-frequency surfaces never wait for motion. */
:where(button, [role="button"], a[href], input, select, textarea, summary):focus-visible,
:where(button, [role="button"], a[href], input, select, textarea, summary):focus-visible *,
:where([data-ds-motion="instant"], [data-instant="true"], [data-slot^="command"]),
:where([data-ds-motion="instant"], [data-instant="true"], [data-slot^="command"]) *,
:where([data-ds-motion="instant"], [data-instant="true"], [data-slot^="command"]) *::before,
:where([data-ds-motion="instant"], [data-instant="true"], [data-slot^="command"]) *::after,
:where([data-ds-motion="instant"], [data-instant="true"], [data-slot^="command"])::before,
:where([data-ds-motion="instant"], [data-instant="true"], [data-slot^="command"])::after {
 animation: none !important;
 transition: none !important;
 scroll-behavior: auto !important;
}

@media (prefers-reduced-motion: reduce) {
 *, ::before, ::after {
  animation: none !important;
  transition: none !important;
  scroll-behavior: auto !important;
 }
}

```
