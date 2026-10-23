import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";

function Pane({ label, className }: { label: string; className?: string }) {
  return <div className={"flex h-full items-center justify-center p-6 text-body text-fg-muted " + (className ?? "")}>{label}</div>;
}

export function Preview() {
  return (
    <ResizablePanelGroup direction="horizontal" className="min-h-64 max-w-2xl overflow-hidden rounded-panel border border-line-subtle">
      <ResizablePanel defaultSize={36} minSize={20}>
        <Pane label="Inbox" className="bg-subtle" />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={64} minSize={30}>
        <Pane label="Message" />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

export function Nested() {
  return (
    <ResizablePanelGroup direction="horizontal" className="min-h-72 max-w-2xl overflow-hidden rounded-panel border border-line-subtle">
      <ResizablePanel defaultSize={30} minSize={15}>
        <Pane label="Agents" className="bg-subtle" />
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={70}>
        <ResizablePanelGroup direction="vertical">
          <ResizablePanel defaultSize={40} minSize={20}>
            <Pane label="Delivery log" />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={60} minSize={20}>
            <Pane label="Payload" />
          </ResizablePanel>
        </ResizablePanelGroup>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
