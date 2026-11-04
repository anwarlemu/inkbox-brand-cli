---
name: sonner
title: Sonner
type: ui
surface: site
description: "Toasts as white floating panels with a filled status glyph, an ink title, a muted description and a purple action."
use_for: "Use to confirm something that happened in the background or will undo (API key copied, agent created, webhook paused). Mount Toaster once near the root and call toast(), toast.success(), toast.error() or toast.promise() from anywhere. Give undoable actions an action button."
never: [A toast for an error that blocks the task (say it in place instead), Colored toast backgrounds, More than one sentence of description]
source: "The Inkbox console's src/components/ui/sonner.tsx (a copy of this one, with its close key, offset and long descriptions)"
---
