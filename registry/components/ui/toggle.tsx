"use client";

import * as React from "react";
import { Toggle as TogglePrimitive } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Extrapolated from the console's soft key (Tunnel quickstart) and its segmented choice (Where does this agent run?):
// a 40px pill with 12px sides and a 14px medium ink label beside a 20px glyph. Off it is bare and washes lilac under the
// pointer; on it holds the lilac. `outline` adds the field edge and turns white with the Shadow/S ring when on. In a
// ToggleGroup the default variant becomes the segmented track (see toggle-group). Like every key it darkens with an
// inset wash while pressed, at once, and shows the soft ring on keyboard focus.
const toggleVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-pill font-sans text-body leading-tight font-medium whitespace-nowrap text-fg outline-none select-none transition-[background-color,box-shadow,color] duration-fast ease-out active:shadow-[inset_0_0_0_9996px_var(--ds-color-wash-pressed)] active:transition-none focus-visible:shadow-focus disabled:pointer-events-none disabled:opacity-50 aria-invalid:text-danger motion-reduce:transition-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5.5",
  {
    variants: {
      variant: {
        default: "bg-transparent hover:bg-subtle data-[state=on]:bg-subtle data-[state=on]:text-fg-brand",
        outline: "border border-line-field bg-surface hover:bg-subtle data-[state=on]:border-transparent data-[state=on]:bg-surface data-[state=on]:text-fg-brand data-[state=on]:shadow-s data-[state=on]:focus-visible:shadow-[var(--ds-shadow-s),var(--ds-shadow-focus)] data-[state=on]:active:shadow-[inset_0_0_0_9996px_var(--ds-color-wash-pressed),var(--ds-shadow-s)]",
      },
      size: {
        default: "h-10 min-w-10 px-3",
        sm: "h-8 min-w-8 px-2 text-body-sm [&_svg:not([class*='size-'])]:size-4.5",
        lg: "h-11 min-w-11 px-4",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Toggle({ className, variant, size, ...props }: React.ComponentProps<typeof TogglePrimitive.Root> & VariantProps<typeof toggleVariants>) {
  return <TogglePrimitive.Root data-slot="toggle" className={cn(toggleVariants({ variant, size, className }))} {...props} />;
}

export { Toggle, toggleVariants };
