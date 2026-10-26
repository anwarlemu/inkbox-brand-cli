# Item
A row of content: an email in the inbox, a webhook event, or a rail row, washing lilac when hovered or selected.

Install: npx inkbox-ds add item
Requires: theme, utils, separator
Packages: @chakra-ui/react, class-variance-authority
Exports: Item, ItemActions, ItemContent, ItemDescription, ItemFooter, ItemGroup, ItemHeader, ItemMedia, ItemSeparator, ItemTitle
Client boundary: yes
Reference: Figma 427:2715: Agent Workspace - Inbox (email list), Webhooks - Event catalog (event list), the rail


## Usage
Use for list rows that open something. An email: ItemHeader (sender, date) over ItemContent (ItemTitle subject, ItemDescription preview). A webhook event: ItemHeader (a sm Badge and an arrow) over the event name and its count. A rail row: size sm with ItemMedia variant="icon" and a filled glyph. Mark the open one with aria-current="true". Separate rows with ItemSeparator.
- Avoid: Bold titles
- Avoid: Gray descriptions in email and event lists (they are purple)
- Avoid: A card border around every row in a list


## Examples
Example components: npx inkbox-ds add item badge button
Example packages: @phosphor-icons/react
[Preview](https://inkbox-ds.vercel.app/preview/item/Preview) | [Events](https://inkbox-ds.vercel.app/preview/item/Events) | [Rail](https://inkbox-ds.vercel.app/preview/item/Rail) | [Variants](https://inkbox-ds.vercel.app/preview/item/Variants)

examples/item.tsx

```tsx
import { ArrowRightIcon, EnvelopeIcon, GearIcon, KeyIcon, PencilSimpleIcon, PhoneIcon, RobotIcon, UsersThreeIcon } from "@phosphor-icons/react/ssr";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemHeader, ItemMedia, ItemSeparator, ItemTitle } from "@/components/ui/item";

const EMAILS = [
  { from: "Ray Liao", when: "Yesterday", subject: "Inkbox A2A: publish your Agent Card and connect by...", preview: "Hello @acme, This is Ray, cofounder of Inkbox. This update is written for you..." },
  { from: "Ray Liao", when: "Jul 31", subject: "Agent-to-Agent on Inkbox: you can now delegate...", preview: "Hello @acme, This is Ray, cofounder of Inkbox. This week we took A2A across..." },
  { from: "Ray Liao", when: "Jul 31", subject: "Agent-to-Agent on Inkbox: you can now delegate...", preview: "Hello @acme, This is Ray, cofounder of Inkbox. Two new capabilities, with exact..." },
];

export function Preview() {
  return (
    <ItemGroup className="w-full max-w-96">
      {EMAILS.map((email, i) => (
        <div key={i}>
          {i > 0 && <ItemSeparator />}
          <Item asChild aria-current={i === 0 ? "true" : undefined}>
            <a href="#email">
              <ItemHeader>
                <span className="text-fg">{email.from}</span>
                <span className="text-fg-muted">{email.when}</span>
              </ItemHeader>
              <ItemContent>
                <ItemTitle className="w-full truncate">{email.subject}</ItemTitle>
                <ItemDescription className="line-clamp-1">{email.preview}</ItemDescription>
              </ItemContent>
            </a>
          </Item>
        </div>
      ))}
    </ItemGroup>
  );
}

export function Events() {
  return (
    <ItemGroup className="w-full max-w-96">
      {["message.sent", "message.delivered", "message.bounced"].map((event, i) => (
        <div key={event}>
          {i > 0 && <ItemSeparator />}
          <Item asChild data-selected={i === 0}>
            <button type="button" className="w-full text-left">
              <ItemHeader className="justify-start">
                <Badge variant="blue" size="sm">Email</Badge>
                <ArrowRightIcon aria-hidden className="size-4.5 text-fg-muted" />
              </ItemHeader>
              <ItemContent>
                <ItemTitle>{event}</ItemTitle>
                <ItemDescription>0 configured destinations</ItemDescription>
              </ItemContent>
            </button>
          </Item>
        </div>
      ))}
    </ItemGroup>
  );
}

export function Rail() {
  const rows = [
    { label: "Agent Workspace", icon: RobotIcon, current: true },
    { label: "Manage Agents", icon: UsersThreeIcon },
    { label: "API Keys", icon: KeyIcon },
    { label: "Email", icon: EnvelopeIcon },
    { label: "Phone", icon: PhoneIcon },
  ];
  return (
    <ItemGroup className="w-full max-w-66 gap-0.5">
      {rows.map(({ label, icon: Icon, current }) => (
        <Item key={label} size="sm" asChild aria-current={current ? "page" : undefined}>
          <a href={`#${label}`}>
            <ItemMedia variant="icon">
              <Icon weight="fill" />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>{label}</ItemTitle>
            </ItemContent>
          </a>
        </Item>
      ))}
    </ItemGroup>
  );
}

