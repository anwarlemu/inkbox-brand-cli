"use client";

import * as React from "react";
import { ScrollArea as ChakraScrollArea } from "@chakra-ui/react";

import { cn } from "@/lib/utils";

// A region that scrolls inside the page (the email list, a long event catalog) with the console's thin bar: a 6px
// thumb in the field's lilac-gray on a clear track, darkening under the pointer.
function ScrollArea({ className, children, ...props }: React.ComponentProps<typeof ChakraScrollArea.Root>) {
  return (
    <ChakraScrollArea.Root unstyled data-slot="scroll-area" className={cn("relative overflow-hidden", className)} {...props}>
      <ChakraScrollArea.Viewport data-slot="scroll-area-viewport" className="size-full rounded-[inherit] outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring">
        {children}
      </ChakraScrollArea.Viewport>
      <ScrollBar />
      <ChakraScrollArea.Corner />
    </ChakraScrollArea.Root>
  );
}

function ScrollBar({ className, orientation = "vertical", ...props }: React.ComponentProps<typeof ChakraScrollArea.Scrollbar>) {
  return (
    <ChakraScrollArea.Scrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn("absolute flex touch-none p-px select-none", orientation === "vertical" && "inset-y-0 right-0 w-2", orientation === "horizontal" && "inset-x-0 bottom-0 h-2 flex-col", className)}
      {...props}
    >
      <ChakraScrollArea.Thumb data-slot="scroll-area-thumb" className="relative flex-1 rounded-pill bg-line-field transition-colors duration-fast ease-out hover:bg-line-strong motion-reduce:transition-none" />
    </ChakraScrollArea.Scrollbar>
  );
}

export { ScrollArea, ScrollBar };
