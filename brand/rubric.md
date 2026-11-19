# Review rubric

Score a restyled screen against the reference screenshots (the console's own screens) and the principles. The screen
keeps its own copy, elements and purpose; judge only how it looks and how usable it is. Scores 0 to 10: 7 is
shippable, 9 matches the reference in quality, 5 is generic. Be consistent: the same screen with the same problems
gets the same scores. When a previous punch list is given, check each item first and say whether it is fixed.

## Same composition (blocker when broken)
When "before" images are given (the screen right after the automatic conversion, before any hand edits), compare
the layout: every element is still there, at the same size relative to its neighbors, in the same place in the
arrangement. Nothing enlarged to fill space or shrunk, no floating piece moved over the content it used to frame, no
image or effect lost. Colors and type are expected to change; sizes, proportions and overlaps are not. Report any
break as a blocker naming the element.

## Purpose (score: hierarchy)
Say in one line what the screen is for. Its main action is the most prominent thing (one purple pill), its key
information is easy to find and scan, and the restyle did not bury, flatten or reorder anything.

## One system (score: coherence)
Every section uses the same few parts: the same pills and keys, fields, lilac wells, Shadow/S panels, pill controls, 12px panel corners,
spacing rhythm and type scale. Nothing left from the old look: an old accent color or font, black text, a dark panel,
square main actions, heavy shadows, gray smudges where an old shadow or fade was converted.

## Reads as Inkbox (score: brand_voice)
Compared side by side with the reference, does it look like the same product? White pages and a lilac rail or wells;
deep purple ink and muted purple secondary text; Inter at 14px with 20px regular titles; a purple pill for the main
action; 40px fields with the lilac-gray edge; tables as a lilac head, a white Shadow/S body and a lilac foot; filled
glyphs; the pink accent used sparingly. Too little reads as a generic white page (5 at most). Too much is as wrong
(5 at most): purple everywhere, pink as a main color, gradients, bold titles, octopus art on every screen.

## Common UX errors (score: detail_quality)
Flag each as a blocker or major:
- Text touching an edge or a card border; content without its 16px gutter on phones.
- Titles too big for a phone; body text under 13px.
- Spacing that collapsed or ballooned; uneven padding; misaligned columns; clipped or overlapping elements;
  horizontal scroll.
- A table that does not scroll inside its panel on a phone.
- Lines of body text wider than about 75 characters.

## Interaction review

Verify with a running page as well as screenshots. Rare celebrations may be expressive; frequent hover/list actions
use only subtle styling; keyboard shortcuts, command toggles and 100+ daily actions are instant. Hold a pointer down
and verify feedback before release. Compare dimensions, font weight and padding across states. Equivalent components
must use the same interaction treatment and size variant. Audit debounce/timeout/transition waits and tap delay;
remove nonessential input latency. Reduced motion must disable animations. Static screenshots cannot prove timing.

## Accessibility (score: accessibility)
Primary copy at least 4.5:1 (the ink and the action purple pass); the muted purples are allowed only for secondary
information. Touch targets at least 44px on phones. Visible focus. States not told apart by color alone.
