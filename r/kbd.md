# Kbd
A 20px lilac key cap with 4px corners and 12px medium text.

Install: npx inkbox-ds add kbd
Requires: theme, utils
Packages: none
Exports: Kbd, KbdGroup
Client boundary: not required by this entry file
Reference: Extrapolated from the Inkbox console (Figma 427:2715): the lilac @handle chip and its 4px tag corners


## Usage
Use to show a keyboard shortcut in a menu, a tooltip or help text (Kbd for one key, KbdGroup for a combination). Write the keys as people see them on the keyboard (⌘, Shift, K).
- Avoid: A shortcut written in caps tracking
- Avoid: A dark key cap on white
- Avoid: Long words inside a key


## Examples
Example components: npx inkbox-ds add kbd
[Preview](https://inkbox-ds.vercel.app/preview/kbd/Preview)

examples/kbd.tsx

```tsx
import { Kbd, KbdGroup } from "@/components/ui/kbd";

export function Preview() {
  return (
    <div className="grid gap-3 text-body text-fg-secondary">
      <p className="flex items-center gap-2">
        Compose an email
        <KbdGroup>
          <Kbd>⌘</Kbd>
          <Kbd>N</Kbd>
        </KbdGroup>
      </p>
      <p className="flex items-center gap-2">
        Search mailboxes
        <KbdGroup>
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
      </p>
      <p className="flex items-center gap-2">
        Close a dialog <Kbd>Esc</Kbd>
      </p>
    </div>
  );
}

```

## Source

components/ui/kbd.tsx

```tsx
import * as React from "react";

import { cn } from "@/lib/utils";

// Extrapolated from the console's small lilac chips (the @handle chip under the handle field): a key is a 20px lilac
// cap with 4px corners and a hairline Shadow/S ring, 12px medium secondary ink in Inter; glyphs inside are 12px. In a
// tooltip (on the ink) it turns translucent white.
function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "pointer-events-none inline-flex h-5 w-fit min-w-5 items-center justify-center gap-1 rounded-xs bg-subtle px-1.5 font-sans text-caption leading-none font-medium text-fg-secondary shadow-line select-none in-data-[slot=tooltip-content]:bg-white/15 in-data-[slot=tooltip-content]:text-white in-data-[slot=tooltip-content]:shadow-none [&_svg:not([class*='size-'])]:size-3",
        className,
      )}
      {...props}
    />
  );
}

function KbdGroup({ className, ...props }: React.ComponentProps<"kbd">) {
  return <kbd data-slot="kbd-group" className={cn("inline-flex items-center gap-1", className)} {...props} />;
}

export { Kbd, KbdGroup };

```
