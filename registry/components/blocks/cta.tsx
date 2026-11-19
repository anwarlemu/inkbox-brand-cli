import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * The closing call to action: a lilac panel with 24px corners, the title, a line and the actions, and an optional
 * picture (the octopus) at the right on wide screens.
 */
function Cta({ title, description, actions, media, className }: { title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; media?: React.ReactNode; className?: string }) {
  return (
    <section data-slot="cta" className={cn("mx-auto max-w-(--ds-layout-column) px-6 py-16", className)}>
      <div className={cn("grid items-center gap-8 rounded-dialog bg-subtle p-8 md:p-12", media && "md:grid-cols-[minmax(0,1fr)_auto]")}>
        <div className="grid gap-3">
          <h2 className="text-h2 leading-heading font-normal text-balance text-fg">{title}</h2>
          {description && <p className="max-w-(--ds-layout-text) text-body leading-body text-pretty text-fg-secondary">{description}</p>}
          {actions && <div className="mt-2 flex flex-wrap items-center gap-3">{actions}</div>}
        </div>
        {media && <div className="hidden md:block">{media}</div>}
      </div>
    </section>
  );
}

export { Cta };
