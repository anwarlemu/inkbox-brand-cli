"use client";

import * as React from "react";
import { Progress as ChakraProgress } from "@chakra-ui/react";

import { cn } from "@/lib/utils";

// How far along something is (mailbox storage, an upload), as the console's Progress theme draws it: an 8px lilac pill
// track with the brand purple pill filling it from the left. A new value slides the fill there (160ms, ease-out); with
// reduced motion it jumps.
function Progress({ className, value, ...props }: React.ComponentProps<typeof ChakraProgress.Root>) {
  return (
    <ChakraProgress.Root unstyled data-slot="progress" value={value} className={cn("relative h-2 w-full overflow-hidden rounded-pill bg-subtle", className)} {...props}>
      <ChakraProgress.Track className="size-full overflow-hidden rounded-pill bg-transparent">
      <ChakraProgress.Range
        data-slot="progress-indicator"
        className="size-full flex-1 rounded-pill bg-brand transition-[translate] duration-slow ease-out motion-reduce:transition-none"
        style={{ translate: `-${100 - (value ?? 0)}%` }}
      />
      </ChakraProgress.Track>
    </ChakraProgress.Root>
  );
}

export { Progress };
