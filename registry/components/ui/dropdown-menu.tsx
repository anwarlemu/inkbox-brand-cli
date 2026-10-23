"use client";

import * as React from "react";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import { CaretRightIcon, CheckIcon } from "@phosphor-icons/react/ssr";

import { usePortalContainer } from "@/lib/surface";
import { cn } from "@/lib/utils";

// A menu, extrapolated from the console (Figma 427:2715): the panel is a raised white panel (8px corners, the floating
// shadow) with 4px of padding; items are 36px rows with 8px corners like the rail's nav rows, a 20px glyph in the
// action-glyph purple 10px from a 14px ink label, and the lilac under the highlighted row. Section labels are 13px in
// the label purple ("Channels"), separators the rail's hairline, shortcuts 12px muted, destructive items red. The
// panel grows out of its trigger from 96 percent with a fade; highlighting a row is instant (menus are used by keyboard
// and many times a day).
const CONTENT =
  "z-50 max-h-(--radix-dropdown-menu-content-available-height) min-w-48 overflow-x-hidden overflow-y-auto rounded-control bg-surface p-1 text-fg shadow-floating outline-none data-[state=closed]:animate-pop-out data-[state=open]:animate-pop-in";
const ITEM =
  "relative flex h-9 cursor-default items-center gap-2.5 rounded-control px-2.5 font-sans text-body leading-tight text-fg outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-subtle data-[inset]:pl-10.5 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5.5 [&_svg:not([class*='text-'])]:text-icon-secondary";

function DropdownMenu(props: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
}

function DropdownMenuPortal(props: React.ComponentProps<typeof DropdownMenuPrimitive.Portal>) {
  const container = usePortalContainer();
  return <DropdownMenuPrimitive.Portal data-slot="dropdown-menu-portal" container={container} {...props} />;
}

function DropdownMenuTrigger(props: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
  return <DropdownMenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />;
}

function DropdownMenuContent({ className, sideOffset = 6, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPortal>
      <DropdownMenuPrimitive.Content data-slot="dropdown-menu-content" sideOffset={sideOffset} className={cn(CONTENT, "origin-(--radix-dropdown-menu-content-transform-origin)", className)} {...props} />
    </DropdownMenuPortal>
  );
}

function DropdownMenuGroup(props: React.ComponentProps<typeof DropdownMenuPrimitive.Group>) {
  return <DropdownMenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />;
}

function DropdownMenuItem({ className, inset, variant = "default", ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & { inset?: boolean; variant?: "default" | "destructive" }) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset || undefined}
      data-variant={variant}
      className={cn(ITEM, "data-[variant=destructive]:text-danger data-[variant=destructive]:[&_svg]:text-danger", className)}
      {...props}
    />
  );
}

function DropdownMenuCheckboxItem({ className, children, checked, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>) {
  return (
    <DropdownMenuPrimitive.CheckboxItem data-slot="dropdown-menu-checkbox-item" checked={checked} className={cn(ITEM, "pl-10.5", className)} {...props}>
      <span className="pointer-events-none absolute left-2.5 flex size-5.5 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <CheckIcon weight="bold" className="size-4.5 text-fg-brand" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  );
}

function DropdownMenuRadioGroup(props: React.ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>) {
  return <DropdownMenuPrimitive.RadioGroup data-slot="dropdown-menu-radio-group" {...props} />;
}

// The selected choice wears the console's radio mark: a pink ring around white.
function DropdownMenuRadioItem({ className, children, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem>) {
  return (
    <DropdownMenuPrimitive.RadioItem data-slot="dropdown-menu-radio-item" className={cn(ITEM, "pl-10.5", className)} {...props}>
      <span className="pointer-events-none absolute left-2.5 flex size-5.5 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <span className="block size-3.5 rounded-pill border-[3.5px] border-pink bg-surface" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  );
}

function DropdownMenuLabel({ className, inset, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Label> & { inset?: boolean }) {
  return <DropdownMenuPrimitive.Label data-slot="dropdown-menu-label" data-inset={inset || undefined} className={cn("px-2.5 pt-2 pb-1 font-sans text-body-sm leading-tight text-fg-label data-[inset]:pl-10.5", className)} {...props} />;
}

function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return <DropdownMenuPrimitive.Separator data-slot="dropdown-menu-separator" className={cn("-mx-1 my-1 h-px bg-line-subtle", className)} {...props} />;
}

function DropdownMenuShortcut({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="dropdown-menu-shortcut" className={cn("ml-auto pl-4 font-sans text-caption text-fg-muted", className)} {...props} />;
}

function DropdownMenuSub(props: React.ComponentProps<typeof DropdownMenuPrimitive.Sub>) {
  return <DropdownMenuPrimitive.Sub data-slot="dropdown-menu-sub" {...props} />;
}

function DropdownMenuSubTrigger({ className, inset, children, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & { inset?: boolean }) {
  return (
    <DropdownMenuPrimitive.SubTrigger data-slot="dropdown-menu-sub-trigger" data-inset={inset || undefined} className={cn(ITEM, "data-[state=open]:bg-subtle", className)} {...props}>
      {children}
      <CaretRightIcon className="ml-auto size-4.5 text-fg-muted" />
    </DropdownMenuPrimitive.SubTrigger>
  );
}

function DropdownMenuSubContent({ className, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
  return (
    <DropdownMenuPortal>
      <DropdownMenuPrimitive.SubContent data-slot="dropdown-menu-sub-content" className={cn(CONTENT, "max-h-(--radix-dropdown-menu-content-available-height) origin-(--radix-dropdown-menu-content-transform-origin)", className)} {...props} />
    </DropdownMenuPortal>
  );
}

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
};
