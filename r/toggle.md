# Toggle
A 38px key with a glyph or a medium label that holds the lilac (or turns white in outline) while pressed.

Install: npx inkbox-ds add toggle
Requires: theme, utils
Packages: radix-ui, class-variance-authority
Exports: Toggle, toggleVariants
Client boundary: yes
Reference: Extrapolated from the Inkbox console (Figma 427:2715): the soft key (Tunnel quickstart) and the segmented choice


## Usage
Use for a two-state control that changes how something shows (bold, show archived, pin). Give an icon-only toggle an aria-label. For a group of exclusive choices use Toggle Group; for a setting use Switch.
- Avoid: A toggle that submits a form
- Avoid: A purple filled toggle
- Avoid: Icon motion when it turns on


## Examples
Example components: npx inkbox-ds add toggle
Example packages: @phosphor-icons/react
[Preview](https://inkbox-ds.vercel.app/preview/toggle/Preview) | [Variants](https://inkbox-ds.vercel.app/preview/toggle/Variants)

examples/toggle.tsx

```tsx
"use client";

import { ArchiveIcon, PushPinIcon, TextBIcon, TextItalicIcon } from "@phosphor-icons/react/ssr";

import { Toggle } from "@/components/ui/toggle";

export function Preview() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Toggle aria-label="Pin the thread" defaultPressed>
        <PushPinIcon weight="fill" />
      </Toggle>
      <Toggle>
        <ArchiveIcon weight="fill" />
        Show archived
      </Toggle>
    </div>
  );
}

export function Variants() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Toggle variant="outline" aria-label="Bold" defaultPressed>
        <TextBIcon weight="bold" />
      </Toggle>
      <Toggle variant="outline" aria-label="Italic">
        <TextItalicIcon weight="bold" />
      </Toggle>
      <Toggle size="sm" aria-label="Pin, small">
        <PushPinIcon weight="fill" />
      </Toggle>
      <Toggle size="lg">Large</Toggle>
      <Toggle disabled>Disabled</Toggle>
    </div>
  );
}

```

## Source

components/ui/toggle.tsx

```tsx
"use client";

import * as React from "react";
import { Toggle as TogglePrimitive } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Extrapolated from the console's soft key (Tunnel quickstart) and its segmented choice (Where does this agent run?):
// a 38px key with fully rounded corners, 8px of side padding and a 14px medium ink label beside a 20px glyph. Off it is bare and
// washes lilac under the pointer; on it holds the lilac. `outline` adds the field edge and turns white with the Shadow/S
// ring when on. In a ToggleGroup the default variant becomes the segmented track (see toggle-group). Press feedback is immediate and changes styling without resizing.
const toggleVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-pill font-sans text-body leading-tight font-medium whitespace-nowrap text-fg outline-none select-none transition-[background-color,box-shadow,color] duration-150 ease-out active:brightness-95 active:transition-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring disabled:pointer-events-none disabled:opacity-50 aria-invalid:text-danger motion-reduce:transition-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5.5",
  {
    variants: {
      variant: {
        default: "bg-transparent hover:bg-subtle data-[state=on]:bg-subtle data-[state=on]:text-fg-brand",
        outline: "border border-line-field bg-surface hover:bg-subtle data-[state=on]:border-transparent data-[state=on]:bg-surface data-[state=on]:text-fg-brand data-[state=on]:shadow-s",
      },
      size: {
        default: "h-9.5 min-w-9.5 px-2",
        sm: "h-8 min-w-8 px-1.5 text-body-sm [&_svg:not([class*='size-'])]:size-4",
        lg: "h-10.5 min-w-10.5 px-3",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Toggle({ className, variant, size, ...props }: React.ComponentProps<typeof TogglePrimitive.Root> & VariantProps<typeof toggleVariants>) {
  return <TogglePrimitive.Root data-slot="toggle" className={cn(toggleVariants({ variant, size, className }))} {...props} />;
}

export { Toggle, toggleVariants };

```
