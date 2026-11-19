# Site header
The website's top bar: the lockup, pill links that wash lilac on hover, actions at the right, and a sheet menu on phones.

Install: npx inkbox-ds add site-header
Requires: theme, button, sheet, utils
Packages: @phosphor-icons/react
Exports: SiteLink, SiteHeader
Client boundary: yes
Reference: The console rail's rows (sidebar-nav-button.tsx) laid out as a top bar


## Usage
Use at the top of every website page (SiteLayout already does). Mark the current page with current on its link; put Log in (ghost) and Get started (default) in actions.
- Avoid: A dark or purple bar
- Avoid: Underlined or bold nav links
- Avoid: More than six links


## Examples
Example components: npx inkbox-ds add site-header lockup button
[Preview](https://inkbox-ds.vercel.app/preview/site-header/Preview)

examples/site-header.tsx

```tsx
import { SiteHeader } from "@/components/blocks/site-header";
import { Lockup } from "@/components/site/lockup";
import { Button } from "@/components/ui/button";

export function Preview() {
  return (
    <SiteHeader
      logo={<Lockup />}
      links={[
        { label: "Product", href: "#product", current: true },
        { label: "Pricing", href: "#pricing" },
        { label: "Changelog", href: "#changelog" },
        { label: "Blog", href: "#blog" },
      ]}
      actions={
        <>
          <Button variant="ghost" size="sm">
            Log in
          </Button>
          <Button size="sm">Get started</Button>
        </>
      }
    />
  );
}

```

## Source

components/blocks/site-header.tsx

```tsx
"use client";

import * as React from "react";
import { ListIcon } from "@phosphor-icons/react/ssr";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type SiteLink = { label: string; href: string; current?: boolean };

const LINK =
  "rounded-pill px-3 py-1.5 text-body leading-tight font-medium text-icon-secondary outline-none transition-colors duration-150 ease-out hover:bg-subtle hover:text-fg focus-visible:shadow-focus aria-[current=page]:bg-subtle-hover aria-[current=page]:text-fg motion-reduce:transition-none";

/**
 * The site's top bar, in the console's rail language: the lockup at the left, pill links in the secondary purple that
 * wash lilac on hover (the current page sits on the deeper lilac), and the actions at the right. Below 768px the links
 * fold into a sheet behind a menu button.
 */
function SiteHeader({ logo, links, actions, homeHref = "/", className }: { logo: React.ReactNode; links: SiteLink[]; actions?: React.ReactNode; homeHref?: string; className?: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <header data-slot="site-header" className={cn("sticky top-0 z-30 border-b border-line-subtle bg-surface", className)}>
      <div className="mx-auto flex h-16 max-w-(--ds-layout-column) items-center gap-6 px-6">
        <a href={homeHref} className="rounded-control outline-none focus-visible:shadow-focus">
          {logo}
        </a>
        <nav aria-label="Main" className="hidden flex-1 items-center gap-1 md:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} aria-current={l.current ? "page" : undefined} className={LINK}>
              {l.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-3 md:flex">{actions}</div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="ml-auto md:hidden" aria-label="Open the menu">
              <ListIcon className="size-5.5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <SheetHeader>
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            <nav aria-label="Main" className="grid gap-1 px-4">
              {links.map((l) => (
                <a key={l.href} href={l.href} aria-current={l.current ? "page" : undefined} onClick={() => setOpen(false)} className={LINK}>
                  {l.label}
                </a>
              ))}
            </nav>
            {actions && <div className="mt-4 grid gap-2 px-4 [&>*]:w-full">{actions}</div>}
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}

export { SiteHeader };

```
