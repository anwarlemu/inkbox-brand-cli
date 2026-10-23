import Link from "next/link";
import { notFound } from "next/navigation";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react/ssr";

import { Code, Command, PageBody, PageHead, Section } from "@www/components/chrome";
import { FramePreview } from "@www/components/frame-preview";
import { Preview } from "@www/components/preview";
import { InlineCode, Prose } from "@www/components/prose";
import { examples } from "@www/lib/examples.generated";
import { CLI_COMMAND, type Item, exampleSource, findItem, items, needsPreviewFrame, sourceOf } from "@www/lib/registry";

export function generateStaticParams() {
  return items.map((i) => ({ name: i.name }));
}

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }) {
  const item = findItem((await params).name);
  return item ? { title: item.title, description: item.description, alternates: { canonical: `/components/${item.name}`, types: { "text/markdown": `/r/${item.name}.md`, "application/json": `/r/${item.name}.json` } } } : {};
}

function exampleLabel(name: string) {
  const words = name.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export default async function ComponentPage({ params }: { params: Promise<{ name: string }> }) {
  const item = findItem((await params).name);
  if (!item) notFound();
  // The main example first, then its states in their own order.
  const all = examples[item.name] ?? {};
  const demos = item.examples.filter((name) => all[name]).map((name) => [name, all[name]] as const);
  const framed = needsPreviewFrame(item);
  const at = items.findIndex((i) => i.name === item.name);
  const prev = at > 0 ? items[at - 1] : undefined;
  const next = at < items.length - 1 ? items[at + 1] : undefined;
  return (
    <>
      <PageHead eyebrow="Component" title={item.title} description={<Prose text={item.description} />}>
        <a href={`/r/${item.name}.md`} className="text-body text-fg-brand underline-offset-4 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-focus-ring">Text reference</a>
      </PageHead>
      <PageBody className="max-w-240">
        <Command command={`${CLI_COMMAND} add ${item.name}`} />

        {demos.length > 0 && (
          <div id="preview" className="grid scroll-mt-6 gap-8">
            {demos.map(([name, Demo]) => (framed ? <FramePreview key={name} src={`/preview/${item.name}/${name}`} label={exampleLabel(name)} /> : <Preview key={name} example={Demo} label={exampleLabel(name)} />))}
          </div>
        )}

        <Usage item={item} />

        {item.examples.length > 0 && (
          <Section id="example" title="Example">
            <Code title={`examples/${item.name}.tsx`} code={exampleSource(item.name)} />
          </Section>
        )}

        <Section id="source" title="Source">
          <div className="grid gap-5">
            {item.paths.map((p) => (
              <Code key={p} title={p} code={sourceOf(p)} tall />
            ))}
          </div>
          {item.source && <p className="text-body-sm text-fg-muted">Reference: {item.source}.</p>}
        </Section>

        <nav aria-label="More components" className="flex items-center justify-between gap-3 border-t border-line-subtle pt-6">
          {prev ? (
            <Link href={`/components/${prev.name}`} className="inline-flex items-center gap-1.5 rounded-control px-2 py-1.5 text-body text-fg-muted outline-none transition-colors duration-150 ease-out hover:text-fg focus-visible:outline-2 focus-visible:outline-focus-ring motion-reduce:transition-none">
              <CaretLeftIcon className="size-4" /> {prev.title}
            </Link>
          ) : <span />}
          {next && (
            <Link href={`/components/${next.name}`} className="inline-flex items-center gap-1.5 rounded-control px-2 py-1.5 text-body text-fg-muted outline-none transition-colors duration-150 ease-out hover:text-fg focus-visible:outline-2 focus-visible:outline-focus-ring motion-reduce:transition-none">
              {next.title} <CaretRightIcon className="size-4" />
            </Link>
          )}
        </nav>
      </PageBody>
    </>
  );
}

function Usage({ item }: { item: Item }) {
  const requires = item.dependencies.filter((d) => d !== "utils");
  return (
    <Section id="usage" title="Usage">
      <div className="grid gap-3 rounded-panel bg-subtle p-4">
        <p className="text-body leading-body text-fg">
          <Prose text={item.use_for} />
        </p>
        {item.never.length > 0 && (
          <div>
            <p className="mb-1 text-body leading-body font-medium text-fg">Avoid</p>
            <ul className="grid gap-1 text-body leading-body text-fg-secondary">
              {item.never.map((n) => (
                <li key={n} className="flex gap-2.5">
                  <span aria-hidden className="mt-2.5 h-px w-2.5 shrink-0 bg-danger" />
                  <Prose text={n} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <p className="text-body text-fg-muted">
        Exports: <InlineCode>{item.exports.join(", ")}</InlineCode>. {item.client ? "This component is a client component." : "Read the examples for composition and props."}
      </p>
      {item.body && (
        <div className="text-body leading-body text-fg">
          <Prose text={item.body} />
        </div>
      )}
      {(requires.length > 0 || item.npm.length > 0) && (
        <p className="text-body text-fg-muted">
          Dependencies:{" "}
          {requires.map((d, i) => (
            <span key={d}>
              {findItem(d) ? <Link href={`/components/${d}`} className="text-fg-brand underline-offset-4 hover:underline">{d}</Link> : <InlineCode>{d}</InlineCode>}
              {i < requires.length - 1 || item.npm.length ? ", " : ""}
            </span>
          ))}
          {item.npm.map((p, i) => (
            <span key={p}>
              <InlineCode>{p}</InlineCode>
              {i < item.npm.length - 1 ? ", " : ""}
            </span>
          ))}
          .
        </p>
      )}
    </Section>
  );
}
