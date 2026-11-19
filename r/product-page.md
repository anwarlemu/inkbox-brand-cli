# Product page
The product page template: a centered hero over the channels, what agents share, and the closing call.

Install: npx inkbox-ds add product-page
Requires: theme, cta, feature-grid, hero, site-layout, button
Packages: @phosphor-icons/react
Exports: CHANNELS, SHARED, ProductPage
Client boundary: not required by this entry file
Reference: Console rail sections (Channels, Shared) and page descriptions


## Usage
Start a product or features page from it; pass a product shot as screenshot.
- Avoid: Fake screenshots


## Examples
Example components: npx inkbox-ds add product-page
[Preview](https://inkbox-ds.vercel.app/preview/product-page/Preview)

examples/product-page.tsx

```tsx
import { ProductPage } from "@/components/site/product-page";

export function Preview() {
  return <ProductPage />;
}

```

## Source

components/site/product-page.tsx

```tsx
import * as React from "react";
import { AddressBookIcon, AppleLogoIcon, ArrowsLeftRightIcon, EnvelopeSimpleIcon, KeyIcon, NotepadIcon, PhoneIcon, VaultIcon, WebhooksLogoIcon } from "@phosphor-icons/react/ssr";

import { Cta } from "@/components/blocks/cta";
import { FeatureGrid, type Feature } from "@/components/blocks/feature-grid";
import { Hero } from "@/components/blocks/hero";
import { SiteLayout } from "@/components/site/site-layout";
import { Button } from "@/components/ui/button";

export const CHANNELS: Feature[] = [
  { icon: <EnvelopeSimpleIcon weight="fill" />, title: "Email", description: "An inbox per agent, IMAP and SMTP access, custom domains and signatures." },
  { icon: <PhoneIcon weight="fill" />, title: "Phone", description: "Dedicated VoIP numbers with HD voice, SMS and MMS." },
  { icon: <AppleLogoIcon weight="fill" />, title: "iMessage", description: "Shared lines to start, dedicated lines for iMessage, RCS and SMS." },
  { icon: <ArrowsLeftRightIcon weight="regular" />, title: "Agent2Agent", description: "Publish an Agent Card and delegate tasks over the open A2A protocol." },
];
export const SHARED: Feature[] = [
  { icon: <AddressBookIcon weight="fill" />, title: "Contacts", description: "One address book every agent reads and writes." },
  { icon: <NotepadIcon weight="fill" />, title: "Notes", description: "Context your agents keep between conversations." },
  { icon: <VaultIcon weight="fill" />, title: "Vault", description: "Credentials kept zero-knowledge, unlocked per agent." },
  { icon: <WebhooksLogoIcon weight="regular" />, title: "Webhooks", description: "Send events to your HTTPS endpoints, signed per identity." },
  { icon: <KeyIcon weight="fill" />, title: "API keys", description: "Scoped keys for every environment, from the console or the SDK." },
];

/** The product page: a hero over the channels, then what agents share, then the closing call. */
function ProductPage({ markSrc, screenshot, channels = CHANNELS, shared = SHARED }: { markSrc?: string; screenshot?: React.ReactNode; channels?: Feature[]; shared?: Feature[] }) {
  return (
    <SiteLayout markSrc={markSrc} current="/product">
      <Hero
        align="center"
        eyebrow="Product"
        title="Everything an agent needs to be reached"
        description="Turn on the channels each agent uses and give them the context they share."
        actions={
          <Button asChild>
            <a href="/signup">Get started free</a>
          </Button>
        }
        media={screenshot}
      />
      <FeatureGrid label="Channels" title="Reach every agent its own way" features={channels} columns={4} />
      <FeatureGrid label="Shared" title="Context every agent can use" features={shared} />
      <Cta
        title="See it in the console"
        description="Create an agent, turn on a channel and send its first message in minutes."
        actions={
          <Button asChild>
            <a href="/signup">Create an agent</a>
          </Button>
        }
      />
    </SiteLayout>
  );
}

export { ProductPage };

```
