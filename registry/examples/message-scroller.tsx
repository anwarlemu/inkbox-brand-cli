"use client";

import * as React from "react";
import { PaperPlaneRightIcon } from "@phosphor-icons/react/ssr";

import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Marker, MarkerContent } from "@/components/ui/marker";
import { Message, MessageContent, MessageHeader } from "@/components/ui/message";
import { MessageScroller, MessageScrollerButton, MessageScrollerContent, MessageScrollerItem, MessageScrollerProvider, MessageScrollerViewport, useMessageScroller } from "@/components/ui/message-scroller";

type Entry = { id: number; from: "contact" | "agent"; text: string };

const START: Entry[] = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  from: i % 3 === 2 ? "agent" : "contact",
  text: i % 3 === 2 ? `Logged ticket #${4100 + i} and replied to the customer.` : `Message ${i + 1}: can you check the delivery log for message.sent?`,
}));

function Composer({ onSend }: { onSend: (text: string) => void }) {
  const { scrollToEnd } = useMessageScroller();
  const [text, setText] = React.useState("");
  return (
    <form
      className="flex items-center gap-2 border-t border-line-subtle p-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!text.trim()) return;
        onSend(text.trim());
        setText("");
        scrollToEnd({ behavior: "auto" });
      }}
    >
      <Input aria-label="Message" value={text} onChange={(e) => setText(e.target.value)} placeholder="Write to your agent" />
      <Button type="submit" size="icon-lg" aria-label="Send">
        <PaperPlaneRightIcon weight="fill" />
      </Button>
    </form>
  );
}

export function Preview() {
  const [entries, setEntries] = React.useState(START);
  return (
    <div className="mx-auto flex h-110 w-full max-w-140 flex-col overflow-hidden rounded-control border border-line-field bg-surface">
      <MessageScrollerProvider>
        <MessageScroller className="min-h-0 flex-1">
          <MessageScrollerViewport>
            <MessageScrollerContent className="gap-4">
              <Marker variant="separator">
                <MarkerContent>Yesterday</MarkerContent>
              </Marker>
              {entries.map((entry) => (
                <MessageScrollerItem key={entry.id}>
                  <Message align={entry.from === "agent" ? "end" : "start"}>
                    <MessageContent>
                      <MessageHeader>{entry.from === "agent" ? "@baked" : "Ray Liao"}</MessageHeader>
                      <Bubble variant={entry.from === "agent" ? "default" : "secondary"} align={entry.from === "agent" ? "end" : "start"}>
                        <BubbleContent>{entry.text}</BubbleContent>
                      </Bubble>
                    </MessageContent>
                  </Message>
                </MessageScrollerItem>
              ))}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton />
        </MessageScroller>
        <Composer onSend={(text) => setEntries((all) => [...all, { id: all.length, from: "agent", text }])} />
      </MessageScrollerProvider>
    </div>
  );
}

export function Streaming() {
  const [count, setCount] = React.useState(3);
  React.useEffect(() => {
    if (count >= 12) return;
    const t = setTimeout(() => setCount((c) => c + 1), 900);
    return () => clearTimeout(t);
  }, [count]);
  return (
    <div className="mx-auto h-80 w-full max-w-140 overflow-hidden rounded-control border border-line-field bg-surface">
      <MessageScroller>
        <MessageScrollerViewport>
          <MessageScrollerContent className="gap-2">
            {Array.from({ length: count }, (_, i) => (
              <MessageScrollerItem key={i}>
                <Bubble variant="secondary">
                  <BubbleContent>{`Delivery ${i + 1}: message.delivered to https://example.com/hooks returned 200.`}</BubbleContent>
                </Bubble>
              </MessageScrollerItem>
            ))}
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton direction="start" />
        <MessageScrollerButton />
      </MessageScroller>
    </div>
  );
}
