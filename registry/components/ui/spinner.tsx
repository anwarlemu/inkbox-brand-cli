import { SpinnerIcon } from "@phosphor-icons/react/ssr";

import { cn } from "@/lib/utils";

// The console's loading glyph (Figma 427:2715: the handle check, Creating Agent Identity...): eight short spokes
// turning once every 0.8s at a constant speed, in the color of the text around it (the purple in a field, white on the
// purple pill). It keeps turning with reduced motion: the turning is the only sign that work is happening.
function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return <SpinnerIcon role="status" weight="bold" aria-label="Loading" data-slot="spinner" className={cn("size-5.5 shrink-0 animate-spin-steady", className)} {...props} />;
}

export { Spinner };
