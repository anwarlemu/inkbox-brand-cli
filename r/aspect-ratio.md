# Aspect Ratio
A frame that holds media at a fixed shape.

Install: npx inkbox-ds add aspect-ratio
Requires: theme
Packages: radix-ui
Exports: AspectRatio
Client boundary: yes
Reference: Extrapolated from the Inkbox console (Figma 427:2715): the 8px corners of its cards and wells


## Usage
Wrap a screenshot, an attachment preview or a video in AspectRatio with ratio={16 / 9} (or 4 / 3, 1) so it keeps its shape at every width. Round and clip it with rounded-control and overflow-hidden.
- Avoid: Stretching an image to fill without object-cover
- Avoid: Corners other than the card's 8px on media inside cards


## Examples
Example components: npx inkbox-ds add aspect-ratio
[Preview](https://inkbox-ds.vercel.app/preview/aspect-ratio/Preview) | [Square](https://inkbox-ds.vercel.app/preview/aspect-ratio/Square)

examples/aspect-ratio.tsx

```tsx
import { AspectRatio } from "@/components/ui/aspect-ratio";

export function Preview() {
  return (
    <div className="w-full max-w-120">
      <AspectRatio ratio={16 / 9} className="overflow-hidden rounded-control bg-subtle">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/octopus.png" alt="The Inkbox octopus" className="size-full object-contain p-6" />
      </AspectRatio>
    </div>
  );
}

export function Square() {
  return (
    <div className="w-40">
      <AspectRatio ratio={1} className="flex items-center justify-center rounded-control border border-line-field bg-surface text-body text-fg-muted">1:1</AspectRatio>
    </div>
  );
}

```

## Source

components/ui/aspect-ratio.tsx

```tsx
"use client";

import * as React from "react";
import { AspectRatio as AspectRatioPrimitive } from "radix-ui";

// Holds media at a fixed shape (a screenshot, an attachment preview). The frame takes no style of its own; round and
// clip the media inside it with the card's 8px corners.
function AspectRatio(props: React.ComponentProps<typeof AspectRatioPrimitive.Root>) {
  return <AspectRatioPrimitive.Root data-slot="aspect-ratio" {...props} />;
}

export { AspectRatio };

```
