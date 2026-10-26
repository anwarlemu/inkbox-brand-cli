# Surface
A white or lilac ground that also keeps the dialogs, menus and tooltips opened inside it.

Install: npx inkbox-ds add surface
Requires: utils
Packages: none
Exports: Surface, usePortalContainer
Client boundary: yes

## Usage
Wrap an embedded panel or a preview in Surface so its overlays render inside it. Pick lilac for the second rail or a channel card's ground.


## Source

lib/surface.tsx

```tsx
"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

// A ground: white (the page and dialogs) or lilac (the second rail, a channel card, a table's head). Dialogs, menus
// and tooltips opened inside a Surface render inside it, so a preview or an embedded panel keeps its overlays.
const PortalContainer = React.createContext<HTMLElement | null>(null);

const GROUNDS = {
  white: "bg-surface text-fg",
  lilac: "bg-subtle text-fg",
} as const;

export function Surface({ ground = "white", className, children, ...props }: React.ComponentProps<"div"> & { ground?: keyof typeof GROUNDS }) {
  const [element, setElement] = React.useState<HTMLDivElement | null>(null);
  return (
    <div ref={setElement} data-ground={ground} className={cn(GROUNDS[ground], className)} {...props}>
      <PortalContainer.Provider value={element}>{children}</PortalContainer.Provider>
    </div>
  );
}

/** Where overlays render: the nearest Surface, else the page body. */
export function usePortalContainer() {
  return React.useContext(PortalContainer) ?? undefined;
}

```
