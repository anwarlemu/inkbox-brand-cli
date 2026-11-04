"use client";

import * as React from "react";
import { Dialog as ChakraDialog, Portal } from "@chakra-ui/react";
import { XIcon } from "@phosphor-icons/react/ssr";

import { usePortalContainer } from "@/lib/surface";
import { cn } from "@/lib/utils";

// The console's dialog (its BaseModal): a white panel with 16px corners and no shadow on the page behind it, which
// takes the ink at 32 percent over a light blur. The head (20px above and below, 24px sides, 56px clear on the right)
// holds the 20px regular title; the close key is a 36px squircle 16px from the top and right corners, a bold 20px X in
// the faint purple that takes the lilac and the muted purple under the pointer. The body keeps the 24px sides with 24px
// below it; a footer has 16px above and below and 8px between its keys. The panel is at most the page less 32px each
// way and its body scrolls; below 768px it fills the screen with square corners, inside the safe area, with 16px sides.
// It stays centered and opens from 96 percent with a fade (120ms, the strong ease-out) and closes to 97 percent faster
// (100ms); the scrim fades in and out over 100ms.
type DialogProps = Omit<React.ComponentProps<typeof ChakraDialog.Root>, "onOpenChange"> & { onOpenChange?: (open: boolean) => void };
function Dialog({ onOpenChange, ...props }: DialogProps) {
  return <ChakraDialog.Root unstyled data-slot="dialog" onOpenChange={(details) => onOpenChange?.(details.open)} {...props} />;
}

function DialogTrigger(props: React.ComponentProps<typeof ChakraDialog.Trigger>) {
  return <ChakraDialog.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal(props: React.ComponentProps<typeof Portal>) {
  const container = usePortalContainer();
  const portalRef = React.useMemo(() => container ? { current: container } : undefined, [container]);
  return <Portal data-slot="dialog-portal" container={portalRef} {...props} />;
}

function DialogClose(props: React.ComponentProps<typeof ChakraDialog.CloseTrigger>) {
  return <ChakraDialog.CloseTrigger unstyled data-slot="dialog-close" {...props} />;
}

function DialogOverlay({ className, ...props }: React.ComponentProps<typeof ChakraDialog.Backdrop>) {
  return (
    <ChakraDialog.Backdrop unstyled
      data-slot="dialog-overlay"
      className={cn("fixed inset-0 z-50 bg-scrim backdrop-blur-[var(--ds-blur-scrim)] data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in", className)}
      {...props}
    />
  );
}

function DialogContent({ className, children, showClose = true, ...props }: React.ComponentProps<typeof ChakraDialog.Content> & { showClose?: boolean }) {
  return (
    <DialogPortal>
      <DialogOverlay />
      {/* The centering layer: Chakra's unstyled positioner brings no layout of its own. */}
      <ChakraDialog.Positioner className="fixed inset-0 z-50 flex items-center justify-center">
      <ChakraDialog.Content
        unstyled
        data-slot="dialog-content"
        className={cn(
          "relative z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-133.5 flex-col overflow-hidden rounded-panel bg-surface text-fg outline-none data-[state=closed]:animate-dialog-out data-[state=open]:animate-dialog-in max-md:h-dvh max-md:max-h-dvh max-md:w-full max-md:max-w-none max-md:rounded-none max-md:pt-[env(safe-area-inset-top,0px)] max-md:pb-[env(safe-area-inset-bottom,0px)] max-md:ps-[env(safe-area-inset-left,0px)] max-md:pe-[env(safe-area-inset-right,0px)]",
          className,
        )}
        {...props}
      >
        {children}
        {showClose && (
          <ChakraDialog.CloseTrigger unstyled
            data-slot="dialog-close"
            className="absolute top-4 right-4 inline-flex size-9 items-center justify-center rounded-control text-fg-faint outline-none transition-colors duration-fast ease-out hover:bg-subtle hover:text-fg-muted active:bg-subtle-hover active:text-fg-muted active:transition-none focus-visible:shadow-focus motion-reduce:transition-none max-md:top-[calc(env(safe-area-inset-top,0px)+16px)] max-md:right-[calc(env(safe-area-inset-right,0px)+8px)]"
          >
            <XIcon className="size-5" weight="bold" />
            <span className="sr-only">Close</span>
          </ChakraDialog.CloseTrigger>
        )}
      </ChakraDialog.Content>
      </ChakraDialog.Positioner>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="dialog-header" className={cn("flex shrink-0 flex-col justify-center gap-1 py-5 pr-14 pl-6 max-md:pl-4", className)} {...props} />;
}

/** The scrolling middle of a dialog, with the head's 24px sides (16px on phones). */
function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="dialog-body" className={cn("min-h-0 flex-1 content-start overflow-y-auto px-6 pt-0 pb-6 max-md:px-4", className)} {...props} />;
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="dialog-footer" className={cn("flex shrink-0 flex-col-reverse gap-2 px-6 py-4 sm:flex-row sm:justify-end max-md:px-4", className)} {...props} />;
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof ChakraDialog.Title>) {
  return <ChakraDialog.Title unstyled data-slot="dialog-title" className={cn("font-sans text-h3 leading-heading font-normal text-fg", className)} {...props} />;
}

function DialogDescription({ className, ...props }: React.ComponentProps<typeof ChakraDialog.Description>) {
  return <ChakraDialog.Description unstyled data-slot="dialog-description" className={cn("text-body leading-body text-fg-secondary", className)} {...props} />;
}

export { Dialog, DialogBody, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogOverlay, DialogPortal, DialogTitle, DialogTrigger };
