"use client";

import * as React from "react";
import { Separator as ChakraSeparator } from "@chakra-ui/react";

import { cn } from "@/lib/utils";

// The console's rules: a 1px line in the faint lilac (#F3F1F5) under a page head, at the rail's edge, between list
// items and above the rail's footer. Decorative by default.
function Separator({ className, orientation = "horizontal", decorative = true, ...props }: Omit<React.ComponentProps<typeof ChakraSeparator>, "orientation"> & { orientation?: "horizontal" | "vertical"; decorative?: boolean }) {
  return (
    <ChakraSeparator
      unstyled
      data-slot="separator"
      aria-hidden={decorative || undefined}
      orientation={orientation}
      className={cn("shrink-0 bg-line-subtle data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px", className)}
      {...props}
    />
  );
}

export { Separator };
