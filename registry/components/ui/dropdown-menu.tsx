"use client";

import * as React from "react";
import { Menu as ChakraMenu, Portal } from "@chakra-ui/react";
import { CaretRightIcon, CheckIcon } from "@phosphor-icons/react/ssr";

import { usePortalContainer } from "@/lib/surface";
import { cn } from "@/lib/utils";

// A menu, extrapolated from the console (Figma 427:2715): the panel is a raised white panel (16px corners, the floating
// shadow) with 4px of padding; items are 36px rows with fully rounded corners like the rail's nav rows, a 20px glyph in the
// action-glyph purple 10px from a 14px ink label, and the lilac under the highlighted row. Section labels are 13px in
// the label purple ("Channels"), separators the rail's hairline, shortcuts 12px muted, destructive items red. The
// panel grows out of its trigger from 96 percent with a fade; highlighting a row is instant (menus are used by keyboard
// and many times a day).
const CONTENT =
  "z-50 max-h-(--available-height) min-w-48 overflow-x-hidden overflow-y-auto rounded-panel bg-surface p-1 text-fg shadow-floating outline-none data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in";
const ITEM =
  "relative flex h-9 cursor-default items-center gap-2.5 rounded-pill px-2.5 font-sans text-body leading-tight text-fg outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-subtle data-[inset]:pl-10.5 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5.5 [&_svg:not([class*='text-'])]:text-icon-secondary";

type MenuProps = Omit<React.ComponentProps<typeof ChakraMenu.Root>, "onOpenChange"> & { onOpenChange?: (open: boolean) => void };
function DropdownMenu({ onOpenChange, ...props }: MenuProps) {
  return <ChakraMenu.Root unstyled data-slot="dropdown-menu" onOpenChange={(details) => onOpenChange?.(details.open)} {...props} />;
}

function DropdownMenuPortal(props: React.ComponentProps<typeof Portal>) {
  const container = usePortalContainer();
  const portalRef = React.useMemo(() => container ? { current: container } : undefined, [container]);
  return <Portal data-slot="dropdown-menu-portal" container={portalRef} {...props} />;
}

function DropdownMenuTrigger(props: React.ComponentProps<typeof ChakraMenu.Trigger>) {
  return <ChakraMenu.Trigger data-slot="dropdown-menu-trigger" {...props} />;
}

function DropdownMenuContent({ className, sideOffset = 6, align, ...props }: Omit<React.ComponentProps<typeof ChakraMenu.Content>, "align"> & { sideOffset?: number; align?: "start" | "center" | "end" }) {
  return (
    <DropdownMenuPortal>
      <ChakraMenu.Positioner data-align={align}>
        <ChakraMenu.Content unstyled data-slot="dropdown-menu-content" style={{ marginBlockStart: sideOffset }} className={cn(CONTENT, "origin-(--transform-origin)", className)} {...props} />
      </ChakraMenu.Positioner>
    </DropdownMenuPortal>
  );
}

function DropdownMenuGroup(props: React.ComponentProps<typeof ChakraMenu.ItemGroup>) {
  return <ChakraMenu.ItemGroup data-slot="dropdown-menu-group" {...props} />;
}

function DropdownMenuItem({ className, inset, variant = "default", value, children, ...props }: Omit<React.ComponentProps<typeof ChakraMenu.Item>, "value"> & { value?: string; inset?: boolean; variant?: "default" | "destructive" }) {
  return (
    <ChakraMenu.Item unstyled
      data-slot="dropdown-menu-item"
      data-inset={inset || undefined}
      data-variant={variant}
      value={value ?? (typeof children === "string" ? children : "menu-item")}
      className={cn(ITEM, "data-[variant=destructive]:text-danger data-[variant=destructive]:[&_svg]:text-danger", className)}
      {...props}
    >{children}</ChakraMenu.Item>
  );
}

