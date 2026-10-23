"use client";

import * as React from "react";
import { PlusIcon, RobotIcon } from "@phosphor-icons/react/ssr";

import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxClear,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxSeparator,
  ComboboxTrigger,
  ComboboxValue,
  useCombobox,
} from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";

const AGENTS = [
  { value: "acme", label: "@acme" },
  { value: "acme-support", label: "@acme-support" },
  { value: "support-desk", label: "@support-desk" },
  { value: "ops-runner", label: "@ops-runner" },
  { value: "test-agent-233", label: "@test-agent-233" },
  { value: "billing-bot", label: "@billing-bot", disabled: true },
];

const EVENTS = ["message.received", "message.sent", "message.delivered", "message.bounced", "call.started", "call.ended", "imessage.received", "tunnel.connected", "tunnel.disconnected"];

export function Preview() {
  const [agent, setAgent] = React.useState<string | null>("acme");
  return (
    <div className="grid w-full max-w-80 gap-1">
      <Label id="agent-label">Agent</Label>
      <Combobox items={AGENTS} value={agent} onValueChange={setAgent}>
        <ComboboxTrigger aria-labelledby="agent-label">
          <ComboboxValue placeholder="Choose an agent" />
        </ComboboxTrigger>
        <ComboboxContent>
          <ComboboxInput placeholder="Search agents" />
          <ComboboxList>
            <ComboboxEmpty>No agent with that handle.</ComboboxEmpty>
            {AGENTS.map((a) => (
              <ComboboxItem key={a.value} value={a.value} label={a.label} disabled={a.disabled}>
                <RobotIcon weight="fill" />
                {a.label}
              </ComboboxItem>
            ))}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}

export function Multiple() {
  const [events, setEvents] = React.useState<string[]>(["message.received", "message.delivered"]);
  return (
    <div className="grid w-full max-w-100 gap-1">
      <Label htmlFor="events">Events</Label>
      <Combobox multiple items={EVENTS} value={events} onValueChange={setEvents} name="events">
        <ComboboxChips>
          {events.map((e) => (
            <ComboboxChip key={e} value={e} className="font-mono text-body-sm" />
          ))}
          <ComboboxChipsInput id="events" placeholder={events.length ? "" : "Add events"} />
          <ComboboxClear />
        </ComboboxChips>
        <ComboboxContent>
          <ComboboxList>
            {(item) => (
              <ComboboxItem value={item.value} className="font-mono text-body-sm">
                {item.label}
              </ComboboxItem>
            )}
          </ComboboxList>
          <ComboboxEmpty>No such event.</ComboboxEmpty>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}

// The "Create" row reads the search from the combobox and offers it as a new value; choosing it calls onValueChange.
function CreateRow({ known }: { known: string[] }) {
  const { search } = useCombobox();
  const value = search.trim().toLowerCase();
  if (!value || known.includes(value)) return null;
  return (
    <>
      <ComboboxSeparator />
      <ComboboxItem value={value} label={value}>
        <PlusIcon />
        Create &ldquo;{value}&rdquo;
      </ComboboxItem>
    </>
  );
}

export function Creatable() {
  const [tags, setTags] = React.useState(["vip", "customer", "vendor"]);
  const [tag, setTag] = React.useState<string | null>(null);
  return (
    <div className="grid w-full max-w-80 gap-1">
      <Label id="tag-label">Contact tag</Label>
      <Combobox items={tags} value={tag} onValueChange={(v) => {
        if (v && !tags.includes(v)) setTags((t) => [...t, v]);
        setTag(v);
      }}>
        <ComboboxTrigger aria-labelledby="tag-label">
          <ComboboxValue placeholder="Add a tag" />
        </ComboboxTrigger>
        <ComboboxContent>
          <ComboboxInput placeholder="Search or create a tag" />
          <ComboboxList>
            {tags.map((t) => (
              <ComboboxItem key={t} value={t}>
                {t}
              </ComboboxItem>
            ))}
            <CreateRow known={tags} />
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}

export function Groups() {
  const [line, setLine] = React.useState<string | null>(null);
  return (
    <div className="grid w-full max-w-80 gap-1">
      <Label id="line-label">Route to</Label>
      <Combobox
        value={line}
        onValueChange={setLine}
        items={[
          { value: "+16504749720", label: "+1 650 474 9720" },
          { value: "+14155550134", label: "+1 415 555 0134" },
          { value: "shared", label: "Shared iMessage line" },
        ]}
      >
        <ComboboxTrigger aria-labelledby="line-label">
          <ComboboxValue placeholder="Choose a line" />
        </ComboboxTrigger>
        <ComboboxContent>
          <ComboboxInput placeholder="Search lines" />
          <ComboboxList>
            <ComboboxEmpty />
            <ComboboxGroup heading="Phone">
              <ComboboxItem value="+16504749720">+1 650 474 9720</ComboboxItem>
              <ComboboxItem value="+14155550134">+1 415 555 0134</ComboboxItem>
            </ComboboxGroup>
            <ComboboxSeparator />
            <ComboboxGroup heading="iMessage">
              <ComboboxItem value="shared">Shared iMessage line</ComboboxItem>
            </ComboboxGroup>
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}

export function States() {
  return (
    <div className="grid w-full max-w-80 gap-3">
      <Combobox items={AGENTS} defaultValue="acme" disabled>
        <ComboboxTrigger aria-label="Disabled agent" />
      </Combobox>
      <div className="grid gap-1">
        <Combobox items={AGENTS}>
          <ComboboxTrigger aria-label="Required agent" aria-invalid>
            <ComboboxValue placeholder="Choose an agent" />
          </ComboboxTrigger>
          <ComboboxContent>
            <ComboboxInput placeholder="Search agents" />
            <ComboboxList>
              {(a) => <ComboboxItem value={a.value}>{a.label}</ComboboxItem>}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
        <p className="text-caption leading-body text-danger">Choose the agent that owns this mailbox.</p>
      </div>
    </div>
  );
}
