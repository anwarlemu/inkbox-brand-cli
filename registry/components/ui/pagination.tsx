import * as React from "react";
import { CaretLeftIcon, CaretRightIcon, DotsThreeIcon } from "@phosphor-icons/react/ssr";

import { cn } from "@/lib/utils";

// The console's pagination (Figma 427:2715, under the Email and iMessage tables): 14px muted "Previous" and "Next" with
// 16px carets, the page numbers in 14px ink, and the current page a 40 by 30 white key with 8px corners and Shadow/S.
// `bar` sets it in the 42px lilac bar with 10px corners that sits 8px under a table, the pages at its right end.
function Pagination({ className, bar = false, ...props }: React.ComponentProps<"nav"> & { bar?: boolean }) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      data-slot="pagination"
      data-bar={bar || undefined}
      className={cn("flex w-full justify-center", bar && "min-h-10.5 items-center justify-end rounded-panel bg-subtle px-2 py-1.5", className)}
      {...props}
    />
  );
}

function PaginationContent({ className, ...props }: React.ComponentProps<"ul">) {
  return <ul data-slot="pagination-content" className={cn("flex flex-row flex-wrap items-center gap-1", className)} {...props} />;
}

function PaginationItem(props: React.ComponentProps<"li">) {
  return <li data-slot="pagination-item" {...props} />;
}

type PaginationLinkProps = { isActive?: boolean; size?: "icon" | "default" } & React.ComponentProps<"a">;

const LINK =
  "inline-flex h-7.5 shrink-0 items-center justify-center gap-1 rounded-control font-sans text-body leading-tight whitespace-nowrap outline-none transition-[background-color,color,box-shadow,scale] duration-150 ease-out active:scale-97 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring aria-disabled:pointer-events-none aria-disabled:opacity-50 motion-reduce:transition-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";

function PaginationLink({ className, isActive, size = "icon", ...props }: PaginationLinkProps) {
  return (
    <a
      aria-current={isActive ? "page" : undefined}
      data-slot="pagination-link"
      data-active={isActive || undefined}
      className={cn(
        LINK,
        size === "icon" ? "min-w-10 px-2" : "px-2.5",
        isActive ? "bg-surface text-fg shadow-s" : "text-fg hover:bg-subtle-hover in-data-[bar=true]:hover:bg-surface/70",
        className,
      )}
      {...props}
    />
  );
}

function PaginationPrevious({ className, children = "Previous", ...props }: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink aria-label="Go to previous page" size="default" className={cn("text-fg-muted hover:text-fg", className)} {...props}>
      <CaretLeftIcon aria-hidden />
      <span>{children}</span>
    </PaginationLink>
  );
}

function PaginationNext({ className, children = "Next", ...props }: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink aria-label="Go to next page" size="default" className={cn("text-fg-muted hover:text-fg", className)} {...props}>
      <span>{children}</span>
      <CaretRightIcon aria-hidden />
    </PaginationLink>
  );
}

function PaginationEllipsis({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span aria-hidden data-slot="pagination-ellipsis" className={cn("flex h-7.5 min-w-8 items-center justify-center text-fg-muted", className)} {...props}>
      <DotsThreeIcon weight="bold" className="size-4" />
      <span className="sr-only">More pages</span>
    </span>
  );
}

export { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious };
