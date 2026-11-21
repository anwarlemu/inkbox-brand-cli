---
name: scroll-area
title: Scroll Area
type: ui
surface: site
description: "A region that scrolls inside the page with a thin lilac-gray bar."
use_for: "Use for a panel with its own scroll (the email list, the event catalog, a long menu) inside a fixed-height layout. Give it a height (h-80, flex-1 in a column). Add a horizontal ScrollBar for wide content. Its edges fade on both axes when there is more past them (fade-xy; pass fade='y' or fade='x' for one axis), so no row is cut off."
never: [Nested scroll areas in the same direction, Hiding the bar entirely on desktop, A dark thumb]
source: "Extrapolated from the Inkbox console (Figma 427:2715): the inbox and event lists, the field edge color for the thumb"
---
