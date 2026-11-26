# Pricing page
The pricing page template: the console's plans, billing questions and a call to talk to sales.

Install: npx inkbox-ds add pricing-page
Requires: theme, cta, faq, pricing-table, site-layout, button
Packages: none
Exports: PLANS, PRICING_QUESTIONS, PricingPage
Client boundary: not required by this entry file
Reference: Console billing tab plans (BillingTab.tsx)


## Usage
Start a pricing page from it; pass your plans.
- Avoid: Inventing plans or prices


## Examples
Example components: npx inkbox-ds add pricing-page
[Preview](https://inkbox-ds.vercel.app/preview/pricing-page/Preview)

examples/pricing-page.tsx

```tsx
import { PricingPage } from "@/components/site/pricing-page";

export function Preview() {
  return <PricingPage />;
}

```

## Source

components/site/pricing-page.tsx

```tsx
import * as React from "react";

import { Cta } from "@/components/blocks/cta";
import { Faq, type Question } from "@/components/blocks/faq";
import { PricingTable, type Plan } from "@/components/blocks/pricing-table";
import { SiteLayout } from "@/components/site/site-layout";
import { Button } from "@/components/ui/button";

// The console's plans (billing tab): names, prices, lines and their first features.
export const PLANS: Plan[] = [
  { name: "Free", price: "$0", cadence: "/ month", description: "For exploring Inkbox", summary: "3 agent identities", features: ["An email inbox", "Shared iMessage with phone calls", "1 GiB of stored mail per mailbox", "An agent-to-agent channel", "Contacts and credential vault access"], action: { label: "Get started", href: "/signup" } },
  { name: "Developer", price: "$30", cadence: "/ month", description: "Best for developers running agents in production", summary: "10 agent identities", features: ["Everything in the Free plan", "1 dedicated VoIP phone number", "2 GiB of stored mail per mailbox", "Custom email signatures", "10 custom email domains"], action: { label: "Choose Developer", href: "/signup?plan=developer" }, featured: true, badge: "Popular" },
  { name: "Startup", price: "$200", cadence: "/ month", description: "Best for startups running agent fleets", summary: "100 agent identities", features: ["Everything in the Developer plan", "1 dedicated iMessage phone number", "9 dedicated VoIP phone numbers", "100 custom email domains", "Priority support"], action: { label: "Choose Startup", href: "/signup?plan=startup" } },
  { name: "Enterprise", price: "Custom", cadence: "pricing", description: "For teams with custom requirements", features: ["Volume pricing", "Custom allowances and rate limits", "International numbers, SMS and calling", "Dedicated iMessage infrastructure", "Dedicated support and onboarding"], action: { label: "Contact sales", href: "/contact" } },
];

export const PRICING_QUESTIONS: Question[] = [
  { question: "What happens when I reach a limit?", answer: "Usage inside your included allowances is never blocked. Set an overage limit to cap spend beyond them." },
  { question: "Can I pay yearly?", answer: "Yes. Developer and Startup can be billed yearly at a lower monthly equivalent." },
  { question: "Can I change plans later?", answer: "Yes. Upgrade or downgrade from billing at any time; changes apply to the next cycle." },
];

/** The pricing page: the plans, questions about billing and a call to talk to sales. */
function PricingPage({ markSrc, plans = PLANS, questions = PRICING_QUESTIONS }: { markSrc?: string; plans?: Plan[]; questions?: Question[] }) {
  return (
    <SiteLayout markSrc={markSrc} current="/pricing">
      <PricingTable className="pt-16 md:pt-24" label="Pricing" title="Start free, grow with your agents" description="Every plan includes email, an agent-to-agent channel, contacts and the vault." plans={plans} note="Prices in USD. Call minutes and SMS cover the U.S. and Canada." />
      <Faq questions={questions} />
      <Cta
        title="Need more identities or numbers?"
        description="Talk to us about volume pricing and dedicated infrastructure."
        actions={
          <Button asChild variant="outline">
            <a href="/contact">Contact sales</a>
          </Button>
        }
      />
    </SiteLayout>
  );
}

export { PricingPage };

```
