"use client";

import * as React from "react";
import { Popover as PopoverPrimitive } from "radix-ui";

import { usePortalContainer } from "@/lib/surface";
import { cn } from "@/lib/utils";

// A popover, extrapolated from the console's raised white panels (Figma 427:2715: the select and the selected tab
// carry Shadow/S): white with 8px corners and the floating shadow (Shadow/S's ring with a softer, longer drop), 16px of
// padding, 14px ink text. It grows out of its trigger from 96 percent with a fade (200ms, the strong ease-out) and
// leaves faster than it came.
function Popover(props: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverTrigger(props: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverAnchor(props: React.ComponentProps<typeof PopoverPrimitive.Anchor>) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />;
}

function PopoverContent({ className, align = "center", sideOffset = 6, ...props }: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  const container = usePortalContainer();
  return (
    <PopoverPrimitive.Portal container={container}>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 flex w-72 max-w-[calc(100vw-2rem)] origin-(--radix-popover-content-transform-origin) flex-col gap-3 rounded-control bg-surface p-4 text-body leading-body text-fg shadow-floating outline-none data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in",
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}

/** The popover's head: its title over a short muted line. */
function PopoverHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="popover-header" className={cn("flex flex-col gap-0.5", className)} {...props} />;
}

function PopoverTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return <h2 data-slot="popover-title" className={cn("font-sans text-body-lg leading-body font-medium text-fg", className)} {...props} />;
}

function PopoverDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="popover-description" className={cn("text-body leading-body text-fg-muted", className)} {...props} />;
}

export { Popover, PopoverAnchor, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger };
