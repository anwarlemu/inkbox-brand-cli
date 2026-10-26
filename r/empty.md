# Empty
The centered empty state: the 3D octopus under an arc of glyph circles, a 22px bold title, a short description and a purple pill.

Install: npx inkbox-ds add empty
Requires: theme, utils
Packages: class-variance-authority
Exports: Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMascot, EmptyMedia, EmptyOrbit, EmptyTitle
Client boundary: not required by this entry file
Reference: Figma 427:2715: Dashboard - empty state (Create Your First Agent), Agent Workspace - Inbox - Not selected (No email selected)


## Usage
Use where a list or pane has nothing yet (Create Your First Agent, No email selected). Put EmptyOrbit (up to five filled glyphs of what the area holds) and EmptyMascot in an EmptyMedia variant="mascot", then the title, a one-sentence description and one default Button with a plus. For a smaller pane, use EmptyMedia variant="icon" with one glyph.
- Avoid: More than one action
- Avoid: Animating the orbit
- Avoid: A title longer than five words
- Avoid: Gray stock illustrations


## Examples
Example components: npx inkbox-ds add empty button
Example packages: @phosphor-icons/react
[Preview](https://inkbox-ds.vercel.app/preview/empty/Preview) | [NoSelection](https://inkbox-ds.vercel.app/preview/empty/NoSelection) | [Icon](https://inkbox-ds.vercel.app/preview/empty/Icon)

examples/empty.tsx

```tsx
import { ArrowsHorizontalIcon, ChatCircleIcon, EnvelopeIcon, EnvelopeOpenIcon, EnvelopeSimpleIcon, PaperPlaneTiltIcon, PhoneIcon, PlusIcon, TextAlignLeftIcon, TrayIcon, VaultIcon } from "@phosphor-icons/react/ssr";

import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMascot, EmptyMedia, EmptyOrbit, EmptyTitle } from "@/components/ui/empty";

export function Preview() {
  return (
    <Empty className="min-h-100">
      <EmptyMedia variant="mascot">
        <EmptyOrbit>
          <EnvelopeIcon weight="fill" />
          <PhoneIcon weight="fill" />
          <ChatCircleIcon weight="bold" className="size-7 text-success" />
          <ArrowsHorizontalIcon weight="bold" />
          <VaultIcon weight="fill" />
        </EmptyOrbit>
        <EmptyMascot src="/octopus.png" />
      </EmptyMedia>
      <EmptyHeader>
        <EmptyTitle>Create Your First Agent</EmptyTitle>
        <EmptyDescription>Set up an identity to unlock mailbox, phone, and vault features</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button>
          <PlusIcon />
          Create Agent
        </Button>
      </EmptyContent>
    </Empty>
  );
}

export function NoSelection() {
  return (
    <Empty className="min-h-100">
      <EmptyMedia variant="mascot">
        <EmptyOrbit>
          <TextAlignLeftIcon weight="bold" />
          <EnvelopeOpenIcon weight="fill" />
          <EnvelopeSimpleIcon weight="fill" />
          <PaperPlaneTiltIcon weight="fill" />
          <TrayIcon weight="fill" />
        </EmptyOrbit>
        <EmptyMascot src="/octopus.png" />
      </EmptyMedia>
      <EmptyHeader>
        <EmptyTitle>No email selected</EmptyTitle>
        <EmptyDescription>Select an email from the list to read it</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button>
          <PlusIcon />
          Compose Email
        </Button>
      </EmptyContent>
    </Empty>
  );
}

export function Icon() {
  return (
    <Empty className="min-h-72">
      <EmptyMedia variant="icon">
        <TrayIcon weight="fill" />
      </EmptyMedia>
      <EmptyHeader>
        <EmptyTitle>No emails to display</EmptyTitle>
        <EmptyDescription>New mail for @acme lands here.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

```

## Source

components/ui/empty.tsx

```tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// The console's empty states (Figma 427:2715: Create Your First Agent, No email selected). Centered: the media, a 22px
// bold ink title, a 14px description on 24px lines in the secondary purple, at most 248px wide, then the action (a purple pill). The
// `mascot` media is the 3D octopus with a soft shadow under it; EmptyOrbit arcs up to five 40px white circles holding
// the channel glyphs above it. Nothing moves: the empty state is seen every time the page loads.
function Empty({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="empty" className={cn("flex min-w-0 flex-1 flex-col items-center justify-center gap-5 p-6 text-center text-balance", className)} {...props} />;
}

function EmptyHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="empty-header" className={cn("flex max-w-sm flex-col items-center gap-2", className)} {...props} />;
}

const emptyMediaVariants = cva("flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0", {
  variants: {
    variant: {
      default: "bg-transparent",
      icon: "size-10 rounded-pill border border-line-subtle bg-surface text-icon-secondary shadow-line [&_svg:not([class*='size-'])]:size-5.5",
      mascot: "relative mb-1 w-56 flex-col",
    },
  },
  defaultVariants: { variant: "default" },
});

function EmptyMedia({ className, variant = "default", ...props }: React.ComponentProps<"div"> & VariantProps<typeof emptyMediaVariants>) {
  return <div data-slot="empty-media" data-variant={variant} className={cn(emptyMediaVariants({ variant }), className)} {...props} />;
}

// Where each circle sits on the arc over the mascot, outermost first: left offset and top, in px of a 224px box.
const ORBIT = [
  [0, 32],
  [44, 12],
  [92, 0],
  [140, 12],
  [184, 32],
] as const;

/** Up to five glyphs in white circles, arced over the mascot (email, phone, iMessage, agent to agent, vault). */
function EmptyOrbit({ className, children, ...props }: React.ComponentProps<"div">) {
  const glyphs = React.Children.toArray(children).slice(0, 5);
  const start = Math.floor((5 - glyphs.length) / 2);
  return (
    <div data-slot="empty-orbit" aria-hidden className={cn("relative h-13 w-56", className)} {...props}>
      {glyphs.map((glyph, i) => {
        const [left, top] = ORBIT[start + i];
        return (
          <span key={i} className="absolute flex size-10 items-center justify-center rounded-pill border border-line-subtle bg-surface text-icon-secondary shadow-line [&_svg:not([class*='size-'])]:size-5.5 [&_svg]:shrink-0" style={{ left, top }}>
            {glyph}
          </span>
        );
      })}
    </div>
  );
}

/** The 3D octopus, standing on a soft shadow. Pass its image as src (the brand's octopus.png). */
function EmptyMascot({ className, alt = "", ...props }: React.ComponentProps<"img">) {
  return (
    <span data-slot="empty-mascot" className="relative -mt-1 flex justify-center after:absolute after:-bottom-1 after:left-1/2 after:h-3 after:w-20 after:-translate-x-1/2 after:rounded-pill after:bg-ink after:opacity-10 after:blur-md">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img alt={alt} width={90} height={80} className={cn("relative z-10 h-20 w-auto select-none", className)} draggable={false} {...props} />
    </span>
  );
}

function EmptyTitle({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="empty-title" className={cn("font-sans text-h2 leading-tight font-bold text-fg", className)} {...props} />;
}

function EmptyDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="empty-description" className={cn("max-w-62 text-body leading-6 text-pretty text-fg-secondary [&>a]:text-fg-brand [&>a]:underline [&>a]:underline-offset-4", className)} {...props} />;
}

function EmptyContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="empty-content" className={cn("flex w-full max-w-sm min-w-0 flex-col items-center gap-3 text-body text-balance", className)} {...props} />;
}

export { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMascot, EmptyMedia, EmptyOrbit, EmptyTitle };

```
