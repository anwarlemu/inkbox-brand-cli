---
name: popover
title: Popover
type: ui
surface: site
description: "A white panel with no edge, 16px corners and the floating shadow that grows out of the control that opened it."
use_for: "Use for a small form or detail tied to one control (rename a mailbox, set a phone line's state). Put a PopoverHeader with a PopoverTitle and PopoverDescription first, then the fields. For choosing one value from a list use Select or Combobox; for actions use Dropdown Menu."
never: [A popover that opens on hover (use Hover Card), A dark or lilac popover panel, Scaling from the center instead of the trigger, Long forms that scroll inside a popover]
source: "The Inkbox console's Chakra popover theme and its popup motion (src/theme/index.ts, src/theme/motion.ts)"
---
