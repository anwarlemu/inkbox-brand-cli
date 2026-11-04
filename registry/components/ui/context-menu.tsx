"use client";

import * as React from "react";
import { ContextMenu as ContextMenuPrimitive } from "radix-ui";
import { CaretRightIcon, CheckIcon } from "@phosphor-icons/react/ssr";

import { usePortalContainer } from "@/lib/surface";
import { cn } from "@/lib/utils";

// A right-click menu, drawn as the console's menu (its Chakra menu theme):
// the panel is white with no edge, 16px corners, the floating shadow and 4px of padding; items are rows of at least
// 36px (12px sides, 8px above and below) with 12px corners and a 14px regular ink label after a 16px glyph in the
// label's color, 4px apart, with the deeper lilac under the highlighted row and no fade (menus are used by keyboard and
// many times a day). Check and radio marks sit at the end of the row: a bold 16px check in the brand purple. Section
// labels are 12px regular in the brand purple, separators the subtle hairline, shortcuts 12px muted, destructive items
// red. The panel grows out of its trigger from 98 percent with a fade (160ms) and leaves in 100ms.
const CONTENT =
  "z-50 max-h-(--radix-context-menu-content-available-height) min-w-48 overflow-x-hidden overflow-y-auto rounded-panel bg-surface p-1 text-fg shadow-floating outline-none data-[state=closed]:animate-pop-out data-[state=open]:animate-pop-in [&_[role^=menuitem]+[role^=menuitem]]:mt-1";
const ITEM =
  "relative flex min-h-9 cursor-default items-center gap-3 rounded-control px-3 py-2 font-sans text-body leading-line-body font-normal text-fg outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-subtle-hover data-[inset]:pl-10 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";

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
    <ContextMenuPrimitive.CheckboxItem data-slot="context-menu-checkbox-item" checked={checked} className={cn(ITEM, className)} {...props}>
      {children}
      <span className="pointer-events-none ml-auto flex size-4 shrink-0 items-center justify-center">
        <ContextMenuPrimitive.ItemIndicator>
          <CheckIcon weight="bold" className="size-4 text-fg-brand" />
        </ContextMenuPrimitive.ItemIndicator>
      </span>
    </ContextMenuPrimitive.CheckboxItem>
  );
}

function ContextMenuRadioGroup(props: React.ComponentProps<typeof ContextMenuPrimitive.RadioGroup>) {
  return <ContextMenuPrimitive.RadioGroup data-slot="context-menu-radio-group" {...props} />;
}

// The selected choice takes the same end check as a checkbox item (the console's menu option).
function ContextMenuRadioItem({ className, children, ...props }: React.ComponentProps<typeof ContextMenuPrimitive.RadioItem>) {
  return (
    <ContextMenuPrimitive.RadioItem data-slot="context-menu-radio-item" className={cn(ITEM, className)} {...props}>
      {children}
      <span className="pointer-events-none ml-auto flex size-4 shrink-0 items-center justify-center">
        <ContextMenuPrimitive.ItemIndicator>
          <CheckIcon weight="bold" className="size-4 text-fg-brand" />
        </ContextMenuPrimitive.ItemIndicator>
      </span>
    </ContextMenuPrimitive.RadioItem>
  );
}

function ContextMenuLabel({ className, inset, ...props }: React.ComponentProps<typeof ContextMenuPrimitive.Label> & { inset?: boolean }) {
  return <ContextMenuPrimitive.Label data-slot="context-menu-label" data-inset={inset || undefined} className={cn("mx-3 my-2 font-sans text-caption leading-line-caption font-normal text-fg-brand data-[inset]:pl-7", className)} {...props} />;
}

function ContextMenuSeparator({ className, ...props }: React.ComponentProps<typeof ContextMenuPrimitive.Separator>) {
  return <ContextMenuPrimitive.Separator data-slot="context-menu-separator" className={cn("my-2 h-px border-0 bg-line-subtle", className)} {...props} />;
}

function ContextMenuShortcut({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="context-menu-shortcut" className={cn("ml-auto pl-4 font-sans text-caption text-fg-muted", className)} {...props} />;
}

function ContextMenuSub(props: React.ComponentProps<typeof ContextMenuPrimitive.Sub>) {
  return <ContextMenuPrimitive.Sub data-slot="context-menu-sub" {...props} />;
}

function ContextMenuSubTrigger({ className, inset, children, ...props }: React.ComponentProps<typeof ContextMenuPrimitive.SubTrigger> & { inset?: boolean }) {
  return (
    <ContextMenuPrimitive.SubTrigger data-slot="context-menu-sub-trigger" data-inset={inset || undefined} className={cn(ITEM, "data-[state=open]:bg-subtle-hover", className)} {...props}>
      {children}
      <CaretRightIcon weight="bold" className="ml-auto size-4 text-fg-muted" />
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
