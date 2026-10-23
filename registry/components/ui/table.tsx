import * as React from "react";

import { cn } from "@/lib/utils";

// The console's table (Figma 427:2715, Email: Mailboxes; iMessage: Agents and lines). Three separate panels: a 48px
// lilac head with 10px corners and 14px muted labels; 8px below it a white body with 8px corners, the Shadow/S ring
// and its short drop, 64px rows of 14px ink ruled by Line/S Bottom; and a lilac foot 8px below (the pagination bar or
// totals). Cells keep 16px sides. The table scrolls sideways inside its frame on a narrow screen.
function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div data-slot="table-container" className="relative w-full overflow-x-auto px-px pt-px pb-1">
      <table data-slot="table" className={cn("w-full caption-bottom border-separate border-spacing-0 font-sans text-body leading-tight text-fg", className)} {...props} />
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
        "[&>tr>td]:bg-surface [&>tr:not(:last-child)>td]:border-b [&>tr:not(:last-child)>td]:border-b-line-row [&>tr>td:first-child]:border-l [&>tr>td:first-child]:border-l-line-ring [&>tr>td:last-child]:border-r [&>tr>td:last-child]:border-r-line-ring [&>tr:first-child>td]:border-t [&>tr:first-child>td]:border-t-line-ring [&>tr:first-child>td:first-child]:rounded-tl-control [&>tr:first-child>td:last-child]:rounded-tr-control [&>tr:last-child>td]:border-b [&>tr:last-child>td]:border-b-line-ring [&>tr:last-child]:shadow-[0_2px_4px_-1px_var(--ds-color-border-ring)] [&>tr:last-child]:[clip-path:inset(0_-8px_-8px_-8px_round_0_0_8px_8px)] [&>tr:last-child>td:first-child]:rounded-bl-control [&>tr:last-child>td:last-child]:rounded-br-control",
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
      className={cn("transition-colors duration-150 ease-out hover:[&>td]:bg-subtle/60 data-[state=selected]:[&>td]:bg-subtle motion-reduce:transition-none", className)}
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
      className={cn("h-16 px-4 align-middle whitespace-nowrap transition-colors duration-150 ease-out motion-reduce:transition-none [&:has([role=checkbox])]:w-10 [&:has([role=checkbox])]:pr-0", className)}
      {...props}
    />
  );
}

function TableCaption({ className, ...props }: React.ComponentProps<"caption">) {
  return <caption data-slot="table-caption" className={cn("mt-3 text-body-sm leading-body text-fg-muted", className)} {...props} />;
}

export { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow };
