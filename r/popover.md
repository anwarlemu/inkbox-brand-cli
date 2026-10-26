# Popover
A raised white panel with 16px corners and the floating shadow that grows out of the control that opened it.

Install: npx inkbox-ds add popover
Requires: theme, surface, utils
Packages: @chakra-ui/react
Exports: Popover, PopoverAnchor, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger
Client boundary: yes
Reference: Extrapolated from the Inkbox console (Figma 427:2715): the raised white panel of the select and the selected tab (Shadow/S), the field and button sizes


## Usage
Use for a small form or detail tied to one control (rename a mailbox, set a phone line's state). Put a PopoverHeader with a PopoverTitle and PopoverDescription first, then the fields. For choosing one value from a list use Select or Combobox; for actions use Dropdown Menu.
- Avoid: A popover that opens on hover (use Hover Card)
- Avoid: A dark or lilac popover panel
- Avoid: Scaling from the center instead of the trigger
- Avoid: Long forms that scroll inside a popover


## Examples
Example components: npx inkbox-ds add popover button input label
Example packages: @phosphor-icons/react
[Preview](https://inkbox-ds.vercel.app/preview/popover/Preview) | [Open](https://inkbox-ds.vercel.app/preview/popover/Open)

examples/popover.tsx

```tsx
"use client";

import * as React from "react";
import { PencilSimpleIcon } from "@phosphor-icons/react/ssr";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";

function RenameForm({ onDone }: { onDone?: () => void }) {
  const [name, setName] = React.useState("Acme support");
  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        onDone?.();
      }}
    >
      <PopoverHeader>
        <PopoverTitle>Display name</PopoverTitle>
        <PopoverDescription>Shown as the sender on acme@inkboxmail.com.</PopoverDescription>
      </PopoverHeader>
      <div className="grid gap-1">
        <Label htmlFor="display-name">Name</Label>
        <Input id="display-name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <Button type="submit" className="w-full">
        Save
      </Button>
    </form>
  );
}

export function Preview() {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="flex justify-center">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline">
            <PencilSimpleIcon weight="fill" />
            Rename mailbox
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start">
          <RenameForm onDone={() => setOpen(false)} />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function Open() {
  return (
    <div className="flex min-h-80 items-start justify-center">
      <Popover defaultOpen>
        <PopoverTrigger asChild>
          <Button variant="outline">
            <PencilSimpleIcon weight="fill" />
            Rename mailbox
          </Button>
        </PopoverTrigger>
        <PopoverContent>
          <RenameForm />
        </PopoverContent>
      </Popover>
    </div>
  );
}

```

## Source

components/ui/popover.tsx

```tsx
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

```
