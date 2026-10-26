# Radio Group
18px circles; the chosen one takes a thick pink ring around a white center.

Install: npx inkbox-ds add radio-group
Requires: theme, utils
Packages: @chakra-ui/react
Exports: RadioGroup, RadioGroupItem
Client boundary: yes
Reference: Figma 427:2715: Tunnel TLS mode radios in Create Agent Identity (Modal States)


## Usage
Use for one choice among two to five visible options (Tunnel TLS mode: Edge (default), Passthrough). Stack options 8px apart, each with its label 8px from the circle. For more options use Select; for an immediate view switch use Tabs or Toggle Group.
- Avoid: A purple or filled dot for the chosen option
- Avoid: Radios laid out without labels
- Avoid: A single radio on its own


## Examples
Example components: npx inkbox-ds add radio-group label
Example packages: @phosphor-icons/react
[Preview](https://inkbox-ds.vercel.app/preview/radio-group/Preview) | [States](https://inkbox-ds.vercel.app/preview/radio-group/States)

examples/radio-group.tsx

```tsx
"use client";

import { InfoIcon } from "@phosphor-icons/react/ssr";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export function Preview() {
  return (
    <div className="grid gap-2">
      <p id="tls-mode" className="flex items-center gap-1.5 text-body leading-body text-fg">
        Tunnel TLS mode <InfoIcon weight="fill" aria-hidden className="size-4 text-fg-label" />
      </p>
      <RadioGroup defaultValue="edge" aria-labelledby="tls-mode">
        <div className="flex items-center gap-2">
          <RadioGroupItem value="edge" id="edge" />
          <Label htmlFor="edge">Edge (default)</Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="passthrough" id="passthrough" />
          <Label htmlFor="passthrough">Passthrough</Label>
        </div>
      </RadioGroup>
    </div>
  );
}

export function States() {
  return (
    <RadioGroup defaultValue="shared" aria-label="iMessage line">
      <div className="flex items-center gap-2">
        <RadioGroupItem value="shared" id="shared" />
        <Label htmlFor="shared">Shared line</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="dedicated" id="dedicated" disabled />
        <Label htmlFor="dedicated">Dedicated line (none available)</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="none" id="none" aria-invalid />
        <Label htmlFor="none">No line (invalid)</Label>
      </div>
    </RadioGroup>
  );
}

```

## Source

components/ui/radio-group.tsx

```tsx
"use client";

import * as React from "react";
import { RadioGroup as ChakraRadioGroup } from "@chakra-ui/react";

import { cn } from "@/lib/utils";

// The console's radios (Tunnel TLS mode: Edge (default), Passthrough): an 18px circle on white. Unselected it has a
// 1.5px gray edge; selected it takes a thick 4px pink ring around a white center. Options stack 8px apart, each label
// 14px ink 8px from its circle (wrap item and label in a `label`, or pair them with htmlFor).
type RadioGroupProps = Omit<React.ComponentProps<typeof ChakraRadioGroup.Root>, "onValueChange"> & { onValueChange?: (value: string | null) => void };
function RadioGroup({ className, onValueChange, ...props }: RadioGroupProps) {
  return <ChakraRadioGroup.Root unstyled data-slot="radio-group" className={cn("grid gap-2", className)} onValueChange={(details) => onValueChange?.(details.value)} {...props} />;
}

function RadioGroupItem({ className, ...props }: React.ComponentProps<typeof ChakraRadioGroup.Item>) {
  return (
    <ChakraRadioGroup.Item
      data-slot="radio-group-item"
      unstyled
      className={cn(
        "peer relative aspect-square size-4.5 shrink-0 cursor-pointer rounded-pill border-[1.5px] border-line-strong bg-surface outline-none active:brightness-95 active:transition-none transition-[border-color,border-width] duration-150 ease-out hover:border-fg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger data-[state=checked]:border-4 data-[state=checked]:border-pink motion-reduce:transition-none",
        className,
      )}
      {...props}
    >
      <ChakraRadioGroup.ItemHiddenInput />
      <ChakraRadioGroup.ItemControl className="contents">
        <ChakraRadioGroup.ItemIndicator data-slot="radio-group-indicator" className="sr-only" />
      </ChakraRadioGroup.ItemControl>
    </ChakraRadioGroup.Item>
  );
}

export { RadioGroup, RadioGroupItem };

```
