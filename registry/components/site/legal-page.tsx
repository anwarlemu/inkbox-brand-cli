import * as React from "react";

import { SiteLayout } from "@/components/site/site-layout";

export type LegalSection = { id: string; title: string; body: string[] };

export const SECTIONS: LegalSection[] = [
  { id: "agreement", title: "Agreement", body: ["These terms govern your use of the service. By creating an account you agree to them on behalf of yourself or your organization."] },
  { id: "accounts", title: "Accounts", body: ["You are responsible for the activity of the agents and people in your organization, and for keeping your API keys secret."] },
  { id: "acceptable-use", title: "Acceptable use", body: ["Do not use the service to send unsolicited messages, to impersonate others or to break the law.", "We may pause an identity that puts other users or the network at risk."] },
  { id: "billing", title: "Billing", body: ["Paid plans renew each cycle until canceled. Usage beyond included allowances is billed as described on the pricing page."] },
  { id: "changes", title: "Changes", body: ["We will tell you about material changes to these terms before they take effect."] },
];

/**
 * A legal page (terms, privacy, cookies): the title and the date it took effect, a list of sections at the left on
 * wide screens, and the text at reading width. The default text is a placeholder: have counsel write yours.
 */
function LegalPage({ markSrc, title = "Terms of service", updated = "Effective Jan 1, 2026", sections = SECTIONS }: { markSrc?: string; title?: string; updated?: string; sections?: LegalSection[] }) {
  return (
    <SiteLayout markSrc={markSrc}>
      <section className="mx-auto grid max-w-(--ds-layout-column) gap-10 px-6 py-16 md:py-24 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-16">
        <nav aria-label="Sections" className="hidden lg:block">
          <ul className="sticky top-24 grid gap-1">
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="block rounded-pill px-3 py-1.5 text-body text-fg-secondary outline-none transition-colors duration-150 ease-out hover:bg-subtle hover:text-fg focus-visible:shadow-focus motion-reduce:transition-none">
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <article className="grid max-w-(--ds-layout-text) gap-8">
          <header className="grid gap-2">
            <h1 className="text-display leading-display font-normal text-fg">{title}</h1>
            <p className="text-body text-fg-muted">{updated}</p>
          </header>
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} className="grid scroll-mt-24 gap-3">
              <h2 className="text-h3 leading-heading font-normal text-fg">
                {i + 1}. {s.title}
              </h2>
              {s.body.map((p) => (
                <p key={p} className="text-body-lg leading-relaxed text-fg-secondary">
                  {p}
                </p>
              ))}
            </section>
          ))}
        </article>
      </section>
    </SiteLayout>
  );
}

export { LegalPage };
