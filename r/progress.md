# Progress
An 8px lilac pill track filled with the purple.

Install: npx inkbox-ds add progress
Requires: theme, utils
Packages: @chakra-ui/react
Exports: Progress
Client boundary: yes
Reference: Extrapolated from the Inkbox console (Figma 427:2715): the Email table's Storage column, the lilac wells and the purple action color


## Usage
Use for a known amount (mailbox storage used, an upload, setup steps done). Put the value as text beside it (0%) and give it an aria-label. For unknown waits use Spinner.
- Avoid: Striped or gradient fills
- Avoid: Progress for something that takes under a second
- Avoid: A track thicker than 8px


## Examples
Example components: npx inkbox-ds add progress
[Preview](https://inkbox-ds.vercel.app/preview/progress/Preview) | [Values](https://inkbox-ds.vercel.app/preview/progress/Values)

examples/progress.tsx

```tsx
"use client";

import * as React from "react";

import { Progress } from "@/components/ui/progress";

export function Preview() {
  const [value, setValue] = React.useState(12);
  React.useEffect(() => {
    // ds-latency: advances a presentation-only progress example; no user input is waiting.
    const t = setTimeout(() => setValue(64), 600);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="grid w-full max-w-100 gap-2">
      <div className="flex justify-between text-body">
        <span className="text-fg">Mailbox storage</span>
        <span className="text-fg-muted">{value}%</span>
      </div>
      <Progress value={value} aria-label="Mailbox storage used" />
    </div>
  );
}

export function Values() {
  return (
    <div className="grid w-full max-w-100 gap-4">
      <Progress value={0} aria-label="Empty" />
      <Progress value={33} aria-label="A third" />
      <Progress value={100} aria-label="Full" />
    </div>
  );
}

```

## Source

components/ui/progress.tsx

```tsx
"use client";

import * as React from "react";
import { Progress as ChakraProgress } from "@chakra-ui/react";

import { cn } from "@/lib/utils";

// How far along something is (mailbox storage, an upload): an 8px lilac pill track with the purple filling it from the
// left. A new value slides the fill there (300ms, the strong ease-out); with reduced motion it jumps.
function Progress({ className, value, ...props }: React.ComponentProps<typeof ChakraProgress.Root>) {
  return (
    <ChakraProgress.Root unstyled data-slot="progress" value={value} className={cn("relative h-2 w-full overflow-hidden rounded-pill bg-subtle", className)} {...props}>
      <ChakraProgress.Track className="size-full overflow-hidden rounded-pill bg-transparent">
      <ChakraProgress.Range
        data-slot="progress-indicator"
        className="size-full flex-1 rounded-pill bg-primary transition-[translate] duration-300 ease-out motion-reduce:transition-none"
        style={{ translate: `-${100 - (value ?? 0)}%` }}
      />
      </ChakraProgress.Track>
    </ChakraProgress.Root>
  );
}

export { Progress };

```
