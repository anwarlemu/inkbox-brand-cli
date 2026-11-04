"use client";

import * as React from "react";
import { Checkbox as ChakraCheckbox } from "@chakra-ui/react";
import { CheckIcon, MinusIcon } from "@phosphor-icons/react/ssr";

import { cn } from "@/lib/utils";

// The console's check (its Chakra Checkbox): a round 18px control with the radio's 1.5px strong edge on white; checked
// or mixed it fills with the brand purple (darker under the pointer) and shows a bold white check (or dash) at 78% of
// its size, with no glyph animation. Fill and edge change at the fast step. Keyboard focus is the soft ring; aria-invalid
// takes the red edge. Its label sits 8px away in 14px ink.
type CheckboxProps = Omit<React.ComponentProps<typeof ChakraCheckbox.Root>, "onCheckedChange"> & { onCheckedChange?: (checked: boolean | "indeterminate") => void };

function Checkbox({ className, onCheckedChange, ...props }: CheckboxProps) {
  return (
    <ChakraCheckbox.Root
      data-slot="checkbox"
      className={cn(
        "peer inline-flex size-4.5 shrink-0 cursor-pointer items-center justify-center rounded-pill border-[1.5px] border-line-strong bg-surface text-white outline-none transition-[background-color,border-color,box-shadow] duration-fast ease-out data-focus-visible:shadow-focus disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger data-[state=checked]:border-brand data-[state=checked]:bg-brand data-[state=checked]:hover:border-primary-hover data-[state=checked]:hover:bg-primary-hover data-[state=indeterminate]:border-brand data-[state=indeterminate]:bg-brand motion-reduce:transition-none",
        className,
      )}
      onCheckedChange={(details) => onCheckedChange?.(details.checked)}
      {...props}
    >
      <ChakraCheckbox.HiddenInput />
      <ChakraCheckbox.Control data-slot="checkbox-control" className="contents">
        <ChakraCheckbox.Indicator data-slot="checkbox-indicator" className="group/indicator flex size-full items-center justify-center text-current">
          <CheckIcon weight="bold" className="size-[78%] group-data-[state=indeterminate]/indicator:hidden" />
          <MinusIcon weight="bold" className="hidden size-[78%] group-data-[state=indeterminate]/indicator:block" />
        </ChakraCheckbox.Indicator>
      </ChakraCheckbox.Control>
    </ChakraCheckbox.Root>
  );
}

export { Checkbox };
