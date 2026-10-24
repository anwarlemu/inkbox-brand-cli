"use client";

import * as React from "react";
import { Menubar as MenubarPrimitive } from "radix-ui";
import { CaretRightIcon, CheckIcon } from "@phosphor-icons/react/ssr";

import { usePortalContainer } from "@/lib/surface";
import { cn } from "@/lib/utils";

// A menu bar, extrapolated from the console (Figma 427:2715). The bar is the tab track: lilac with 10px corners and a
// 2px inset, its triggers 36px with 8px corners and 14px medium ink, the open one a white key with Shadow/S. Its menus
// are drawn as the dropdown menu (moving between them along the bar is instant: a closing panel that lingered would
// dismiss the next one, and the move is made by keyboard and pointer many times): the panel is a raised white panel (16px corners, the floating
// shadow) with 4px of padding; items are 36px rows with fully rounded corners like the rail's nav rows, a 20px glyph in the
// action-glyph purple 10px from a 14px ink label, and the lilac under the highlighted row. Section labels are 13px in
// the label purple ("Channels"), separators the rail's hairline, shortcuts 12px muted, destructive items red. The
// panel grows out of its trigger from 96 percent with a fade; highlighting a row is instant (menus are used by keyboard
// and many times a day).
const CONTENT =
  "z-50 max-h-(--radix-menubar-content-available-height) min-w-48 overflow-x-hidden overflow-y-auto rounded-panel bg-surface p-1 text-fg shadow-floating outline-none data-[state=open]:animate-fade-in";
const ITEM =
  "relative flex h-9 cursor-default items-center gap-2.5 rounded-pill px-2.5 font-sans text-body leading-tight text-fg outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-subtle data-[inset]:pl-10.5 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5.5 [&_svg:not([class*='text-'])]:text-icon-secondary";

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
    <MenubarPrimitive.CheckboxItem data-slot="menubar-checkbox-item" checked={checked} className={cn(ITEM, "pl-10.5", className)} {...props}>
      <span className="pointer-events-none absolute left-2.5 flex size-5.5 items-center justify-center">
        <MenubarPrimitive.ItemIndicator>
          <CheckIcon weight="bold" className="size-4.5 text-fg-brand" />
        </MenubarPrimitive.ItemIndicator>
      </span>
      {children}
    </MenubarPrimitive.CheckboxItem>
  );
}

function MenubarRadioGroup(props: React.ComponentProps<typeof MenubarPrimitive.RadioGroup>) {
  return <MenubarPrimitive.RadioGroup data-slot="menubar-radio-group" {...props} />;
}

// The selected choice wears the console's radio mark: a pink ring around white.
function MenubarRadioItem({ className, children, ...props }: React.ComponentProps<typeof MenubarPrimitive.RadioItem>) {
  return (
    <MenubarPrimitive.RadioItem data-slot="menubar-radio-item" className={cn(ITEM, "pl-10.5", className)} {...props}>
      <span className="pointer-events-none absolute left-2.5 flex size-5.5 items-center justify-center">
        <MenubarPrimitive.ItemIndicator>
          <span className="block size-3.5 rounded-pill border-[3.5px] border-pink bg-surface" />
        </MenubarPrimitive.ItemIndicator>
      </span>
      {children}
    </MenubarPrimitive.RadioItem>
  );
}

function MenubarLabel({ className, inset, ...props }: React.ComponentProps<typeof MenubarPrimitive.Label> & { inset?: boolean }) {
  return <MenubarPrimitive.Label data-slot="menubar-label" data-inset={inset || undefined} className={cn("px-2.5 pt-2 pb-1 font-sans text-body-sm leading-tight text-fg-label data-[inset]:pl-10.5", className)} {...props} />;
}

function MenubarSeparator({ className, ...props }: React.ComponentProps<typeof MenubarPrimitive.Separator>) {
  return <MenubarPrimitive.Separator data-slot="menubar-separator" className={cn("-mx-1 my-1 h-px bg-line-subtle", className)} {...props} />;
}

function MenubarShortcut({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="menubar-shortcut" className={cn("ml-auto pl-4 font-sans text-caption text-fg-muted", className)} {...props} />;
}

function MenubarSub(props: React.ComponentProps<typeof MenubarPrimitive.Sub>) {
  return <MenubarPrimitive.Sub data-slot="menubar-sub" {...props} />;
}

function MenubarSubTrigger({ className, inset, children, ...props }: React.ComponentProps<typeof MenubarPrimitive.SubTrigger> & { inset?: boolean }) {
  return (
    <MenubarPrimitive.SubTrigger data-slot="menubar-sub-trigger" data-inset={inset || undefined} className={cn(ITEM, "data-[state=open]:bg-subtle", className)} {...props}>
      {children}
      <CaretRightIcon className="ml-auto size-4.5 text-fg-muted" />
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
