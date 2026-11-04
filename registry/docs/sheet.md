---
name: sheet
title: Sheet
type: ui
surface: site
description: "A white panel that slides from an edge over the blurred, ink-tinted page, with the dialog's title and 36px close key."
use_for: "Use for a task beside the page that keeps its context, such as editing a mailbox or reading a call's details. Use side=\"right\" by default and side=\"left\" for the rail on phones. Put the title in SheetHeader and the one action in SheetFooter as a full-width secondary Button; the close key and Escape dismiss it."
never: [A sheet that opens another sheet, A dark scrim, A sheet for a short confirmation (use Alert Dialog)]
source: "The Inkbox console's Chakra modal and drawer themes and its close key (src/theme/index.ts, src/components/ui/chakra-controls.tsx)"
---
