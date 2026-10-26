# Hover Card
A raised white preview card with 16px corners that opens after a short pause on a link or handle.

Install: npx inkbox-ds add hover-card
Requires: theme, surface, utils
Packages: radix-ui
Exports: HoverCard, HoverCardContent, HoverCardTrigger
Client boundary: yes
Reference: Extrapolated from the Inkbox console (Figma 427:2715): the raised white panels and the avatar tile, with the shared popup radius


## Usage
Use to preview what a link or an agent handle points to (the agent's addresses, its channels) for people with a pointer. Keep the same information reachable by clicking: hover cards do not open on touch.
- Avoid: Actions that exist only inside the card
- Avoid: A card that opens instantly on hover
- Avoid: Long content


## Examples
Example components: npx inkbox-ds add hover-card
Example packages: @phosphor-icons/react
[Preview](https://inkbox-ds.vercel.app/preview/hover-card/Preview) | [Open](https://inkbox-ds.vercel.app/preview/hover-card/Open)

examples/hover-card.tsx

```tsx
import { EnvelopeSimpleIcon, PhoneIcon } from "@phosphor-icons/react/ssr";

import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

function AgentCard() {
  return (
    <div className="flex gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-pill bg-avatar text-body-lg font-medium text-white">A</span>
      <div className="grid min-w-0 gap-1">
        <p className="text-body font-medium text-fg">@acme</p>
        <p className="text-body text-fg-muted">Support agent for Acme. Created Jul 27, 2026.</p>
        <p className="mt-1 flex items-center gap-2 text-body text-fg">
          <EnvelopeSimpleIcon weight="fill" className="size-4.5 text-icon-secondary" /> acme@inkboxmail.com
        </p>
        <p className="flex items-center gap-2 text-body text-fg">
          <PhoneIcon weight="fill" className="size-4.5 text-icon-secondary" /> +1 650 474 9720
        </p>
      </div>
    </div>
  );
}

export function Preview() {
  return (
    <p className="text-body text-fg">
      Messages to{" "}
      <HoverCard>
        <HoverCardTrigger href="#agent" className="text-rose underline-offset-4 hover:underline">
          @acme
        </HoverCardTrigger>
        <HoverCardContent>
          <AgentCard />
        </HoverCardContent>
      </HoverCard>{" "}
      are answered within a minute.
    </p>
  );
}

export function Open() {
  return (
    <div className="flex min-h-60 items-start justify-center">
      <HoverCard defaultOpen>
        <HoverCardTrigger href="#agent" className="text-rose underline-offset-4 hover:underline">
          @acme
        </HoverCardTrigger>
        <HoverCardContent>
          <AgentCard />
        </HoverCardContent>
      </HoverCard>
    </div>
  );
}

```

## Source

components/ui/hover-card.tsx

```tsx
"use client";

import * as React from "react";
import { HoverCard as HoverCardPrimitive } from "radix-ui";

import { usePortalContainer } from "@/lib/surface";
import { cn } from "@/lib/utils";

// A preview on hover, extrapolated from the console's raised white panels (Figma 427:2715): white, 16px corners, the
// floating shadow, 16px of padding, 14px ink. It waits before opening (so a passing pointer does not trigger it), then
// uses a short opacity fade without scaling. The dwell prevents accidental previews; it never delays the link action.
function HoverCard({ openDelay = 400, closeDelay = 150, ...props }: React.ComponentProps<typeof HoverCardPrimitive.Root>) {
  return <HoverCardPrimitive.Root data-slot="hover-card" openDelay={openDelay} closeDelay={closeDelay} {...props} />;
}

function HoverCardTrigger(props: React.ComponentProps<typeof HoverCardPrimitive.Trigger>) {
  return <HoverCardPrimitive.Trigger data-slot="hover-card-trigger" {...props} />;
}

function HoverCardContent({ className, align = "center", sideOffset = 6, ...props }: React.ComponentProps<typeof HoverCardPrimitive.Content>) {
  const container = usePortalContainer();
  return (
    <HoverCardPrimitive.Portal container={container} data-slot="hover-card-portal">
      <HoverCardPrimitive.Content
        data-slot="hover-card-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 w-72 max-w-[calc(100vw-2rem)] origin-(--radix-hover-card-content-transform-origin) rounded-panel bg-surface p-4 text-body leading-body text-fg shadow-floating outline-none data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in",
          className,
        )}
        {...props}
      />
    </HoverCardPrimitive.Portal>
  );
}

export { HoverCard, HoverCardContent, HoverCardTrigger };

```
