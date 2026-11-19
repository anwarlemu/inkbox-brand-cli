# Not found page
The 404 template: the console's empty state with the octopus, the message and the ways back.

Install: npx inkbox-ds add not-found-page
Requires: theme, site-layout, button, empty
Packages: @phosphor-icons/react
Exports: NotFoundPage
Client boundary: not required by this entry file
Reference: Console empty state (Empty mascot and orbit)


## Usage
Use as the site's not-found page.
- Avoid: Jokes in the message


## Examples
Example components: npx inkbox-ds add not-found-page
[Preview](https://inkbox-ds.vercel.app/preview/not-found-page/Preview)

examples/not-found-page.tsx

```tsx
import { NotFoundPage } from "@/components/site/not-found-page";

export function Preview() {
  return <NotFoundPage />;
}

```

## Source

components/site/not-found-page.tsx

```tsx
import * as React from "react";
import { CompassIcon, EnvelopeIcon, MagnifyingGlassIcon, PhoneIcon, VaultIcon } from "@phosphor-icons/react/ssr";

import { SiteLayout } from "@/components/site/site-layout";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMascot, EmptyMedia, EmptyOrbit, EmptyTitle } from "@/components/ui/empty";

/** The 404 page: the console's empty state (the octopus in its orbit of glyphs), the message and the ways back. */
function NotFoundPage({ markSrc, mascotSrc = "/octopus.png", title = "Page not found", description = "The page you are looking for moved or never existed." }: { markSrc?: string; mascotSrc?: string; title?: string; description?: string }) {
  return (
    <SiteLayout markSrc={markSrc}>
      <section className="mx-auto max-w-(--ds-layout-column) px-6 py-16 md:py-24">
        <Empty className="min-h-100">
          <EmptyMedia variant="mascot">
            <EmptyOrbit>
              <MagnifyingGlassIcon weight="bold" />
              <EnvelopeIcon weight="fill" />
              <CompassIcon weight="fill" />
              <PhoneIcon weight="fill" />
              <VaultIcon weight="fill" />
            </EmptyOrbit>
            <EmptyMascot src={mascotSrc} />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>{title}</EmptyTitle>
            <EmptyDescription>{description}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent className="flex-row flex-wrap justify-center">
            <Button asChild>
              <a href="/">Back to home</a>
            </Button>
            <Button asChild variant="outline">
              <a href="/contact">Contact us</a>
            </Button>
          </EmptyContent>
        </Empty>
      </section>
    </SiteLayout>
  );
}

export { NotFoundPage };

```
