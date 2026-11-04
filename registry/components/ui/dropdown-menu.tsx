"use client";

import * as React from "react";
import { Menu as ChakraMenu, Portal } from "@chakra-ui/react";
import { CaretRightIcon, CheckIcon } from "@phosphor-icons/react/ssr";

import { usePortalContainer } from "@/lib/surface";
import { cn } from "@/lib/utils";

// A menu, from the console's Chakra menu theme:
// the panel is white with no edge, 16px corners, the floating shadow and 4px of padding; items are rows of at least
// 36px (12px sides, 8px above and below) with 12px corners and a 14px regular ink label after a 16px glyph in the
// label's color, 4px apart, with the deeper lilac under the highlighted row and no fade (menus are used by keyboard and
// many times a day). Check and radio marks sit at the end of the row: a bold 16px check in the brand purple. Section
// labels are 12px regular in the brand purple, separators the subtle hairline, shortcuts 12px muted, destructive items
// red. The panel grows out of its trigger from 98 percent with a fade (160ms) and leaves in 100ms.
const CONTENT =
  "z-50 max-h-(--available-height) min-w-48 overflow-x-hidden overflow-y-auto rounded-panel bg-surface p-1 text-fg shadow-floating outline-none data-[state=closed]:animate-pop-out data-[state=open]:animate-pop-in [&_[role^=menuitem]+[role^=menuitem]]:mt-1";
const ITEM =
  "relative flex min-h-9 cursor-default items-center gap-3 rounded-control px-3 py-2 font-sans text-body leading-line-body font-normal text-fg outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-subtle-hover data-[inset]:pl-10 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";

// The trigger, so focus can go back to it when the menu closes.
const TriggerRef = React.createContext<React.RefObject<HTMLElement | null> | null>(null);

type MenuProps = Omit<React.ComponentProps<typeof ChakraMenu.Root>, "onOpenChange"> & { onOpenChange?: (open: boolean) => void };
function DropdownMenu({ onOpenChange, onExitComplete, ...props }: MenuProps) {
  const trigger = React.useRef<HTMLElement | null>(null);
  const restore = React.useCallback(() => {
    if (document.activeElement === document.body || document.activeElement === null) trigger.current?.focus();
  }, []);
  return (
    <TriggerRef.Provider value={trigger}>
      <ChakraMenu.Root
        unstyled
        data-slot="dropdown-menu"
        onOpenChange={(details) => {
          onOpenChange?.(details.open);
          // Closing right after a keyboard open can leave focus on the page body (the menu's own first-item focus lands
          // in the panel as it leaves). Hand it back to the trigger then; focus moved on purpose (a dialog an item opened)
          // is left alone.
          if (!details.open) requestAnimationFrame(() => requestAnimationFrame(restore));
        }}
        // And again once the panel has left: its unmount can drop focus after the close.
        onExitComplete={() => {
          onExitComplete?.();
          restore();
        }}
        {...props}
      />
    </TriggerRef.Provider>
  );
}

function DropdownMenuPortal(props: React.ComponentProps<typeof Portal>) {
  const container = usePortalContainer();
  const portalRef = React.useMemo(() => container ? { current: container } : undefined, [container]);
  return <Portal data-slot="dropdown-menu-portal" container={portalRef} {...props} />;
}

