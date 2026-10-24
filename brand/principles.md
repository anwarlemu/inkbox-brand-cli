# Inkbox: what good looks like

Read by `inkbox-ds review` every time, next to the reference screenshots in `brand/reference/` (the console's own
screens from its design).

## The idea

Inkbox gives AI agents their own identity: a mailbox, a phone line, iMessage, a tunnel and a vault. Its mascot is a
soft purple octopus. The console is calm and quiet: white pages, a lilac rail, deep purple ink, and one muted purple
for every action. It reads like a well-kept mail client, not a dashboard of charts.

## The console

- One ground. Pages are white. The left rail is white with a hairline at its edge; an agent's workspace adds a second,
  lilac rail (#F4F2F6) beside it. The lilac is also the ground of a table's head and foot, a field's well, a channel
  card and the tab track.
- Ink is a deep purple (#3E2A53), never black. Secondary copy is #70637E; dates, table heads and descriptions are the
  muted purple #998EA5. The action purple (#74629D) is for the main action, links, rail labels and email previews.
  Pink (#F9B1B5) is the one accent: BETA and ADMIN marks, a channel's icon tile, the selected radio.
- One face: Inter. Body and controls are 14px regular; page and dialog titles 20px regular; tabs and card titles
  medium; only an empty state's title is bold. Keys, hosts and IDs are IBM Plex Mono; code blocks use the system
  monospace in a light editor theme. No caps except BETA and ADMIN; no tracking.
- The main action is a 40px purple pill. Other actions: the lilac pill beside it, the 36px white outline key with
  fully rounded corners for actions inside content, a 38px lilac key in a page head, ghost glyphs for row actions.
- Fields are 40px with fully rounded corners and a lilac-gray edge (#D2C9DB). Raised white things (a selected tab, a table body,
  a select) carry Shadow/S: a 1px ring and a short drop. Corners: pills for buttons, compact controls, tabs and badges; 8px tiles, 12px content panels, 16px
  table heads and banners, 24px dialogs.
- Navigation is the rail: 38px rows with a filled 22px glyph and a 14px label; the current row sits on the lilac.
  A page opens with a head: a 20px title, a 14px muted line, a hairline under it.
- Tables are three pieces: a lilac head, a white body with Shadow/S and 64px rows, a lilac pagination bar.
- Dialogs are white with 24px corners over the page tinted with the ink at 12 percent and lightly blurred.
- Icons are filled (Phosphor fill weight) in ink or #5B4C6A; chevrons, close and plus are line glyphs.
- Empty states have the octopus with five glyph circles around it, a 22px bold title and a pill action.

## Always

- Keep what each screen is for: its main action stays the most prominent thing, its key information easy to scan.
- For new pages, follow the user's brief. When only restyling existing UI, preserve its words, links, images, elements
  and behavior.
- Visible focus on every control; touch targets at least 44px on phones. The muted purples are the design's own
  values and sit under 4.5:1 on white: keep them for secondary information (dates, heads, hints), never for the only
  copy of something a person must read.
- Rare onboarding, feedback and celebrations may use expressive motion; frequent interactions use subtle style changes;
  shortcuts, command palette toggles and other 100+ daily interactions are instant. Reduced motion disables animation.
- Press feedback starts on pointer-down; actions retain native click/keyboard activation. No scaling, changing font
  weights or padding on hover/press. Reuse component variants and consistent section gutters.
- Audit debounces, artificial timers, transition waits and tap delay. Keep typing, filtering and feedback immediate;
  only essential nonblocking timers survive, with a specific `ds-latency` reason beside each call.

## Refuse

- Black or gray text, a dark theme, gradients, glows, bright saturated accents, square main actions, bold titles,
  heavy shadows, outlined cards inside cards, more than one purple pill in a view.

## Voice (for any text the agent must write, such as an alt text)

Plain, short and concrete. Sentence case, American spelling, no em dashes. Never "seamless", "revolutionary",
"cutting-edge", "unleash", "supercharge", "next-generation", "world-class", "leverage", "elevate".
