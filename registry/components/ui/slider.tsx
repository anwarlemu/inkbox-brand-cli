"use client";

import * as React from "react";
import { Slider as ChakraSlider } from "@chakra-ui/react";

import { cn } from "@/lib/utils";

// Extrapolated from the console's switch (Figma "Toggle"): a 6px pill track in the field's lilac-gray, filled with the
// action purple up to the value, and a 20px white knob with the switch knob's soft drop. Under the pointer or keyboard
// focus the knob takes a soft purple halo; it never animates its position (it follows the pointer). Pass two values for
// a range.
type SliderProps = Omit<React.ComponentProps<typeof ChakraSlider.Root>, "onValueChange" | "aria-label" | "aria-labelledby"> & { onValueChange?: (value: number[]) => void; "aria-label"?: string | string[]; "aria-labelledby"?: string | string[] };
function Slider({ className, defaultValue, value, min = 0, max = 100, onValueChange, "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy, ...props }: SliderProps) {
  const values = React.useMemo(() => (Array.isArray(value) ? value : Array.isArray(defaultValue) ? defaultValue : [min, max]), [value, defaultValue, min, max]);
  return (
    <ChakraSlider.Root
      unstyled
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      onValueChange={(details) => onValueChange?.(details.value)}
      aria-label={ariaLabel === undefined ? undefined : Array.isArray(ariaLabel) ? ariaLabel : [ariaLabel]}
      aria-labelledby={ariaLabelledBy === undefined ? undefined : Array.isArray(ariaLabelledBy) ? ariaLabelledBy : [ariaLabelledBy]}
      min={min}
      max={max}
      className={cn(
        "relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-40 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col",
        className,
      )}
      {...props}
    >
      <ChakraSlider.Control>
      <ChakraSlider.Track
        data-slot="slider-track"
        className="relative grow overflow-hidden rounded-pill bg-line-field data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5"
      >
        <ChakraSlider.Range data-slot="slider-range" className="absolute bg-primary data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full" />
      </ChakraSlider.Track>
      {Array.from({ length: values.length }, (_, index) => (
        <ChakraSlider.Thumb
          data-slot="slider-thumb"
          index={index}
          key={index}
          aria-label={Array.isArray(ariaLabel) ? ariaLabel[index] : ariaLabel ?? (values.length > 1 ? (index === 0 ? "Minimum" : "Maximum") : undefined)}
          className="block size-5 shrink-0 cursor-grab rounded-pill bg-surface shadow-knob outline-none transition-[box-shadow] duration-150 ease-out hover:shadow-[var(--ds-shadow-knob),0_0_0_4px_var(--ds-color-ring-tint)] focus-visible:shadow-[var(--ds-shadow-knob),0_0_0_4px_var(--ds-color-ring-tint)] active:cursor-grabbing disabled:pointer-events-none motion-reduce:transition-none"
        ><ChakraSlider.HiddenInput /></ChakraSlider.Thumb>
      ))}
      </ChakraSlider.Control>
    </ChakraSlider.Root>
  );
}

export { Slider };
