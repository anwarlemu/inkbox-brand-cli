---
name: table
title: Table
type: ui
surface: site
description: "The console's table: a lilac head with muted labels, then a white body outlined by the ring line with 12px corners and 64px rows; or the borderless open list table."
use_for: "Use for rows of records people scan and act on (mailboxes, agents and lines, webhooks). Put labels in TableHeader, rows in TableBody, totals in a TableFooter and Pagination with bar under the table; row actions are ghost icon buttons in the last cell. Pass variant open for a list that sits on its own (a clear head and rows that wash on hover). Keep cells to one line; truncate long values."
never: [Zebra striping, Vertical rules between cells, A dark or purple head row, Bold cell text]
source: "Console src/components/table/PaginatedTable.tsx (TABLE_SX and the open table)"
---
