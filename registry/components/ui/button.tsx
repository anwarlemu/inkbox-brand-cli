"use client";

import * as React from "react";
import { Button as ChakraButton } from "@chakra-ui/react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// The console's keys (its Chakra theme and Figma 427:2715). The main action is a 40px purple pill with a 14px regular
// white label 20px in from each side and its glyph 8px away (Create Agent, Log in); a Create or Add key with a Plus takes
// a bold 16px Plus and a medium label. `secondary` and `soft` are the same pill in lilac with ink text (soft keeps 12px
// sides). `outline` is the 36px white key with the field edge and a medium purple label (Copy as markdown). `ghost` is a
// bare 32px glyph or label in the secondary icon color that turns purple under the pointer or while its menu is open,
// with no wash. Every key but ghost and link darkens with an inset wash while pressed, at once; focus is the soft ring.
// A disabled key keeps full opacity: filled keys turn lilac with muted text and the pointer shows not-allowed. For a
// destructive outline or ghost key pass `text-danger` (ghost: `hover:text-danger-strong`).
const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-pill font-sans text-body leading-tight font-normal whitespace-nowrap outline-none select-none transition-[background-color,color,box-shadow] duration-fast ease-out focus-visible:shadow-focus disabled:cursor-not-allowed disabled:text-fg-muted motion-reduce:transition-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5.5",
  {
    variants: {
      variant: {
        default: "bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-hover active:shadow-[inset_0_0_0_9996px_var(--ds-color-wash-pressed)] active:transition-none disabled:shadow-none disabled:border-transparent disabled:bg-subtle disabled:text-fg-muted",
        secondary: "bg-subtle text-fg hover:bg-subtle-hover active:bg-subtle-hover active:shadow-[inset_0_0_0_9996px_var(--ds-color-wash-pressed)] active:transition-none disabled:shadow-none disabled:border-transparent disabled:bg-subtle disabled:text-fg-muted",
        destructive: "bg-danger text-white hover:bg-danger-strong active:bg-danger-strong active:shadow-[inset_0_0_0_9996px_var(--ds-color-wash-pressed)] active:transition-none disabled:shadow-none disabled:border-transparent disabled:bg-subtle disabled:text-fg-muted",
        outline: "border border-line-field bg-surface font-medium text-fg-brand hover:bg-subtle active:bg-subtle active:shadow-[inset_0_0_0_9996px_var(--ds-color-wash-pressed)] active:transition-none disabled:shadow-none disabled:border-transparent disabled:bg-subtle disabled:text-fg-muted",
        soft: "bg-subtle text-fg hover:bg-subtle-hover active:bg-subtle-hover active:shadow-[inset_0_0_0_9996px_var(--ds-color-wash-pressed)] active:transition-none disabled:shadow-none disabled:border-transparent disabled:bg-subtle disabled:text-fg-muted",
        ghost: "bg-transparent text-icon-secondary hover:text-fg-brand active:text-fg aria-expanded:text-fg-brand data-[state=open]:text-fg-brand",
        link: "h-auto px-0 text-fg-brand underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5",
        sm: "h-9 px-5",
        lg: "h-11 px-6",
        icon: "size-8 px-0",
        "icon-sm": "size-7 px-0 [&_svg:not([class*='size-'])]:size-4.5",
        "icon-lg": "size-10 px-0",
      },
    },
    compoundVariants: [
      { variant: "outline", size: "default", className: "h-9 px-3" },
      { variant: "soft", size: "default", className: "px-3" },
      { variant: "ghost", size: "default", className: "h-8 px-2" },
      { variant: "link", className: "h-auto px-0" },
    ],
    defaultVariants: { variant: "default", size: "default" },
  },
);

type ButtonProps = Omit<React.ComponentProps<typeof ChakraButton>, "variant" | "size"> & VariantProps<typeof buttonVariants> & { asChild?: boolean };

function Button({ className, variant, size, asChild = false, type, ...props }: ButtonProps) {
  return <ChakraButton unstyled asChild={asChild} data-slot="button" data-variant={variant ?? "default"} type={asChild ? type : (type ?? "button")} className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
