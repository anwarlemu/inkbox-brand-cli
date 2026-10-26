# Scroll Area
A region that scrolls inside the page with a thin lilac-gray bar.

Install: npx inkbox-ds add scroll-area
Requires: theme, utils
Packages: @chakra-ui/react
Exports: ScrollArea, ScrollBar
Client boundary: yes
Reference: Extrapolated from the Inkbox console (Figma 427:2715): the inbox and event lists, the field edge color for the thumb


## Usage
Use for a panel with its own scroll (the email list, the event catalog, a long menu) inside a fixed-height layout. Give it a height (h-80, flex-1 in a column). Add a horizontal ScrollBar for wide content.
- Avoid: Nested scroll areas in the same direction
- Avoid: Hiding the bar entirely on desktop
- Avoid: A dark thumb


## Examples
Example components: npx inkbox-ds add scroll-area separator
[Preview](https://inkbox-ds.vercel.app/preview/scroll-area/Preview) | [Horizontal](https://inkbox-ds.vercel.app/preview/scroll-area/Horizontal)

examples/scroll-area.tsx

```tsx
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const EVENTS = Array.from({ length: 24 }, (_, i) => `message.${["sent", "delivered", "bounced", "received"][i % 4]}.${i + 1}`);

export function Preview() {
  return (
    <ScrollArea className="h-72 w-64 rounded-panel border border-line-subtle">
      <div className="p-3">
        <p className="mb-2 text-body-sm text-fg-label">Events</p>
        {EVENTS.map((event, i) => (
          <div key={event}>
            {i > 0 && <Separator className="my-2" />}
            <p className="text-body text-fg">{event}</p>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

export function Horizontal() {
  return (
    <ScrollArea className="w-full max-w-96 rounded-panel border border-line-subtle whitespace-nowrap">
      <div className="flex w-max gap-3 p-3">
        {["Hermes", "Openclaw", "Codex", "Claude Code", "OpenCode", "Other", "Cursor", "Windsurf"].map((name) => (
          <span key={name} className="flex h-9 items-center rounded-pill bg-subtle px-3 text-body text-fg">
            {name}
          </span>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

```

## Source

components/ui/scroll-area.tsx

```tsx
"use client";

import * as React from "react";
import { ScrollArea as ChakraScrollArea } from "@chakra-ui/react";

import { cn } from "@/lib/utils";

// A region that scrolls inside the page (the email list, a long event catalog) with the console's thin bar: a 6px
// thumb in the field's lilac-gray on a clear track, darkening under the pointer.
function ScrollArea({ className, children, ...props }: React.ComponentProps<typeof ChakraScrollArea.Root>) {
  return (
    <ChakraScrollArea.Root data-slot="scroll-area" className={cn("relative overflow-hidden", className)} {...props}>
      <ChakraScrollArea.Viewport data-slot="scroll-area-viewport" className="size-full rounded-[inherit] outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring">
        {children}
      </ChakraScrollArea.Viewport>
      <ScrollBar />
      <ChakraScrollArea.Corner />
    </ChakraScrollArea.Root>
  );
}

function ScrollBar({ className, orientation = "vertical", ...props }: React.ComponentProps<typeof ChakraScrollArea.Scrollbar>) {
  return (
    <ChakraScrollArea.Scrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn("flex touch-none p-0.5 select-none", orientation === "vertical" && "h-full w-2.5", orientation === "horizontal" && "h-2.5 flex-col", className)}
      {...props}
    >
      <ChakraScrollArea.Thumb data-slot="scroll-area-thumb" className="relative flex-1 rounded-pill bg-line-field transition-colors duration-150 ease-out hover:bg-line-strong motion-reduce:transition-none" />
    </ChakraScrollArea.Scrollbar>
  );
}

export { ScrollArea, ScrollBar };

```
