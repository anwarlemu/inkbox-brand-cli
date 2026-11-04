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
