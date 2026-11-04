---
name: sidebar
title: Sidebar
type: ui
surface: site
description: "The console's rail on the lilac: the lockup, 36px pill rows with 18px filled glyphs and medium labels in the secondary purple, purple group labels, a red unread count and a ruled foot; the second rail for an agent's workspace."
use_for: "Use for an app's main navigation. Wrap the app in SidebarProvider; put the lockup in SidebarHeader, groups of SidebarMenuButton rows (isActive on the current page, a filled Phosphor glyph first) in SidebarContent, and Help, the organization (SidebarMenuBadge with ADMIN) and the account in SidebarFooter; an unread number is SidebarMenuBadge variant count. The page goes in SidebarInset, under a page head (a 20px regular title, a muted line, actions at the right, a hairline below). Use variant secondary for a second rail beside it (an agent's workspace), collapsible icon to let it narrow to its glyphs (rows then show their tooltip), and SidebarTrigger or Cmd B to toggle. On phones it opens in a sheet."
never: [A dark or purple rail, Line glyphs in the rows, Bold or purple row labels, A purple pill for the current row, Animating the rail when the keyboard shortcut toggles it]
source: "Console src/components/layout (sidebar-metrics.ts, sidebar-nav-button.tsx, left-menu-panel.tsx, page-head.tsx)"
---
