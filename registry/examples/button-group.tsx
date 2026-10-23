import { CaretDownIcon, CopyIcon, FileTextIcon, MinusIcon, PlusIcon } from "@phosphor-icons/react/ssr";

import { Button } from "@/components/ui/button";
import { ButtonGroup, ButtonGroupSeparator, ButtonGroupText } from "@/components/ui/button-group";
import { Input } from "@/components/ui/input";

export function Preview() {
  return (
    <ButtonGroup aria-label="Prompt actions">
      <Button variant="outline">
        <FileTextIcon weight="fill" />
        View as formatted
      </Button>
      <Button variant="outline">
        <CopyIcon weight="duotone" />
        Copy as markdown
      </Button>
    </ButtonGroup>
  );
}

export function WithField() {
  return (
    <div className="grid w-full max-w-115 gap-4">
      <ButtonGroup className="w-full">
        <Input aria-label="Mailbox name" defaultValue="acme-support" />
        <ButtonGroupText>@inboxmail.com</ButtonGroupText>
      </ButtonGroup>
      <ButtonGroup className="w-full">
        <Input aria-label="Search contacts" placeholder="Search contacts" />
        <Button variant="outline">Search</Button>
      </ButtonGroup>
    </div>
  );
}

export function Split() {
  return (
    <div className="flex flex-wrap items-center gap-6">
      <ButtonGroup>
        <Button>Create Agent</Button>
        <ButtonGroupSeparator />
        <Button size="icon-lg" aria-label="More create options">
          <CaretDownIcon />
        </Button>
      </ButtonGroup>
      <ButtonGroup aria-label="Phone lines">
        <Button variant="outline" size="icon" className="size-9" aria-label="Remove a line">
          <MinusIcon />
        </Button>
        <ButtonGroupText className="min-w-12 justify-center text-fg">2</ButtonGroupText>
        <Button variant="outline" size="icon" className="size-9" aria-label="Add a line">
          <PlusIcon />
        </Button>
      </ButtonGroup>
    </div>
  );
}

export function Vertical() {
  return (
    <ButtonGroup orientation="vertical" aria-label="Zoom">
      <Button variant="outline" size="icon" className="size-9" aria-label="Zoom in">
        <PlusIcon />
      </Button>
      <Button variant="outline" size="icon" className="size-9" aria-label="Zoom out">
        <MinusIcon />
      </Button>
    </ButtonGroup>
  );
}
