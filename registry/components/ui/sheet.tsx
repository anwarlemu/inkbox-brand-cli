"use client";

import * as React from "react";
import { Dialog as SheetPrimitive } from "radix-ui";
import { XIcon } from "@phosphor-icons/react/ssr";

import { usePortalContainer } from "@/lib/surface";
import { cn } from "@/lib/utils";

// A panel from the edge of the screen, drawn as the console's dialog (Figma 427:2715: Create Agent Identity): white
// over the blurred, ink-tinted page, a 20px regular title 24px in, a faint 20px close glyph and the same 24px sides. It
// travels its own size from its edge on the drawer curve (300ms in, 200ms out); its inner corner takes the dialog's
// 16px. Side panels are 384px wide (the full width on phones); top and bottom panels take their content's height.
function Sheet(props: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger(props: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose(props: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetPortal(props: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  const container = usePortalContainer();
  return <SheetPrimitive.Portal data-slot="sheet-portal" container={container} {...props} />;
}

function SheetOverlay({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn("fixed inset-0 z-50 bg-scrim backdrop-blur-[var(--ds-blur-scrim)] data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in", className)}
      {...props}
    />
  );
}

const SIDES = {
  right: "inset-y-0 right-0 h-full w-full rounded-l-dialog sm:max-w-96 data-[state=closed]:animate-sheet-out-right data-[state=open]:animate-sheet-in-right",
  left: "inset-y-0 left-0 h-full w-full rounded-r-dialog sm:max-w-96 data-[state=closed]:animate-sheet-out-left data-[state=open]:animate-sheet-in-left",
  top: "inset-x-0 top-0 h-auto max-h-[85dvh] rounded-b-dialog data-[state=closed]:animate-sheet-out-top data-[state=open]:animate-sheet-in-top",
  bottom: "inset-x-0 bottom-0 h-auto max-h-[85dvh] rounded-t-dialog data-[state=closed]:animate-sheet-out-bottom data-[state=open]:animate-sheet-in-bottom",
} as const;

function SheetContent({ className, children, side = "right", showCloseButton = true, ...props }: React.ComponentProps<typeof SheetPrimitive.Content> & { side?: keyof typeof SIDES; showCloseButton?: boolean }) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        data-side={side}
        className={cn("fixed z-50 flex flex-col overflow-y-auto bg-surface text-fg shadow-dialog outline-none", SIDES[side], className)}
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close
            data-slot="sheet-close"
            className="absolute top-5 right-5 inline-flex size-7 items-center justify-center rounded-control text-fg-faint outline-none transition-colors duration-150 ease-out hover:text-fg-muted focus-visible:outline-2 focus-visible:outline-focus-ring motion-reduce:transition-none"
          >
            <XIcon className="size-5.5" />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Content>
    </SheetPortal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sheet-header" className={cn("flex min-h-17 shrink-0 flex-col justify-center gap-1 py-5 pr-14 pl-6", className)} {...props} />;
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sheet-footer" className={cn("mt-auto flex shrink-0 flex-col gap-3 p-6", className)} {...props} />;
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return <SheetPrimitive.Title data-slot="sheet-title" className={cn("font-sans text-h3 leading-heading font-normal text-fg", className)} {...props} />;
}

function SheetDescription({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return <SheetPrimitive.Description data-slot="sheet-description" className={cn("text-body leading-body text-fg-secondary", className)} {...props} />;
}

export { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetOverlay, SheetPortal, SheetTitle, SheetTrigger };
