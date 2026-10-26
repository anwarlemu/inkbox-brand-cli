# Collapsible
A part that shows and hides in place, opening with its height.

Install: npx inkbox-ds add collapsible
Requires: theme, utils
Packages: @chakra-ui/react
Exports: Collapsible, CollapsibleContent, CollapsibleTrigger
Client boundary: yes
Reference: Figma 427:2715: Create Agent Identity (Advanced settings - tunnel mode, phone state, line sharing)


## Usage
Use for one optional group (Advanced settings under the channels). Make the trigger the whole row: a 14px ink label with a caret at the right that turns when open. For several sections, use Accordion.
- Avoid: Hiding required fields in it
- Avoid: A trigger without a caret
- Avoid: Animating anything but the content height and the caret


## Examples
Example components: npx inkbox-ds add collapsible label
Example packages: @phosphor-icons/react
[Preview](https://inkbox-ds.vercel.app/preview/collapsible/Preview)

examples/collapsible.tsx

```tsx
"use client";

import * as React from "react";
import { CaretDownIcon } from "@phosphor-icons/react/ssr";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";

export function Preview() {
  const [open, setOpen] = React.useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="w-full max-w-122">
      <CollapsibleTrigger className="group flex w-full items-center justify-between gap-4 rounded-pill py-2 text-left text-body text-fg outline-none transition-colors duration-150 ease-out hover:text-fg-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring motion-reduce:transition-none">
        Advanced settings - tunnel mode, phone state, line sharing
        <CaretDownIcon aria-hidden weight="bold" className="size-4 shrink-0 text-icon-default transition-transform duration-200 ease-out group-data-[state=open]:rotate-180 motion-reduce:transition-none" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="grid gap-2 pt-3" role="radiogroup" aria-label="Tunnel TLS mode">
          <p className="text-body text-fg">Tunnel TLS mode</p>
          <Label className="gap-2">
            <input type="radio" name="tls" defaultChecked className="size-4 accent-[var(--ds-color-action-primary)]" />
            Edge (default)
          </Label>
          <Label className="gap-2">
            <input type="radio" name="tls" className="size-4 accent-[var(--ds-color-action-primary)]" />
            Passthrough
          </Label>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

```

## Source

components/ui/collapsible.tsx

```tsx
"use client";

import * as React from "react";
import { Collapsible as ChakraCollapsible } from "@chakra-ui/react";

import { cn } from "@/lib/utils";

// A part that shows and hides in place (Figma 427:2715: "Advanced settings - tunnel mode, phone state, line sharing"
// under the channels). The parts carry no look of their own beyond the motion: the content opens with its height
// (200ms, the strong ease-out; closing is quicker). Style the trigger as the row it is (see the example).
type CollapsibleProps = Omit<React.ComponentProps<typeof ChakraCollapsible.Root>, "onOpenChange"> & { onOpenChange?: (open: boolean) => void };
function Collapsible({ onOpenChange, ...props }: CollapsibleProps) {
  return <ChakraCollapsible.Root unstyled data-slot="collapsible" onOpenChange={(details) => onOpenChange?.(details.open)} {...props} />;
}

function CollapsibleTrigger(props: React.ComponentProps<typeof ChakraCollapsible.Trigger>) {
  return <ChakraCollapsible.Trigger unstyled data-slot="collapsible-trigger" {...props} />;
}

function CollapsibleContent({ className, ...props }: React.ComponentProps<typeof ChakraCollapsible.Content>) {
  return <ChakraCollapsible.Content unstyled data-slot="collapsible-content" className={cn("overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down", className)} {...props} />;
}

export { Collapsible, CollapsibleContent, CollapsibleTrigger };

```
