# Feature grid
Features as the console's fact cards: a filled glyph-led title and a muted line, two to four across.

Install: npx inkbox-ds add feature-grid
Requires: theme, section-head, card, utils
Packages: none
Exports: Feature, FeatureGrid
Client boundary: not required by this entry file
Reference: Console webhooks event catalog fact cards (Trigger, Delivery, Response contract)


## Usage
Use for a product's channels or capabilities. One filled Phosphor glyph per card (regular for line-only glyphs such as Webhooks); pass href to make the whole card a link.
- Avoid: Colored icon tiles
- Avoid: More than one glyph per card
- Avoid: Paragraphs longer than two lines


## Examples
Example components: npx inkbox-ds add feature-grid
Example packages: @phosphor-icons/react
[Preview](https://inkbox-ds.vercel.app/preview/feature-grid/Preview)

examples/feature-grid.tsx

```tsx
import { ArrowsLeftRightIcon, EnvelopeSimpleIcon, PhoneIcon } from "@phosphor-icons/react/ssr";

import { FeatureGrid } from "@/components/blocks/feature-grid";

export function Preview() {
  return (
    <FeatureGrid
      label="Channels"
      title="One identity, every way to reach it"
      features={[
        { icon: <EnvelopeSimpleIcon weight="fill" />, title: "Email", description: "Every agent gets an inbox of its own." },
        { icon: <PhoneIcon weight="fill" />, title: "Phone", description: "A dedicated number for calls and texts." },
        { icon: <ArrowsLeftRightIcon weight="regular" />, title: "Agent2Agent", description: "Delegate work to any agent over A2A.", href: "#a2a" },
      ]}
    />
  );
}

```

## Source

components/blocks/feature-grid.tsx

```tsx
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

```
