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
12. Assets follow the agd-playground share-image editor (`/inkbox`), with tokens winning where they disagree: headlines
    are Inter SemiBold, not the editor's Funnel Display; the card's IBM Plex Sans is Inter; every editor color is its
    nearest token (the hatching lilac #beaeda became text-faint #BCB3C5, a little grayer). Each change is listed in
    `brand/assets/image.json` notes. Add the editor's marketing colors as tokens to bring them back.
13. The Y Combinator badge (the orange Y square) is left out as a third-party mark; its words stay, in the pill badge.
14. The window's sample mailbox is Acme placeholder copy; the editor's named a real person. The editor's console
    screens are labelled placeholders, so none ship: pass `--image` with a real capture.
15. Motion pieces use the console's ease-out (`--ds-easing-out`) at 420 ms per entrance, 80 ms apart. Neither the
    editor nor the site has motion of its own to copy. `brand/assets/video.json`.
16. Merch sizes are common vendor print areas, not a vendor's template. The octopus is 3D-rendered art, so it prints
    only on full-color files and is embedded (not traced) in SVGs. `brand/assets/merch.json`.
