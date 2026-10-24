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
