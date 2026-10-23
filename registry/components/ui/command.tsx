"use client";

import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { Dialog as DialogPrimitive } from "radix-ui";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/ssr";

import { usePortalContainer } from "@/lib/surface";
import { cn } from "@/lib/utils";

// A command menu, extrapolated from the console (Figma 427:2715): a white panel with 8px corners; the search row is
// 48px with a 20px magnifying glass in muted purple and 14px ink text over the rail's hairline; groups open with 13px
// headings in the label purple ("Channels"), items are 36px rows with 8px corners, a 20px glyph in the action-glyph
// purple and the lilac under the selected row; shortcuts are 12px muted. CommandDialog puts it in the console's dialog
// (16px corners, the blurred ink-tinted page) and opens without motion: it is summoned by keyboard many times a day.
function Command({ className, ...props }: React.ComponentProps<typeof CommandPrimitive>) {
  return <CommandPrimitive data-slot="command" className={cn("flex size-full flex-col overflow-hidden rounded-control bg-surface text-fg", className)} {...props} />;
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
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-scrim backdrop-blur-[var(--ds-blur-scrim)]" />
        <DialogPrimitive.Content
          className={cn("fixed top-[18dvh] left-1/2 z-50 w-[calc(100%-2rem)] max-w-140 -translate-x-1/2 overflow-hidden rounded-dialog bg-surface p-1.5 text-fg outline-none", className)}
          aria-describedby={undefined}
        >
          <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">{description}</DialogPrimitive.Description>
          <Command className="rounded-control [&_[data-slot=command-list]]:max-h-96">{children}</Command>
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
        "relative flex h-9 cursor-default items-center gap-2.5 rounded-control px-2.5 font-sans text-body leading-tight text-fg outline-none select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-[selected=true]:bg-subtle [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5.5 [&_svg:not([class*='text-'])]:text-icon-secondary",
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
