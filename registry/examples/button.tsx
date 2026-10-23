import { CopyIcon, FileTextIcon, GithubLogoIcon, LightningIcon, PencilSimpleIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react/ssr";

import { Button } from "@/components/ui/button";

export function Preview() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button>
        <PlusIcon />
        Create Agent
      </Button>
      <Button variant="secondary">
        <GithubLogoIcon weight="fill" />
        Continue with GitHub
      </Button>
      <Button variant="outline">
        <FileTextIcon weight="fill" />
        View as formatted
      </Button>
      <Button variant="soft">
        <LightningIcon weight="fill" />
        Tunnel quickstart
      </Button>
    </div>
  );
}

export function Variants() {
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button>Log in</Button>
        <Button variant="secondary">Cancel</Button>
        <Button variant="destructive">
          <TrashIcon weight="fill" />
          Delete agent
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline">
          <CopyIcon weight="duotone" />
          Copy as markdown
        </Button>
        <Button variant="ghost" size="icon" aria-label="Edit mailbox">
          <PencilSimpleIcon weight="fill" />
        </Button>
        <Button variant="link">Generate a random key instead</Button>
      </div>
    </div>
  );
}

export function States() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button disabled>Create Agent Identity</Button>
      <Button variant="outline" disabled>
        View as formatted
      </Button>
      <Button size="sm">Small</Button>
      <Button size="lg">Large</Button>
    </div>
  );
}
