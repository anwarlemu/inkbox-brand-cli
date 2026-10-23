"use client";

import * as React from "react";
import { CodeIcon, CodeBlockIcon, LightningIcon, RobotIcon, SparkleIcon, TerminalWindowIcon, TextAlignCenterIcon, TextAlignLeftIcon, TextAlignRightIcon } from "@phosphor-icons/react/ssr";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

// The runners as 24px logo tiles; a real app puts each runner's own logo in the tile.
const RUNNERS = [
  { value: "hermes", label: "Hermes", icon: RobotIcon },
  { value: "openclaw", label: "Openclaw", icon: LightningIcon },
  { value: "codex", label: "Codex", icon: TerminalWindowIcon },
  { value: "claude-code", label: "Claude Code", icon: SparkleIcon },
  { value: "opencode", label: "OpenCode", icon: CodeBlockIcon },
];

export function Preview() {
  const [runner, setRunner] = React.useState("hermes");
  return (
    <div className="grid w-full gap-3">
      <p id="runner" className="text-body leading-tight font-medium text-fg">Where does this agent run?</p>
      <ToggleGroup type="single" value={runner} onValueChange={(v) => v && setRunner(v)} aria-labelledby="runner" className="w-full">
        {RUNNERS.map(({ value, label, icon: Icon }) => (
          <ToggleGroupItem key={value} value={value}>
            <span className="flex size-6 items-center justify-center rounded-sm bg-surface text-fg-brand shadow-s">
              <Icon weight="fill" className="size-4" />
            </span>
            {label}
          </ToggleGroupItem>
        ))}
        <ToggleGroupItem value="other">
          <CodeIcon weight="bold" />
          Other
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}

export function Outline() {
  return (
    <ToggleGroup type="multiple" variant="outline" defaultValue={["email"]} aria-label="Channels">
      <ToggleGroupItem value="email">Email</ToggleGroupItem>
      <ToggleGroupItem value="phone">Phone</ToggleGroupItem>
      <ToggleGroupItem value="imessage">iMessage</ToggleGroupItem>
    </ToggleGroup>
  );
}

export function Sizes() {
  return (
    <div className="grid gap-3">
      <ToggleGroup type="single" size="sm" defaultValue="left" aria-label="Alignment, small">
        <ToggleGroupItem value="left" aria-label="Align left">
          <TextAlignLeftIcon weight="bold" />
        </ToggleGroupItem>
        <ToggleGroupItem value="center" aria-label="Align center">
          <TextAlignCenterIcon weight="bold" />
        </ToggleGroupItem>
        <ToggleGroupItem value="right" aria-label="Align right">
          <TextAlignRightIcon weight="bold" />
        </ToggleGroupItem>
      </ToggleGroup>
      <ToggleGroup type="single" spacing={0} defaultValue="day" aria-label="Range">
        <ToggleGroupItem value="day">Day</ToggleGroupItem>
        <ToggleGroupItem value="week">Week</ToggleGroupItem>
        <ToggleGroupItem value="month">Month</ToggleGroupItem>
        <ToggleGroupItem value="year" disabled>
          Year
        </ToggleGroupItem>
      </ToggleGroup>
      <ToggleGroup type="single" orientation="vertical" defaultValue="inbox" aria-label="Folder" className="w-48">
        <ToggleGroupItem value="inbox" className="justify-start">Inbox</ToggleGroupItem>
        <ToggleGroupItem value="sent" className="justify-start">Sent</ToggleGroupItem>
        <ToggleGroupItem value="spam" className="justify-start">Spam</ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
