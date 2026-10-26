# Marker
A 12px muted marker in a conversation or list, alone, between two hairlines, ruled underneath, or as the purple unread line.

Install: npx inkbox-ds add marker
Requires: theme, utils
Packages: @chakra-ui/react, class-variance-authority
Exports: Marker, MarkerContent, MarkerIcon, markerVariants
Client boundary: yes
Reference: Extrapolated from the Inkbox console (Figma 427:2715): the inbox dates (muted) and the rail rules


## Usage
Mark where a day begins (separator, "Yesterday"), where unread messages start (unread), or an event in a thread (default with a MarkerIcon, "Ray joined the conversation"). Use border to head a short list.
- Avoid: Markers larger than 12px
- Avoid: A colored pill around a date
- Avoid: More than one unread line


## Examples
Example components: npx inkbox-ds add marker
Example packages: @phosphor-icons/react
[Preview](https://inkbox-ds.vercel.app/preview/marker/Preview) | [Variants](https://inkbox-ds.vercel.app/preview/marker/Variants)

examples/marker.tsx

```tsx
import { ArrowsLeftRightIcon, UserPlusIcon } from "@phosphor-icons/react/ssr";

import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker";

export function Preview() {
  return (
    <div className="mx-auto grid w-full max-w-120 gap-5">
      <Marker variant="separator">
        <MarkerContent>Yesterday</MarkerContent>
      </Marker>
      <Marker>
        <MarkerIcon>
          <UserPlusIcon weight="fill" />
        </MarkerIcon>
        <MarkerContent>Ray Liao joined the conversation</MarkerContent>
      </Marker>
      <Marker variant="unread">
        <MarkerContent>2 unread</MarkerContent>
      </Marker>
    </div>
  );
}

export function Variants() {
  return (
    <div className="mx-auto grid w-full max-w-120 gap-5">
      <Marker variant="border">
        <MarkerContent>Threads</MarkerContent>
      </Marker>
      <Marker>
        <MarkerIcon>
          <ArrowsLeftRightIcon />
        </MarkerIcon>
        <MarkerContent>
          Delegated to @ops-agent over Agent2Agent. <a href="#session">View session</a>
        </MarkerContent>
      </Marker>
      <Marker variant="separator">
        <MarkerContent>Jul 31</MarkerContent>
      </Marker>
    </div>
  );
}

```

## Source

components/ui/marker.tsx

```tsx
"use client";

import * as React from "react";
import { chakra } from "@chakra-ui/react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// A marker in a conversation or a list: 12px muted text, as the inbox sets its dates (Figma 427:2715). `separator`
// centers it between two hairlines ("Yesterday"), `border` rules it underneath, and `unread` is the purple line where
// unread messages begin.
const markerVariants = cva(
  "group/marker relative flex min-h-4 w-full items-center gap-2 text-left font-sans text-caption leading-tight text-fg-muted [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [a]:underline [a]:underline-offset-4 [a]:hover:text-fg",
  {
    variants: {
      variant: {
        default: "",
        separator: "before:mr-1 before:h-px before:min-w-0 before:flex-1 before:bg-line-subtle after:ml-1 after:h-px after:min-w-0 after:flex-1 after:bg-line-subtle",
        border: "border-b border-line-subtle pb-2",
        unread: "font-medium text-fg-brand before:mr-1 before:h-px before:min-w-0 before:flex-1 before:bg-line-brand after:ml-1 after:h-px after:min-w-0 after:flex-1 after:bg-line-brand",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Marker({ className, variant = "default", asChild = false, ...props }: React.ComponentProps<"div"> & VariantProps<typeof markerVariants> & { asChild?: boolean }) {
  const Comp = asChild ? chakra.div : "div";
  // Chakra's factory renders its child in its place only when told to.
  const slotProps = asChild ? { asChild: true } : {};
  return <Comp {...slotProps} data-slot="marker" data-variant={variant} role={variant === "default" ? undefined : "separator"} className={cn(markerVariants({ variant }), className)} {...props} />;
}

function MarkerIcon({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="marker-icon" aria-hidden="true" className={cn("inline-flex size-4 shrink-0 items-center justify-center [&_svg:not([class*='size-'])]:size-4", className)} {...props} />;
}

function MarkerContent({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="marker-content" className={cn("min-w-0 break-words group-data-[variant=separator]/marker:flex-none group-data-[variant=separator]/marker:text-center group-data-[variant=unread]/marker:flex-none *:[a]:underline *:[a]:underline-offset-4 *:[a]:hover:text-fg", className)} {...props} />;
}

export { Marker, MarkerContent, MarkerIcon, markerVariants };

```
