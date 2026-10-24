"use client";

import * as React from "react";
import { CheckCircleIcon, CopyIcon, EyeIcon, EyeSlashIcon, MagnifyingGlassIcon, SpinnerIcon, XCircleIcon } from "@phosphor-icons/react/ssr";

import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText, InputGroupTextarea } from "@/components/ui/input-group";
import { Kbd } from "@/components/ui/kbd";
import { Label } from "@/components/ui/label";

export function Preview() {
  const [handle, setHandle] = React.useState("acme-support");
  return (
    <div className="grid w-full max-w-114.5 gap-1">
      <Label htmlFor="mailbox">Mailbox</Label>
      <InputGroup>
        <InputGroupInput id="mailbox" value={handle} onChange={(e) => setHandle(e.target.value)} />
        <InputGroupAddon align="inline-end" variant="segment">
          @inboxmail.com
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
}

export function HandleCheck() {
  return (
    <div className="grid w-full max-w-100.5 gap-3">
      <InputGroup>
        <InputGroupInput aria-label="Checking handle" defaultValue="acme-support" />
        <InputGroupAddon align="inline-end">
          <SpinnerIcon className="animate-spin-steady text-fg-faint" aria-label="Checking" />
        </InputGroupAddon>
      </InputGroup>
      <div className="grid gap-1">
        <InputGroup>
          <InputGroupInput aria-label="Available handle" defaultValue="acme-support" />
          <InputGroupAddon align="inline-end">
            <CheckCircleIcon weight="fill" className="text-success" aria-label="Available" />
          </InputGroupAddon>
        </InputGroup>
        <p className="flex items-center gap-2 text-caption text-fg-secondary">
          Will be displayed as <span className="rounded-pill bg-subtle px-2 py-1 text-fg">@acme-support</span>
        </p>
      </div>
      <div className="grid gap-1">
        <InputGroup>
          <InputGroupInput aria-label="Taken handle" defaultValue="acme-support" aria-invalid aria-describedby="taken" />
          <InputGroupAddon align="inline-end">
            <XCircleIcon weight="fill" className="text-danger-strong" aria-hidden />
          </InputGroupAddon>
        </InputGroup>
        <p id="taken" className="flex items-center gap-2 text-caption text-fg-secondary">
          Will be displayed as <span className="rounded-pill bg-subtle px-2 py-1 text-fg">@acme-support</span>
          <span className="text-danger">(is not available)</span>
        </p>
      </div>
    </div>
  );
}

export function Addons() {
  const [shown, setShown] = React.useState(false);
  return (
    <div className="grid w-full max-w-100.5 gap-3">
      <InputGroup>
        <InputGroupAddon>
          <MagnifyingGlassIcon />
        </InputGroupAddon>
        <InputGroupInput aria-label="Search mailboxes" placeholder="Search mailboxes" />
        <InputGroupAddon align="inline-end">
          <Kbd>⌘K</Kbd>
        </InputGroupAddon>
      </InputGroup>
      <InputGroup>
        <InputGroupInput aria-label="Vault key" type={shown ? "text" : "password"} defaultValue="correct-horse-battery" />
        <InputGroupAddon align="inline-end">
          <InputGroupButton size="icon-xs" aria-label={shown ? "Hide the key" : "Show the key"} onClick={() => setShown((s) => !s)} className="text-fg-brand">
            {shown ? <EyeSlashIcon weight="fill" /> : <EyeIcon weight="fill" />}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      <InputGroup>
        <InputGroupAddon>
          <InputGroupText>https://</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput aria-label="Webhook URL" placeholder="api.example.com/inkbox" className="pl-1" />
        <InputGroupAddon align="inline-end">
          <InputGroupButton size="sm" variant="secondary">
            <CopyIcon weight="duotone" /> Copy
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      <InputGroup>
        <InputGroupInput aria-label="Read-only mailbox" readOnly defaultValue="acme-support" />
        <InputGroupAddon align="inline-end" variant="segment">
          @inboxmail.com
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
}

export function WithTextarea() {
  const [text, setText] = React.useState("");
  return (
    <InputGroup className="max-w-100.5">
      <InputGroupTextarea aria-label="Reply" placeholder="Write a reply to Ray Liao" value={text} onChange={(e) => setText(e.target.value.slice(0, 280))} />
      <InputGroupAddon align="block-end" className="justify-between">
        <InputGroupText className="text-caption">{text.length}/280</InputGroupText>
        <InputGroupButton size="sm" variant="default" className="rounded-pill" disabled={!text}>
          Send
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}
