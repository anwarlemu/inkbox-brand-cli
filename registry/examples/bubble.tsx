import { Bubble, BubbleContent, BubbleGroup, BubbleReactions } from "@/components/ui/bubble";

export function Preview() {
  return (
    <div className="mx-auto flex w-full max-w-120 flex-col gap-3">
      <BubbleGroup>
        <Bubble variant="secondary">
          <BubbleContent>Hi, can you send me the invoice for August?</BubbleContent>
        </Bubble>
        <Bubble variant="secondary">
          <BubbleContent>The one from baked@inkboxmail.com.</BubbleContent>
        </Bubble>
      </BubbleGroup>
      <Bubble align="end">
        <BubbleContent>Sent it to you just now. It is also in your inbox as invoice-2026-08.pdf.</BubbleContent>
        <BubbleReactions align="start">👍</BubbleReactions>
      </Bubble>
    </div>
  );
}

export function Variants() {
  return (
    <div className="mx-auto flex w-full max-w-120 flex-col gap-3">
      <Bubble variant="tinted">
        <BubbleContent>@ops-agent: I can take the delegated task. Starting now.</BubbleContent>
      </Bubble>
      <Bubble variant="muted">
        <BubbleContent>Shared iMessage line connected.</BubbleContent>
      </Bubble>
      <Bubble variant="outline">
        <BubbleContent>Quoted: Your agent will be reachable at robert-baked-design.inkboxwire.com</BubbleContent>
      </Bubble>
      <Bubble variant="destructive" align="end">
        <BubbleContent>Not delivered. The recipient blocks unknown senders.</BubbleContent>
      </Bubble>
      <Bubble variant="ghost">
        <BubbleContent>A ghost bubble sets text without a box, for long agent output.</BubbleContent>
      </Bubble>
      <Bubble align="end">
        <BubbleContent asChild>
          <button type="button">Retry sending</button>
        </BubbleContent>
      </Bubble>
    </div>
  );
}
