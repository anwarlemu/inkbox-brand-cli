"use client";

import * as React from "react";
import { Checkbox as ChakraCheckbox } from "@chakra-ui/react";
import { CheckCircleIcon, CircleIcon, MinusCircleIcon } from "@phosphor-icons/react/ssr";

import { cn } from "@/lib/utils";

// Inkbox checks are always circles, drawn with Phosphor's circle glyphs on Chakra's (unstyled) checkbox: an empty
// circle in the strong edge color when off, the filled check circle in the brand purple when on and the filled minus
// circle when some are on (darker under the pointer). The 22px glyph box draws an 18px circle, the console's size.
// No glyph animation; the color changes at the fast step. Keyboard focus is the soft ring; aria-invalid draws the
// empty circle in red. Its label sits 8px away in 14px ink.
type CheckboxProps = Omit<React.ComponentProps<typeof ChakraCheckbox.Root>, "onCheckedChange"> & { onCheckedChange?: (checked: boolean | "indeterminate") => void };

function Checkbox({ className, onCheckedChange, ...props }: CheckboxProps) {
  return (
    <ChakraCheckbox.Root
      unstyled
      data-slot="checkbox"
      className={cn(
        "peer group/checkbox inline-flex size-5.5 shrink-0 cursor-pointer items-center justify-center rounded-pill text-line-strong outline-none transition-[color,box-shadow] duration-fast ease-out data-focus-visible:shadow-focus data-disabled:cursor-not-allowed data-disabled:opacity-50 data-invalid:text-danger aria-invalid:text-danger data-[state=checked]:text-brand data-[state=checked]:hover:text-primary-hover data-[state=indeterminate]:text-brand data-[state=indeterminate]:hover:text-primary-hover motion-reduce:transition-none",
        className,
      )}
      onCheckedChange={(details) => onCheckedChange?.(details.checked)}
      {...props}
    >
      <ChakraCheckbox.HiddenInput />
      <ChakraCheckbox.Control data-slot="checkbox-control" className="flex size-full items-center justify-center rounded-pill">
        <CircleIcon aria-hidden className="size-full group-data-[state=checked]/checkbox:hidden group-data-[state=indeterminate]/checkbox:hidden" />
        <CheckCircleIcon aria-hidden weight="fill" data-slot="checkbox-indicator" className="hidden size-full group-data-[state=checked]/checkbox:block" />
        <MinusCircleIcon aria-hidden weight="fill" data-slot="checkbox-indicator" className="hidden size-full group-data-[state=indeterminate]/checkbox:block" />
      </ChakraCheckbox.Control>
    </ChakraCheckbox.Root>
  );
}

export { Checkbox };
