import Link from "next/link";

import { PageBody, PageHead } from "@www/components/chrome";
import { items } from "@www/lib/registry";

export const metadata = { title: "Components" };

export default function ComponentsPage() {
  return (
    <>
      <PageHead title="Components" description={`${items.length} components, each with its examples, usage rules and source.`} />
      <PageBody>
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-3">
          {items.map((i) => (
            <li key={i.name}>
              <Link href={`/components/${i.name}`} className="grid h-full content-start gap-1 rounded-control border border-line-field bg-surface p-4 outline-none transition-colors duration-150 ease-out hover:bg-subtle focus-visible:outline-2 focus-visible:outline-focus-ring motion-reduce:transition-none">
                <span className="text-body leading-tight font-medium text-fg">{i.title}</span>
                <span className="text-body leading-body text-fg-muted">{i.description}</span>
              </Link>
            </li>
          ))}
        </ul>
      </PageBody>
    </>
  );
}
