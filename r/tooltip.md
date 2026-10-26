# Tooltip
A short ink label with white 13px text, 16px corners and a small arrow.

Install: npx inkbox-ds add tooltip
Requires: theme, surface, utils
Packages: radix-ui
Exports: Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
Client boundary: yes
Reference: Extrapolated from the Inkbox console (Figma 427:2715): the info glyphs beside Tunnel, Connection, TLS and Tunnel TLS mode


## Usage
Use to explain an icon button or an info glyph in a few words (Tunnel, Connection, TLS). Wrap a toolbar or page in TooltipProvider so neighboring tooltips open at once after the first.
- Avoid: Essential information only in a tooltip
- Avoid: Interactive content inside a tooltip
- Avoid: Sentences longer than one line or two
- Avoid: A white tooltip


## Examples
Example components: npx inkbox-ds add tooltip button
Example packages: @phosphor-icons/react
[Preview](https://inkbox-ds.vercel.app/preview/tooltip/Preview) | [Info](https://inkbox-ds.vercel.app/preview/tooltip/Info)

examples/tooltip.tsx

```tsx
import { ArrowsClockwiseIcon, GearSixIcon, InfoIcon, PencilSimpleIcon } from "@phosphor-icons/react/ssr";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function Preview() {
  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Edit mailbox">
              <PencilSimpleIcon weight="fill" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Edit mailbox</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Refresh">
              <ArrowsClockwiseIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Refresh</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Mailbox settings">
              <GearSixIcon weight="fill" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Mailbox settings</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

export function Info() {
  return (
    <div className="flex min-h-40 items-start justify-center pt-14">
      <p className="flex items-center gap-1.5 text-body text-fg">
        Tunnel TLS mode
        <Tooltip defaultOpen>
          <TooltipTrigger className="rounded-pill text-fg-label outline-none focus-visible:outline-2 focus-visible:outline-focus-ring" aria-label="About TLS modes">
            <InfoIcon weight="fill" className="size-4.5" />
          </TooltipTrigger>
          <TooltipContent side="top">Edge ends TLS at Inkbox. Passthrough sends it to your agent.</TooltipContent>
        </Tooltip>
      </p>
    </div>
  );
}

```

## Source

components/ui/tooltip.tsx

```tsx
"use client";

import * as React from "react";
import { Tooltip as TooltipPrimitive } from "radix-ui";

import { usePortalContainer } from "@/lib/surface";
import { cn } from "@/lib/utils";

// A tooltip, extrapolated from the console's info glyphs (Figma 427:2715: Tunnel, Connection, TLS, Tunnel TLS mode):
// the ink with 13px white text, 16px corners, 6px by 10px of padding and a small ink arrow. The first one waits 400ms;
// once one is open its neighbors open at once and without motion (the provider's skip delay), as a toolbar should.
// Whether a TooltipProvider is above: tooltips under one share its delay, so neighbors open at once. A lone Tooltip
// brings its own provider. The dwell avoids incidental hover popups; it never delays the underlying button action.
const HasProvider = React.createContext(false);

function TooltipProvider({ delayDuration = 400, skipDelayDuration = 300, ...props }: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <HasProvider.Provider value>
      <TooltipPrimitive.Provider data-slot="tooltip-provider" delayDuration={delayDuration} skipDelayDuration={skipDelayDuration} {...props} />
    </HasProvider.Provider>
  );
}

function Tooltip(props: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  const root = <TooltipPrimitive.Root data-slot="tooltip" {...props} />;
  return React.useContext(HasProvider) ? root : <TooltipProvider>{root}</TooltipProvider>;
}

function TooltipTrigger(props: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

function TooltipContent({ className, sideOffset = 6, children, ...props }: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  const container = usePortalContainer();
  return (
    <TooltipPrimitive.Portal container={container}>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          "z-50 w-fit max-w-72 origin-(--radix-tooltip-content-transform-origin) rounded-panel bg-inverse px-2.5 py-1.5 font-sans text-body-sm leading-tight text-balance text-fg-inverse data-[state=closed]:animate-fade-out data-[state=delayed-open]:animate-fade-in",
          className,
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="z-50 fill-inverse" width={10} height={5} />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };

```
