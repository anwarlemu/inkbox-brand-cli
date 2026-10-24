import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// The console's cards (Figma 427:2715). `default` is the webhook Trigger and Delivery card: white, a 1px #D2C9DB edge,
// 12px corners, 14px in; a 14px ink title led by a 16px filled glyph and a 14px muted description. `raised` is the white
// panel lifted by Shadow/S (a table's body). `muted` is the dialog's channel card: the lilac with no edge, 12px above and
// below, a 16px medium title (52px tall with a 28px glyph tile). Size sm tightens the insides to 12px.
const cardVariants = cva("group/card flex flex-col gap-3 rounded-control py-3.5 font-sans text-body leading-body text-fg data-[size=sm]:gap-2 data-[size=sm]:py-3", {
  variants: {
    variant: {
      default: "border border-line-field bg-surface",
      raised: "bg-surface shadow-s",
      muted: "bg-subtle py-3",
    },
  },
  defaultVariants: { variant: "default" },
});

function Card({ className, variant, size = "default", ...props }: React.ComponentProps<"div"> & VariantProps<typeof cardVariants> & { size?: "default" | "sm" }) {
  return <div data-slot="card" data-variant={variant ?? "default"} data-size={size} className={cn(cardVariants({ variant }), className)} {...props} />;
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("grid auto-rows-min grid-rows-[auto] has-data-[slot=card-description]:grid-rows-[auto_auto] items-start gap-x-3 gap-y-2.5 px-3.5 group-data-[size=sm]/card:px-3 has-data-[slot=card-action]:grid-cols-[minmax(0,1fr)_auto]", className)}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("flex min-w-0 items-center gap-1.5 text-body leading-body text-fg group-data-[variant=muted]/card:text-body-lg group-data-[variant=muted]/card:font-medium [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4.5", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-description" className={cn("text-body leading-body text-fg-muted", className)} {...props} />;
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-action" className={cn("col-start-2 row-span-full flex self-start justify-self-end", className)} {...props} />;
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-content" className={cn("px-3.5 group-data-[size=sm]/card:px-3", className)} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-footer" className={cn("flex items-center gap-2 px-3.5 group-data-[size=sm]/card:px-3", className)} {...props} />;
}

export { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, cardVariants };
