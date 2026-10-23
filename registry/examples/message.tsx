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
