"use client";

import * as React from "react";
import { Input as ChakraInput } from "@chakra-ui/react";

import { cn } from "@/lib/utils";

// The console's field (its Chakra Input and Figma "Form- Input"): a 40px pill, the lilac-gray edge on white, 14px ink
// text and a lighter purple placeholder, 16px in from the edge. The edge darkens under the pointer; focus takes the
// purple edge and the soft ring; aria-invalid takes the red edge with no ring (Not Available). A read-only or disabled
// field sits on the lilac with muted text (the email local part in a channel card). For a search field put a 16px
// magnifier at its start with an InputGroup; keep type="text".
const FIELD =
  "h-10 w-full min-w-0 rounded-pill border border-line-field bg-surface px-4 font-sans text-body leading-tight text-fg outline-none transition-[border-color,box-shadow] duration-fast ease-out placeholder:text-fg-subtle hover:border-line-strong selection:bg-ring-tint focus-visible:border-line-brand focus-visible:shadow-focus aria-invalid:border-danger aria-invalid:focus-visible:shadow-none read-only:bg-subtle read-only:text-fg-muted disabled:cursor-not-allowed disabled:bg-subtle disabled:text-fg-muted motion-reduce:transition-none file:mr-3 file:border-0 file:bg-transparent file:font-sans file:text-body file:font-medium file:text-fg";

function Input({ className, type = "text", size, ...props }: React.ComponentProps<"input">) {
  return <ChakraInput unstyled type={type} htmlSize={size} data-slot="input" className={cn(FIELD, className)} {...props} />;
}

export { Input, FIELD as inputClassName };
