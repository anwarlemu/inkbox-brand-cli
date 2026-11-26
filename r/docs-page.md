# Docs page
A documentation page: the console's rail of groups, the article in the text column and the page's headings at the right.

Install: npx inkbox-ds add docs-page
Requires: theme, site-layout, utils
Packages: none
Exports: DocsGroup, DocsHeading, DocsPage
Client boundary: not required by this entry file
Reference: The console's rail rows and labels (Figma 427:2715) and the library's text column


## Usage
Use for product documentation and guides; put the article's content in children.
- Avoid: More than one h1
- Avoid: A rail that cuts its links off: it scrolls and fades


## Examples
Example components: npx inkbox-ds add docs-page
[Preview](https://inkbox-ds.vercel.app/preview/docs-page/Preview)

examples/docs-page.tsx

```tsx
import { DocsPage } from "@/components/site/docs-page";

export function Preview() {
  return (
    <DocsPage
      title="Send an email"
      description="Every agent has its own address. Send from it with one call."
      groups={[
        { title: "Get started", links: [{ label: "Quickstart", href: "#" }, { label: "Send an email", href: "#", current: true }] },
        { title: "Channels", links: [{ label: "Email", href: "#" }, { label: "Phone", href: "#" }, { label: "Agent2Agent", href: "#" }] },
      ]}
      headings={[{ id: "request", label: "Request" }, { id: "response", label: "Response" }]}
    >
      <h2 id="request" className="text-h4 text-fg">Request</h2>
      <p>Pass the recipient, a subject and the body. The message goes out from the agent's own address.</p>
      <h2 id="response" className="text-h4 text-fg">Response</h2>
      <p>The call returns the message id and its state.</p>
    </DocsPage>
  );
}

```

## Source

components/site/docs-page.tsx

```tsx
import * as React from "react";

import { SiteLayout } from "@/components/site/site-layout";
import { cn } from "@/lib/utils";

export type DocsGroup = { title: string; links: { label: string; href: string; current?: boolean }[] };
export type DocsHeading = { id: string; label: string };

/**
 * A documentation page: the console's rail of groups at the left, the article in the text column, and the headings of
 * the page at the right on wide screens. The rail scrolls on its own and fades at its edges.
 */
function DocsPage({ markSrc, groups, title, description, headings = [], children }: { markSrc?: string; groups: DocsGroup[]; title: string; description?: string; headings?: DocsHeading[]; children: React.ReactNode }) {
  return (
    <SiteLayout markSrc={markSrc} current="/docs">
      <div className="mx-auto grid max-w-(--ds-layout-column) gap-10 px-6 py-12 lg:grid-cols-[14rem_minmax(0,1fr)_12rem]">
        <nav aria-label="Documentation" className="fade-y max-h-[calc(100dvh-8rem)] overflow-y-auto lg:sticky lg:top-24">
          {groups.map((group) => (
            <div key={group.title} className="mb-6">
              <p className="ds-label mb-2 text-body-sm text-fg-label">{group.title}</p>
              <ul className="grid gap-1">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      aria-current={link.current ? "page" : undefined}
                      className={cn("block rounded-pill px-2.5 py-1.5 text-body text-icon-secondary outline-none transition-colors duration-150 ease-out hover:bg-subtle focus-visible:shadow-focus aria-[current=page]:bg-subtle-hover aria-[current=page]:font-medium aria-[current=page]:text-fg motion-reduce:transition-none")}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <article className="grid min-w-0 content-start gap-4">
          <h1 className="text-h2 text-fg">{title}</h1>
          {description ? <p className="text-body-lg text-fg-secondary">{description}</p> : null}
          <div className="grid max-w-(--ds-layout-text) gap-4 text-body leading-relaxed text-fg-secondary">{children}</div>
        </article>
        {headings.length ? (
          <aside className="hidden lg:block">
            <p className="ds-label mb-2 text-body-sm text-fg-label">On this page</p>
            <ul className="grid gap-1.5">
              {headings.map((h) => (
                <li key={h.id}>
                  <a href={`#${h.id}`} className="text-body-sm text-fg-muted outline-none transition-colors duration-150 ease-out hover:text-fg-brand focus-visible:shadow-focus motion-reduce:transition-none">
                    {h.label}
                  </a>
                </li>
              ))}
            </ul>
          </aside>
        ) : null}
      </div>
    </SiteLayout>
  );
}

export { DocsPage };

```
