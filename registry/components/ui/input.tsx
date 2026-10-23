import * as React from "react";

import { cn } from "@/lib/utils";

// The console's field (Figma "Form- Input"): 40px tall, 8px corners, the lilac-gray edge on white, 14px ink text and a
// lighter purple placeholder, 14px in from the edge. Focus takes the purple edge and a soft ring; aria-invalid takes
// the red edge (Not Available). A read-only or disabled field sits on the lilac (the email local part in a channel
// card).
const FIELD =
  "h-10 w-full min-w-0 rounded-control border border-line-field bg-surface px-3.5 font-sans text-body leading-tight text-fg outline-none transition-[border-color,box-shadow] duration-150 ease-out placeholder:text-fg-subtle selection:bg-ring-tint focus-visible:border-line-brand focus-visible:shadow-focus aria-invalid:border-danger aria-invalid:focus-visible:shadow-none read-only:bg-subtle read-only:text-fg-muted disabled:cursor-not-allowed disabled:bg-subtle disabled:text-fg-muted motion-reduce:transition-none file:mr-3 file:border-0 file:bg-transparent file:font-sans file:text-body file:font-medium file:text-fg";

function Input({ className, type = "text", ...props }: React.ComponentProps<"input">) {
  return <input type={type} data-slot="input" className={cn(FIELD, className)} {...props} />;
}

export { Input, FIELD as inputClassName };
