"use client";

import * as React from "react";
import { Toggle as TogglePrimitive } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Extrapolated from the console's soft key (Tunnel quickstart) and its segmented choice (Where does this agent run?):
// a 38px key with 8px corners, 8px of side padding and a 14px medium ink label beside a 20px glyph. Off it is bare and
// washes lilac under the pointer; on it holds the lilac. `outline` adds the field edge and turns white with the Shadow/S
// ring when on. In a ToggleGroup the default variant becomes the segmented track (see toggle-group). Pressing scales
// it to 97 percent; the state change itself is a color change only.
const toggleVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-control font-sans text-body leading-tight font-medium whitespace-nowrap text-fg outline-none select-none transition-[background-color,box-shadow,color,scale] duration-150 ease-out active:scale-97 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring disabled:pointer-events-none disabled:opacity-50 aria-invalid:text-danger motion-reduce:transition-none motion-reduce:active:scale-100 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5.5",
  {
    variants: {
      variant: {
        default: "bg-transparent hover:bg-subtle data-[state=on]:bg-subtle data-[state=on]:text-fg-brand",
        outline: "border border-line-field bg-surface hover:bg-subtle data-[state=on]:border-transparent data-[state=on]:bg-surface data-[state=on]:text-fg-brand data-[state=on]:shadow-s",
      },
      size: {
        default: "h-9.5 min-w-9.5 px-2",
        sm: "h-8 min-w-8 px-1.5 text-body-sm [&_svg:not([class*='size-'])]:size-4",
        lg: "h-10.5 min-w-10.5 px-3",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Toggle({ className, variant, size, ...props }: React.ComponentProps<typeof TogglePrimitive.Root> & VariantProps<typeof toggleVariants>) {
  return <TogglePrimitive.Root data-slot="toggle" className={cn(toggleVariants({ variant, size, className }))} {...props} />;
}

export { Toggle, toggleVariants };
