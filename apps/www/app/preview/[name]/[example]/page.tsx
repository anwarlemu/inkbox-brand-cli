import { notFound } from "next/navigation";

import { PreviewHeight } from "@www/components/preview-height";
import { Surface } from "@/lib/surface";
import { examples } from "@www/lib/examples.generated";
import { findItem, items } from "@www/lib/registry";

// One example alone on a page: overlay examples render here in a frame, and the browser checks load every example here.
export function generateStaticParams() {
  return items.flatMap((i) => Object.keys(examples[i.name] ?? {}).map((example) => ({ name: i.name, example })));
}

export const metadata = { robots: { index: false } };

export default async function ExamplePage({ params }: { params: Promise<{ name: string; example: string }> }) {
  const { name, example } = await params;
  const item = findItem(name);
  const Example = examples[name]?.[example];
  if (!item || !Example) notFound();
  // Pages and blocks run edge to edge; app shells fill a fixed 800px window so their rail and scrolling page show.
  const layout = item.type === "site" || item.type === "block";
  const shell = item.type === "product";
  return (
    <Surface data-preview-root="" className={shell ? "h-200 bg-surface" : layout ? "min-h-40 bg-surface" : "min-h-120 bg-surface p-6 sm:p-10"}>
      <Example />
      <PreviewHeight />
    </Surface>
  );
}
