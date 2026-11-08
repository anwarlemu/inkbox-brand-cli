# Separator
A 1px rule in the faint lilac, across or down.

Install: npx inkbox-ds add separator
Requires: theme, utils
Packages: @chakra-ui/react
Exports: Separator
Client boundary: yes
Reference: Figma 427:2715: the rail's footer rule, page head rules, inbox list dividers


## Usage
Use between groups: under a page head, above the rail's footer, between list rows, between toolbar groups (orientation="vertical"). It is decorative unless you set decorative={false}.
- Avoid: Darker rules than the faint lilac between rows
- Avoid: Double rules
- Avoid: Rules inside a lilac panel


## Examples
Example components: npx inkbox-ds add separator
[Preview](https://inkbox-ds.vercel.app/preview/separator/Preview)

examples/separator.tsx

```tsx
import { Separator } from "@/components/ui/separator";

export function Preview() {
  return (
    <div className="w-full max-w-96">
      <p className="text-body text-fg">Webhooks</p>
      <p className="text-body text-fg-muted">Manage subscriptions and review payloads.</p>
      <Separator className="my-4" />
      <div className="flex h-5 items-center gap-4 text-body whitespace-nowrap text-fg">
        <span>Mailboxes</span>
        <Separator orientation="vertical" />
        <span>Contact rules</span>
        <Separator orientation="vertical" />
        <span>Custom domains</span>
      </div>
    </div>
  );
}

```

## Source

components/ui/separator.tsx

```tsx
"use client";

import * as React from "react";
import { Separator as ChakraSeparator } from "@chakra-ui/react";

import { cn } from "@/lib/utils";

// The console's rules: a 1px line in the faint lilac (#F3F1F5) under a page head, at the rail's edge, between list
// items and above the rail's footer. Decorative by default.
function Separator({ className, orientation = "horizontal", decorative = true, ...props }: Omit<React.ComponentProps<typeof ChakraSeparator>, "orientation"> & { orientation?: "horizontal" | "vertical"; decorative?: boolean }) {
  return (
    <ChakraSeparator
      unstyled
      data-slot="separator"
      aria-hidden={decorative || undefined}
      orientation={orientation}
      className={cn("shrink-0 bg-line-subtle data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px", className)}
      {...props}
    />
  );
}

export { Separator };

```
