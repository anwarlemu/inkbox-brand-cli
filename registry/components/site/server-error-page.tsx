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
