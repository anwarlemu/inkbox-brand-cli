import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

// A row of content (Figma 427:2715): an email in the inbox list (sender and date over the subject and a purple preview),
// a webhook event (a tag and an arrow over the event name and a purple count), a rail row (a 22px filled glyph and a
// 14px label, 38px tall at size sm). `default` is bare and washes lilac under the pointer; a selected item
// (aria-current or data-selected) sits on the lilac with 8px corners. `outline` takes the field edge, `muted` the lilac.
function ItemGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div role="list" data-slot="item-group" className={cn("group/item-group flex flex-col", className)} {...props} />;
}

function ItemSeparator({ className, ...props }: React.ComponentProps<typeof Separator>) {
  return <Separator data-slot="item-separator" orientation="horizontal" className={cn("my-0.5", className)} {...props} />;
}

const itemVariants = cva(
  "group/item flex flex-wrap items-center rounded-control border border-transparent font-sans text-body leading-body text-fg outline-none transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring aria-[current=page]:bg-subtle aria-[current=true]:bg-subtle data-[selected=true]:bg-subtle motion-reduce:transition-none [a]:hover:bg-subtle [button]:hover:bg-subtle",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline: "border-line-field bg-surface",
        muted: "bg-subtle [a]:hover:bg-subtle-hover [button]:hover:bg-subtle-hover",
      },
      size: {
        default: "gap-3 p-3",
        sm: "min-h-9.5 gap-2.5 px-3 py-1.5",
        xs: "gap-2 px-2 py-1",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Item({ className, variant = "default", size = "default", asChild = false, ...props }: React.ComponentProps<"div"> & VariantProps<typeof itemVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "div";
  return <Comp data-slot="item" data-variant={variant} data-size={size} className={cn(itemVariants({ variant, size, className }))} {...props} />;
}

const itemMediaVariants = cva("flex shrink-0 items-center justify-center gap-2 group-has-data-[slot=item-description]/item:self-start [&_svg]:pointer-events-none", {
  variants: {
    variant: {
      default: "bg-transparent",
      icon: "text-icon-default [&_svg:not([class*='size-'])]:size-6",
      image: "size-10 overflow-hidden rounded-control [&_img]:size-full [&_img]:object-cover",
    },
  },
  defaultVariants: { variant: "default" },
});

function ItemMedia({ className, variant = "default", ...props }: React.ComponentProps<"div"> & VariantProps<typeof itemMediaVariants>) {
  return <div data-slot="item-media" data-variant={variant} className={cn(itemMediaVariants({ variant, className }))} {...props} />;
}

function ItemContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="item-content" className={cn("flex min-w-0 flex-1 flex-col gap-1 [&+[data-slot=item-content]]:flex-none", className)} {...props} />;
}

function ItemTitle({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="item-title" className={cn("flex w-fit min-w-0 items-center gap-2 text-body leading-tight text-fg", className)} {...props} />;
}

/** The purple line under a title (a preview, a count), clamped to two lines. */
function ItemDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="item-description" className={cn("line-clamp-2 text-body leading-tight font-normal text-balance text-fg-brand [&>a]:underline [&>a]:underline-offset-4", className)} {...props} />;
}

function ItemActions({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="item-actions" className={cn("flex items-center gap-1", className)} {...props} />;
}

/** The top line of an item: what it is at the left (sender, tag), when or where at the right (date, arrow). */
function ItemHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="item-header" className={cn("flex basis-full items-center justify-between gap-2 text-body leading-tight", className)} {...props} />;
}

function ItemFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="item-footer" className={cn("flex basis-full items-center justify-between gap-2", className)} {...props} />;
}

export { Item, ItemActions, ItemContent, ItemDescription, ItemFooter, ItemGroup, ItemHeader, ItemMedia, ItemSeparator, ItemTitle };