function DropdownMenuCheckboxItem({ className, children, checked, onCheckedChange, value, ...props }: Omit<React.ComponentProps<typeof ChakraMenu.CheckboxItem>, "onCheckedChange" | "value"> & { value?: string; onCheckedChange?: (checked: boolean) => void }) {
  return (
    <ChakraMenu.CheckboxItem unstyled data-slot="dropdown-menu-checkbox-item" value={value ?? (typeof children === "string" ? children : "menu-checkbox-item")} checked={checked} onCheckedChange={onCheckedChange} className={cn(ITEM, "pl-10.5", className)} {...props}>
      <span className="pointer-events-none absolute left-2.5 flex size-5.5 items-center justify-center">
        <ChakraMenu.ItemIndicator>
          <CheckIcon weight="bold" className="size-4.5 text-fg-brand" />
        </ChakraMenu.ItemIndicator>
      </span>
      {children}
    </ChakraMenu.CheckboxItem>
  );
}

type RadioMenuProps = Omit<React.ComponentProps<typeof ChakraMenu.RadioItemGroup>, "onValueChange"> & { onValueChange?: (value: string) => void };
function DropdownMenuRadioGroup({ onValueChange, ...props }: RadioMenuProps) {
  return <ChakraMenu.RadioItemGroup data-slot="dropdown-menu-radio-group" onValueChange={(details) => onValueChange?.(details.value)} {...props} />;
}

// The selected choice wears the console's radio mark: a pink ring around white.
function DropdownMenuRadioItem({ className, children, value, ...props }: Omit<React.ComponentProps<typeof ChakraMenu.RadioItem>, "value"> & { value?: string }) {
  return (
    <ChakraMenu.RadioItem unstyled data-slot="dropdown-menu-radio-item" value={value ?? (typeof children === "string" ? children : "menu-radio-item")} className={cn(ITEM, "pl-10.5", className)} {...props}>
      <span className="pointer-events-none absolute left-2.5 flex size-5.5 items-center justify-center">
        <ChakraMenu.ItemIndicator>
          <span className="block size-3.5 rounded-pill border-[3.5px] border-pink bg-surface" />
        </ChakraMenu.ItemIndicator>
      </span>
      {children}
    </ChakraMenu.RadioItem>
  );
}

function DropdownMenuLabel({ className, inset, ...props }: React.ComponentProps<typeof ChakraMenu.ItemGroupLabel> & { inset?: boolean }) {
  return <ChakraMenu.ItemGroupLabel data-slot="dropdown-menu-label" data-inset={inset || undefined} className={cn("px-2.5 pt-2 pb-1 font-sans text-body-sm leading-tight text-fg-label data-[inset]:pl-10.5", className)} {...props} />;
}

function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<typeof ChakraMenu.Separator>) {
  return <ChakraMenu.Separator data-slot="dropdown-menu-separator" className={cn("-mx-1 my-1 h-px bg-line-subtle", className)} {...props} />;
}

function DropdownMenuShortcut({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="dropdown-menu-shortcut" className={cn("ml-auto pl-4 font-sans text-caption text-fg-muted", className)} {...props} />;
}

function DropdownMenuSub({ onOpenChange, ...props }: MenuProps) {
  return <ChakraMenu.Root unstyled data-slot="dropdown-menu-sub" onOpenChange={(details) => onOpenChange?.(details.open)} {...props} />;
}

function DropdownMenuSubTrigger({ className, inset, children, ...props }: React.ComponentProps<typeof ChakraMenu.TriggerItem> & { inset?: boolean }) {
  return (
    <ChakraMenu.TriggerItem unstyled data-slot="dropdown-menu-sub-trigger" data-inset={inset || undefined} className={cn(ITEM, "data-[state=open]:bg-subtle", className)} {...props}>
      {children}
      <CaretRightIcon className="ml-auto size-4.5 text-fg-muted" />
    </ChakraMenu.TriggerItem>
  );
}

function DropdownMenuSubContent({ className, ...props }: React.ComponentProps<typeof ChakraMenu.Content>) {
  return (
    <DropdownMenuPortal>
      <ChakraMenu.Positioner>
        <ChakraMenu.Content unstyled data-slot="dropdown-menu-sub-content" className={cn(CONTENT, "origin-(--transform-origin)", className)} {...props} />
      </ChakraMenu.Positioner>
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
