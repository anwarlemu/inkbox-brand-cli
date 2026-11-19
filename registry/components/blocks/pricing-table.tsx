import * as React from "react";
import { CheckCircleIcon } from "@phosphor-icons/react/ssr";

import { SectionHead } from "@/components/blocks/section-head";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type Plan = { name: string; price: string; cadence?: string; description: string; summary?: string; features: string[]; action: { label: string; href: string }; featured?: boolean; badge?: string };

/**
 * Plans as the console's billing cards: the name, the price at 24px with its cadence, a muted line, the summary in
 * medium ink, the features with green filled check circles, and the action at the foot. The featured plan is raised
 * and takes the purple action.
 */
function PricingTable({ label, title, description, plans, note, className }: { label?: string; title?: React.ReactNode; description?: React.ReactNode; plans: Plan[]; note?: React.ReactNode; className?: string }) {
  return (
    <section data-slot="pricing-table" className={cn("mx-auto grid max-w-(--ds-layout-column) gap-8 px-6 py-16", className)}>
      {title && <SectionHead label={label} title={title} description={description} align="center" />}
      <ul className={cn("grid gap-4 md:grid-cols-2", plans.length >= 3 && "lg:grid-cols-3", plans.length >= 4 && "xl:grid-cols-4")}>
        {plans.map((p) => (
          <li key={p.name} className="grid">
            <Card variant={p.featured ? "raised" : "default"} className="h-full">
              <CardHeader>
                <CardTitle className="justify-between">
                  {p.name}
                  {p.badge && <Badge variant="pink">{p.badge}</Badge>}
                </CardTitle>
                <p className="flex items-baseline gap-1">
                  <span className="text-h1 leading-tight font-medium text-fg">{p.price}</span>
                  {p.cadence && <span className="text-body text-fg-muted">{p.cadence}</span>}
                </p>
                <CardDescription>{p.description}</CardDescription>
              </CardHeader>
              <CardContent className="grid flex-1 content-start gap-3">
                {p.summary && <p className="text-body leading-body font-medium text-fg">{p.summary}</p>}
                <ul className="grid gap-2">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2 text-body leading-body text-fg-secondary">
                      <CheckCircleIcon weight="fill" aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
                      {f}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button asChild variant={p.featured ? "default" : "secondary"} className="w-full">
                  <a href={p.action.href}>{p.action.label}</a>
                </Button>
              </CardFooter>
            </Card>
          </li>
        ))}
      </ul>
      {note && <p className="text-center text-body-sm leading-body text-fg-muted">{note}</p>}
    </section>
  );
}

export { PricingTable };
