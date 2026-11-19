# Pricing table
Plans as the console's billing cards: price, line, summary, green check-circle features and an action; the featured plan is raised.

Install: npx inkbox-ds add pricing-table
Requires: theme, section-head, badge, button, card, utils
Packages: @phosphor-icons/react
Exports: Plan, PricingTable
Client boundary: not required by this entry file
Reference: Console billing tab plans (components/billing/BillingTab.tsx, lib/plan-upgrade.ts)


## Usage
Use for plans. Mark one plan featured; pass the console's own plans or yours.
- Avoid: Square checks (checks are always circles)
- Avoid: Strikethrough prices
- Avoid: More than one featured plan


## Examples
Example components: npx inkbox-ds add pricing-table pricing-page
[Preview](https://inkbox-ds.vercel.app/preview/pricing-table/Preview)

examples/pricing-table.tsx

```tsx
import { PricingTable } from "@/components/blocks/pricing-table";
import { PLANS } from "@/components/site/pricing-page";

export function Preview() {
  return <PricingTable label="Pricing" title="Start free, grow with your agents" plans={PLANS.slice(0, 3)} />;
}

```

## Source

components/blocks/pricing-table.tsx

```tsx
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

```
