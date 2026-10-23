import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// A message bubble in an agent conversation, in the console's colors (Figma 427:2715, iMessage and the inbox): an
// incoming message on the lilac with ink text, an outgoing one in the action purple with white text. 14px text on a 21px
// line, 14px by 10px of padding, 16px corners with the tail corner (bottom left for incoming, bottom right for outgoing)
// cut to 4px. In a BubbleGroup only the last bubble keeps the tail. Bubbles never animate in: a conversation is read
// all day.
function BubbleGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="bubble-group" className={cn("flex min-w-0 flex-col gap-1 [&>[data-slot=bubble]:not(:last-child)>[data-slot=bubble-content]]:rounded-dialog", className)} {...props} />;
}

const bubbleVariants = cva(
  "group/bubble relative flex w-fit max-w-[80%] min-w-0 flex-col gap-1 group-data-[align=end]/message:self-end data-[align=end]:self-end data-[align=start]:*:data-[slot=bubble-content]:rounded-bl-xs data-[align=end]:*:data-[slot=bubble-content]:rounded-br-xs data-[variant=ghost]:max-w-full",
  {
    variants: {
      variant: {
        // Outgoing: the purple, as the main action.
        default: "*:data-[slot=bubble-content]:bg-primary *:data-[slot=bubble-content]:text-on-primary [&>[data-slot=bubble-content]:is(button,a):hover]:bg-primary-hover",
        // Incoming: the lilac.
        secondary: "*:data-[slot=bubble-content]:bg-subtle *:data-[slot=bubble-content]:text-fg [&>[data-slot=bubble-content]:is(button,a):hover]:bg-subtle-hover",
        // A system or quoted message: the cool gray of a neutral tag.
        muted: "*:data-[slot=bubble-content]:bg-tag-gray *:data-[slot=bubble-content]:text-fg-secondary [&>[data-slot=bubble-content]:is(button,a):hover]:bg-subtle-hover",
        // Another agent (Agent2Agent): the pale purple of a Signed tag.
        tinted: "*:data-[slot=bubble-content]:bg-tag-purple *:data-[slot=bubble-content]:text-fg [&>[data-slot=bubble-content]:is(button,a):hover]:bg-subtle-hover",
        outline: "*:data-[slot=bubble-content]:border-line-field *:data-[slot=bubble-content]:bg-surface *:data-[slot=bubble-content]:text-fg [&>[data-slot=bubble-content]:is(button,a):hover]:bg-subtle",
        ghost: "*:data-[slot=bubble-content]:rounded-none *:data-[slot=bubble-content]:bg-transparent *:data-[slot=bubble-content]:p-0 *:data-[slot=bubble-content]:text-fg",
        // A message that failed to send.
        destructive: "*:data-[slot=bubble-content]:border-danger *:data-[slot=bubble-content]:bg-surface *:data-[slot=bubble-content]:text-danger [&>[data-slot=bubble-content]:is(button,a):hover]:bg-subtle",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Bubble({ variant = "default", align = "start", className, ...props }: React.ComponentProps<"div"> & VariantProps<typeof bubbleVariants> & { align?: "start" | "end" }) {
  return <div data-slot="bubble" data-variant={variant} data-align={align} className={cn(bubbleVariants({ variant }), className)} {...props} />;
}

function BubbleContent({ asChild = false, className, ...props }: React.ComponentProps<"div"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "div";
  return (
    <Comp
      data-slot="bubble-content"
      className={cn(
        "w-fit max-w-full min-w-0 overflow-hidden rounded-dialog border border-transparent px-3.5 py-2.5 font-sans text-body leading-body break-words group-data-[align=end]/bubble:self-end [button]:cursor-pointer [button]:text-left [button,a]:outline-none [button,a]:transition-colors [button,a]:duration-150 [button,a]:ease-out [button,a]:focus-visible:outline-2 [button,a]:focus-visible:outline-offset-2 [button,a]:focus-visible:outline-focus-ring motion-reduce:transition-none",
        className,
      )}
      {...props}
    />
  );
}

const bubbleReactionsVariants = cva(
  "absolute z-10 flex w-fit shrink-0 items-center justify-center gap-1 rounded-pill bg-surface px-1.5 py-0.5 text-body-sm leading-tight text-fg shadow-s has-[button]:p-0",
  {
    variants: {
      side: { top: "top-0 -translate-y-3/4", bottom: "bottom-0 translate-y-3/4" },
      align: { start: "left-3", end: "right-3" },
    },
    defaultVariants: { side: "bottom", align: "end" },
  },
);

/** Reactions pinned to a bubble's edge: a white pill with Shadow/S. */
function BubbleReactions({ side = "bottom", align = "end", className, ...props }: React.ComponentProps<"div"> & { align?: "start" | "end"; side?: "top" | "bottom" }) {
  return <div data-slot="bubble-reactions" data-align={align} data-side={side} className={cn(bubbleReactionsVariants({ side, align }), className)} {...props} />;
}

export { Bubble, BubbleContent, BubbleGroup, BubbleReactions, bubbleVariants };
