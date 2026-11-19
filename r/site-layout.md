# Site layout
A website page's frame: the site header and footer around the page's sections, with the brand's links.

Install: npx inkbox-ds add site-layout
Requires: theme, site-footer, site-header, lockup, button
Packages: none
Exports: SITE_LINKS, FOOTER_GROUPS, SiteLayout
Client boundary: not required by this entry file

## Usage
Use as the outer frame of every website page; pass current with the page's href. The page templates use it.
- Avoid: Pages without the header and footer
- Avoid: A second nav bar


## Examples
Example components: npx inkbox-ds add site-layout
[Preview](https://inkbox-ds.vercel.app/preview/site-layout/Preview)

examples/site-layout.tsx

```tsx
import { SiteLayout } from "@/components/site/site-layout";

export function Preview() {
  return (
    <SiteLayout current="/product">
      <section className="mx-auto max-w-(--ds-layout-column) px-6 py-16">
        <p className="text-body text-fg-secondary">The page's sections go here.</p>
      </section>
    </SiteLayout>
  );
}

```

## Source

components/site/site-layout.tsx

```tsx
import * as React from "react";

import { SiteFooter, type FooterGroup } from "@/components/blocks/site-footer";
import { SiteHeader, type SiteLink } from "@/components/blocks/site-header";
import { Lockup } from "@/components/site/lockup";
import { Button } from "@/components/ui/button";

export const SITE_LINKS: SiteLink[] = [
  { label: "Product", href: "/product" },
  { label: "Pricing", href: "/pricing" },
  { label: "Changelog", href: "/changelog" },
  { label: "Blog", href: "/blog" },
  { label: "About", href: "/about" },
];

export const FOOTER_GROUPS: FooterGroup[] = [
  { title: "Product", links: [{ label: "Email", href: "/product#email" }, { label: "Phone", href: "/product#phone" }, { label: "Agent2Agent", href: "/product#a2a" }, { label: "Pricing", href: "/pricing" }] },
  { title: "Company", links: [{ label: "About", href: "/about" }, { label: "Blog", href: "/blog" }, { label: "Changelog", href: "/changelog" }, { label: "Contact", href: "/contact" }] },
  { title: "Legal", links: [{ label: "Privacy policy", href: "/legal/privacy" }, { label: "Terms of service", href: "/legal/terms" }] },
];

/**
 * A website page's frame: the top bar (lockup, links, Log in and Get started) and the foot around the page's sections.
 * Mark the current link with `current` (its href); swap any part through props.
 */
function SiteLayout({ children, current, markSrc, links = SITE_LINKS, groups = FOOTER_GROUPS, actions, legal = "© 2026 Inkbox", tagline = "Give every AI agent a way to be reached." }: { children: React.ReactNode; current?: string; markSrc?: string; links?: SiteLink[]; groups?: FooterGroup[]; actions?: React.ReactNode; legal?: string; tagline?: string }) {
  return (
    <div data-slot="site-layout" className="flex min-h-dvh flex-col bg-page font-sans text-fg">
      <SiteHeader
        logo={<Lockup markSrc={markSrc} />}
        links={links.map((l) => ({ ...l, current: l.href === current }))}
        actions={
          actions ?? (
            <>
              <Button asChild variant="ghost" size="sm">
                <a href="/login">Log in</a>
              </Button>
              <Button asChild size="sm">
                <a href="/signup">Get started</a>
              </Button>
            </>
          )
        }
      />
      <main className="flex-1">{children}</main>
      <SiteFooter logo={<Lockup markSrc={markSrc} />} tagline={tagline} groups={groups} legal={legal} legalLinks={[{ label: "Privacy policy", href: "/legal/privacy" }, { label: "Terms of service", href: "/legal/terms" }]} />
    </div>
  );
}

export { SiteLayout };

```
