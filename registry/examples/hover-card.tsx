import { EnvelopeSimpleIcon, PhoneIcon } from "@phosphor-icons/react/ssr";

import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

function AgentCard() {
  return (
    <div className="flex gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-avatar text-body-lg font-medium text-white">A</span>
      <div className="grid min-w-0 gap-1">
        <p className="text-body font-medium text-fg">@acme</p>
        <p className="text-body text-fg-muted">Support agent for Acme. Created Jul 27, 2026.</p>
        <p className="mt-1 flex items-center gap-2 text-body text-fg">
          <EnvelopeSimpleIcon weight="fill" className="size-4.5 text-icon-secondary" /> acme@inkboxmail.com
        </p>
        <p className="flex items-center gap-2 text-body text-fg">
          <PhoneIcon weight="fill" className="size-4.5 text-icon-secondary" /> +1 650 474 9720
        </p>
      </div>
    </div>
  );
}

export function Preview() {
  return (
    <p className="text-body text-fg">
      Messages to{" "}
      <HoverCard>
        <HoverCardTrigger href="#agent" className="text-rose underline-offset-4 hover:underline">
          @acme
        </HoverCardTrigger>
        <HoverCardContent>
          <AgentCard />
        </HoverCardContent>
      </HoverCard>{" "}
      are answered within a minute.
    </p>
  );
}

export function Open() {
  return (
    <div className="flex min-h-60 items-start justify-center">
      <HoverCard defaultOpen>
        <HoverCardTrigger href="#agent" className="text-rose underline-offset-4 hover:underline">
          @acme
        </HoverCardTrigger>
        <HoverCardContent>
          <AgentCard />
        </HoverCardContent>
      </HoverCard>
    </div>
  );
}
