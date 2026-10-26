"use client";

import * as React from "react";
import { Switch as ChakraSwitch } from "@chakra-ui/react";

import { cn } from "@/lib/utils";

// The console's toggle (Figma "Toggle", 44 by 24 in every channel card of Create Agent Identity): a pill track in the
// off gray #B1ADBB, the action purple when on, with a 20px white knob 2px in that carries a soft drop. The knob slides
// across on the strong in-out curve (it travels on screen); with reduced motion it jumps. `size="sm"` is a 36 by 20
// variant for dense rows.
type SwitchProps = Omit<React.ComponentProps<typeof ChakraSwitch.Root>, "onCheckedChange"> & { size?: "default" | "sm"; onCheckedChange?: (checked: boolean) => void };

function Switch({ className, size = "default", onCheckedChange, ...props }: SwitchProps) {
  return (
    <ChakraSwitch.Root
      data-slot="switch"
      data-size={size}
      onCheckedChange={(details) => onCheckedChange?.(details.checked)}
      className={cn(
        "peer group/switch inline-flex shrink-0 cursor-pointer items-center rounded-pill bg-off p-0.5 outline-none transition-[background-color] duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:outline-2 aria-invalid:outline-danger data-[state=checked]:bg-primary data-[size=default]:h-6 data-[size=default]:w-11 data-[size=sm]:h-5 data-[size=sm]:w-9 motion-reduce:transition-none",
        className,
      )}
      {...props}
    >
      <ChakraSwitch.HiddenInput role="switch" />
      <ChakraSwitch.Control data-slot="switch-control" className="flex size-full items-center rounded-pill bg-transparent p-0">
      <ChakraSwitch.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block rounded-pill bg-surface shadow-knob transition-transform duration-200 ease-in-out group-data-[size=default]/switch:size-5 group-data-[size=sm]/switch:size-4 data-[state=checked]:translate-x-5 motion-reduce:transition-none group-data-[size=sm]/switch:data-[state=checked]:translate-x-4"
      />
      </ChakraSwitch.Control>
    </ChakraSwitch.Root>
  );
}

export { Switch };
