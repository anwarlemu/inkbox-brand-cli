# List and detail shell
A list beside its detail in the console's frame: selectable rows at the left, the chosen item with tags, fact cards and code at the right.

Install: npx inkbox-ds add list-detail-shell
Requires: theme, app-shell, badge, button, card, code-block, tabs, utils
Packages: @phosphor-icons/react
Exports: ListEntry, ENTRIES, ListDetailShell
Client boundary: yes
Reference: Console webhooks event catalog (app/(protected)/webhooks/page.tsx; Figma Webhooks - Event catalog, brand/reference/site-webhooks-desktop.jpg)


## Usage
Start any list and detail screen from it (events, messages, contacts); pass entries. On phones the two take turns.
- Avoid: A modal for every detail on wide screens
- Avoid: Rows without a selected state


## Examples
Example components: npx inkbox-ds add list-detail-shell
[Preview](https://inkbox-ds.vercel.app/preview/list-detail-shell/Preview)

examples/list-detail-shell.tsx

```tsx
import { ListDetailShell } from "@/components/product/list-detail-shell";

export function Preview() {
  return <ListDetailShell />;
}

```

## Source

components/product/list-detail-shell.tsx

```tsx
"use client";

import * as React from "react";
import { ArrowLeftIcon, ArrowRightIcon, BellRingingIcon, LightningIcon, PlugsIcon } from "@phosphor-icons/react/ssr";

import { AppPageBody, AppPageHead, AppShell, type AppNavGroup } from "@/components/product/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CodeBlock, CodeBlockContent, CodeBlockHeader, CodeBlockTitle } from "@/components/ui/code-block";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export type ListEntry = { id: string; name: string; meta: string; tag: string; tags?: string[]; description: string; facts?: { icon?: React.ReactNode; title: string; description: string }[]; code?: { title: string; language: string; code: string } };

const PAYLOAD = `{
  "event": "message.received",
  "mailbox": "acme@inkboxmail.com",
  "message_id": "msg_4c89b2fa3522"
}`;

export const ENTRIES: ListEntry[] = [
  {
    id: "message.received",
    name: "message.received",
    meta: "0 configured destinations",
    tag: "Email",
    tags: ["Signed", "Fire-and-forget"],
    description: "Delivered when a mailbox stores a new inbound message.",
    facts: [
      { icon: <LightningIcon weight="fill" />, title: "Trigger", description: "Triggered after an inbound email is accepted and persisted to the mailbox." },
      { icon: <BellRingingIcon weight="fill" />, title: "Delivery", description: "Fire-and-forget POST. Delivery failures are logged and do not block mail processing." },
      { icon: <PlugsIcon weight="fill" />, title: "Response contract", description: "Any response body is ignored." },
    ],
    code: { title: "Payload example", language: "json", code: PAYLOAD },
  },
  { id: "message.sent", name: "message.sent", meta: "1 configured destination", tag: "Email", tags: ["Signed"], description: "Delivered when an agent's outbound message is accepted for delivery." },
  { id: "message.delivered", name: "message.delivered", meta: "0 configured destinations", tag: "Email", tags: ["Signed"], description: "Delivered when the receiving server accepts an outbound message." },
  { id: "call.completed", name: "call.completed", meta: "2 configured destinations", tag: "Phone", tags: ["Signed"], description: "Delivered when a call ends, with its duration and recording state." },
];

/**
 * A list beside its detail in the console's frame (the webhooks event catalog): the page head and its tabs, a column of
 * selectable rows (a tag, the name, a muted line) and the chosen item at the right: its tags, title, description, fact
 * cards and a code block. On phones the list and the detail take turns, with a back button.
 */
function ListDetailShell({ title = "Webhooks", description = "Manage webhook subscriptions and review event payloads.", tabs = ["Manage webhooks", "Event catalog", "Delivery log"], entries = ENTRIES, nav }: { title?: string; description?: string; tabs?: string[]; entries?: ListEntry[]; nav?: AppNavGroup[] }) {
  const [selected, setSelected] = React.useState(entries[0]?.id);
  const [detail, setDetail] = React.useState(false);
  const item = entries.find((e) => e.id === selected) ?? entries[0];
  return (
    <AppShell nav={nav} current={title}>
      <AppPageHead title={title} description={description} />
      <AppPageBody>
        {tabs.length > 0 && (
          <Tabs defaultValue={tabs[1] ?? tabs[0]}>
            <TabsList>
              {tabs.map((t) => (
                <TabsTrigger key={t} value={t}>
                  {t}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)]">
          <ul aria-label={`${title} list`} className={cn("grid content-start gap-1 rounded-panel border border-line-subtle p-2", detail && "max-lg:hidden")}>
            {entries.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  aria-current={e.id === item?.id ? "true" : undefined}
                  onClick={() => {
                    setSelected(e.id);
                    setDetail(true);
                  }}
                  className="grid w-full gap-1 rounded-control px-2.5 py-2 text-left outline-none transition-colors duration-150 ease-out hover:bg-subtle focus-visible:shadow-focus aria-[current=true]:bg-subtle motion-reduce:transition-none"
                >
                  <span className="flex items-center gap-1.5">
                    <Badge variant="blue" size="sm">
                      {e.tag}
                    </Badge>
                    <ArrowRightIcon aria-hidden className="size-3.5 text-icon-secondary" />
                  </span>
                  <span className="text-body leading-body text-fg">{e.name}</span>
                  <span className="text-body-sm leading-tight text-fg-brand">{e.meta}</span>
                </button>
              </li>
            ))}
          </ul>
          {item && (
            <section aria-label={item.name} className={cn("grid content-start gap-4 rounded-panel border border-line-subtle p-4 md:p-5", !detail && "max-lg:hidden")}>
              <Button variant="link" className="w-fit lg:hidden" onClick={() => setDetail(false)}>
                <ArrowLeftIcon />
                All events
              </Button>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="blue" size="sm">
                  {item.tag}
                </Badge>
                {item.tags?.map((t) => (
                  <Badge key={t} variant={t === "Signed" ? "purple" : "gray"} size="sm">
                    {t}
                  </Badge>
                ))}
              </div>
              <div className="grid gap-1.5 border-b border-line-subtle pb-4">
                <h2 className="text-h3 leading-heading font-normal text-fg">{item.name}</h2>
                <p className="text-body leading-body text-fg-muted">{item.description}</p>
              </div>
              {item.facts && (
                <ul className="grid gap-3 md:grid-cols-3">
                  {item.facts.map((f) => (
                    <li key={f.title} className="grid">
                      <Card size="sm">
                        <CardHeader>
                          <CardTitle>
                            {f.icon}
                            {f.title}
                          </CardTitle>
                          <CardDescription>{f.description}</CardDescription>
                        </CardHeader>
                      </Card>
                    </li>
                  ))}
                </ul>
              )}
              {item.code && (
                <div className="grid gap-2">
                  <p className="text-body leading-body text-fg">{item.code.title}</p>
                  <CodeBlock>
                    <CodeBlockHeader>
                      <CodeBlockTitle language={item.code.language}>{item.code.language.toUpperCase()}</CodeBlockTitle>
                    </CodeBlockHeader>
                    <CodeBlockContent code={item.code.code} language={item.code.language} />
                  </CodeBlock>
                </div>
              )}
            </section>
          )}
        </div>
      </AppPageBody>
    </AppShell>
  );
}

export { ListDetailShell };

```
