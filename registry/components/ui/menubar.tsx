"use client";

import * as React from "react";
import { Menubar as MenubarPrimitive } from "radix-ui";
import { CaretRightIcon, CheckCircleIcon } from "@phosphor-icons/react/ssr";

import { usePortalContainer } from "@/lib/surface";
import { cn } from "@/lib/utils";

// A menu bar, extrapolated from the console (Figma 427:2715). The bar is the tab track: lilac with 10px corners and a
// 2px inset, its triggers 36px with 8px corners and 14px medium ink, the open one a white key with Shadow/S. Its menus
// are drawn as the console's menu, and moving between them along the bar is instant (a closing panel that lingered
// would dismiss the next one, and the move is made by keyboard and pointer many times):
// the panel is white with no edge, 16px corners, the floating shadow and 4px of padding; items are rows of at least
// 36px (12px sides, 8px above and below) with 12px corners and a 14px regular ink label after a 16px glyph in the
// label's color, 4px apart, with the deeper lilac under the highlighted row and no fade (menus are used by keyboard and
// many times a day). Check and radio marks sit at the end of the row: a bold 16px check in the brand purple. Section
// labels are 12px regular in the brand purple, separators the subtle hairline, shortcuts 12px muted, destructive items
// red. The panel grows out of its trigger from 98 percent with a fade (160ms) and leaves at once.
const CONTENT =
  "z-50 max-h-(--radix-menubar-content-available-height) min-w-48 overflow-x-hidden overflow-y-auto rounded-panel bg-surface p-1 text-fg shadow-floating outline-none data-[state=open]:animate-pop-in [&_[role^=menuitem]+[role^=menuitem]]:mt-1";
const ITEM =
  "relative flex min-h-9 cursor-default items-center gap-3 rounded-control px-3 py-2 font-sans text-body leading-line-body font-normal text-fg outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-subtle-hover data-[inset]:pl-10 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";

function Menubar({ className, ...props }: React.ComponentProps<typeof MenubarPrimitive.Root>) {
  return <MenubarPrimitive.Root data-slot="menubar" className={cn("flex h-10 w-fit items-center gap-1 rounded-pill bg-subtle p-0.5", className)} {...props} />;
}

function MenubarMenu(props: React.ComponentProps<typeof MenubarPrimitive.Menu>) {
  return <MenubarPrimitive.Menu data-slot="menubar-menu" {...props} />;
}

function MenubarPortal(props: React.ComponentProps<typeof MenubarPrimitive.Portal>) {
  const container = usePortalContainer();
  return <MenubarPrimitive.Portal data-slot="menubar-portal" container={container} {...props} />;
}

function MenubarTrigger({ className, ...props }: React.ComponentProps<typeof MenubarPrimitive.Trigger>) {
  return (
    <MenubarPrimitive.Trigger
      data-slot="menubar-trigger"
      className={cn(
        "flex h-9 items-center gap-2 rounded-pill px-2.5 font-sans text-body leading-tight font-medium text-fg outline-none select-none transition-[background-color,box-shadow] duration-150 ease-out hover:bg-subtle-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring data-[state=open]:bg-surface data-[state=open]:shadow-s motion-reduce:transition-none",
        className,
      )}
      {...props}
    />
  );
}

function MenubarContent({ className, align = "start", alignOffset = -2, sideOffset = 8, ...props }: React.ComponentProps<typeof MenubarPrimitive.Content>) {
  return (
    <MenubarPortal>
      <MenubarPrimitive.Content data-slot="menubar-content" align={align} alignOffset={alignOffset} sideOffset={sideOffset} className={cn(CONTENT, "origin-(--radix-menubar-content-transform-origin)", className)} {...props} />
    </MenubarPortal>
  );
}

function MenubarGroup(props: React.ComponentProps<typeof MenubarPrimitive.Group>) {
  return <MenubarPrimitive.Group data-slot="menubar-group" {...props} />;
}

