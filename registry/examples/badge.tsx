import { CheckCircleIcon } from "@phosphor-icons/react/ssr";

import { Badge } from "@/components/ui/badge";

export function Preview() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="flex items-center gap-2.5 text-body text-fg">
        Agent2Agent
        <Badge variant="pink">BETA</Badge>
      </span>
      <span className="flex items-center gap-2.5 text-body text-fg">
        My Organisation
        <Badge variant="pink">ADMIN</Badge>
      </span>
      <Badge variant="success" size="lg">
        <CheckCircleIcon weight="fill" />
        Included
      </Badge>
    </div>
  );
}

export function Tags() {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge variant="blue" size="sm">Email</Badge>
      <Badge variant="purple" size="sm">Signed</Badge>
      <Badge variant="gray" size="sm">Fire-and-forget</Badge>
      <Badge variant="green" size="sm">Blacklist</Badge>
      <Badge variant="blue" size="sm">Unread</Badge>
    </div>
  );
}

export function Status() {
  return (
    <div className="flex flex-wrap items-center gap-6">
      <Badge variant="green" size="well">Active</Badge>
      <Badge variant="gray" size="well">Idle</Badge>
      <Badge variant="blue" size="well">Edge</Badge>
    </div>
  );
}

export function Variants() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge>3 new</Badge>
      <Badge variant="secondary">Draft</Badge>
      <Badge variant="outline">Webhook</Badge>
      <Badge variant="destructive">Failed</Badge>
      <Badge variant="ghost">Archived</Badge>
      <Badge variant="link" asChild>
        <a href="https://inkbox.ai/docs" target="_blank" rel="noreferrer">Docs</a>
      </Badge>
    </div>
  );
}
