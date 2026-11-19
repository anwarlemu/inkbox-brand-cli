# Sheet
A white panel that slides from an edge over the blurred, ink-tinted page, with the dialog's title and 36px close key.

Install: npx inkbox-ds add sheet
Requires: theme, surface, utils
Packages: radix-ui, @phosphor-icons/react
Exports: Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetOverlay, SheetPortal, SheetTitle, SheetTrigger
Client boundary: yes
Reference: The Inkbox console's Chakra modal and drawer themes and its close key (src/theme/index.ts, src/components/ui/chakra-controls.tsx)


## Usage
Use for a task beside the page that keeps its context, such as editing a mailbox or reading a call's details. Use side="right" by default and side="left" for the rail on phones. Put the title in SheetHeader and the one action in SheetFooter as a full-width secondary Button; the close key and Escape dismiss it.
- Avoid: A sheet that opens another sheet
- Avoid: A dark scrim
- Avoid: A sheet for a short confirmation (use Alert Dialog)


## Examples
Example components: npx inkbox-ds add sheet button input label
[Preview](https://inkbox-ds.vercel.app/preview/sheet/Preview) | [Sides](https://inkbox-ds.vercel.app/preview/sheet/Sides) | [Open](https://inkbox-ds.vercel.app/preview/sheet/Open)

examples/sheet.tsx

```tsx
"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

function EditMailbox() {
  return (
    <>
      <SheetHeader>
        <SheetTitle>Edit mailbox</SheetTitle>
        <SheetDescription>Mailboxes are provisioned and deleted with their owning identity.</SheetDescription>
      </SheetHeader>
      <div className="grid gap-4 px-6">
        <div className="grid gap-1">
          <Label htmlFor="sheet-name">Display name</Label>
          <Input id="sheet-name" defaultValue="Acme support" />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="sheet-reply">Reply-to address</Label>
          <Input id="sheet-reply" type="email" placeholder="support@acme.com" />
        </div>
      </div>
      <SheetFooter>
        <Button variant="secondary" className="w-full">Save changes</Button>
      </SheetFooter>
    </>
  );
}

export function Preview() {
  return (
    <div className="flex justify-center">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline">Edit mailbox</Button>
        </SheetTrigger>
        <SheetContent>
          <EditMailbox />
        </SheetContent>
      </Sheet>
    </div>
  );
}

export function Sides() {
  const sides = ["top", "right", "bottom", "left"] as const;
  return (
    <div className="flex flex-wrap justify-center gap-3">
      {sides.map((side) => (
        <Sheet key={side}>
          <SheetTrigger asChild>
            <Button variant="outline" className="capitalize">
              {side}
            </Button>
          </SheetTrigger>
          <SheetContent side={side}>
            <SheetHeader>
              <SheetTitle>Sheet from the {side}</SheetTitle>
              <SheetDescription>Slides from its edge on the drawer curve.</SheetDescription>
            </SheetHeader>
          </SheetContent>
        </Sheet>
      ))}
    </div>
  );
}

export function Open() {
  return (
    <div className="min-h-120">
      <Sheet defaultOpen>
        <SheetContent>
          <EditMailbox />
        </SheetContent>
      </Sheet>
    </div>
  );
}

```

## Source

components/ui/sheet.tsx

```tsx
"use client";

import * as React from "react";
import { Dialog as SheetPrimitive } from "radix-ui";
import { XIcon } from "@phosphor-icons/react/ssr";

import { usePortalContainer } from "@/lib/surface";
import { cn } from "@/lib/utils";

// A panel from the edge of the screen, drawn as the console's dialog and drawer: white over the blurred page under the
// ink at 32 percent, a 20px regular title 24px in, the dialog's close key (a 36px squircle 16px from the corner, a bold
// 20px X in the faint purple) and the same 24px sides. It travels its own size from its edge on the drawer curve (160ms
// in, 120ms out); its inner corner takes the dialog's 16px. Side panels are 384px wide (the full width on phones); top
// and bottom panels take their content's height.
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
  right: "inset-y-0 right-0 h-full w-full rounded-l-panel sm:max-w-96 data-[state=closed]:animate-sheet-out-right data-[state=open]:animate-sheet-in-right",
  left: "inset-y-0 left-0 h-full w-full rounded-r-panel sm:max-w-96 data-[state=closed]:animate-sheet-out-left data-[state=open]:animate-sheet-in-left",
  top: "inset-x-0 top-0 h-auto max-h-[85dvh] rounded-b-panel data-[state=closed]:animate-sheet-out-top data-[state=open]:animate-sheet-in-top",
  bottom: "inset-x-0 bottom-0 h-auto max-h-[85dvh] rounded-t-panel data-[state=closed]:animate-sheet-out-bottom data-[state=open]:animate-sheet-in-bottom",
} as const;

function SheetContent({ className, children, side = "right", showCloseButton = true, instant = false, ...props }: React.ComponentProps<typeof SheetPrimitive.Content> & { side?: keyof typeof SIDES; showCloseButton?: boolean; instant?: boolean }) {
  return (
    <SheetPortal>
      <SheetOverlay data-ds-motion={instant ? "instant" : undefined} />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        data-ds-motion={instant ? "instant" : undefined}
        data-side={side}
        className={cn("fixed z-50 flex flex-col overflow-y-auto bg-surface text-fg shadow-dialog outline-none", SIDES[side], className)}
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close
            data-slot="sheet-close"
            className="absolute top-4 right-4 inline-flex size-9 items-center justify-center rounded-control text-fg-faint outline-none transition-colors duration-fast ease-out hover:bg-subtle hover:text-fg-muted active:bg-subtle-hover active:text-fg-muted active:transition-none focus-visible:shadow-focus motion-reduce:transition-none"
          >
            <XIcon className="size-5" weight="bold" />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Content>
    </SheetPortal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sheet-header" className={cn("flex shrink-0 flex-col justify-center gap-1 py-5 pr-14 pl-6", className)} {...props} />;
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sheet-footer" className={cn("mt-auto flex shrink-0 flex-col gap-2 p-6", className)} {...props} />;
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return <SheetPrimitive.Title data-slot="sheet-title" className={cn("font-sans text-h3 leading-heading font-normal text-fg", className)} {...props} />;
}

function SheetDescription({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return <SheetPrimitive.Description data-slot="sheet-description" className={cn("text-body leading-body text-fg-secondary", className)} {...props} />;
}

export { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetOverlay, SheetPortal, SheetTitle, SheetTrigger };

```
