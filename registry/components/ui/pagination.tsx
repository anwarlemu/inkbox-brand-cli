import * as React from "react";
import { CaretLeftIcon, CaretRightIcon, DotsThreeIcon } from "@phosphor-icons/react/ssr";

import { cn } from "@/lib/utils";

// The console's pagination (PaginationNavigator). Previous and Next are quiet keys: an 18px caret in a 28px box beside
// a 14px ink label, 6px in on the caret's side and 12px on the label's, 12px corners and a hairline (0.5px) edge kept
// clear until the pointer is over it, when the key fills with the lilac hover and the edge takes the field color
// (100ms, ease-out). A disabled key fades to the subtle purple. The current page is 14px medium in the secondary icon
// purple with no fill; other page numbers are quiet keys like Previous and Next. `bar` sets it under a table: centered
// in a row at least 44px tall.
function Pagination({ className, bar = false, ...props }: React.ComponentProps<"nav"> & { bar?: boolean }) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      data-slot="pagination"
      data-bar={bar || undefined}
      className={cn("flex w-full justify-center", bar && "min-h-11 items-center", className)}
      {...props}
    />
  );
}

function PaginationContent({ className, ...props }: React.ComponentProps<"ul">) {
  return <ul data-slot="pagination-content" className={cn("flex flex-row flex-wrap items-center gap-2", className)} {...props} />;
}

function PaginationItem(props: React.ComponentProps<"li">) {
  return <li data-slot="pagination-item" {...props} />;
}

type PaginationLinkProps = { isActive?: boolean; size?: "icon" | "default" } & React.ComponentProps<"a">;

const KEY =
  "inline-flex shrink-0 items-center justify-center rounded-control border-[0.5px] border-transparent bg-transparent font-sans text-body leading-tight whitespace-nowrap text-fg outline-none transition-[background-color,border-color] duration-fast ease-out hover:border-line-field hover:bg-subtle-hover focus-visible:shadow-focus aria-disabled:pointer-events-none aria-disabled:text-fg-subtle motion-reduce:transition-none [&_svg]:pointer-events-none [&_svg]:shrink-0";

function PaginationLink({ className, isActive, size = "icon", ...props }: PaginationLinkProps) {
  return (
    <a
      aria-current={isActive ? "page" : undefined}
      data-slot="pagination-link"
      data-active={isActive || undefined}
      className={cn(
        KEY,
        "h-9",
        size === "icon" ? "min-w-8 px-2" : "px-3",
        isActive && "pointer-events-none font-medium text-icon-secondary hover:border-transparent hover:bg-transparent",
        className,
      )}
      {...props}
    />
  );
}

/** The caret's 28px box. */
function Arrow({ children }: { children: React.ReactNode }) {
  return <span className="flex size-7 items-center justify-center [&_svg]:size-4.5">{children}</span>;
}

function PaginationPrevious({ className, children = "Previous", isActive: _active, size: _size, ...props }: React.ComponentProps<typeof PaginationLink>) {
  return (
    <a aria-label="Go to previous page" data-slot="pagination-link" className={cn(KEY, "py-0.75 pr-3 pl-1.5", className)} {...props}>
      <Arrow>
        <CaretLeftIcon aria-hidden />
      </Arrow>
      <span>{children}</span>
    </a>
  );
}

function PaginationNext({ className, children = "Next", isActive: _active, size: _size, ...props }: React.ComponentProps<typeof PaginationLink>) {
  return (
    <a aria-label="Go to next page" data-slot="pagination-link" className={cn(KEY, "py-0.75 pr-1.5 pl-3", className)} {...props}>
      <span>{children}</span>
      <Arrow>
        <CaretRightIcon aria-hidden />
      </Arrow>
    </a>
  );
}

function PaginationEllipsis({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span aria-hidden data-slot="pagination-ellipsis" className={cn("flex h-9 min-w-8 items-center justify-center text-fg-muted", className)} {...props}>
      <DotsThreeIcon weight="bold" className="size-4" />
      <span className="sr-only">More pages</span>
    </span>
  );
}

export { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious };
