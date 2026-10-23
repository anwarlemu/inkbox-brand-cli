import * as React from "react";

import { cn } from "@/lib/utils";

// Extrapolated from the console's small lilac chips (the @handle chip under the handle field): a key is a 20px lilac
// cap with 4px corners and a hairline Shadow/S ring, 12px medium secondary ink in Inter; glyphs inside are 12px. In a
// tooltip (on the ink) it turns translucent white.
function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "pointer-events-none inline-flex h-5 w-fit min-w-5 items-center justify-center gap-1 rounded-xs bg-subtle px-1.5 font-sans text-caption leading-none font-medium text-fg-secondary shadow-line select-none in-data-[slot=tooltip-content]:bg-white/15 in-data-[slot=tooltip-content]:text-white in-data-[slot=tooltip-content]:shadow-none [&_svg:not([class*='size-'])]:size-3",
        className,
      )}
      {...props}
    />
  );
}

function KbdGroup({ className, ...props }: React.ComponentProps<"kbd">) {
  return <kbd data-slot="kbd-group" className={cn("inline-flex items-center gap-1", className)} {...props} />;
}

export { Kbd, KbdGroup };
