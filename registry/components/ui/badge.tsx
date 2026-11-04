"use client";

import * as React from "react";
import { chakra } from "@chakra-ui/react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// The console's badges (the Badge theme): a 28px pill with 12px sides, a 12px medium label on a 1 line, no caps, a light
// fill under dark ink. green is success, red the pink with the strong red, blue the tag blue with the info ink, purple
// the tag purple with the deep purple, gray the lilac hover, yellow the warning sand. `count` is the rail's small red
// number (16px tall, at least 22px wide, 8px corners, white on the red). `pink` is the 22px plan mark (BETA, ADMIN) with a
// pink edge, `success` the white Included pill with a green edge. Size `well` makes the tunnel's 38px status wells;
// sm and lg remain for dense tags and the Included pill.
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-pill border border-transparent font-sans font-medium whitespace-nowrap normal-case transition-[background-color,color] duration-fast ease-out focus-visible:shadow-focus focus-visible:outline-none motion-reduce:transition-none [&>svg]:pointer-events-none [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-on-primary [a&]:hover:bg-primary-hover",
        secondary: "bg-subtle text-fg [a&]:hover:bg-subtle-hover",
        destructive: "bg-danger text-white",
        outline: "border-line-field bg-surface text-fg [a&]:hover:bg-subtle",
        ghost: "text-fg-secondary [a&]:hover:bg-subtle",
        link: "text-fg-brand underline-offset-4 [a&]:hover:underline",
        pink: "rounded-pill border-pink bg-surface text-pink",
        success: "rounded-pill border-success bg-surface text-success",
        green: "bg-success-bg text-success",
        red: "bg-pink text-danger-strong",
        blue: "bg-tag-blue text-info-fg",
        purple: "bg-tag-purple text-primary-hover",
        gray: "bg-subtle-hover text-fg",
        yellow: "bg-warning-bg text-warning-fg",
        count: "rounded-sm bg-danger text-white",
      },
      size: {
        sm: "h-4.5 px-1 text-micro leading-tight [&>svg]:size-3.5",
        default: "h-7 px-3 text-caption leading-none [&>svg]:size-4",
        lg: "h-7 gap-1.5 pr-2.5 pl-1 text-body leading-tight [&>svg]:size-5.5",
        well: "h-9.5 rounded-pill px-3.5 text-body leading-tight font-normal text-fg [&>svg]:size-5.5",
      },
    },
    compoundVariants: [
      { variant: "pink", size: "default", className: "h-5.5 px-1.5" },
      { variant: "count", size: "default", className: "h-4 min-w-5.5 px-1.5 text-micro tabular-nums" },
    ],
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Badge({ className, variant, size, asChild = false, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? chakra.span : "span";
  // Chakra's factory renders its child in its place only when told to.
  const slotProps = asChild ? { asChild: true } : {};
  return <Comp {...slotProps} data-slot="badge" data-variant={variant ?? "default"} className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}

export { Badge, badgeVariants };
