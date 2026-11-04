"use client";

import * as React from "react";
import { chakra } from "@chakra-ui/react";

import { cn } from "@/lib/utils";

// A field's label (the console's FormLabel: Email address, Password, Vault key): 14px regular ink on a 24px line, 4px
// above its field. A required mark inside it (`<span aria-hidden>*</span>` with data-slot="label-required") is red. A
// disabled field's label fades with it.
function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <chakra.label
      data-slot="label"
      className={cn("flex items-center gap-2 font-sans text-body leading-6 font-normal text-fg select-none *:data-[slot=label-required]:-ms-1 *:data-[slot=label-required]:text-danger group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50", className)}
      {...props}
    />
  );
}

export { Label };
