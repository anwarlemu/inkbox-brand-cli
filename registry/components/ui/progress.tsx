"use client";

import * as React from "react";
import { Progress as ProgressPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

// How far along something is (mailbox storage, an upload): an 8px lilac pill track with the purple filling it from the
// left. A new value slides the fill there (300ms, the strong ease-out); with reduced motion it jumps.
function Progress({ className, value, ...props }: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root data-slot="progress" value={value} className={cn("relative h-2 w-full overflow-hidden rounded-pill bg-subtle", className)} {...props}>
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="size-full flex-1 rounded-pill bg-primary transition-[translate] duration-300 ease-out motion-reduce:transition-none"
        style={{ translate: `-${100 - (value ?? 0)}%` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
