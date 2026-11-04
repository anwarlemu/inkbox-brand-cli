import * as React from "react";

import { cn } from "@/lib/utils";

// The console's table (PaginatedTable's TABLE_SX). A 48px lilac head with 14px regular muted labels and pill-round
// ends (16px), an 8px gap, then the white body: 64px rows of 14px ink ruled by the row line, outlined by the 1px ring
// line with 12px outer corners and a soft drop under the last row. A row under the pointer or selected fills the lilac
// (the fill eases over 100ms). Cells keep 16px sides; the table scrolls sideways inside its frame on a narrow screen.
// `open` is the console's borderless list table: a 40px clear head over the row line, rows 2px apart with 12px
// corners, filled with 70% of the lilac under the pointer or when selected.
const OPEN =
  "data-[variant=open]:border-spacing-y-0.5 data-[variant=open]:[&>thead]:after:hidden data-[variant=open]:[&>thead>tr>th]:h-10 data-[variant=open]:[&>thead>tr>th]:rounded-none data-[variant=open]:[&>thead>tr>th]:border-b data-[variant=open]:[&>thead>tr>th]:border-line-row data-[variant=open]:[&>thead>tr>th]:bg-transparent data-[variant=open]:[&>tbody>tr>td]:rounded-none data-[variant=open]:[&>tbody>tr>td]:border-0 data-[variant=open]:[&>tbody>tr>td]:bg-transparent data-[variant=open]:[&>tbody>tr>td:first-child]:rounded-l-control data-[variant=open]:[&>tbody>tr>td:last-child]:rounded-r-control data-[variant=open]:[&>tbody>tr:last-child]:shadow-none data-[variant=open]:[&>tbody>tr:last-child]:[clip-path:none] data-[variant=open]:[&>tbody>tr:not([data-empty]):hover>td]:bg-subtle/70 data-[variant=open]:[&>tbody>tr[data-state=selected]>td]:bg-subtle/70";

function Table({ className, variant = "default", ...props }: React.ComponentProps<"table"> & { variant?: "default" | "open" }) {
  return (
    <div data-slot="table-container" className="relative w-full overflow-x-auto px-px pt-px pb-1">
      <table data-slot="table" data-variant={variant} className={cn("w-full caption-bottom border-separate border-spacing-0 font-sans text-body leading-tight text-fg", OPEN, className)} {...props} />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn(
        "after:table-row after:h-2 after:content-[''] [&>tr>th]:bg-subtle [&>tr>th:first-child]:rounded-l-panel [&>tr>th:last-child]:rounded-r-panel",
        className,
      )}
      {...props}
    />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn(
        "[&>tr>td]:bg-surface [&>tr:not(:last-child)>td]:border-b [&>tr:not(:last-child)>td]:border-b-line-row [&>tr>td:first-child]:border-l [&>tr>td:first-child]:border-l-line-ring [&>tr>td:last-child]:border-r [&>tr>td:last-child]:border-r-line-ring [&>tr:first-child>td]:border-t [&>tr:first-child>td]:border-t-line-ring [&>tr:first-child>td:first-child]:rounded-tl-control [&>tr:first-child>td:last-child]:rounded-tr-control [&>tr:last-child>td]:border-b [&>tr:last-child>td]:border-b-line-ring [&>tr:last-child]:shadow-[0_2px_4px_-1px_var(--ds-color-shadow-drop)] [&>tr:last-child]:[clip-path:inset(0_calc(var(--ds-space-2)*-1)_calc(var(--ds-space-2)*-1)_calc(var(--ds-space-2)*-1)_round_0_0_var(--ds-radius-control)_var(--ds-radius-control))] [&>tr:last-child>td:first-child]:rounded-bl-control [&>tr:last-child>td:last-child]:rounded-br-control",
        className,
      )}
      {...props}
    />
  );
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "before:table-row before:h-2 before:content-[''] [&>tr>td]:h-10.5 [&>tr>td]:bg-subtle [&>tr>td]:font-medium [&>tr>td:first-child]:rounded-l-panel [&>tr>td:last-child]:rounded-r-panel [&>tr>th]:bg-subtle",
        className,
      )}
      {...props}
    />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn("[&:not([data-empty]):hover>td]:bg-subtle data-[state=selected]:[&>td]:bg-subtle", className)}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn("h-12 px-4 text-left align-middle text-body leading-tight font-normal whitespace-nowrap text-fg-muted [&:has([role=checkbox])]:w-10 [&:has([role=checkbox])]:pr-0", className)}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn("h-16 px-4 align-middle whitespace-nowrap transition-[background-color] duration-fast ease-out motion-reduce:transition-none [&:has([role=checkbox])]:w-10 [&:has([role=checkbox])]:pr-0", className)}
      {...props}
    />
  );
}

function TableCaption({ className, ...props }: React.ComponentProps<"caption">) {
  return <caption data-slot="table-caption" className={cn("mt-3 text-body-sm leading-body text-fg-muted", className)} {...props} />;
}

export { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow };
