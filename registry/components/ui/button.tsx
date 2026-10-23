import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// The console's buttons (Figma 427:2715). The main action is a 40px purple pill with a 14px regular white label and a
// 20px glyph 8px from it (Create Agent, Enable iMessage, Log in). `secondary` is the same pill in lilac with ink text
// (Continue with GitHub). `outline` is the 36px white key with 8px corners, the field edge and a medium purple label
// (View as formatted, Copy as markdown). `soft` is the 38px lilac key in a page head (Tunnel quickstart). `ghost` is a
// bare glyph or label that washes on hover (a row's edit pencil). A press scales the button to 97 percent.
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-sans text-body leading-tight outline-none select-none transition-[background-color,color,scale] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring active:scale-97 disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5.5",
  {
    variants: {
      variant: {
        default: "rounded-pill bg-primary px-5 text-on-primary hover:bg-primary-hover",
        secondary: "rounded-pill bg-subtle px-5 text-fg hover:bg-subtle-hover",
        destructive: "rounded-pill bg-danger px-5 text-white hover:bg-danger-strong",
        outline: "rounded-control border border-line-field bg-surface px-2.5 font-medium text-fg-brand hover:bg-subtle",
        soft: "rounded-control bg-subtle px-3 text-fg hover:bg-subtle-hover [&_svg:not([class*='size-'])]:size-6",
        ghost: "rounded-control text-icon-secondary hover:bg-subtle hover:text-fg data-[state=open]:bg-subtle",
        link: "h-auto rounded-xs px-0 text-fg-brand underline-offset-4 hover:underline active:scale-100",
      },
      size: {
        default: "h-10",
        sm: "h-9 [&_svg:not([class*='size-'])]:size-5.5",
        lg: "h-11 px-6",
        icon: "size-8 rounded-control px-0",
        "icon-sm": "size-7 rounded-control px-0 [&_svg:not([class*='size-'])]:size-4.5",
        "icon-lg": "size-10 px-0",
      },
    },
    compoundVariants: [
      { variant: "outline", size: "default", className: "h-9" },
      { variant: "soft", size: "default", className: "h-9.5 gap-2.5" },
      { variant: "ghost", size: "default", className: "h-8 px-2" },
      { variant: "link", size: "default", className: "h-auto" },
    ],
    defaultVariants: { variant: "default", size: "default" },
  },
);

type ButtonProps = React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean };

function Button({ className, variant, size, asChild = false, type, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp data-slot="button" data-variant={variant ?? "default"} type={asChild ? type : (type ?? "button")} className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
