import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const EVENTS = Array.from({ length: 24 }, (_, i) => `message.${["sent", "delivered", "bounced", "received"][i % 4]}.${i + 1}`);

export function Preview() {
  return (
    <ScrollArea className="h-72 w-64 rounded-panel border border-line-subtle">
      <div className="p-3">
        <p className="mb-2 text-body-sm text-fg-label">Events</p>
        {EVENTS.map((event, i) => (
          <div key={event}>
            {i > 0 && <Separator className="my-2" />}
            <p className="text-body text-fg">{event}</p>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

export function Horizontal() {
  return (
    <ScrollArea className="w-full max-w-96 rounded-panel border border-line-subtle whitespace-nowrap">
      <div className="flex w-max gap-3 p-3">
        {["Hermes", "Openclaw", "Codex", "Claude Code", "OpenCode", "Other", "Cursor", "Windsurf"].map((name) => (
          <span key={name} className="flex h-9 items-center rounded-pill bg-subtle px-3 text-body text-fg">
            {name}
          </span>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
