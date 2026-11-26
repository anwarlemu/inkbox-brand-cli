# Hero
The opening section: a pill eyebrow, the 32px regular display title, a secondary line, the actions and an optional picture.

Install: npx inkbox-ds add hero
Requires: theme, badge, utils
Packages: none
Exports: Hero
Client boundary: not required by this entry file
Reference: Brand share images' copy (agd-playground inkbox-og content.ts) set in the console's type scale


## Usage
Use once, first on a page. Keep the title to one sentence; one default button and at most one outline button; media is a product shot or the octopus.
- Avoid: Titles bigger than the display token
- Avoid: Gradient or colored text
- Avoid: Two default buttons


## Examples
Example components: npx inkbox-ds add hero button
[Preview](https://inkbox-ds.vercel.app/preview/hero/Preview) | [Centered](https://inkbox-ds.vercel.app/preview/hero/Centered)

examples/hero.tsx

```tsx
import { Hero } from "@/components/blocks/hero";
import { Button } from "@/components/ui/button";

export function Preview() {
  return (
    <Hero
      eyebrow="Agent2Agent ships today"
      title="Give every AI agent a way to be reached"
      description="Email, phone, iMessage and Agent2Agent for your agents, with contacts, notes and a vault they share."
      actions={
        <>
          <Button>Get started free</Button>
          <Button variant="outline">Read the docs</Button>
        </>
      }
      // eslint-disable-next-line @next/next/no-img-element
      media={<img src="/octopus.png" alt="" width={320} height={283} className="mx-auto h-auto w-full max-w-80" />}
    />
  );
}

export function Centered() {
  return <Hero align="center" eyebrow="Product" title="Everything an agent needs to be reached" description="Turn on the channels each agent uses." actions={<Button>Get started free</Button>} />;
}

```

## Source

components/blocks/hero.tsx

```tsx
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

```
