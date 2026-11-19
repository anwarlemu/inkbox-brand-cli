# Badge
28px pills with 12px medium labels on light fills (green, red, blue, purple, gray, yellow), the pink plan mark, the green Included pill, the red unread count and the tunnel's status wells.

Install: npx inkbox-ds add badge
Requires: theme, utils
Packages: @chakra-ui/react, class-variance-authority
Exports: Badge, badgeVariants
Client boundary: yes
Reference: Console Badge theme and the rail's notification count; Figma 427:2715: the rail (BETA, ADMIN), Create Agent Identity (Included), Tunnel (Active, Idle, Edge)


## Usage
Use green, red, blue, purple, gray or yellow for a status or tag (Active, Failed, Email, Signed, Draft, Pending). Use pink for a feature or role mark beside a label (BETA, ADMIN), success size lg with a filled check-circle for something granted (Included), count for an unread number, and size well for a status reading (Active on green, Idle on gray, Edge on blue). Default (purple) and destructive are for counts and errors.
- Avoid: Caps typed with CSS
- Avoid: A badge as a button
- Avoid: More than three badges in a row
- Avoid: Saturated fills behind text
- Avoid: Regular-weight badge labels


## Examples
Example components: npx inkbox-ds add badge
Example packages: @phosphor-icons/react
[Preview](https://inkbox-ds.vercel.app/preview/badge/Preview) | [Tags](https://inkbox-ds.vercel.app/preview/badge/Tags) | [Count](https://inkbox-ds.vercel.app/preview/badge/Count) | [Status](https://inkbox-ds.vercel.app/preview/badge/Status) | [Variants](https://inkbox-ds.vercel.app/preview/badge/Variants)

examples/badge.tsx

```tsx
import { CheckCircleIcon } from "@phosphor-icons/react/ssr";

import { Badge } from "@/components/ui/badge";

export function Preview() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="flex items-center gap-2.5 text-body text-fg">
        Agent2Agent
        <Badge variant="pink">BETA</Badge>
      </span>
      <span className="flex items-center gap-2.5 text-body text-fg">
        My Organisation
        <Badge variant="pink">ADMIN</Badge>
      </span>
      <Badge variant="success" size="lg">
        <CheckCircleIcon weight="fill" />
        Included
      </Badge>
    </div>
  );
}

export function Tags() {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge variant="green">Active</Badge>
      <Badge variant="red">Failed</Badge>
      <Badge variant="blue">Email</Badge>
      <Badge variant="purple">Signed</Badge>
      <Badge variant="gray">Fire-and-forget</Badge>
      <Badge variant="yellow">Pending</Badge>
    </div>
  );
}

export function Count() {
  return (
    <span className="flex items-center gap-2 text-body text-fg">
      Inbox
      <Badge variant="count">12</Badge>
    </span>
  );
}

export function Status() {
  return (
    <div className="flex flex-wrap items-center gap-6">
      <Badge variant="green" size="well">Active</Badge>
      <Badge variant="gray" size="well">Idle</Badge>
      <Badge variant="blue" size="well">Edge</Badge>
    </div>
  );
}

export function Variants() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge>3 new</Badge>
      <Badge variant="secondary">Draft</Badge>
      <Badge variant="outline">Webhook</Badge>
      <Badge variant="destructive">Failed</Badge>
      <Badge variant="ghost">Archived</Badge>
      <Badge variant="link" asChild>
        <a href="https://inkbox.ai/docs" target="_blank" rel="noreferrer">Docs</a>
      </Badge>
    </div>
  );
}

```

## Source

components/ui/badge.tsx

```tsx
"use client";

import * as React from "react";
import { chakra } from "@chakra-ui/react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// The console's badges (the Badge theme): a 28px pill with 12px sides, a 12px medium label on a 1 line, no caps, a light
// fill under dark ink. green is success, red the pink with the strong red, blue the tag blue with the info ink, purple
// the tag purple with the deep purple, gray the lilac hover, yellow the warning sand. `count` is the rail's small red
// number (16px tall, at least 22px wide, 8px corners, white on the red). `pink` is the 22px plan mark (BETA, ADMIN) with a
// pink edge, `success` the white Included pill with a green edge. Size `well` makes the tunnel's 38px status wells;
// sm and lg remain for dense tags and the Included pill.
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-pill border border-transparent font-sans font-medium whitespace-nowrap normal-case transition-[background-color,color] duration-fast ease-out focus-visible:shadow-focus focus-visible:outline-none motion-reduce:transition-none [&>svg]:pointer-events-none [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-on-primary [a&]:hover:bg-primary-hover",
        secondary: "bg-subtle text-fg [a&]:hover:bg-subtle-hover",
        destructive: "bg-danger text-white",
        outline: "border-line-field bg-surface text-fg [a&]:hover:bg-subtle",
        ghost: "text-fg-secondary [a&]:hover:bg-subtle",
        link: "text-fg-brand underline-offset-4 [a&]:hover:underline",
        pink: "rounded-pill border-pink bg-surface text-pink",
        success: "rounded-pill border-success bg-surface text-success",
        green: "bg-success-bg text-success",
        red: "bg-pink text-danger-strong",
        blue: "bg-tag-blue text-info-fg",
        purple: "bg-tag-purple text-primary-hover",
        gray: "bg-subtle-hover text-fg",
        yellow: "bg-warning-bg text-warning-fg",
        count: "rounded-sm bg-danger text-white",
      },
      size: {
        sm: "h-4.5 px-1 text-micro leading-tight [&>svg]:size-3.5",
        default: "h-7 px-3 text-caption leading-none [&>svg]:size-4",
        lg: "h-7 gap-1.5 pr-2.5 pl-1 text-body leading-tight [&>svg]:size-5.5",
        well: "h-9.5 rounded-pill px-3.5 text-body leading-tight font-normal text-fg [&>svg]:size-5.5",
      },
    },
    compoundVariants: [
      { variant: "pink", size: "default", className: "h-5.5 px-1.5" },
      { variant: "count", size: "default", className: "h-4 min-w-5.5 px-1.5 text-micro tabular-nums" },
    ],
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Badge({ className, variant, size, asChild = false, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? chakra.span : "span";
  // Chakra's factory renders its child in its place only when told to.
  const slotProps = asChild ? { asChild: true } : {};
  return <Comp {...slotProps} data-slot="badge" data-variant={variant ?? "default"} className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}

export { Badge, badgeVariants };

```
