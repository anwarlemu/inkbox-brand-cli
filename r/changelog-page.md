# Changelog page
The changelog template: each release on a timeline with its date, version, tags and changes.

Install: npx inkbox-ds add changelog-page
Requires: theme, section-head, site-layout, badge
Packages: none
Exports: Release, RELEASES, ChangelogPage
Client boundary: not required by this entry file
Reference: Changelog copy from the brand share images (SDK 0.5.14, Agent Cards)


## Usage
Start a changelog from it; pass releases newest first.
- Avoid: Marketing copy in change lines


## Examples
Example components: npx inkbox-ds add changelog-page
[Preview](https://inkbox-ds.vercel.app/preview/changelog-page/Preview)

examples/changelog-page.tsx

```tsx
import { ChangelogPage } from "@/components/site/changelog-page";

export function Preview() {
  return <ChangelogPage />;
}

```

## Source

components/site/changelog-page.tsx

```tsx
import * as React from "react";

import { SectionHead } from "@/components/blocks/section-head";
import { SiteLayout } from "@/components/site/site-layout";
import { Badge } from "@/components/ui/badge";

export type Release = { version?: string; date: string; title: string; tags?: string[]; changes: string[] };

export const RELEASES: Release[] = [
  { version: "SDK 0.5.14", date: "Jul 31, 2026", title: "Agent Cards, public directory and invitations", tags: ["A2A", "SDK"], changes: ["Publish an agent's card to the public directory.", "Find workers with a directory search.", "Connect a bundle of agents with one invitation."] },
  { date: "Jul 24, 2026", title: "Agent2Agent", tags: ["A2A"], changes: ["Delegate tasks to other agents over A2A 1.0.", "Every identity can serve an Agent Card."] },
  { date: "Jul 17, 2026", title: "Custom email signatures", tags: ["Email"], changes: ["Set a signature per mailbox.", "Signatures apply to replies sent through the API."] },
];

/** The changelog: a heading, then each release on a timeline: the date at the left, the title, tags and changes. */
function ChangelogPage({ markSrc, releases = RELEASES }: { markSrc?: string; releases?: Release[] }) {
  return (
    <SiteLayout markSrc={markSrc} current="/changelog">
      <section className="mx-auto grid max-w-(--ds-layout-column) gap-10 px-6 py-16 md:py-24">
        <SectionHead title="Changelog" description="New features, improvements and fixes." />
        <ol className="grid gap-0">
          {releases.map((r) => (
            <li key={`${r.date}-${r.title}`} className="grid gap-3 border-t border-line-subtle py-8 md:grid-cols-[12rem_minmax(0,1fr)] md:gap-10">
              <div className="grid content-start gap-1">
                <time className="text-body leading-body text-fg-muted">{r.date}</time>
                {r.version && <span className="font-mono text-body-sm text-fg-label">{r.version}</span>}
              </div>
              <div className="grid content-start gap-3">
                <h2 className="text-h3 leading-heading font-normal text-fg">{r.title}</h2>
                {r.tags && (
                  <div className="flex flex-wrap gap-1.5">
                    {r.tags.map((t) => (
                      <Badge key={t} variant="blue" size="sm">
                        {t}
                      </Badge>
                    ))}
                  </div>
                )}
                <ul className="grid list-disc gap-1.5 pl-5 text-body leading-body text-fg-secondary">
                  {r.changes.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </SiteLayout>
  );
}

export { ChangelogPage };

```
