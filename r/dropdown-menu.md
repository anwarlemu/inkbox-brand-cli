# Dropdown Menu
A white menu panel of 36px rows with 12px corners, the deeper lilac under the highlighted row, purple section labels and a filled purple check circle at the end of a chosen row.

Install: npx inkbox-ds add dropdown-menu
Requires: theme, surface, utils
Packages: @chakra-ui/react, @phosphor-icons/react
Exports: DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuPortal, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger
Client boundary: yes
Reference: The Inkbox console's Chakra menu theme (src/theme/index.ts) and its menu option check; extrapolated from Figma 427:2715 for glyph rows and destructive items


## Usage
Use for actions on one thing behind a single control (an agent's row actions, the account menu), and for small option sets with DropdownMenuCheckboxItem or DropdownMenuRadioItem. Mark a destructive action with variant="destructive" and keep it last, after a separator.
- Avoid: Navigation between pages in a dropdown
- Avoid: More than one level of submenu
- Avoid: Animating the highlighted row
- Avoid: Icons that move on hover


## Examples
Example components: npx inkbox-ds add dropdown-menu button
Example packages: @phosphor-icons/react
[Preview](https://inkbox-ds.vercel.app/preview/dropdown-menu/Preview) | [Open](https://inkbox-ds.vercel.app/preview/dropdown-menu/Open) | [RowActions](https://inkbox-ds.vercel.app/preview/dropdown-menu/RowActions) | [Options](https://inkbox-ds.vercel.app/preview/dropdown-menu/Options)

examples/dropdown-menu.tsx

```tsx
"use client";

import * as React from "react";
import { BuildingsIcon, DotsThreeIcon, GearSixIcon, KeyIcon, PencilSimpleIcon, QuestionIcon, SignOutIcon, TrashIcon, UsersThreeIcon } from "@phosphor-icons/react/ssr";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function AccountItems() {
  return (
    <>
      <DropdownMenuLabel>Acme</DropdownMenuLabel>
      <DropdownMenuGroup>
        <DropdownMenuItem>
          <BuildingsIcon weight="fill" />
          My Organisation
          <DropdownMenuShortcut>⇧⌘O</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <KeyIcon weight="fill" />
          API Keys
          <DropdownMenuShortcut>⌘K</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <UsersThreeIcon weight="fill" />
            Invite people
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem>By email</DropdownMenuItem>
            <DropdownMenuItem>Copy invite link</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem>
          <GearSixIcon weight="fill" />
          Settings
        </DropdownMenuItem>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuItem>
        <QuestionIcon weight="fill" />
        Help
      </DropdownMenuItem>
      <DropdownMenuItem disabled>Billing (admins only)</DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive">
        <SignOutIcon weight="fill" />
        Log out
      </DropdownMenuItem>
    </>
  );
}

export function Preview() {
  return (
    <div className="flex justify-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">Account</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60">
          <AccountItems />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function Open() {
  return (
    <div className="flex min-h-110 items-start justify-center">
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">Account</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-60">
          <AccountItems />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function RowActions() {
  return (
    <div className="flex justify-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Actions for @acme">
            <DotsThreeIcon weight="bold" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem>
            <PencilSimpleIcon weight="fill" />
            Edit agent
          </DropdownMenuItem>
          <DropdownMenuItem>
            <KeyIcon weight="fill" />
            Rotate API key
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">
            <TrashIcon weight="fill" />
            Delete agent
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function Options() {
  const [channels, setChannels] = React.useState({ email: true, phone: true, imessage: false });
  const [mode, setMode] = React.useState("edge");
  return (
    <div className="flex justify-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">Filter</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>Channels</DropdownMenuLabel>
          <DropdownMenuCheckboxItem checked={channels.email} onCheckedChange={(v) => setChannels((c) => ({ ...c, email: v === true }))}>
            Email
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked={channels.phone} onCheckedChange={(v) => setChannels((c) => ({ ...c, phone: v === true }))}>
            Phone
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked={channels.imessage} onCheckedChange={(v) => setChannels((c) => ({ ...c, imessage: v === true }))}>
            iMessage
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Tunnel TLS mode</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={mode} onValueChange={setMode}>
            <DropdownMenuRadioItem value="edge">Edge (default)</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="passthrough">Passthrough</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

```

## Source

components/ui/dropdown-menu.tsx

```tsx
"use client";

import * as React from "react";
import { Menu as ChakraMenu, Portal } from "@chakra-ui/react";
import { CaretRightIcon, CheckCircleIcon } from "@phosphor-icons/react/ssr";

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
      <span className="pointer-events-none ml-auto flex size-5 shrink-0 items-center justify-center">
        <ChakraMenu.ItemIndicator>
          <CheckCircleIcon weight="fill" className="size-5 text-fg-brand" />
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
      <span className="pointer-events-none ml-auto flex size-5 shrink-0 items-center justify-center">
        <ChakraMenu.ItemIndicator>
          <CheckCircleIcon weight="fill" className="size-5 text-fg-brand" />
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

```
