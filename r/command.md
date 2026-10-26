# Command
A search row over grouped 36px results with purple group headings, in a panel or a dialog with the shared 16px popup corners.

Install: npx inkbox-ds add command
Requires: theme, surface, utils
Packages: cmdk, radix-ui, @phosphor-icons/react
Exports: Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut
Client boundary: yes
Reference: Extrapolated from the Inkbox console (Figma 427:2715): the nav rows, section labels (Channels, Shared) and the dialog


## Usage
Use as a command palette (CommandDialog, opened with Command K) to jump to agents, mailboxes and pages, or inline as a searchable list. Give every item a filled glyph and the group a heading.
- Avoid: Animating the palette open or closed
- Avoid: A palette without an empty state
- Avoid: Results without groups once there are more than ten


## Examples
Example components: npx inkbox-ds add command button
Example packages: @phosphor-icons/react
[Preview](https://inkbox-ds.vercel.app/preview/command/Preview) | [Dialog](https://inkbox-ds.vercel.app/preview/command/Dialog) | [Open](https://inkbox-ds.vercel.app/preview/command/Open)

examples/command.tsx

```tsx
"use client";

import * as React from "react";
import { BookOpenTextIcon, EnvelopeSimpleIcon, GearSixIcon, KeyIcon, LockKeyIcon, PhoneIcon, PlusIcon, RobotIcon, WebhooksLogoIcon } from "@phosphor-icons/react/ssr";

import { Button } from "@/components/ui/button";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from "@/components/ui/command";

function Items({ onRun }: { onRun?: () => void }) {
  return (
    <>
      <CommandInput placeholder="Search agents, mailboxes and pages" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Agents">
          <CommandItem onSelect={onRun}>
            <RobotIcon weight="fill" />
            @acme
          </CommandItem>
          <CommandItem onSelect={onRun}>
            <RobotIcon weight="fill" />
            @acme-support
          </CommandItem>
          <CommandItem onSelect={onRun}>
            <PlusIcon />
            Create Agent
            <CommandShortcut>⌘N</CommandShortcut>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Channels">
          <CommandItem onSelect={onRun}>
            <EnvelopeSimpleIcon weight="fill" />
            Email
          </CommandItem>
          <CommandItem onSelect={onRun}>
            <PhoneIcon weight="fill" />
            Phone
          </CommandItem>
          <CommandItem disabled>
            <WebhooksLogoIcon weight="fill" />
            Agent2Agent (beta)
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Shared">
          <CommandItem onSelect={onRun}>
            <LockKeyIcon weight="fill" />
            Vault
          </CommandItem>
          <CommandItem onSelect={onRun}>
            <KeyIcon weight="fill" />
            API Keys
            <CommandShortcut>⌘K</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={onRun}>
            <GearSixIcon weight="fill" />
            Settings
            <CommandShortcut>⌘,</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={onRun}>
            <BookOpenTextIcon weight="fill" />
            Read the docs
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </>
  );
}

export function Preview() {
  return (
    <Command className="mx-auto max-w-112 shadow-s">
      <Items />
    </Command>
  );
}

export function Dialog() {
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  return (
    <div className="grid justify-items-center gap-3">
      <Button variant="outline" onClick={() => setOpen(true)}>
        Open the command menu
      </Button>
      <p className="text-body text-fg-muted">
        Or press <kbd className="rounded-xs bg-subtle px-1.5 font-sans text-caption text-fg">⌘K</kbd>
      </p>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <Items onRun={() => setOpen(false)} />
      </CommandDialog>
    </div>
  );
}

export function Open() {
  return (
    <div className="min-h-120">
      <CommandDialog defaultOpen>
        <Items />
      </CommandDialog>
    </div>
  );
}

```

## Source

components/ui/command.tsx

```tsx
"use client";

import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { Dialog as DialogPrimitive } from "radix-ui";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/ssr";

import { usePortalContainer } from "@/lib/surface";
import { cn } from "@/lib/utils";

// A command menu, extrapolated from the console (Figma 427:2715): a white panel with 16px corners; the search row is
// 48px with a 20px magnifying glass in muted purple and 14px ink text over the rail's hairline; groups open with 13px
// headings in the label purple ("Channels"), items are 36px pill rows, a 20px glyph in the action-glyph
// purple and the lilac under the selected row; shortcuts are 12px muted. CommandDialog puts it in the console's dialog
// (16px corners, the blurred ink-tinted page) and opens without motion: it is summoned by keyboard many times a day.
function Command({ className, ...props }: React.ComponentProps<typeof CommandPrimitive>) {
  return <CommandPrimitive data-slot="command" data-ds-motion="instant" className={cn("flex size-full flex-col overflow-hidden rounded-panel bg-surface text-fg", className)} {...props} />;
}

function CommandDialog({
  title = "Command menu",
  description = "Search for a command to run",
  children,
  className,
  showCloseButton = false,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root> & { title?: string; description?: string; className?: string; showCloseButton?: boolean }) {
  const container = usePortalContainer();
  return (
    <DialogPrimitive.Root data-slot="command-dialog" {...props}>
      <DialogPrimitive.Portal container={container}>
        <DialogPrimitive.Overlay data-ds-motion="instant" className="fixed inset-0 z-50 bg-scrim backdrop-blur-[var(--ds-blur-scrim)]" />
        <DialogPrimitive.Content
          data-ds-motion="instant"
          className={cn("fixed top-[18dvh] left-1/2 z-50 w-[calc(100%-2rem)] max-w-140 -translate-x-1/2 overflow-hidden rounded-panel bg-surface p-1.5 text-fg outline-none", className)}
          aria-describedby={undefined}
        >
          <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">{description}</DialogPrimitive.Description>
          <Command className="rounded-panel [&_[data-slot=command-list]]:max-h-96">{children}</Command>
          {showCloseButton && <DialogPrimitive.Close className="sr-only">Close</DialogPrimitive.Close>}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function CommandInput({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div data-slot="command-input-wrapper" className="flex h-12 shrink-0 items-center gap-2.5 border-b border-line-subtle px-3.5">
      <MagnifyingGlassIcon aria-hidden className="size-5.5 shrink-0 text-fg-muted" />
      <CommandPrimitive.Input
        data-slot="command-input"
        className={cn("h-full w-full min-w-0 bg-transparent font-sans text-body leading-tight text-fg outline-none placeholder:text-fg-subtle disabled:cursor-not-allowed disabled:opacity-50", className)}
        {...props}
      />
    </div>
  );
}

function CommandList({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.List>) {
  return <CommandPrimitive.List data-slot="command-list" className={cn("max-h-80 scroll-py-1 overflow-x-hidden overflow-y-auto overscroll-contain p-1", className)} {...props} />;
}

function CommandEmpty({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return <CommandPrimitive.Empty data-slot="command-empty" className={cn("py-8 text-center text-body text-fg-muted", className)} {...props} />;
}

function CommandGroup({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn("overflow-hidden text-fg [&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-body-sm [&_[cmdk-group-heading]]:leading-tight [&_[cmdk-group-heading]]:text-fg-label", className)}
      {...props}
    />
  );
}

function CommandSeparator({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return <CommandPrimitive.Separator data-slot="command-separator" className={cn("-mx-1 my-1 h-px bg-line-subtle", className)} {...props} />;
}

function CommandItem({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(
        "relative flex h-9 cursor-default items-center gap-2.5 rounded-pill px-2.5 font-sans text-body leading-tight text-fg outline-none select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-[selected=true]:bg-subtle [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5.5 [&_svg:not([class*='text-'])]:text-icon-secondary",
        className,
      )}
      {...props}
    />
  );
}

function CommandShortcut({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="command-shortcut" className={cn("ml-auto pl-4 font-sans text-caption text-fg-muted", className)} {...props} />;
}

export { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut };

```
