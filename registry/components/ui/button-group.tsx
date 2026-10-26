"use client";

import * as React from "react";
import { chakra } from "@chakra-ui/react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Buttons joined into one control (extrapolated from the Inkbox console, Figma 427:2715: the outline keys of the
// created dialog and the split field of the Email channel card). Inner corners square off and the shared edges merge,
// so outline keys read as one 36px bar with fully rounded outer corners; a field, select or text segment can sit in the bar.
// ButtonGroupText is the lilac segment with muted 14px text (@inboxmail.com); ButtonGroupSeparator is a 1px rule
// between filled buttons.
const buttonGroupVariants = cva(
  "group/button-group flex w-fit items-stretch *:focus-visible:relative *:focus-visible:z-10 has-[>[data-slot=button-group]]:gap-2 has-[>input]:[&>[data-slot=button]]:h-10 has-[>input]:[&>[data-slot=button-group-text]]:h-10 [&>input]:flex-1",
  {
    variants: {
      orientation: {
        horizontal: "[&>*:not(:first-child)]:rounded-l-none [&>*:not(:first-child)]:border-l-0 [&>*:not(:last-child)]:rounded-r-none",
        vertical: "flex-col [&>*:not(:first-child)]:rounded-t-none [&>*:not(:first-child)]:border-t-0 [&>*:not(:last-child)]:rounded-b-none",
      },
    },
    defaultVariants: { orientation: "horizontal" },
  },
);

function ButtonGroup({ className, orientation, ...props }: React.ComponentProps<"div"> & VariantProps<typeof buttonGroupVariants>) {
  return <div role="group" data-slot="button-group" data-orientation={orientation ?? "horizontal"} className={cn(buttonGroupVariants({ orientation }), className)} {...props} />;
}

function ButtonGroupText({ className, asChild = false, ...props }: React.ComponentProps<"div"> & { asChild?: boolean }) {
  const Comp = asChild ? chakra.div : "div";
  // Chakra's factory renders its child in its place only when told to.
  const slotProps = asChild ? { asChild: true } : {};
  return (
    <Comp {...slotProps}
      data-slot="button-group-text"
      className={cn("flex items-center gap-2 rounded-pill border border-line-field bg-subtle px-3.5 font-sans text-body leading-tight whitespace-nowrap text-fg-muted [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-5.5", className)}
      {...props}
    />
  );
}

function ButtonGroupSeparator({ className, orientation = "vertical", ...props }: React.ComponentProps<"div"> & { orientation?: "horizontal" | "vertical" }) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      data-slot="button-group-separator"
      data-orientation={orientation}
      className={cn("relative shrink-0 self-stretch bg-surface/40", orientation === "vertical" ? "w-px" : "h-px", className)}
      {...props}
    />
  );
}

export { ButtonGroup, ButtonGroupSeparator, ButtonGroupText, buttonGroupVariants };
