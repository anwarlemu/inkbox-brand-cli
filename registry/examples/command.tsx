"use client";

import * as React from "react";
import { BookOpenTextIcon, EnvelopeSimpleIcon, GearSixIcon, KeyIcon, LockKeyIcon, PhoneIcon, PlusIcon, RobotIcon, WebhooksLogoIcon } from "@phosphor-icons/react/ssr";

import { Button } from "@/components/ui/button";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from "@/components/ui/command";

function Items({ onRun }: { onRun?: () => void }) {
  return (
    <>
      <CommandInput placeholder="Search agents, mailboxes and pages" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Agents">
          <CommandItem onSelect={onRun}>
            <RobotIcon weight="fill" />
            @baked
          </CommandItem>
          <CommandItem onSelect={onRun}>
            <RobotIcon weight="fill" />
            @robert-baked-design
          </CommandItem>
          <CommandItem onSelect={onRun}>
            <PlusIcon />
            Create Agent
            <CommandShortcut>⌘N</CommandShortcut>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Channels">
          <CommandItem onSelect={onRun}>
            <EnvelopeSimpleIcon weight="fill" />
            Email
          </CommandItem>
          <CommandItem onSelect={onRun}>
            <PhoneIcon weight="fill" />
            Phone
          </CommandItem>
          <CommandItem disabled>
            <WebhooksLogoIcon weight="fill" />
            Agent2Agent (beta)
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Shared">
          <CommandItem onSelect={onRun}>
            <LockKeyIcon weight="fill" />
            Vault
          </CommandItem>
          <CommandItem onSelect={onRun}>
            <KeyIcon weight="fill" />
            API Keys
            <CommandShortcut>⌘K</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={onRun}>
            <GearSixIcon weight="fill" />
            Settings
            <CommandShortcut>⌘,</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={onRun}>
            <BookOpenTextIcon weight="fill" />
            Read the docs
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </>
  );
}

export function Preview() {
  return (
    <Command className="mx-auto max-w-112 shadow-s">
      <Items />
    </Command>
  );
}

export function Dialog() {
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  return (
    <div className="grid justify-items-center gap-3">
      <Button variant="outline" onClick={() => setOpen(true)}>
        Open the command menu
      </Button>
      <p className="text-body text-fg-muted">
        Or press <kbd className="rounded-xs bg-subtle px-1.5 font-sans text-caption text-fg">⌘K</kbd>
      </p>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <Items onRun={() => setOpen(false)} />
      </CommandDialog>
    </div>
  );
}

export function Open() {
  return (
    <div className="min-h-120">
      <CommandDialog defaultOpen>
        <Items />
      </CommandDialog>
    </div>
  );
}
