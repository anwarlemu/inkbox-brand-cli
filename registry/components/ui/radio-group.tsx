"use client";

import * as React from "react";
import { RadioGroup as ChakraRadioGroup } from "@chakra-ui/react";

import { cn } from "@/lib/utils";

// The console's radios (Tunnel TLS mode: Edge (default), Passthrough): an 18px circle on white. Unselected it has a
// 1.5px strong edge; selected it takes a 6px brand purple ring around a white center, with no inner dot. The edge's
// color and width change at the fast step; keyboard focus is the soft ring. Options stack 8px apart, each label
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
        "peer relative aspect-square size-4.5 shrink-0 cursor-pointer rounded-pill border-[1.5px] border-line-strong bg-surface outline-none transition-[border-color,border-width,box-shadow] duration-fast ease-out data-focus-visible:shadow-focus disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger data-[state=checked]:border-[6px] data-[state=checked]:border-brand motion-reduce:transition-none",
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
