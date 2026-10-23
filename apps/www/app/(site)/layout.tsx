import { DocsRail } from "@www/components/nav";
import { items } from "@www/lib/registry";

// The docs pages, laid out as the console: the rail at the left, the page beside it. Example previews (app/preview)
// render bare.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="lg:flex">
      <DocsRail entries={items.map((i) => ({ name: i.name, title: i.title }))} />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
