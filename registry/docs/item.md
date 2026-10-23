---
name: item
title: Item
type: ui
surface: site
description: "A row of content: an email in the inbox, a webhook event, or a rail row, washing lilac when hovered or selected."
use_for: "Use for list rows that open something. An email: ItemHeader (sender, date) over ItemContent (ItemTitle subject, ItemDescription preview). A webhook event: ItemHeader (a sm Badge and an arrow) over the event name and its count. A rail row: size sm with ItemMedia variant=\"icon\" and a filled glyph. Mark the open one with aria-current=\"true\". Separate rows with ItemSeparator."
never: [Bold titles, Gray descriptions in email and event lists (they are purple), A card border around every row in a list]
source: "Figma 427:2715: Agent Workspace - Inbox (email list), Webhooks - Event catalog (event list), the rail"
---
