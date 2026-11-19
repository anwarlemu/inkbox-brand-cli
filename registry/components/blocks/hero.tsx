import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * The opening section: an optional pill eyebrow, the 32px regular display title in ink, a secondary line, the
 * actions, and an optional picture (a product shot or the octopus) beside the words on wide screens or under them.
 */
function Hero({ eyebrow, title, description, actions, media, align = "left", className }: { eyebrow?: string; title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; media?: React.ReactNode; align?: "left" | "center"; className?: string }) {
  const center = align === "center";
  return (
    <section data-slot="hero" className={cn("mx-auto max-w-(--ds-layout-column) px-6 py-16 md:py-24", className)}>
      <div className={cn("grid items-center gap-10", media && !center && "lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16")}>
        <div className={cn("grid gap-5", center && "mx-auto max-w-(--ds-layout-heading) justify-items-center text-center")}>
          {eyebrow && (
            <Badge variant="purple" className="w-fit">
              {eyebrow}
            </Badge>
          )}
          <h1 className="text-display leading-display font-normal text-balance text-fg">{title}</h1>
          {description && <p className="max-w-(--ds-layout-text) text-body-lg leading-body text-pretty text-fg-secondary">{description}</p>}
          {actions && <div className={cn("mt-1 flex flex-wrap items-center gap-3", center && "justify-center")}>{actions}</div>}
        </div>
        {media && <div className={cn("min-w-0", center && "mx-auto w-full max-w-(--ds-layout-column)")}>{media}</div>}
      </div>
    </section>
  );
}

export { Hero };
