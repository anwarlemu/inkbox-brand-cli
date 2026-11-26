# Message
One message in a conversation: a 32px avatar tile, the sender and time in 14px, the bubbles, and a 12px muted footer.

Install: npx inkbox-ds add message
Requires: theme, utils
Packages: none
Exports: Message, MessageAvatar, MessageContent, MessageFooter, MessageGroup, MessageHeader
Client boundary: not required by this entry file
Reference: Extrapolated from the Inkbox console (Figma 427:2715): the inbox rows (sender in ink, date muted) and the rail's initial tile


## Usage
Build a conversation from Message rows inside a MessageGroup: MessageAvatar with an initial or a picture, MessageContent with a MessageHeader (the name, then a time element), the Bubble pieces and an optional MessageFooter (Delivered, Read). Set align end for the person's own messages; the row mirrors to the right.
- Avoid: Round avatars
- Avoid: A bold sender name
- Avoid: Timestamps darker than the muted purple


## Examples
Example components: npx inkbox-ds add message bubble
Example packages: @phosphor-icons/react
[Preview](https://inkbox-ds.vercel.app/preview/message/Preview) | [AgentOutput](https://inkbox-ds.vercel.app/preview/message/AgentOutput)

examples/message.tsx

```tsx
import { CheckIcon } from "@phosphor-icons/react/ssr";

import { Bubble, BubbleContent, BubbleGroup } from "@/components/ui/bubble";
import { Message, MessageAvatar, MessageContent, MessageFooter, MessageGroup, MessageHeader } from "@/components/ui/message";

export function Preview() {
  return (
    <MessageGroup className="mx-auto w-full max-w-140">
      <Message>
        <MessageAvatar>R</MessageAvatar>
        <MessageContent>
          <MessageHeader>
            Ray Liao <time dateTime="2026-08-08T19:16">7:16 PM</time>
          </MessageHeader>
          <BubbleGroup>
            <Bubble variant="secondary">
              <BubbleContent>Can your agent publish its Agent Card?</BubbleContent>
            </Bubble>
            <Bubble variant="secondary">
              <BubbleContent>Then other organizations can find it and delegate to it.</BubbleContent>
            </Bubble>
          </BubbleGroup>
        </MessageContent>
      </Message>
      <Message align="end">
        <MessageAvatar>A</MessageAvatar>
        <MessageContent>
          <MessageHeader>
            @acme <time dateTime="2026-08-08T19:18">7:18 PM</time>
          </MessageHeader>
          <Bubble align="end">
            <BubbleContent>Done. It is listed in the public directory now.</BubbleContent>
          </Bubble>
          <MessageFooter>
            <CheckIcon weight="bold" /> Delivered
          </MessageFooter>
        </MessageContent>
      </Message>
    </MessageGroup>
  );
}

export function AgentOutput() {
  return (
    <Message className="mx-auto max-w-140">
      <MessageAvatar>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/octopus.png" alt="" className="bg-subtle" />
      </MessageAvatar>
      <MessageContent>
        <MessageHeader>
          test-agent <time dateTime="2026-08-08T19:20">7:20 PM</time>
        </MessageHeader>
        <Bubble variant="ghost">
          <BubbleContent>I sent the first email from test-agent-233@inkboxmail.com and saved my identity for future sessions. The tunnel at test-agent-233.inkboxwire.com is idle until a request arrives.</BubbleContent>
        </Bubble>
      </MessageContent>
    </Message>
  );
}

```

## Source

components/ui/message.tsx

```tsx
import * as React from "react";

import { cn } from "@/lib/utils";

// One message in an agent conversation (Figma 427:2715, the inbox and iMessage): a 32px avatar tile (the initial on
// the avatar blue, circular, as the rail's "R"), the sender's name in 14px ink with the time in 14px muted beside
// it, the bubbles, and a 12px muted footer (Delivered). Outgoing messages (align end) mirror to the right.
function MessageGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="message-group" className={cn("flex min-w-0 flex-col gap-4", className)} {...props} />;
}

function Message({ className, align = "start", ...props }: React.ComponentProps<"div"> & { align?: "start" | "end" }) {
  return <div data-slot="message" data-align={align} className={cn("group/message relative flex w-full min-w-0 gap-2.5 font-sans text-body data-[align=end]:flex-row-reverse", className)} {...props} />;
}

function MessageAvatar({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="message-avatar"
      className={cn(
        "flex size-8 shrink-0 items-center justify-center self-end overflow-hidden rounded-pill bg-avatar text-body leading-tight font-medium text-white group-has-data-[slot=message-footer]/message:-translate-y-6 *:[img]:size-full *:[img]:object-cover",
        className,
      )}
      {...props}
    />
  );
}

function MessageContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="message-content" className={cn("flex w-full min-w-0 flex-col gap-1.5 break-words group-data-[align=end]/message:items-end", className)} {...props} />;
}

/** The sender and the time: "Ray Liao" in ink, "Yesterday" muted, as an inbox row. */
function MessageHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="message-header"
      className={cn("flex max-w-full min-w-0 items-baseline gap-2 px-1 text-body leading-tight text-fg group-data-[align=end]/message:flex-row-reverse [&_time]:text-fg-muted group-has-data-[variant=ghost]/message:px-0", className)}
      {...props}
    />
  );
}

function MessageFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="message-footer"
      className={cn("flex max-w-full min-w-0 items-center gap-1 px-1 text-caption leading-tight text-fg-muted group-data-[align=end]/message:justify-end group-has-data-[variant=ghost]/message:px-0 [&_svg:not([class*='size-'])]:size-3.5", className)}
      {...props}
    />
  );
}

export { Message, MessageAvatar, MessageContent, MessageFooter, MessageGroup, MessageHeader };

```
