# Server error page
The 500 template: the console's empty state with the octopus, a plain message, a retry and the way home.

Install: npx inkbox-ds add server-error-page
Requires: theme, site-layout, button, empty
Packages: @phosphor-icons/react
Exports: ServerErrorPage
Client boundary: not required by this entry file
Reference: Console empty state (Empty mascot and orbit), as the not-found page


## Usage
Use as the site's error page (500, 503).
- Avoid: Stack traces or error codes in the message
- Avoid: Jokes in the message


## Examples
Example components: npx inkbox-ds add server-error-page
[Preview](https://inkbox-ds.vercel.app/preview/server-error-page/Preview) | [WithStatus](https://inkbox-ds.vercel.app/preview/server-error-page/WithStatus)

examples/server-error-page.tsx

```tsx
import { ServerErrorPage } from "@/components/site/server-error-page";

export function Preview() {
  return <ServerErrorPage />;
}

export function WithStatus() {
  return <ServerErrorPage statusHref="https://status.acme.com" />;
}

```

## Source

components/site/server-error-page.tsx

```tsx
import * as React from "react";
import { ArrowClockwiseIcon, EnvelopeIcon, GearSixIcon, PhoneIcon, WarningIcon } from "@phosphor-icons/react/ssr";

import { SiteLayout } from "@/components/site/site-layout";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMascot, EmptyMedia, EmptyOrbit, EmptyTitle } from "@/components/ui/empty";

/** The 500 page: the console's empty state with the octopus, a plain message, a retry and the way home. */
function ServerErrorPage({ markSrc, mascotSrc = "/octopus.png", title = "Something went wrong", description = "We could not load this page. Try again in a moment.", retryHref = "", statusHref }: { markSrc?: string; mascotSrc?: string; title?: string; description?: string; retryHref?: string; statusHref?: string }) {
  return (
    <SiteLayout markSrc={markSrc}>
      <section className="mx-auto max-w-(--ds-layout-column) px-6 py-16 md:py-24">
        <Empty className="min-h-100">
          <EmptyMedia variant="mascot">
            <EmptyOrbit>
              <WarningIcon weight="fill" />
              <EnvelopeIcon weight="fill" />
              <GearSixIcon weight="fill" />
              <PhoneIcon weight="fill" />
              <ArrowClockwiseIcon weight="bold" />
            </EmptyOrbit>
            <EmptyMascot src={mascotSrc} />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>{title}</EmptyTitle>
            <EmptyDescription>{description}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent className="flex-row flex-wrap justify-center">
            <Button asChild>
              <a href={retryHref}>Try again</a>
            </Button>
            <Button asChild variant="outline">
              <a href="/">Back to home</a>
            </Button>
            {statusHref ? (
              <Button asChild variant="link">
                <a href={statusHref}>Status</a>
              </Button>
            ) : null}
          </EmptyContent>
        </Empty>
      </section>
    </SiteLayout>
  );
}

export { ServerErrorPage };

```
