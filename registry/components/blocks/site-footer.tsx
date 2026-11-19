import * as React from "react";

import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export type FooterGroup = { title: string; links: { label: string; href: string }[] };

/**
 * The site's foot: the lockup and a line at the left, link groups with purple labels, then a hairline over the legal
 * line and its links.
 */
function SiteFooter({ logo, tagline, groups, legal, legalLinks = [], className }: { logo: React.ReactNode; tagline?: string; groups: FooterGroup[]; legal: string; legalLinks?: { label: string; href: string }[]; className?: string }) {
  return (
    <footer data-slot="site-footer" className={cn("border-t border-line-subtle bg-surface", className)}>
      <div className="mx-auto grid max-w-(--ds-layout-column) gap-10 px-6 py-12">
        <div className="grid gap-10 md:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)]">
          <div className="grid content-start gap-3">
            {logo}
            {tagline && <p className="max-w-72 text-body leading-body text-fg-secondary">{tagline}</p>}
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {groups.map((g) => (
              <div key={g.title} className="grid content-start gap-3">
                <p className="text-body-sm leading-tight font-medium text-fg-label">{g.title}</p>
                <ul className="grid gap-2">
                  {g.links.map((l) => (
                    <li key={l.href}>
                      <a href={l.href} className="rounded-xs text-body leading-body text-fg-secondary outline-none transition-colors duration-150 ease-out hover:text-fg focus-visible:shadow-focus motion-reduce:transition-none">
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <Separator />
        <div className="flex flex-wrap items-center justify-between gap-4 text-body-sm leading-tight text-fg-muted">
          <p>{legal}</p>
          {legalLinks.length > 0 && (
            <ul className="flex flex-wrap gap-4">
              {legalLinks.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="rounded-xs outline-none transition-colors duration-150 ease-out hover:text-fg focus-visible:shadow-focus motion-reduce:transition-none">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </footer>
  );
}

export { SiteFooter };
