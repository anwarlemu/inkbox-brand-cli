import * as React from "react";

import { SectionHead } from "@/components/blocks/section-head";
import { SiteLayout } from "@/components/site/site-layout";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export type Post = { title: string; excerpt: string; href: string; date: string; tag?: string; author?: string };

export const POSTS: Post[] = [
  { title: "Agents can now talk to each other", excerpt: "Agent-to-Agent ships today: delegate work to any agent over the open A2A protocol.", href: "/blog/agent-to-agent", date: "Jul 24, 2026", tag: "Feature" },
  { title: "Publish your Agent Card", excerpt: "Other agents can now find yours in the public directory, and one invitation connects a whole bundle of agents.", href: "/blog/agent-cards", date: "Jul 31, 2026", tag: "Feature" },
  { title: "Build an agent that answers its own email", excerpt: "A walkthrough: create an identity, read the inbox with the SDK and reply from the agent.", href: "/blog/answer-email", date: "Aug 7, 2026", tag: "Guide" },
];

/** The blog index: a heading, the newest post wide, then the rest as cards. Dates and tags come with each post. */
function BlogIndexPage({ markSrc, posts = POSTS, title = "Blog", description = "Product news, guides and notes from the team." }: { markSrc?: string; posts?: Post[]; title?: string; description?: string }) {
  return (
    <SiteLayout markSrc={markSrc} current="/blog">
      <section className="mx-auto grid max-w-(--ds-layout-column) gap-8 px-6 py-16 md:py-24">
        <SectionHead title={title} description={description} />
        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((p, i) => (
            <li key={p.href} className={i === 0 ? "grid md:col-span-2 lg:col-span-3" : "grid"}>
              <Card className="relative h-full transition-colors duration-150 ease-out hover:bg-subtle motion-reduce:transition-none">
                <CardHeader>
                  {p.tag && (
                    <Badge variant="purple" size="sm" className="w-fit">
                      {p.tag}
                    </Badge>
                  )}
                  <CardTitle className={i === 0 ? "text-h3 leading-heading" : "text-body-lg leading-heading font-medium"}>
                    <a href={p.href} className="outline-none after:absolute after:inset-0 focus-visible:underline">
                      {p.title}
                    </a>
                  </CardTitle>
                  <CardDescription>{p.excerpt}</CardDescription>
                </CardHeader>
                <CardFooter className="mt-auto text-body-sm text-fg-muted">
                  <time>{p.date}</time>
                  {p.author && <span className="before:mx-2 before:content-['·']">{p.author}</span>}
                </CardFooter>
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </SiteLayout>
  );
}

export { BlogIndexPage };
