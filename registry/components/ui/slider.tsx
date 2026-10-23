"use client";

import * as React from "react";
import { Slider as SliderPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

// Extrapolated from the console's switch (Figma "Toggle"): a 6px pill track in the field's lilac-gray, filled with the
// action purple up to the value, and a 20px white knob with the switch knob's soft drop. Under the pointer or keyboard
// focus the knob takes a soft purple halo; it never animates its position (it follows the pointer). Pass two values for
// a range.
function Slider({ className, defaultValue, value, min = 0, max = 100, ...props }: React.ComponentProps<typeof SliderPrimitive.Root>) {
  const values = React.useMemo(() => (Array.isArray(value) ? value : Array.isArray(defaultValue) ? defaultValue : [min, max]), [value, defaultValue, min, max]);
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        "relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-40 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col",
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className="relative grow overflow-hidden rounded-pill bg-line-field data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5"
      >
        <SliderPrimitive.Range data-slot="slider-range" className="absolute bg-primary data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full" />
      </SliderPrimitive.Track>
      {Array.from({ length: values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          aria-label={props["aria-label"] ? undefined : values.length > 1 ? (index === 0 ? "Minimum" : "Maximum") : undefined}
          className="block size-5 shrink-0 cursor-grab rounded-pill bg-surface shadow-knob outline-none transition-[box-shadow] duration-150 ease-out hover:shadow-[var(--ds-shadow-knob),0_0_0_4px_var(--ds-color-ring-tint)] focus-visible:shadow-[var(--ds-shadow-knob),0_0_0_4px_var(--ds-color-ring-tint)] active:cursor-grabbing disabled:pointer-events-none motion-reduce:transition-none"
        />
      ))}
    </SliderPrimitive.Root>
  );
}

export { Slider };
