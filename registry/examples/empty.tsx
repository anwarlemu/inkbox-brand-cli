import { ArrowsHorizontalIcon, ChatCircleIcon, EnvelopeIcon, EnvelopeOpenIcon, EnvelopeSimpleIcon, PaperPlaneTiltIcon, PhoneIcon, PlusIcon, TextAlignLeftIcon, TrayIcon, VaultIcon } from "@phosphor-icons/react/ssr";

import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMascot, EmptyMedia, EmptyOrbit, EmptyTitle } from "@/components/ui/empty";

export function Preview() {
  return (
    <Empty className="min-h-100">
      <EmptyMedia variant="mascot">
        <EmptyOrbit>
          <EnvelopeIcon weight="fill" />
          <PhoneIcon weight="fill" />
          <ChatCircleIcon weight="bold" className="size-7 text-success" />
          <ArrowsHorizontalIcon weight="bold" />
          <VaultIcon weight="fill" />
        </EmptyOrbit>
        <EmptyMascot src="/octopus.png" />
      </EmptyMedia>
      <EmptyHeader>
        <EmptyTitle>Create Your First Agent</EmptyTitle>
        <EmptyDescription>Set up an identity to unlock mailbox, phone, and vault features</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button>
          <PlusIcon />
          Create Agent
        </Button>
      </EmptyContent>
    </Empty>
  );
}

export function NoSelection() {
  return (
    <Empty className="min-h-100">
      <EmptyMedia variant="mascot">
        <EmptyOrbit>
          <TextAlignLeftIcon weight="bold" />
          <EnvelopeOpenIcon weight="fill" />
          <EnvelopeSimpleIcon weight="fill" />
          <PaperPlaneTiltIcon weight="fill" />
          <TrayIcon weight="fill" />
        </EmptyOrbit>
        <EmptyMascot src="/octopus.png" />
      </EmptyMedia>
      <EmptyHeader>
        <EmptyTitle>No email selected</EmptyTitle>
        <EmptyDescription>Select an email from the list to read it</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button>
          <PlusIcon />
          Compose Email
        </Button>
      </EmptyContent>
    </Empty>
  );
}

export function Icon() {
  return (
    <Empty className="min-h-72">
      <EmptyMedia variant="icon">
        <TrayIcon weight="fill" />
      </EmptyMedia>
      <EmptyHeader>
        <EmptyTitle>No emails to display</EmptyTitle>
        <EmptyDescription>New mail for @acme lands here.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
