import { Separator } from "@/components/ui/separator";

export function Preview() {
  return (
    <div className="w-full max-w-96">
      <p className="text-body text-fg">Webhooks</p>
      <p className="text-body text-fg-muted">Manage subscriptions and review payloads.</p>
      <Separator className="my-4" />
      <div className="flex h-5 items-center gap-4 text-body whitespace-nowrap text-fg">
        <span>Mailboxes</span>
        <Separator orientation="vertical" />
        <span>Contact rules</span>
        <Separator orientation="vertical" />
        <span>Custom domains</span>
      </div>
    </div>
  );
}
