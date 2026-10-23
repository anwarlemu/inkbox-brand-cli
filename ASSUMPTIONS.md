# Assumptions for the brand owner to confirm

Each is in force today; each names where it lives, so a change is one edit.

1. Source. Values come from the Figma file "Inkbox (Copy) (Copy)", section "New" (node 427:2715), the console's
   screens, measured on 2026-10-23. The Figma MCP stopped after 16 calls (Starter plan limit), so colors were sampled
   from its 1x renders, type sizes and weights were fitted to its text layers' widths (Inter, no tracking), and sizes
   and radii come from the layer geometry. Shared styles were read directly: Shadow/S, Line/S Bottom and the 4, 8, 12,
   16 and 24 spacing variables. `brand/tokens.css`, `brand/elements.json`.
2. Inkbox has one look, the console's, applied to every project (`"surfaces": ["site"]` is the engine's single-look
   mode). There is no dark theme in the design. `brand/brand.json`.
3. The muted purples (#998EA5 for table heads and dates, #9E94A9 for placeholders and descriptions) are the design's
   own values and sit near 3:1 on white, under WCAG AA for small text. They are kept as measured; the guidance limits
   them to secondary information. Darken `--ds-color-text-muted` and `--ds-color-text-subtle` to pass AA.
4. Hover and focus states are not in the design. Hovers darken the lilac a step (#ECE9F0) or the purple a step
   (#67568E); focus is a 2px purple outline on controls and a purple edge with a soft ring on fields.
5. Components the design does not show (menus, popovers, tooltips, calendar, charts, carousel, toasts and others)
   extend its patterns: white panels with Shadow/S and 8px corners, 14px Inter, lilac highlights, filled glyphs.
   Each component's docs entry says what it is drawn from.
6. Icons are Phosphor (the design uses another set): fill weight for the console's solid glyphs, regular for line
   glyphs (chevrons, close, plus), duotone for copy.
7. Keys, hosts and IDs are IBM Plex Mono; code blocks use the system monospace in the editor's light theme, as the
   event catalog shows.
8. Primitives come from Radix (`radix-ui`), `cmdk` and `sonner`; no shadcn code. Calendar, chart, carousel,
   resizable, input OTP and the drawer are written by hand.
9. The logo is the octopus mark and the wordmark from inkbox.ai (`brand/logo/`), recolored to the ink.
10. Review passes at 7 on every score. `brand/brand.json`.
11. The repo is public, so installs need no token. Make it private if the brand's files should not be public.
