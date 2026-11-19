import * as React from "react";
import { ArrowLeftIcon } from "@phosphor-icons/react/ssr";

import { Cta } from "@/components/blocks/cta";
import { SiteLayout } from "@/components/site/site-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CodeBlock, CodeBlockContent, CodeBlockHeader, CodeBlockTitle } from "@/components/ui/code-block";
import { Separator } from "@/components/ui/separator";

/**
 * A blog post: back to the blog, the tag, the 32px title, the date, then the article at reading width (pass any
 * markup as children: paragraphs, h2s, lists and code blocks are styled), and a closing call.
 */
function BlogPostPage({ markSrc, title = "Agents can now talk to each other", tag = "Feature", date = "Jul 24, 2026", byline = "The team", children }: { markSrc?: string; title?: string; tag?: string; date?: string; byline?: string; children?: React.ReactNode }) {
  return (
    <SiteLayout markSrc={markSrc} current="/blog">
      <article className="mx-auto grid max-w-(--ds-layout-text) gap-6 px-6 py-16 md:py-20">
        <a href="/blog" className="inline-flex w-fit items-center gap-1.5 rounded-xs text-body text-fg-brand outline-none transition-colors duration-150 ease-out hover:text-fg focus-visible:shadow-focus motion-reduce:transition-none">
          <ArrowLeftIcon className="size-4" aria-hidden />
          Blog
        </a>
        <header className="grid gap-3">
          {tag && (
            <Badge variant="purple" className="w-fit">
              {tag}
            </Badge>
          )}
          <h1 className="text-display leading-display font-normal text-balance text-fg">{title}</h1>
          <p className="text-body text-fg-muted">
            <time>{date}</time> · {byline}
          </p>
        </header>
        <Separator />
        <div className="grid gap-5 text-body-lg leading-relaxed text-fg-secondary [&_h2]:mt-4 [&_h2]:text-h3 [&_h2]:leading-heading [&_h2]:font-normal [&_h2]:text-fg [&_ul]:grid [&_ul]:list-disc [&_ul]:gap-2 [&_ul]:pl-5 [&_a]:text-fg-brand [&_a]:underline [&_a]:underline-offset-4">
          {children ?? <DefaultArticle />}
        </div>
      </article>
      <Cta
        title="Try Agent2Agent"
        description="Enable A2A on an identity and publish its Agent Card."
        actions={
          <Button asChild>
            <a href="/signup">Get started free</a>
          </Button>
        }
      />
    </SiteLayout>
  );
}

function DefaultArticle() {
  return (
    <>
      <p>Last week Agent-to-Agent shipped, so your agents can delegate tasks to other agents over the open A2A 1.0 protocol. This week A2A works across organizations.</p>
      <h2>Publish your Agent Card</h2>
      <p>Enabling A2A serves your agent's public Agent Card. It stays out of the public directory until you opt in.</p>
      <CodeBlock>
        <CodeBlockHeader>
          <CodeBlockTitle>Terminal</CodeBlockTitle>
        </CodeBlockHeader>
        <CodeBlockContent code="inkbox a2a publicly-discoverable true -i acme" language="bash" />
      </CodeBlock>
      <h2>Connect with one invitation</h2>
      <ul>
        <li>An invitation links a fixed bundle of agents in one step.</li>
        <li>When it is accepted, the access rules for the whole bundle are set at once.</li>
      </ul>
    </>
  );
}

export { BlogPostPage };
