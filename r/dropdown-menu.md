# Dropdown Menu
A raised white menu of 36px rows with filled glyphs, lilac highlight, purple section labels and checks.

Install: npx inkbox-ds add dropdown-menu
Requires: theme, surface, utils
Packages: @chakra-ui/react, @phosphor-icons/react
Exports: DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuPortal, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger
Client boundary: yes
Reference: Extrapolated from the Inkbox console (Figma 427:2715): nav rows (38px, 8px corners, filled glyphs, lilac current row), section labels (Channels), the raised panel


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
      <DropdownMenuLabel>Robert Ligthart</DropdownMenuLabel>
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

function DropdownMenuContent({ className, sideOffset = 6, align, onFocus, ...props }: Omit<React.ComponentProps<typeof ChakraMenu.Content>, "align"> & { sideOffset?: number; align?: "start" | "center" | "end" }) {
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

// A heading above items: shadcn's label stands alone, so it is a plain element rather than Chakra's group label (which
// must sit inside a group).
function DropdownMenuLabel({ className, inset, ...props }: React.ComponentProps<"div"> & { inset?: boolean }) {
  return <div data-slot="dropdown-menu-label" data-inset={inset || undefined} className={cn("px-2.5 pt-2 pb-1 font-sans text-body-sm leading-tight text-fg-label data-[inset]:pl-10.5", className)} {...props} />;
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

```
