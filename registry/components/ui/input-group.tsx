"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// The console's field with things inside it (Figma 427:2715, Create Agent Identity): the field's 40px, 8px corners and
// lilac-gray edge around a borderless control, with addons at either end: a muted glyph or text, the trailing state
// glyph of the handle check (a spinner while checking, a green check-circle when free, a red x-circle when taken), or a
// `segment`, the lilac suffix with a divider ("@inboxmail.com" in the Email card). Focus, invalid and read-only states
// belong to the whole group. Addons can also sit above or below a textarea (block-start, block-end).
function InputGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-group"
      role="group"
      className={cn(
        "group/input-group relative flex h-10 w-full min-w-0 items-center overflow-hidden rounded-control border border-line-field bg-surface transition-[border-color,box-shadow] duration-150 ease-out motion-reduce:transition-none",
        "has-[[data-slot=input-group-control]:focus-visible]:border-line-brand has-[[data-slot=input-group-control]:focus-visible]:shadow-focus",
        "has-[[data-slot][aria-invalid=true]]:border-danger has-[[data-slot][aria-invalid=true]]:shadow-none",
        "has-[[data-slot=input-group-control]:read-only]:border-line-field/50 has-[[data-slot=input-group-control]:read-only]:bg-subtle has-[[data-slot=input-group-control]:disabled]:border-line-field/50 has-[[data-slot=input-group-control]:disabled]:bg-subtle has-[[data-slot=input-group-control]:disabled]:opacity-70",
        "has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>textarea]:h-auto",
        "has-[>[data-align=inline-start]]:[&>input]:pl-2 has-[>[data-align=inline-end]]:[&>input]:pr-2 has-[>[data-align=block-start]]:[&>textarea]:pt-1 has-[>[data-align=block-end]]:[&>textarea]:pb-1",
        className,
      )}
      {...props}
    />
  );
}

const inputGroupAddonVariants = cva(
  "flex h-auto shrink-0 cursor-text items-center justify-center gap-2 font-sans text-body leading-tight text-fg-muted select-none group-has-[[data-slot=input-group-control]:disabled]/input-group:cursor-not-allowed [&>kbd]:rounded-xs [&>svg:not([class*='size-'])]:size-5",
  {
    variants: {
      align: {
        "inline-start": "order-first pl-3.5 has-[>button]:pl-1",
        "inline-end": "order-last pr-3 has-[>button]:pr-1",
        "block-start": "order-first w-full justify-start px-3.5 pt-2.5",
        "block-end": "order-last w-full justify-start px-3.5 pb-2.5",
      },
      variant: {
        plain: "",
        segment: "self-stretch border-line-field bg-subtle px-3.5 group-has-[[data-slot=input-group-control]:read-only]/input-group:border-line-field/50 group-has-[[data-slot=input-group-control]:disabled]/input-group:border-line-field/50",
      },
    },
    compoundVariants: [
      { variant: "segment", align: "inline-end", className: "border-l pr-3.5" },
      { variant: "segment", align: "inline-start", className: "border-r pl-3.5" },
    ],
    defaultVariants: { align: "inline-start", variant: "plain" },
  },
);

function InputGroupAddon({ className, align = "inline-start", variant = "plain", ...props }: React.ComponentProps<"div"> & VariantProps<typeof inputGroupAddonVariants>) {
  return (
    <div
      role="group"
      data-slot="input-group-addon"
      data-align={align}
      data-variant={variant}
      className={cn(inputGroupAddonVariants({ align, variant }), className)}
      onClick={(e) => {
        // A click on the addon (not on a button in it) focuses the control, as a click inside a field would.
        if ((e.target as HTMLElement).closest("button")) return;
        e.currentTarget.parentElement?.querySelector<HTMLElement>("input, textarea")?.focus();
      }}
      {...props}
    />
  );
}

const inputGroupButtonVariants = cva("shadow-none", {
  variants: {
    size: {
      xs: "h-7 gap-1 rounded-sm px-2 text-body-sm [&>svg:not([class*='size-'])]:size-4",
      sm: "h-8 gap-1.5 rounded-control px-2.5",
      "icon-xs": "size-7 rounded-sm p-0 [&>svg:not([class*='size-'])]:size-4",
      "icon-sm": "size-8 rounded-control p-0",
    },
  },
  defaultVariants: { size: "xs" },
});

function InputGroupButton({ className, type = "button", variant = "ghost", size = "xs", ...props }: Omit<React.ComponentProps<typeof Button>, "size"> & VariantProps<typeof inputGroupButtonVariants>) {
  return <Button type={type} data-size={size} variant={variant} className={cn(inputGroupButtonVariants({ size }), className)} {...props} />;
}

function InputGroupText({ className, ...props }: React.ComponentProps<"span">) {
  return <span className={cn("flex items-center gap-2 font-sans text-body leading-tight text-fg-muted [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-5", className)} {...props} />;
}

function InputGroupInput({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      data-slot="input-group-control"
      className={cn(
        "h-full min-w-0 flex-1 bg-transparent px-3.5 font-sans text-body leading-tight text-fg outline-none placeholder:text-fg-subtle selection:bg-ring-tint read-only:text-fg-muted disabled:cursor-not-allowed disabled:text-fg-muted",
        className,
      )}
      {...props}
    />
  );
}

function InputGroupTextarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="input-group-control"
      className={cn(
        "field-sizing-content flex min-h-16 w-full min-w-0 flex-1 resize-none bg-transparent px-3.5 py-2.5 font-sans text-body leading-5 text-fg outline-none placeholder:text-fg-subtle selection:bg-ring-tint read-only:text-fg-muted disabled:cursor-not-allowed disabled:text-fg-muted",
        className,
      )}
      {...props}
    />
  );
}

export { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText, InputGroupTextarea };