function MenubarItem({ className, inset, variant = "default", ...props }: React.ComponentProps<typeof MenubarPrimitive.Item> & { inset?: boolean; variant?: "default" | "destructive" }) {
  return (
    <MenubarPrimitive.Item
      data-slot="menubar-item"
      data-inset={inset || undefined}
      data-variant={variant}
      className={cn(ITEM, "data-[variant=destructive]:text-danger data-[variant=destructive]:[&_svg]:text-danger", className)}
      {...props}
    />
  );
}

function MenubarCheckboxItem({ className, children, checked, ...props }: React.ComponentProps<typeof MenubarPrimitive.CheckboxItem>) {
  return (
    <MenubarPrimitive.CheckboxItem data-slot="menubar-checkbox-item" checked={checked} className={cn(ITEM, className)} {...props}>
      {children}
      <span className="pointer-events-none ml-auto flex size-5 shrink-0 items-center justify-center">
        <MenubarPrimitive.ItemIndicator>
          <CheckCircleIcon weight="fill" className="size-5 text-fg-brand" />
        </MenubarPrimitive.ItemIndicator>
      </span>
    </MenubarPrimitive.CheckboxItem>
  );
}

function MenubarRadioGroup(props: React.ComponentProps<typeof MenubarPrimitive.RadioGroup>) {
  return <MenubarPrimitive.RadioGroup data-slot="menubar-radio-group" {...props} />;
}

// The selected choice takes the same end check as a checkbox item (the console's menu option).
function MenubarRadioItem({ className, children, ...props }: React.ComponentProps<typeof MenubarPrimitive.RadioItem>) {
  return (
    <MenubarPrimitive.RadioItem data-slot="menubar-radio-item" className={cn(ITEM, className)} {...props}>
      {children}
      <span className="pointer-events-none ml-auto flex size-5 shrink-0 items-center justify-center">
        <MenubarPrimitive.ItemIndicator>
          <CheckCircleIcon weight="fill" className="size-5 text-fg-brand" />
        </MenubarPrimitive.ItemIndicator>
      </span>
    </MenubarPrimitive.RadioItem>
  );
}

function MenubarLabel({ className, inset, ...props }: React.ComponentProps<typeof MenubarPrimitive.Label> & { inset?: boolean }) {
  return <MenubarPrimitive.Label data-slot="menubar-label" data-inset={inset || undefined} className={cn("mx-3 my-2 font-sans text-caption leading-line-caption font-normal text-fg-brand data-[inset]:pl-7", className)} {...props} />;
}

function MenubarSeparator({ className, ...props }: React.ComponentProps<typeof MenubarPrimitive.Separator>) {
  return <MenubarPrimitive.Separator data-slot="menubar-separator" className={cn("my-2 h-px border-0 bg-line-subtle", className)} {...props} />;
}

function MenubarShortcut({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="menubar-shortcut" className={cn("ml-auto pl-4 font-sans text-caption text-fg-muted", className)} {...props} />;
}

function MenubarSub(props: React.ComponentProps<typeof MenubarPrimitive.Sub>) {
  return <MenubarPrimitive.Sub data-slot="menubar-sub" {...props} />;
}

function MenubarSubTrigger({ className, inset, children, ...props }: React.ComponentProps<typeof MenubarPrimitive.SubTrigger> & { inset?: boolean }) {
  return (
    <MenubarPrimitive.SubTrigger data-slot="menubar-sub-trigger" data-inset={inset || undefined} className={cn(ITEM, "data-[state=open]:bg-subtle-hover", className)} {...props}>
      {children}
      <CaretRightIcon weight="bold" className="ml-auto size-4 text-fg-muted" />
    </MenubarPrimitive.SubTrigger>
  );
}

function MenubarSubContent({ className, ...props }: React.ComponentProps<typeof MenubarPrimitive.SubContent>) {
  return (
    <MenubarPortal>
      <MenubarPrimitive.SubContent data-slot="menubar-sub-content" className={cn(CONTENT, "max-h-(--radix-menubar-content-available-height) origin-(--radix-menubar-content-transform-origin)", className)} {...props} />
    </MenubarPortal>
  );
}

export {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarGroup,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarPortal,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
};
