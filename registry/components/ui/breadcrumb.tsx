import * as React from "react";
import { chakra } from "@chakra-ui/react";
import { CaretRightIcon, DotsThreeIcon } from "@phosphor-icons/react/ssr";

import { cn } from "@/lib/utils";

// A trail of pages (extrapolated from the Inkbox console, Figma 427:2715: its page heads and muted links). 14px muted
// links that darken to ink on hover, the current page in ink, 16px faint carets between them, and three dots for the
// pages folded away.
function Breadcrumb(props: React.ComponentProps<"nav">) {
  return <nav aria-label="breadcrumb" data-slot="breadcrumb" {...props} />;
}

function BreadcrumbList({ className, ...props }: React.ComponentProps<"ol">) {
  return <ol data-slot="breadcrumb-list" className={cn("flex flex-wrap items-center gap-1.5 font-sans text-body leading-tight break-words text-fg-muted", className)} {...props} />;
}

function BreadcrumbItem({ className, ...props }: React.ComponentProps<"li">) {
  return <li data-slot="breadcrumb-item" className={cn("inline-flex items-center gap-1.5", className)} {...props} />;
}

function BreadcrumbLink({ asChild, className, ...props }: React.ComponentProps<"a"> & { asChild?: boolean }) {
  const Comp = asChild ? chakra.a : "a";
  return (
    <Comp
      data-slot="breadcrumb-link"
      className={cn("rounded-xs text-fg-muted outline-none transition-colors duration-150 ease-out hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring motion-reduce:transition-none", className)}
      {...props}
    />
  );
}

function BreadcrumbPage({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="breadcrumb-page" role="link" aria-disabled="true" aria-current="page" className={cn("font-normal text-fg", className)} {...props} />;
}

function BreadcrumbSeparator({ children, className, ...props }: React.ComponentProps<"li">) {
  return (
    <li data-slot="breadcrumb-separator" role="presentation" aria-hidden="true" className={cn("text-fg-faint [&>svg]:size-4", className)} {...props}>
      {children ?? <CaretRightIcon />}
    </li>
  );
}

function BreadcrumbEllipsis({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span data-slot="breadcrumb-ellipsis" role="presentation" aria-hidden="true" className={cn("flex size-7 items-center justify-center", className)} {...props}>
      <DotsThreeIcon weight="bold" className="size-4" />
      <span className="sr-only">More</span>
    </span>
  );
}

export { Breadcrumb, BreadcrumbEllipsis, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator };
