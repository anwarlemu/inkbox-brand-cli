"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpenTextIcon, ListIcon, MagnifyingGlassIcon, PaletteIcon, SquaresFourIcon, XIcon } from "@phosphor-icons/react/ssr";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Lockup } from "@www/components/logo";

type Entry = { name: string; title: string };

// A rail row, as the console draws one (Agent Workspace, Email, Vault): 38px tall with 8px corners, a 22px glyph 10px
// from a 14px regular ink label; the current page sits on the lilac. Hover washes the row; there is no motion.
const ROW =
  "flex h-9.5 items-center gap-2.5 rounded-control px-3 text-body leading-tight text-fg outline-none transition-colors duration-150 ease-out hover:bg-subtle focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring aria-[current=page]:bg-subtle motion-reduce:transition-none [&_svg]:size-6 [&_svg]:shrink-0";

const PAGES = [
  { href: "/", label: "Introduction", icon: BookOpenTextIcon },
  { href: "/components", label: "All components", icon: SquaresFourIcon },
  { href: "/theme", label: "Theme", icon: PaletteIcon },
];

function Groups({ entries, query, onNavigate }: { entries: Entry[]; query: string; onNavigate: () => void }) {
  const pathname = usePathname();
  const q = query.trim().toLowerCase();
  const shown = q ? entries.filter((e) => e.title.toLowerCase().includes(q) || e.name.includes(q)) : entries;
  return (
    <>
      {!q && (
        <ul className="grid gap-0.5">
          {PAGES.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link href={href} onNavigate={onNavigate} aria-current={pathname === href ? "page" : undefined} className={ROW}>
                <Icon weight="fill" aria-hidden />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div>
        <p className="ds-label mb-2 px-1 text-body-sm leading-tight text-fg-label">Components</p>
        {shown.length ? (
          <ul className="grid gap-0.5">
            {shown.map((e) => {
              const href = `/components/${e.name}`;
              return (
                <li key={e.name}>
                  <Link href={href} scroll={false} onNavigate={onNavigate} data-item={e.name} aria-current={pathname === href ? "page" : undefined} className={cn(ROW, "h-8.5")}>
                    {e.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-3 text-body text-fg-muted">Nothing matches.</p>
        )}
      </div>
    </>
  );
}

/**
 * The docs' rail, as the console's (288px of white beside the page, a hairline at its edge): the lockup, a filter, the
 * pages and every component. Below 1024px it folds into a bar at the top of the page that opens it over the page.
 */
export function DocsRail({ entries }: { entries: Entry[] }) {
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const close = React.useCallback(() => setOpen(false), []);
  return (
    <>
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line-subtle bg-surface px-4 lg:hidden">
        <Link href="/" aria-label="Inkbox design system" className="rounded-control outline-none focus-visible:outline-2 focus-visible:outline-focus-ring">
          <Lockup />
        </Link>
        <button type="button" aria-expanded={open} aria-controls="docs-rail" onClick={() => setOpen((o) => !o)} className="inline-flex size-9 items-center justify-center rounded-control text-fg outline-none hover:bg-subtle focus-visible:outline-2 focus-visible:outline-focus-ring">
          {open ? <XIcon className="size-5.5" /> : <ListIcon className="size-5.5" />}
          <span className="sr-only">{open ? "Close the library" : "Open the library"}</span>
        </button>
      </div>
      <nav
        id="docs-rail"
        aria-label="Library"
        className={cn(
          "z-20 flex-col border-r border-line-subtle bg-surface max-lg:fixed max-lg:inset-x-0 max-lg:top-14 max-lg:bottom-0 lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-(--ds-layout-rail) lg:shrink-0",
          open ? "flex" : "hidden",
        )}
      >
        <Link href="/" aria-label="Inkbox design system" className="mx-4 mt-4 mb-3 hidden w-fit rounded-control outline-none focus-visible:outline-2 focus-visible:outline-focus-ring lg:block">
          <Lockup />
        </Link>
        <div className="relative mx-3 mb-3 mt-3 lg:mt-1">
          <MagnifyingGlassIcon aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4.5 -translate-y-1/2 text-fg-muted" />
          <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter components" aria-label="Filter components" className="h-9 pl-9" />
        </div>
        <div className="grid min-h-0 flex-1 content-start gap-5 overflow-y-auto overscroll-contain px-3 pb-6 [scrollbar-width:thin]">
          <Groups entries={entries} query={query} onNavigate={close} />
        </div>
      </nav>
    </>
  );
}
