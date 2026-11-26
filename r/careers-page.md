# Careers page
The careers template: the hiring call, reasons to join as cards, open roles as rows with their team, and a way in for everyone else.

Install: npx inkbox-ds add careers-page
Requires: theme, cta, feature-grid, hero, section-head, site-layout, badge, button, card
Packages: @phosphor-icons/react
Exports: Role, CareersPage
Client boundary: not required by this entry file
Reference: Hiring copy from the brand share images (agd-playground inkbox-og content.ts); rows from the console's cards and badges


## Usage
Start a careers page from it with your own roles.
- Avoid: Photos of people who have not agreed
- Avoid: Roles that are not open


## Examples
Example components: npx inkbox-ds add careers-page about-page
[Preview](https://inkbox-ds.vercel.app/preview/careers-page/Preview) | [NoRoles](https://inkbox-ds.vercel.app/preview/careers-page/NoRoles)

examples/careers-page.tsx

```tsx
import { CareersPage } from "@/components/site/careers-page";
import { VALUES } from "@/components/site/about-page";

export function Preview() {
  return (
    <CareersPage
      description="Founding engineers, in San Francisco."
      reasons={VALUES}
      roles={[
        { title: "Founding engineer, platform", team: "Engineering", location: "San Francisco", href: "#" },
        { title: "Founding engineer, voice", team: "Engineering", location: "San Francisco", href: "#" },
      ]}
    />
  );
}

export function NoRoles() {
  return <CareersPage roles={[]} />;
}

```

## Source

components/site/careers-page.tsx

```tsx
import * as React from "react";
import { ArrowRightIcon } from "@phosphor-icons/react/ssr";

import { Cta } from "@/components/blocks/cta";
import { FeatureGrid, type Feature } from "@/components/blocks/feature-grid";
import { Hero } from "@/components/blocks/hero";
import { SectionHead } from "@/components/blocks/section-head";
import { SiteLayout } from "@/components/site/site-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export type Role = { title: string; team: string; location: string; href: string };

/** The careers page: the hiring call, why work here as cards, the open roles as rows, and a way in for everyone else. */
function CareersPage({ markSrc, title = "Come build the inbox for AI agents", description, reasons = [], roles, contactHref = "/contact" }: { markSrc?: string; title?: string; description?: string; reasons?: Feature[]; roles: Role[]; contactHref?: string }) {
  return (
    <SiteLayout markSrc={markSrc} current="/careers">
      <Hero eyebrow="Careers" title={title} description={description} />
      {reasons.length ? <FeatureGrid label="Why join" title="How we work" features={reasons} /> : null}
      <section className="mx-auto grid max-w-(--ds-layout-column) gap-6 px-6 py-12">
        <SectionHead label="Open roles" title={roles.length ? `${roles.length} open ${roles.length === 1 ? "role" : "roles"}` : "No open roles right now"} />
        {roles.length ? (
          <ul className="grid gap-3">
            {roles.map((role) => (
              <li key={`${role.title}-${role.location}`}>
                <Card className="flex-row flex-wrap items-center justify-between gap-4 p-5">
                  <div className="grid gap-1">
                    <p className="text-body font-medium text-fg">{role.title}</p>
                    <p className="text-body-sm text-fg-muted">{role.location}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">{role.team}</Badge>
                    <Button asChild variant="outline">
                      <a href={role.href}>
                        View role <ArrowRightIcon aria-hidden />
                      </a>
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
      <Cta
        title="Do not see your role?"
        description="Tell us what you would build."
        actions={
          <Button asChild>
            <a href={contactHref}>Get in touch</a>
          </Button>
        }
      />
    </SiteLayout>
  );
}

export { CareersPage };

```
