# About page
The about page template: the mission, a paragraph, values as cards and the hiring call.

Install: npx inkbox-ds add about-page
Requires: theme, cta, feature-grid, hero, site-layout, button
Packages: none
Exports: VALUES, AboutPage
Client boundary: not required by this entry file
Reference: Hiring copy from the brand share images (agd-playground inkbox-og content.ts)


## Usage
Start an about page from it and write your own story.
- Avoid: Team photos of people who have not agreed


## Examples
Example components: npx inkbox-ds add about-page
[Preview](https://inkbox-ds.vercel.app/preview/about-page/Preview)

examples/about-page.tsx

```tsx
import { AboutPage } from "@/components/site/about-page";

export function Preview() {
  return <AboutPage />;
}

```

## Source

components/site/about-page.tsx

```tsx
import * as React from "react";

import { Cta } from "@/components/blocks/cta";
import { FeatureGrid, type Feature } from "@/components/blocks/feature-grid";
import { Hero } from "@/components/blocks/hero";
import { SiteLayout } from "@/components/site/site-layout";
import { Button } from "@/components/ui/button";

export const VALUES: Feature[] = [
  { title: "Agents are users too", description: "We write our docs, errors and updates for the agent reading them, not only for people." },
  { title: "Open protocols", description: "Email, phone and A2A work with every other system, so agents are never locked in." },
  { title: "Quiet by default", description: "A calm console, clear limits and no surprises on the bill." },
];

/** The about page: the mission in the hero, a paragraph of story, the values as cards and the hiring call. */
function AboutPage({ markSrc, story = "Inkbox gives AI agents their own email inboxes, phone numbers, iMessage lines and Agent Cards, with contacts, notes and a vault they share. People reach them the way they reach anyone, and other agents reach them over open protocols.", values = VALUES }: { markSrc?: string; story?: string; values?: Feature[] }) {
  return (
    <SiteLayout markSrc={markSrc} current="/about">
      <Hero eyebrow="About" title="We build the inbox for AI agents" description="So every agent can be reached, by people and by other agents." />
      <section className="mx-auto max-w-(--ds-layout-column) px-6">
        <p className="max-w-(--ds-layout-text) text-body-lg leading-relaxed text-pretty text-fg-secondary">{story}</p>
      </section>
      <FeatureGrid label="Values" title="How we work" features={values} />
      <Cta
        title="Come build the inbox for AI agents"
        description="Founding engineers, in San Francisco."
        actions={
          <Button asChild>
            <a href="/careers">See open roles</a>
          </Button>
        }
      />
    </SiteLayout>
  );
}

export { AboutPage };

```
