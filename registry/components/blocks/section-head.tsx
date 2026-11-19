import * as React from "react";

import { cn } from "@/lib/utils";

/** A section's heading: an optional purple label, the 24px regular title and a secondary line, left or centered. */
function SectionHead({ label, title, description, align = "left", className }: { label?: string; title: React.ReactNode; description?: React.ReactNode; align?: "left" | "center"; className?: string }) {
  return (
    <div data-slot="section-head" className={cn("grid max-w-(--ds-layout-heading) gap-2", align === "center" && "mx-auto justify-items-center text-center", className)}>
      {label && <p className="text-body-sm leading-tight font-medium text-fg-label">{label}</p>}
      <h2 className="text-h2 leading-heading font-normal text-balance text-fg">{title}</h2>
      {description && <p className="text-body leading-body text-pretty text-fg-secondary">{description}</p>}
    </div>
  );
}

export { SectionHead };
