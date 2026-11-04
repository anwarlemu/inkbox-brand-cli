# Direction
Sets left-to-right or right-to-left for every component inside it.

Install: npx inkbox-ds add direction
Requires: theme
Packages: radix-ui
Exports: DirectionProvider, useDirection
Client boundary: yes
Reference: Extrapolated from the Inkbox console (Figma 427:2715): no visual of its own


## Usage
Wrap an app or a section in DirectionProvider dir="rtl" when its language reads right to left, and set dir on the element too. Menus, sliders, tabs and carousels then flip their keyboard and layout direction.
- Avoid: Mixing directions inside one menu or form
- Avoid: Mirroring logos or code


## Examples
Example components: npx inkbox-ds add direction tabs
[Preview](https://inkbox-ds.vercel.app/preview/direction/Preview)

examples/direction.tsx

```tsx
import { DirectionProvider } from "@/components/ui/direction";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function Preview() {
  return (
    <DirectionProvider dir="rtl">
      <div dir="rtl" className="grid gap-3">
        <p className="text-body text-fg">صندوق البريد</p>
        <Tabs defaultValue="mailboxes">
          <TabsList>
            <TabsTrigger value="mailboxes">صناديق البريد</TabsTrigger>
            <TabsTrigger value="rules">قواعد الاتصال</TabsTrigger>
            <TabsTrigger value="domains">النطاقات</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </DirectionProvider>
  );
}

```

## Source

components/ui/direction.tsx

```tsx
"use client";

import * as React from "react";
import { Direction } from "radix-ui";

// Sets the reading direction (ltr or rtl) for every Radix-based component inside it, so menus, sliders and tabs flip
// for right-to-left text. It renders nothing of its own; set dir on the element you wrap too.
function DirectionProvider({ dir, direction, children }: React.ComponentProps<typeof Direction.DirectionProvider> & { direction?: React.ComponentProps<typeof Direction.DirectionProvider>["dir"] }) {
  return <Direction.DirectionProvider dir={direction ?? dir}>{children}</Direction.DirectionProvider>;
}

const useDirection = Direction.useDirection;

export { DirectionProvider, useDirection };

```
