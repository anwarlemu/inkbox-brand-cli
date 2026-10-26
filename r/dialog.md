# Dialog
A centered white panel with 16px corners over the blurred, ink-tinted page.

Install: npx inkbox-ds add dialog
Requires: theme, surface, utils
Packages: @chakra-ui/react, @phosphor-icons/react
Exports: Dialog, DialogBody, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogOverlay, DialogPortal, DialogTitle, DialogTrigger
Client boundary: yes
Reference: Figma 427:2715: Modal - Create Agent, Modal - Created, modal-bg


## Usage
Use for a short task that needs the person's full attention (Create Agent Identity) or a result they must read before moving on (the new API key). Put the title in DialogHeader, the content in DialogBody and a full-width default Button at the end of the body for the one action.
- Avoid: A dark scrim
- Avoid: A dialog that opens another dialog
- Avoid: A drop shadow under the panel
- Avoid: Scaling from zero


## Examples
Example components: npx inkbox-ds add dialog button input label
[Preview](https://inkbox-ds.vercel.app/preview/dialog/Preview)

examples/dialog.tsx

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function Preview() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Create Agent</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Agent Identity</DialogTitle>
          <DialogDescription className="sr-only">Choose a handle and a display name for the new agent.</DialogDescription>
        </DialogHeader>
        <DialogBody className="grid gap-3">
          <div className="grid gap-1">
            <Label htmlFor="handle">Agent handle</Label>
            <Input id="handle" placeholder="acme-support" />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="display">Agent display name</Label>
            <Input id="display" placeholder="Robert" />
          </div>
          <Button className="mt-3 w-full">Create Agent Identity</Button>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

```

## Source

components/ui/dialog.tsx

```tsx
"use client";

import * as React from "react";
import { Dialog as ChakraDialog, Portal } from "@chakra-ui/react";
import { XIcon } from "@phosphor-icons/react/ssr";

import { usePortalContainer } from "@/lib/surface";
import { cn } from "@/lib/utils";

// The console's dialog (Create Agent Identity, @test-agent is ready!): a white panel with 16px corners on the page
// behind it, which takes the ink at 12 percent over a light blur. A 68px head holds the 20px regular title 24px in from
// the left and a faint 20px close glyph 24px from the right; the body keeps the same 24px sides. It stays centered and
// opens from 96 percent with a fade (250ms, the strong ease-out); it closes faster than it opens.
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
      <ChakraDialog.Positioner>
      <ChakraDialog.Content
        unstyled
        data-slot="dialog-content"
        className={cn(
          "z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-133.5 flex-col overflow-hidden rounded-panel bg-surface text-fg outline-none data-[state=closed]:animate-dialog-out data-[state=open]:animate-dialog-in",
          className,
        )}
        {...props}
      >
        {children}
        {showClose && (
          <ChakraDialog.CloseTrigger unstyled
            data-slot="dialog-close"
            className="absolute top-5 right-5 inline-flex size-7 items-center justify-center rounded-pill text-fg-faint outline-none active:brightness-95 active:transition-none transition-colors duration-150 ease-out hover:text-fg-muted focus-visible:outline-2 focus-visible:outline-focus-ring motion-reduce:transition-none"
          >
            <XIcon className="size-5.5" weight="bold" />
            <span className="sr-only">Close</span>
          </ChakraDialog.CloseTrigger>
        )}
      </ChakraDialog.Content>
      </ChakraDialog.Positioner>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="dialog-header" className={cn("flex min-h-17 shrink-0 flex-col justify-center gap-1 py-5 pr-14 pl-6", className)} {...props} />;
}

/** The scrolling middle of a dialog, with the head's 24px sides. */
function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="dialog-body" className={cn("min-h-0 flex-1 overflow-y-auto px-6 pb-6", className)} {...props} />;
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="dialog-footer" className={cn("flex shrink-0 flex-col-reverse gap-3 px-6 pb-6 sm:flex-row sm:justify-end", className)} {...props} />;
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof ChakraDialog.Title>) {
  return <ChakraDialog.Title unstyled data-slot="dialog-title" className={cn("font-sans text-h3 leading-heading font-normal text-fg", className)} {...props} />;
}

function DialogDescription({ className, ...props }: React.ComponentProps<typeof ChakraDialog.Description>) {
  return <ChakraDialog.Description unstyled data-slot="dialog-description" className={cn("text-body leading-body text-fg-secondary", className)} {...props} />;
}

export { Dialog, DialogBody, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogOverlay, DialogPortal, DialogTitle, DialogTrigger };

```
