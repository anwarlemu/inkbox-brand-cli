# Breadcrumb
A trail of 14px muted links ending in the current page in ink, with faint carets between.

Install: npx inkbox-ds add breadcrumb
Requires: theme, utils
Packages: @chakra-ui/react, @phosphor-icons/react
Exports: Breadcrumb, BreadcrumbEllipsis, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator
Client boundary: yes
Reference: Extrapolated from the Inkbox console (Figma 427:2715): page heads, muted text and links


## Usage
Use above a page head when a page sits deep in a hierarchy (Webhooks, then an endpoint, then a delivery). Fold middle levels into BreadcrumbEllipsis when the trail is long; use asChild to render your router's link.
- Avoid: Purple links
- Avoid: Slashes as separators
- Avoid: A breadcrumb on a top-level page


## Examples
Example components: npx inkbox-ds add breadcrumb
Example packages: @phosphor-icons/react
[Preview](https://inkbox-ds.vercel.app/preview/breadcrumb/Preview) | [Collapsed](https://inkbox-ds.vercel.app/preview/breadcrumb/Collapsed) | [CustomSeparator](https://inkbox-ds.vercel.app/preview/breadcrumb/CustomSeparator)

examples/breadcrumb.tsx

```tsx
import { LineVerticalIcon } from "@phosphor-icons/react/ssr";

import { Breadcrumb, BreadcrumbEllipsis, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

export function Preview() {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="#">Webhooks</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href="#">Delivery log</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>message.sent</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export function Collapsed() {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="#">Agent Workspace</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbEllipsis />
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href="#">Tunnel</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>Telemetry</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export function CustomSeparator() {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="#">Vault</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator>
          <LineVerticalIcon className="rotate-12" />
        </BreadcrumbSeparator>
        <BreadcrumbItem>
          <BreadcrumbPage>Login credentials</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

```

## Source

components/ui/breadcrumb.tsx

```tsx
"use client";

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
  // Chakra's factory renders its child in its place only when told to.
  const slotProps = asChild ? { asChild: true } : {};
  return (
    <Comp {...slotProps}
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

```
