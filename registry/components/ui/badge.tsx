import * as React from "react";
import { chakra } from "@chakra-ui/react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Every badge in the console (Figma 427:2715). `pink` is BETA and ADMIN: a 1px pink edge, fully rounded corners, 12px pink text,
// 22px tall with 6px sides and a 1px top inset to optically center the uppercase label. `success` is the Included pill:
// white with a 1px green edge, a filled check-circle (22px, the design's 20px glyph at Phosphor's proportions) 4px in and a 14px green label, 28px tall. `blue`, `purple` and `gray` are the webhook tags (Email, Signed,
// Fire-and-forget) at size sm: 11px medium on the pale fill, fully rounded corners, 17px tall; `green` is the Blacklist tag.
// At size `well` they become the tunnel's 38px status wells (Active, Idle, Edge): 14px ink, fully rounded corners.
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-pill border border-transparent font-sans whitespace-nowrap transition-[background-color,color] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring motion-reduce:transition-none [&>svg]:pointer-events-none [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-on-primary [a&]:hover:bg-primary-hover",
        secondary: "bg-subtle text-fg [a&]:hover:bg-subtle-hover",
        destructive: "bg-danger text-white",
        outline: "border-line-field bg-surface text-fg [a&]:hover:bg-subtle",
        ghost: "text-fg-secondary [a&]:hover:bg-subtle",
        link: "text-fg-brand underline-offset-4 [a&]:hover:underline",
        pink: "rounded-pill border-pink bg-surface pt-px text-pink",
        success: "rounded-pill border-success bg-surface text-success",
        green: "bg-success-bg text-fg",
        blue: "bg-tag-blue text-tag-blue-fg",
        purple: "bg-tag-purple text-tag-purple-fg",
        gray: "bg-tag-gray text-fg",
      },
      size: {
        sm: "h-4.5 px-1 text-micro leading-tight font-medium [&>svg]:size-3.5",
        default: "h-5.5 px-1.5 text-caption leading-none [&>svg]:size-4",
        lg: "h-7 gap-1.5 pr-2.5 pl-1 text-body leading-tight [&>svg]:size-5.5",
        well: "h-9.5 rounded-pill px-3.5 text-body leading-tight text-fg [&>svg]:size-5.5",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Badge({ className, variant, size, asChild = false, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? chakra.span : "span";
  return <Comp data-slot="badge" data-variant={variant ?? "default"} className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}

export { Badge, badgeVariants };
