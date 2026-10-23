---
name: sidebar
title: Sidebar
type: ui
surface: site
description: "The console's rail: 288px of white with a hairline edge, the lockup, 38px rows with filled glyphs, purple group labels and a ruled foot; the lilac second rail for an agent's workspace."
use_for: "Use for an app's main navigation. Wrap the app in SidebarProvider; put the lockup in SidebarHeader, groups of SidebarMenuButton rows (isActive on the current page, a filled Phosphor glyph first) in SidebarContent, and Help, the organization (SidebarMenuBadge with ADMIN) and the account in SidebarFooter; the page goes in SidebarInset. Use variant secondary for a second rail beside it (an agent's workspace), collapsible icon to let it narrow to its glyphs (rows then show their tooltip), and SidebarTrigger or Cmd B to toggle. On phones it opens in a sheet."
never: [A dark or purple rail, Line glyphs in the rows, Bold or purple row labels, A purple pill for the current row, Animating the rail when the keyboard shortcut toggles it]
source: "Figma 427:2715: the rail in Dashboard - empty state and every console screen; the second rail in Agent Workspace - Inbox"
---
