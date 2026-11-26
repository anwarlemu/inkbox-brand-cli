# Contact page
The contact page template: ways to reach the team as cards and a form.

Install: npx inkbox-ds add contact-page
Requires: theme, section-head, site-layout, button, card, field, input, textarea
Packages: @phosphor-icons/react
Exports: ContactOption, OPTIONS, ContactPage
Client boundary: not required by this entry file

## Usage
Start a contact page from it; set action to your endpoint.
- Avoid: Collecting more than you need


## Examples
Example components: npx inkbox-ds add contact-page
[Preview](https://inkbox-ds.vercel.app/preview/contact-page/Preview)

examples/contact-page.tsx

```tsx
import { ContactPage } from "@/components/site/contact-page";

export function Preview() {
  return <ContactPage />;
}

```

## Source

components/site/contact-page.tsx

```tsx
import * as React from "react";
import { BookOpenTextIcon, ChatCircleIcon, EnvelopeSimpleIcon } from "@phosphor-icons/react/ssr";

import { SectionHead } from "@/components/blocks/section-head";
import { SiteLayout } from "@/components/site/site-layout";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export type ContactOption = { icon?: React.ReactNode; title: string; description: string; href: string; action: string };

export const OPTIONS: ContactOption[] = [
  { icon: <EnvelopeSimpleIcon weight="fill" />, title: "Sales", description: "Volume pricing, dedicated lines and onboarding.", href: "mailto:sales@acme.com", action: "Email sales" },
  { icon: <ChatCircleIcon weight="fill" />, title: "Support", description: "Questions about your account or an agent.", href: "mailto:support@acme.com", action: "Email support" },
  { icon: <BookOpenTextIcon weight="fill" />, title: "Docs", description: "Guides, the API reference and the SDKs.", href: "/docs", action: "Read the docs" },
];

/**
 * The contact page: the heading and the ways to reach the team as cards at the left, the form at the right. The form
 * posts to `action`; wire it to your own endpoint.
 */
function ContactPage({ markSrc, options = OPTIONS, action = "/api/contact" }: { markSrc?: string; options?: ContactOption[]; action?: string }) {
  return (
    <SiteLayout markSrc={markSrc}>
      <section className="mx-auto grid max-w-(--ds-layout-column) gap-10 px-6 py-16 md:py-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
        <div className="grid content-start gap-8">
          <SectionHead title="Contact us" description="Tell us what you are building. We usually reply within a day." />
          <ul className="grid gap-3">
            {options.map((o) => (
              <li key={o.title}>
                <Card size="sm">
                  <CardHeader>
                    <CardTitle>
                      {o.icon}
                      {o.title}
                    </CardTitle>
                    <CardDescription>
                      {o.description}{" "}
                      <a href={o.href} className="text-fg-brand underline-offset-4 outline-none hover:underline focus-visible:underline">
                        {o.action}
                      </a>
                    </CardDescription>
                  </CardHeader>
                </Card>
              </li>
            ))}
          </ul>
        </div>
        <form action={action} method="post" className="grid content-start gap-5 rounded-dialog border border-line-field bg-surface p-6">
          <FieldGroup>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="contact-name">Name</FieldLabel>
                <Input id="contact-name" name="name" autoComplete="name" placeholder="Your name" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="contact-email">Work email</FieldLabel>
                <Input id="contact-email" name="email" type="email" autoComplete="email" placeholder="you@acme.com" required />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="contact-company">Company</FieldLabel>
              <Input id="contact-company" name="company" autoComplete="organization" placeholder="Acme" />
            </Field>
            <Field>
              <FieldLabel htmlFor="contact-message">How can we help?</FieldLabel>
              <Textarea id="contact-message" name="message" rows={5} placeholder="Tell us about your agents" required />
            </Field>
          </FieldGroup>
          <Button type="submit" className="w-full sm:w-fit">
            Send message
          </Button>
        </form>
      </section>
    </SiteLayout>
  );
}

export { ContactPage };

```
