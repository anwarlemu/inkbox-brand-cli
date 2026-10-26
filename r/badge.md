# Badge
The pink BETA and ADMIN marks, the green Included pill, the pale webhook tags, and the tunnel's status wells.

Install: npx inkbox-ds add badge
Requires: theme, utils
Packages: @chakra-ui/react, class-variance-authority
Exports: Badge, badgeVariants
Client boundary: yes
Reference: Figma 427:2715: the rail (BETA, ADMIN), Create Agent Identity (Included), Webhooks (Email, Signed, Fire-and-forget), iMessage (Blacklist), Tunnel (Active, Idle, Edge), Inbox (Unread)


## Usage
Use pink for a feature or role marker beside a label (BETA, ADMIN), success size lg with a filled check-circle for something granted (Included), blue, purple and gray at size sm for event tags (Email, Signed, Fire-and-forget), green size sm for a rule mode (Blacklist), and size well for a status reading (Active on green, Idle on gray, Edge on blue). Default (purple) and destructive are for counts and errors.
- Avoid: Caps typed with CSS
- Avoid: A badge as a button
- Avoid: More than three badges in a row
- Avoid: Saturated fills behind text


## Examples
Example components: npx inkbox-ds add badge
Example packages: @phosphor-icons/react
[Preview](https://inkbox-ds.vercel.app/preview/badge/Preview) | [Tags](https://inkbox-ds.vercel.app/preview/badge/Tags) | [Status](https://inkbox-ds.vercel.app/preview/badge/Status) | [Variants](https://inkbox-ds.vercel.app/preview/badge/Variants)

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
      <Badge variant="blue" size="sm">Email</Badge>
      <Badge variant="purple" size="sm">Signed</Badge>
      <Badge variant="gray" size="sm">Fire-and-forget</Badge>
      <Badge variant="green" size="sm">Blacklist</Badge>
      <Badge variant="blue" size="sm">Unread</Badge>
    </div>
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

// Every badge in the console (Figma 427:2715). `pink` is BETA and ADMIN: a 1px pink edge, fully rounded corners, 12px pink text,
// 22px tall with 6px sides and a 1px top inset to optically center the uppercase label. `success` is the Included pill:
// white with a 1px green edge, a filled check-circle (22px, the design's 20px glyph at Phosphor's proportions) 4px in and a 14px green label, 28px tall. `blue`, `purple` and `gray` are the webhook tags (Email, Signed,
// Fire-and-forget) at size sm: 11px medium on the pale fill, fully rounded corners, 17px tall; `green` is the Blacklist tag.
// At size `well` they become the tunnel's 38px status wells (Active, Idle, Edge): 14px ink, fully rounded corners.
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-pill border border-transparent font-sans whitespace-nowrap transition-[background-color,color] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring motion-reduce:transition-none [&>svg]:pointer-events-none [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-on-primary [a&]:hover:bg-primary-hover",
        secondary: "bg-subtle text-fg [a&]:hover:bg-subtle-hover",
        destructive: "bg-danger text-white",
        outline: "border-line-field bg-surface text-fg [a&]:hover:bg-subtle",
        ghost: "text-fg-secondary [a&]:hover:bg-subtle",
        link: "text-fg-brand underline-offset-4 [a&]:hover:underline",
        pink: "rounded-pill border-pink bg-surface pt-px text-pink",
        success: "rounded-pill border-success bg-surface text-success",
        green: "bg-success-bg text-fg",
        blue: "bg-tag-blue text-tag-blue-fg",
        purple: "bg-tag-purple text-tag-purple-fg",
        gray: "bg-tag-gray text-fg",
      },
      size: {
        sm: "h-4.5 px-1 text-micro leading-tight font-medium [&>svg]:size-3.5",
        default: "h-5.5 px-1.5 text-caption leading-none [&>svg]:size-4",
        lg: "h-7 gap-1.5 pr-2.5 pl-1 text-body leading-tight [&>svg]:size-5.5",
        well: "h-9.5 rounded-pill px-3.5 text-body leading-tight text-fg [&>svg]:size-5.5",
      },
    },
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
