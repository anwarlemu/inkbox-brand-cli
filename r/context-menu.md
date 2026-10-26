# Context Menu
The dropdown menu's panel and rows, opened with a right click or a long press on an area.

Install: npx inkbox-ds add context-menu
Requires: theme, surface, utils
Packages: radix-ui, @phosphor-icons/react
Exports: ContextMenu, ContextMenuCheckboxItem, ContextMenuContent, ContextMenuGroup, ContextMenuItem, ContextMenuLabel, ContextMenuPortal, ContextMenuRadioGroup, ContextMenuRadioItem, ContextMenuSeparator, ContextMenuShortcut, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger, ContextMenuTrigger
Client boundary: yes
Reference: Extrapolated from the Inkbox console (Figma 427:2715): the email list items, nav rows and the raised panel


## Usage
Use for shortcuts to actions on an item in a list (an email in the inbox, a contact). Every action must also be reachable another way, such as a row's menu button.
- Avoid: Actions that exist only in the context menu
- Avoid: A context menu on text people need to select
- Avoid: Nested submenus beyond one level


## Examples
Example components: npx inkbox-ds add context-menu
Example packages: @phosphor-icons/react
[Preview](https://inkbox-ds.vercel.app/preview/context-menu/Preview)

examples/context-menu.tsx

```tsx
"use client";

import * as React from "react";
import { ArchiveIcon, ArrowBendUpLeftIcon, ArrowBendUpRightIcon, EnvelopeOpenIcon, ProhibitIcon, TrashIcon, WarningIcon } from "@phosphor-icons/react/ssr";

import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

export function Preview() {
  const [starred, setStarred] = React.useState(false);
  const [folder, setFolder] = React.useState("inbox");
  return (
    <ContextMenu>
      <ContextMenuTrigger className="mx-auto grid w-full max-w-96 gap-1 rounded-control bg-subtle p-3">
        <span className="flex justify-between text-body text-fg">
          Ray Liao <span className="text-fg-muted">Yesterday</span>
        </span>
        <span className="text-body text-fg">Inkbox A2A: publish your Agent Card</span>
        <span className="truncate text-body text-fg-brand">Hello @acme, This is Ray, cofounder of Inkbox.</span>
        <span className="mt-2 text-caption text-fg-muted">Right-click or long-press the email</span>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-60">
        <ContextMenuItem>
          <ArrowBendUpLeftIcon />
          Reply
          <ContextMenuShortcut>R</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem>
          <ArrowBendUpRightIcon />
          Forward
          <ContextMenuShortcut>F</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem>
          <EnvelopeOpenIcon weight="fill" />
          Mark as unread
        </ContextMenuItem>
        <ContextMenuCheckboxItem checked={starred} onCheckedChange={(v) => setStarred(v === true)}>
          Starred
        </ContextMenuCheckboxItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <ArchiveIcon weight="fill" />
            Move to
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-44">
            <ContextMenuLabel>Folders</ContextMenuLabel>
            <ContextMenuRadioGroup value={folder} onValueChange={setFolder}>
              <ContextMenuRadioItem value="inbox">Inbox</ContextMenuRadioItem>
              <ContextMenuRadioItem value="sent">Sent</ContextMenuRadioItem>
              <ContextMenuRadioItem value="spam">Spam</ContextMenuRadioItem>
            </ContextMenuRadioGroup>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuItem>
          <WarningIcon weight="fill" />
          Report spam
        </ContextMenuItem>
        <ContextMenuItem>
          <ProhibitIcon />
          Block sender
        </ContextMenuItem>
        <ContextMenuItem variant="destructive">
          <TrashIcon weight="fill" />
          Delete
          <ContextMenuShortcut>⌫</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

```

## Source

components/ui/context-menu.tsx

```tsx
"use client";

import * as React from "react";
import { ContextMenu as ContextMenuPrimitive } from "radix-ui";
import { CaretRightIcon, CheckIcon } from "@phosphor-icons/react/ssr";

import { usePortalContainer } from "@/lib/surface";
import { cn } from "@/lib/utils";

// A right-click menu, extrapolated from the console (Figma 427:2715), drawn as the dropdown menu: the panel is a raised white panel (16px corners, the floating
// shadow) with 4px of padding; items are 36px rows with fully rounded corners like the rail's nav rows, a 20px glyph in the
// action-glyph purple 10px from a 14px ink label, and the lilac under the highlighted row. Section labels are 13px in
// the label purple ("Channels"), separators the rail's hairline, shortcuts 12px muted, destructive items red. The
// panel grows out of its trigger from 96 percent with a fade; highlighting a row is instant (menus are used by keyboard
// and many times a day).
const CONTENT =
  "z-50 max-h-(--radix-context-menu-content-available-height) min-w-48 overflow-x-hidden overflow-y-auto rounded-panel bg-surface p-1 text-fg shadow-floating outline-none data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in";
const ITEM =
  "relative flex h-9 cursor-default items-center gap-2.5 rounded-pill px-2.5 font-sans text-body leading-tight text-fg outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-subtle data-[inset]:pl-10.5 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5.5 [&_svg:not([class*='text-'])]:text-icon-secondary";

function ContextMenu(props: React.ComponentProps<typeof ContextMenuPrimitive.Root>) {
  return <ContextMenuPrimitive.Root data-slot="context-menu" {...props} />;
}

function ContextMenuPortal(props: React.ComponentProps<typeof ContextMenuPrimitive.Portal>) {
  const container = usePortalContainer();
  return <ContextMenuPrimitive.Portal data-slot="context-menu-portal" container={container} {...props} />;
}

function ContextMenuTrigger({ className, ...props }: React.ComponentProps<typeof ContextMenuPrimitive.Trigger>) {
  return <ContextMenuPrimitive.Trigger data-slot="context-menu-trigger" className={cn("select-none", className)} {...props} />;
}

function ContextMenuContent({ className, ...props }: React.ComponentProps<typeof ContextMenuPrimitive.Content>) {
  return (
    <ContextMenuPortal>
      <ContextMenuPrimitive.Content data-slot="context-menu-content" className={cn(CONTENT, "origin-(--radix-context-menu-content-transform-origin)", className)} {...props} />
    </ContextMenuPortal>
  );
}

function ContextMenuGroup(props: React.ComponentProps<typeof ContextMenuPrimitive.Group>) {
  return <ContextMenuPrimitive.Group data-slot="context-menu-group" {...props} />;
}

function ContextMenuItem({ className, inset, variant = "default", ...props }: React.ComponentProps<typeof ContextMenuPrimitive.Item> & { inset?: boolean; variant?: "default" | "destructive" }) {
  return (
    <ContextMenuPrimitive.Item
      data-slot="context-menu-item"
      data-inset={inset || undefined}
      data-variant={variant}
      className={cn(ITEM, "data-[variant=destructive]:text-danger data-[variant=destructive]:[&_svg]:text-danger", className)}
      {...props}
    />
  );
}

function ContextMenuCheckboxItem({ className, children, checked, ...props }: React.ComponentProps<typeof ContextMenuPrimitive.CheckboxItem>) {
  return (
    <ContextMenuPrimitive.CheckboxItem data-slot="context-menu-checkbox-item" checked={checked} className={cn(ITEM, "pl-10.5", className)} {...props}>
      <span className="pointer-events-none absolute left-2.5 flex size-5.5 items-center justify-center">
        <ContextMenuPrimitive.ItemIndicator>
          <CheckIcon weight="bold" className="size-4.5 text-fg-brand" />
        </ContextMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.CheckboxItem>
  );
}

function ContextMenuRadioGroup(props: React.ComponentProps<typeof ContextMenuPrimitive.RadioGroup>) {
  return <ContextMenuPrimitive.RadioGroup data-slot="context-menu-radio-group" {...props} />;
}

// The selected choice wears the console's radio mark: a pink ring around white.
function ContextMenuRadioItem({ className, children, ...props }: React.ComponentProps<typeof ContextMenuPrimitive.RadioItem>) {
  return (
    <ContextMenuPrimitive.RadioItem data-slot="context-menu-radio-item" className={cn(ITEM, "pl-10.5", className)} {...props}>
      <span className="pointer-events-none absolute left-2.5 flex size-5.5 items-center justify-center">
        <ContextMenuPrimitive.ItemIndicator>
          <span className="block size-3.5 rounded-pill border-[3.5px] border-pink bg-surface" />
        </ContextMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.RadioItem>
  );
}

function ContextMenuLabel({ className, inset, ...props }: React.ComponentProps<typeof ContextMenuPrimitive.Label> & { inset?: boolean }) {
  return <ContextMenuPrimitive.Label data-slot="context-menu-label" data-inset={inset || undefined} className={cn("px-2.5 pt-2 pb-1 font-sans text-body-sm leading-tight text-fg-label data-[inset]:pl-10.5", className)} {...props} />;
}

function ContextMenuSeparator({ className, ...props }: React.ComponentProps<typeof ContextMenuPrimitive.Separator>) {
  return <ContextMenuPrimitive.Separator data-slot="context-menu-separator" className={cn("-mx-1 my-1 h-px bg-line-subtle", className)} {...props} />;
}

function ContextMenuShortcut({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="context-menu-shortcut" className={cn("ml-auto pl-4 font-sans text-caption text-fg-muted", className)} {...props} />;
}

function ContextMenuSub(props: React.ComponentProps<typeof ContextMenuPrimitive.Sub>) {
  return <ContextMenuPrimitive.Sub data-slot="context-menu-sub" {...props} />;
}

function ContextMenuSubTrigger({ className, inset, children, ...props }: React.ComponentProps<typeof ContextMenuPrimitive.SubTrigger> & { inset?: boolean }) {
  return (
    <ContextMenuPrimitive.SubTrigger data-slot="context-menu-sub-trigger" data-inset={inset || undefined} className={cn(ITEM, "data-[state=open]:bg-subtle", className)} {...props}>
      {children}
      <CaretRightIcon className="ml-auto size-4.5 text-fg-muted" />
    </ContextMenuPrimitive.SubTrigger>
  );
}

function ContextMenuSubContent({ className, ...props }: React.ComponentProps<typeof ContextMenuPrimitive.SubContent>) {
  return (
    <ContextMenuPortal>
      <ContextMenuPrimitive.SubContent data-slot="context-menu-sub-content" className={cn(CONTENT, "max-h-(--radix-context-menu-content-available-height) origin-(--radix-context-menu-content-transform-origin)", className)} {...props} />
    </ContextMenuPortal>
  );
}

export {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuPortal,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
};

```
