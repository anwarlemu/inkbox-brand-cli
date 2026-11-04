---
name: alert-dialog
title: Alert Dialog
type: ui
surface: site
description: "The console's dialog for a question that must be answered: title, a secondary line and two pills."
use_for: "Use before an action that cannot be undone (delete an agent, rotate an API key) or when the person must acknowledge something. Name the action on its button (Delete agent), use variant=\"destructive\" for it, and keep Cancel beside it."
never: [OK and Cancel as labels, A close glyph on an alert dialog, Closing on a click outside, More than two actions]
source: "The Inkbox console's BaseModal and Chakra modal theme (panel, scrim, title, motion) with its pill buttons"
---