function DropdownMenuTrigger({ ref, ...props }: React.ComponentProps<typeof ChakraMenu.Trigger>) {
  const trigger = React.useContext(TriggerRef);
  const setRef = React.useCallback(
    (node: HTMLButtonElement | null) => {
      if (trigger) trigger.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [trigger, ref],
  );
  return <ChakraMenu.Trigger ref={setRef} data-slot="dropdown-menu-trigger" {...props} />;
}

function DropdownMenuContent({ className, sideOffset = 8, align, onFocus, ...props }: Omit<React.ComponentProps<typeof ChakraMenu.Content>, "align"> & { sideOffset?: number; align?: "start" | "center" | "end" }) {
  const trigger = React.useContext(TriggerRef);
  return (
    <DropdownMenuPortal>
      <ChakraMenu.Positioner data-align={align}>
        <ChakraMenu.Content
          unstyled
          data-slot="dropdown-menu-content"
          style={{ marginBlockStart: sideOffset }}
          className={cn(CONTENT, "origin-(--transform-origin)", className)}
          onFocus={(event) => {
            onFocus?.(event);
            // A keyboard open focuses the panel a moment later; if the menu closed first (a quick Escape), that focus
            // would land in a panel that is leaving. Send it back to the trigger.
            if (event.currentTarget.getAttribute("data-state") === "closed") trigger?.current?.focus();
          }}
          {...props}
        />
      </ChakraMenu.Positioner>
    </DropdownMenuPortal>
  );
}

function DropdownMenuGroup(props: React.ComponentProps<typeof ChakraMenu.ItemGroup>) {
  return <ChakraMenu.ItemGroup data-slot="dropdown-menu-group" {...props} />;
}

// An item's value identifies it to the menu (highlight, selection), so items without one each get their own: a label
// when the children are plain text, otherwise a generated id (a shared fallback would highlight every such row at once).
function useItemValue(value: string | undefined, children: React.ReactNode) {
  const id = React.useId();
  return value ?? (typeof children === "string" ? children : id);
}

function DropdownMenuItem({ className, inset, variant = "default", value, children, ...props }: Omit<React.ComponentProps<typeof ChakraMenu.Item>, "value"> & { value?: string; inset?: boolean; variant?: "default" | "destructive" }) {
  const itemValue = useItemValue(value, children);
  return (
    <ChakraMenu.Item unstyled
      data-slot="dropdown-menu-item"
      data-inset={inset || undefined}
      data-variant={variant}
      value={itemValue}
      className={cn(ITEM, "data-[variant=destructive]:text-danger data-[variant=destructive]:[&_svg]:text-danger", className)}
      {...props}
    >{children}</ChakraMenu.Item>
  );
}

function DropdownMenuCheckboxItem({ className, children, checked, onCheckedChange, value, ...props }: Omit<React.ComponentProps<typeof ChakraMenu.CheckboxItem>, "onCheckedChange" | "value"> & { value?: string; onCheckedChange?: (checked: boolean) => void }) {
  const itemValue = useItemValue(value, children);
  return (
    <ChakraMenu.CheckboxItem unstyled data-slot="dropdown-menu-checkbox-item" value={itemValue} checked={checked} onCheckedChange={onCheckedChange} className={cn(ITEM, className)} {...props}>
      {children}
      <span className="pointer-events-none ml-auto flex size-4 shrink-0 items-center justify-center">
        <ChakraMenu.ItemIndicator>
          <CheckIcon weight="bold" className="size-4 text-fg-brand" />
        </ChakraMenu.ItemIndicator>
      </span>
    </ChakraMenu.CheckboxItem>
  );
}

type RadioMenuProps = Omit<React.ComponentProps<typeof ChakraMenu.RadioItemGroup>, "onValueChange"> & { onValueChange?: (value: string) => void };
function DropdownMenuRadioGroup({ onValueChange, ...props }: RadioMenuProps) {
  return <ChakraMenu.RadioItemGroup data-slot="dropdown-menu-radio-group" onValueChange={(details) => onValueChange?.(details.value)} {...props} />;
}

// The selected choice takes the same end check as a checkbox item (the console's menu option).
function DropdownMenuRadioItem({ className, children, value, ...props }: Omit<React.ComponentProps<typeof ChakraMenu.RadioItem>, "value"> & { value?: string }) {
  const itemValue = useItemValue(value, children);
  return (
    <ChakraMenu.RadioItem unstyled data-slot="dropdown-menu-radio-item" value={itemValue} className={cn(ITEM, className)} {...props}>
      {children}
      <span className="pointer-events-none ml-auto flex size-4 shrink-0 items-center justify-center">
        <ChakraMenu.ItemIndicator>
          <CheckIcon weight="bold" className="size-4 text-fg-brand" />
        </ChakraMenu.ItemIndicator>
      </span>
    </ChakraMenu.RadioItem>
  );
}

// A heading above items: shadcn's label stands alone, so it is a plain element rather than Chakra's group label (which
// must sit inside a group).
function DropdownMenuLabel({ className, inset, ...props }: React.ComponentProps<"div"> & { inset?: boolean }) {
  return <div data-slot="dropdown-menu-label" data-inset={inset || undefined} className={cn("mx-3 my-2 font-sans text-caption leading-line-caption font-normal text-fg-brand data-[inset]:pl-7", className)} {...props} />;
}

function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<typeof ChakraMenu.Separator>) {
  return <ChakraMenu.Separator data-slot="dropdown-menu-separator" className={cn("my-2 h-px border-0 bg-line-subtle", className)} {...props} />;
}

function DropdownMenuShortcut({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="dropdown-menu-shortcut" className={cn("ml-auto pl-4 font-sans text-caption text-fg-muted", className)} {...props} />;
}

function DropdownMenuSub({ onOpenChange, ...props }: MenuProps) {
  return <ChakraMenu.Root unstyled data-slot="dropdown-menu-sub" onOpenChange={(details) => onOpenChange?.(details.open)} {...props} />;
}

function DropdownMenuSubTrigger({ className, inset, children, ...props }: React.ComponentProps<typeof ChakraMenu.TriggerItem> & { inset?: boolean }) {
  return (
    <ChakraMenu.TriggerItem unstyled data-slot="dropdown-menu-sub-trigger" data-inset={inset || undefined} className={cn(ITEM, "data-[state=open]:bg-subtle-hover", className)} {...props}>
      {children}
      <CaretRightIcon weight="bold" className="ml-auto size-4 text-fg-muted" />
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
