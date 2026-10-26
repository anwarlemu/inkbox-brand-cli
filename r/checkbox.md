# Checkbox
An 18px box with 4px corners and a gray edge that fills purple with a white check.

Install: npx inkbox-ds add checkbox
Requires: theme, utils
Packages: @chakra-ui/react, @phosphor-icons/react
Exports: Checkbox
Client boundary: yes
Reference: Extrapolated from the Inkbox console (Figma 427:2715): the radios' 18px size and gray edge, the action purple and the white checks


## Usage
Use for independent on or off choices that apply when a form is submitted (event subscriptions, consent). Pair each checkbox with a Label 8px to its right. Use the indeterminate state for a parent that covers some of its children. For a setting that applies at once use Switch.
- Avoid: A pink checked box
- Avoid: A round checkbox
- Avoid: A checkbox that acts immediately like a switch


## Examples
Example components: npx inkbox-ds add checkbox label
[Preview](https://inkbox-ds.vercel.app/preview/checkbox/Preview) | [States](https://inkbox-ds.vercel.app/preview/checkbox/States)

examples/checkbox.tsx

```tsx
"use client";

import * as React from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const EVENTS = ["message.received", "message.sent", "message.delivered"];

export function Preview() {
  const [chosen, setChosen] = React.useState<string[]>(["message.received"]);
  const all = chosen.length === EVENTS.length ? true : chosen.length ? "indeterminate" : false;
  return (
    <div className="grid gap-2.5">
      <div className="flex items-center gap-2">
        <Checkbox id="all-events" checked={all} onCheckedChange={(v) => setChosen(v === true ? EVENTS : [])} />
        <Label htmlFor="all-events" className="font-medium">All email events</Label>
      </div>
      <div className="grid gap-2.5 pl-6.5">
        {EVENTS.map((e) => (
          <div key={e} className="flex items-center gap-2">
            <Checkbox id={e} checked={chosen.includes(e)} onCheckedChange={(v) => setChosen((c) => (v === true ? [...c, e] : c.filter((x) => x !== e)))} />
            <Label htmlFor={e} className="font-mono">{e}</Label>
          </div>
        ))}
      </div>
    </div>
  );
}

export function States() {
  return (
    <div className="grid gap-2.5">
      <div className="flex items-center gap-2">
        <Checkbox id="c1" />
        <Label htmlFor="c1">Unchecked</Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="c2" defaultChecked />
        <Label htmlFor="c2">Checked</Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="c3" checked="indeterminate" />
        <Label htmlFor="c3">Some of them</Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="c4" disabled />
        <Label htmlFor="c4">Disabled</Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="c5" aria-invalid />
        <Label htmlFor="c5">I accept the Terms of Service (required)</Label>
      </div>
    </div>
  );
}

```

## Source

components/ui/checkbox.tsx

```tsx
"use client";

import * as React from "react";
import { Checkbox as ChakraCheckbox } from "@chakra-ui/react";
import { CheckIcon, MinusIcon } from "@phosphor-icons/react/ssr";

import { cn } from "@/lib/utils";

// Extrapolated from the console's radios and checks (Figma 427:2715): an 18px box with 4px corners and the radio's
// 1.5px gray edge on white; checked or mixed it fills with the action purple and shows a bold white check (or dash).
// Its label sits 8px away in 14px ink.
type CheckboxProps = Omit<React.ComponentProps<typeof ChakraCheckbox.Root>, "onCheckedChange"> & { onCheckedChange?: (checked: boolean | "indeterminate") => void };

function Checkbox({ className, onCheckedChange, ...props }: CheckboxProps) {
  return (
    <ChakraCheckbox.Root
      data-slot="checkbox"
      className={cn(
        "peer inline-flex size-4.5 shrink-0 cursor-pointer items-center justify-center rounded-pill border-[1.5px] border-line-strong bg-surface text-on-primary outline-none active:brightness-95 active:transition-none transition-[background-color,border-color] duration-150 ease-out hover:border-fg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary motion-reduce:transition-none",
        className,
      )}
      onCheckedChange={(details) => onCheckedChange?.(details.checked)}
      {...props}
    >
      <ChakraCheckbox.HiddenInput />
      <ChakraCheckbox.Control data-slot="checkbox-control" className="contents">
        <ChakraCheckbox.Indicator data-slot="checkbox-indicator" className="group/indicator flex items-center justify-center text-current">
          <CheckIcon weight="bold" className="size-3.5 group-data-[state=indeterminate]/indicator:hidden" />
          <MinusIcon weight="bold" className="hidden size-3.5 group-data-[state=indeterminate]/indicator:block" />
        </ChakraCheckbox.Indicator>
      </ChakraCheckbox.Control>
    </ChakraCheckbox.Root>
  );
}

export { Checkbox };

```
