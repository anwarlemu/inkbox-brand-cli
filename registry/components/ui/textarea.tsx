"use client";

import * as React from "react";
import { Textarea as ChakraTextarea } from "@chakra-ui/react";

import { cn } from "@/lib/utils";

// The console's multi-line field (Agent Description in Create Agent Identity, 72px tall): the field's lilac-gray edge
// on white with 12px corners, 14px ink on 20px lines with 12px above and below and 16px at the sides, the light purple
// placeholder. It grows with its content (field-sizing), from 72px, and is not resized by hand. Hover, focus, invalid,
// read-only and disabled states match Input.
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <ChakraTextarea
      unstyled
      data-slot="textarea"
      className={cn(
        "field-sizing-content flex min-h-18 w-full min-w-0 resize-none rounded-control border border-line-field bg-surface px-4 py-3 font-sans text-body leading-line-body text-fg outline-none transition-[border-color,box-shadow] duration-fast ease-out placeholder:text-fg-subtle hover:border-line-strong selection:bg-ring-tint focus-visible:border-line-brand focus-visible:shadow-focus aria-invalid:border-danger aria-invalid:focus-visible:shadow-none read-only:bg-subtle read-only:text-fg-muted disabled:cursor-not-allowed disabled:bg-subtle disabled:text-fg-muted motion-reduce:transition-none",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
