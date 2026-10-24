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