export function Variants() {
  return (
    <div className="grid w-full max-w-120 gap-3">
      <Item variant="outline">
        <ItemMedia variant="icon">
          <EnvelopeIcon weight="fill" />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>acme@inkboxmail.com</ItemTitle>
          <ItemDescription>Created Jul 27, 2026</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Button variant="ghost" size="icon" aria-label="Edit mailbox">
            <PencilSimpleIcon weight="fill" />
          </Button>
        </ItemActions>
      </Item>
      <Item variant="muted" size="sm">
        <ItemMedia variant="icon">
          <GearIcon weight="fill" />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Mailbox settings</ItemTitle>
        </ItemContent>
      </Item>
      <Item size="xs">
        <ItemContent>
          <ItemTitle>Shared iMessage Line: Enabled</ItemTitle>
        </ItemContent>
      </Item>
    </div>
  );
}

```

## Source

components/ui/item.tsx

```tsx
"use client";

import * as React from "react";
import { chakra } from "@chakra-ui/react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

// A row of content (Figma 427:2715): an email in the inbox list (sender and date over the subject and a purple preview),
// a webhook event (a tag and an arrow over the event name and a purple count), a rail row (a 22px filled glyph and a
// 14px label, 38px tall at size sm). `default` is bare and washes lilac under the pointer; a selected item
// (aria-current or data-selected) sits on the lilac with 8px corners. `outline` takes the field edge, `muted` the lilac.
function ItemGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div role="list" data-slot="item-group" className={cn("group/item-group flex flex-col", className)} {...props} />;
}

function ItemSeparator({ className, ...props }: React.ComponentProps<typeof Separator>) {
  return <Separator data-slot="item-separator" orientation="horizontal" className={cn("my-0.5", className)} {...props} />;
}

const itemVariants = cva(
  "group/item flex flex-wrap items-center rounded-control border border-transparent font-sans text-body leading-body text-fg outline-none transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring aria-[current=page]:bg-subtle aria-[current=true]:bg-subtle data-[selected=true]:bg-subtle motion-reduce:transition-none [a]:hover:bg-subtle [button]:hover:bg-subtle",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline: "border-line-field bg-surface",
        muted: "bg-subtle [a]:hover:bg-subtle-hover [button]:hover:bg-subtle-hover",
      },
      size: {
        default: "gap-3 p-3",
        sm: "min-h-9.5 gap-2.5 px-3 py-1.5",
        xs: "gap-2 px-2 py-1",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Item({ className, variant = "default", size = "default", asChild = false, ...props }: React.ComponentProps<"div"> & VariantProps<typeof itemVariants> & { asChild?: boolean }) {
  const Comp = asChild ? chakra.div : "div";
  // Chakra's factory renders its child in its place only when told to.
  const slotProps = asChild ? { asChild: true } : {};
  return <Comp {...slotProps} data-slot="item" data-variant={variant} data-size={size} className={cn(itemVariants({ variant, size, className }))} {...props} />;
}

const itemMediaVariants = cva("flex shrink-0 items-center justify-center gap-2 group-has-data-[slot=item-description]/item:self-start [&_svg]:pointer-events-none", {
  variants: {
    variant: {
      default: "bg-transparent",
      icon: "text-icon-default [&_svg:not([class*='size-'])]:size-6",
      image: "size-10 overflow-hidden rounded-pill [&_img]:size-full [&_img]:object-cover",
    },
  },
  defaultVariants: { variant: "default" },
});

function ItemMedia({ className, variant = "default", ...props }: React.ComponentProps<"div"> & VariantProps<typeof itemMediaVariants>) {
  return <div data-slot="item-media" data-variant={variant} className={cn(itemMediaVariants({ variant, className }))} {...props} />;
}

function ItemContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="item-content" className={cn("flex min-w-0 flex-1 flex-col gap-1 [&+[data-slot=item-content]]:flex-none", className)} {...props} />;
}

function ItemTitle({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="item-title" className={cn("flex w-fit min-w-0 items-center gap-2 text-body leading-tight text-fg", className)} {...props} />;
}

/** The purple line under a title (a preview, a count), clamped to two lines. */
function ItemDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="item-description" className={cn("line-clamp-2 text-body leading-tight font-normal text-balance text-fg-brand [&>a]:underline [&>a]:underline-offset-4", className)} {...props} />;
}

function ItemActions({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="item-actions" className={cn("flex items-center gap-1", className)} {...props} />;
}

/** The top line of an item: what it is at the left (sender, tag), when or where at the right (date, arrow). */
function ItemHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="item-header" className={cn("flex basis-full items-center justify-between gap-2 text-body leading-tight", className)} {...props} />;
}

function ItemFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="item-footer" className={cn("flex basis-full items-center justify-between gap-2", className)} {...props} />;
}

export { Item, ItemActions, ItemContent, ItemDescription, ItemFooter, ItemGroup, ItemHeader, ItemMedia, ItemSeparator, ItemTitle };

```
