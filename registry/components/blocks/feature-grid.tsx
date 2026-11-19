import * as React from "react";

import { SectionHead } from "@/components/blocks/section-head";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type Feature = { icon?: React.ReactNode; title: string; description: string; href?: string };

/**
 * Features as the console's fact cards (Trigger, Delivery, Response contract): a filled glyph-led 14px title and a
 * muted line on a white card with the field edge, two to four across.
 */
function FeatureGrid({ label, title, description, features, columns = 3, className }: { label?: string; title?: React.ReactNode; description?: React.ReactNode; features: Feature[]; columns?: 2 | 3 | 4; className?: string }) {
  return (
    <section data-slot="feature-grid" className={cn("mx-auto grid max-w-(--ds-layout-column) gap-8 px-6 py-16", className)}>
      {title && <SectionHead label={label} title={title} description={description} />}
      <ul className={cn("grid gap-4 sm:grid-cols-2", columns === 3 && "lg:grid-cols-3", columns === 4 && "lg:grid-cols-4")}>
        {features.map((f) => (
          <li key={f.title} className="grid">
            <Card className={cn("relative", f.href && "transition-colors duration-150 ease-out hover:bg-subtle motion-reduce:transition-none")}>
              <CardHeader>
                <CardTitle>
                  {f.icon}
                  {f.href ? (
                    <a href={f.href} className="outline-none after:absolute after:inset-0 focus-visible:underline">
                      {f.title}
                    </a>
                  ) : (
                    f.title
                  )}
                </CardTitle>
                <CardDescription>{f.description}</CardDescription>
              </CardHeader>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}

export { FeatureGrid };
