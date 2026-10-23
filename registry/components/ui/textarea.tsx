import * as React from "react";

import { cn } from "@/lib/utils";

// The console's multi-line field (Agent Description in Create Agent Identity, 72px tall): the field's 8px corners and
// lilac-gray edge on white, 14px ink on 20px lines with 10px above and 14px at the sides, the light purple placeholder.
// It grows with its content (field-sizing), from 72px. Focus, invalid and read-only states match Input.
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "field-sizing-content flex min-h-18 w-full min-w-0 resize-y rounded-control border border-line-field bg-surface px-3.5 py-2.5 font-sans text-body leading-5 text-fg outline-none transition-[border-color,box-shadow] duration-150 ease-out placeholder:text-fg-subtle selection:bg-ring-tint focus-visible:border-line-brand focus-visible:shadow-focus aria-invalid:border-danger aria-invalid:focus-visible:shadow-none read-only:bg-subtle read-only:text-fg-muted disabled:cursor-not-allowed disabled:bg-subtle disabled:text-fg-muted motion-reduce:transition-none",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
