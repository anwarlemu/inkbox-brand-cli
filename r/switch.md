# Switch
A 52 by 32 pill: off gray, purple when on, with a 24px white knob that slides 20px across in 120ms.

Install: npx inkbox-ds add switch
Requires: theme, utils
Packages: @chakra-ui/react
Exports: Switch
Client boundary: yes
Reference: The Inkbox console's Switch theme (a 44 by 24 track inside 4px of padding); Figma 427:2715: Toggle in the channel cards of Create Agent Identity


## Usage
Use to turn a setting or a channel on and off immediately (Phone Number, iMessage, Agent2Agent in Create Agent Identity). Put the label at the left and the switch at the right of the row, and give the switch an accessible name with aria-label or a Label. Use size sm (44 by 28) in dense lists.
- Avoid: A switch that needs a save button to apply
- Avoid: A label inside the track
- Avoid: A colored track other than purple when on
- Avoid: A knob that bounces


## Examples
Example components: npx inkbox-ds add switch label
Example packages: @phosphor-icons/react
[Preview](https://inkbox-ds.vercel.app/preview/switch/Preview) | [States](https://inkbox-ds.vercel.app/preview/switch/States)

examples/switch.tsx

```tsx
"use client";

import * as React from "react";
import { AppleLogoIcon, ArrowsLeftRightIcon, PhoneIcon } from "@phosphor-icons/react/ssr";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function Preview() {
  const [phone, setPhone] = React.useState(true);
  const [imessage, setImessage] = React.useState(false);
  const rows = [
    { id: "phone", label: "Phone Number", icon: PhoneIcon, checked: phone, set: setPhone },
    { id: "imessage", label: "iMessage", icon: AppleLogoIcon, checked: imessage, set: setImessage },
  ];
  return (
    <div className="grid w-full max-w-121.5 gap-2">
      {rows.map(({ id, label, icon: Icon, checked, set }) => (
        <div key={id} className="flex h-13 items-center gap-2.5 rounded-pill bg-subtle px-3.5">
          <span className="flex size-7 items-center justify-center rounded-pill bg-pink text-rose">
            <Icon weight="fill" className="size-5" />
          </span>
          <Label htmlFor={id} className="flex-1 text-body-lg font-medium">
            {label}
          </Label>
          <Switch id={id} checked={checked} onCheckedChange={set} />
        </div>
      ))}
    </div>
  );
}

export function States() {
  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-3">
        <Switch id="a2a" />
        <Label htmlFor="a2a">
          <ArrowsLeftRightIcon className="size-5" /> Agent2Agent
        </Label>
      </div>
      <div className="flex items-center gap-3">
        <Switch id="on" defaultChecked />
        <Label htmlFor="on">Shared iMessage line</Label>
      </div>
      <div className="flex items-center gap-3">
        <Switch id="off-disabled" disabled />
        <Label htmlFor="off-disabled">Dedicated line (none available)</Label>
      </div>
      <div className="flex items-center gap-3">
        <Switch id="on-disabled" disabled defaultChecked />
        <Label htmlFor="on-disabled">Email (always on)</Label>
      </div>
      <div className="flex items-center gap-3">
        <Switch id="small" size="sm" defaultChecked />
        <Label htmlFor="small">Small</Label>
      </div>
    </div>
  );
}

```

## Source

components/ui/switch.tsx

```tsx
"use client";

import * as React from "react";
import { Switch as ChakraSwitch } from "@chakra-ui/react";

import { cn } from "@/lib/utils";

// The console's switch (its Chakra Switch: a 44 by 24 track inside 4px of padding): a 52 by 32 pill in the off gray,
// the brand purple when on, with a 24px white knob that carries a soft drop and travels 20px. The knob slides on the
// strong in-out curve in 120ms (it travels on screen) while the track's color changes in 120ms on the ease-out; with
// reduced motion it jumps. Keyboard focus is the soft ring. `size="sm"` is 44 by 28 with a 20px knob for dense rows.
type SwitchProps = Omit<React.ComponentProps<typeof ChakraSwitch.Root>, "onCheckedChange"> & { size?: "default" | "sm"; onCheckedChange?: (checked: boolean) => void };

function Switch({ className, size = "default", onCheckedChange, ...props }: SwitchProps) {
  return (
    <ChakraSwitch.Root
      unstyled
      data-slot="switch"
      data-size={size}
      onCheckedChange={(details) => onCheckedChange?.(details.checked)}
      className={cn(
        "peer group/switch inline-flex shrink-0 cursor-pointer items-center rounded-pill bg-off p-1 outline-none transition-[background-color,box-shadow] duration-base ease-out data-focus-visible:shadow-focus disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:outline-2 aria-invalid:outline-danger data-[state=checked]:bg-brand data-[size=default]:h-8 data-[size=default]:w-13 data-[size=sm]:h-7 data-[size=sm]:w-11 motion-reduce:transition-none",
        className,
      )}
      {...props}
    >
      <ChakraSwitch.HiddenInput role="switch" />
      <ChakraSwitch.Control data-slot="switch-control" className="flex size-full items-center rounded-pill bg-transparent p-0">
      <ChakraSwitch.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block rounded-pill bg-surface shadow-knob transition-transform duration-base ease-in-out group-data-[size=default]/switch:size-6 group-data-[size=sm]/switch:size-5 data-[state=checked]:translate-x-5 motion-reduce:transition-none group-data-[size=sm]/switch:data-[state=checked]:translate-x-4"
      />
      </ChakraSwitch.Control>
    </ChakraSwitch.Root>
  );
}

export { Switch };

```
