---
name: dialog
title: Dialog
type: ui
surface: site
description: "A centered white panel with 16px corners over the blurred page under the ink at 32 percent; it fills the screen on phones."
use_for: "Use for a short task that needs the person's full attention (Create Agent Identity) or a result they must read before moving on (the new API key). Put the title in DialogHeader, the content in DialogBody and the one action at the end of the body as a full-width Button with no glyph: variant=\"secondary\" to create or confirm, variant=\"destructive\" to delete. Leave out a Cancel key: the close key and Escape dismiss it."
never: [A dark scrim, A dialog that opens another dialog, A drop shadow under the panel, Scaling from zero, A Cancel key beside the action, A glyph on the action]
source: "The Inkbox console's BaseModal and Chakra modal theme (src/components/modals/base-modal.tsx, src/theme/index.ts); Figma 427:2715 Modal - Create Agent"
---
