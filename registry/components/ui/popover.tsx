"use client";

import * as React from "react";
import { Popover as ChakraPopover, Portal } from "@chakra-ui/react";

import { usePortalContainer } from "@/lib/surface";
import { cn } from "@/lib/utils";

// A popover, extrapolated from the console's raised white panels (Figma 427:2715: the select and the selected tab
// carry Shadow/S): white with 16px corners and the floating shadow (Shadow/S's ring with a softer, longer drop), 16px of
// padding, 14px ink text. It grows out of its trigger from 96 percent with a fade (200ms, the strong ease-out) and
// leaves faster than it came.
type PopoverProps = Omit<React.ComponentProps<typeof ChakraPopover.Root>, "onOpenChange"> & { onOpenChange?: (open: boolean) => void };
function Popover({ onOpenChange, ...props }: PopoverProps) {
  return <ChakraPopover.Root unstyled data-slot="popover" onOpenChange={(details) => onOpenChange?.(details.open)} {...props} />;
}

function PopoverTrigger(props: React.ComponentProps<typeof ChakraPopover.Trigger>) {
  return <ChakraPopover.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverAnchor(props: React.ComponentProps<typeof ChakraPopover.Anchor>) {
  return <ChakraPopover.Anchor data-slot="popover-anchor" {...props} />;
}

type PopoverContentProps = Omit<React.ComponentProps<typeof ChakraPopover.Content>, "positioning"> & { align?: "start" | "center" | "end"; sideOffset?: number; onOpenAutoFocus?: (event: { preventDefault(): void }) => void };
function PopoverContent({ className, align = "center", sideOffset = 6, onOpenAutoFocus: _onOpenAutoFocus, ...props }: PopoverContentProps) {
  const container = usePortalContainer();
  const portalRef = React.useMemo(() => container ? { current: container } : undefined, [container]);
  return (
    <Portal container={portalRef}>
      <ChakraPopover.Positioner>
      <ChakraPopover.Content
        unstyled
        data-slot="popover-content"
        className={cn(
          "z-50 flex w-72 max-w-[calc(100vw-2rem)] origin-(--transform-origin) flex-col gap-3 rounded-panel bg-surface p-4 text-body leading-body text-fg shadow-floating outline-none data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in",
          className,
        )}
        {...props}
      />
      </ChakraPopover.Positioner>
    </Portal>
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
