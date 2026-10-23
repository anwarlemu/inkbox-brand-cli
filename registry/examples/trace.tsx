import { EnvelopeSimpleIcon, LightningIcon, MagnifyingGlassIcon, PaperPlaneTiltIcon, PhoneIcon, VaultIcon, WarningCircleIcon } from "@phosphor-icons/react/ssr";

import { Trace, TraceCollapsible, TraceCollapsibleContent, TraceCollapsibleTrigger, TraceDescription, TraceIcon, TraceLine, TraceTitle } from "@/components/ui/trace";

export function Preview() {
  return (
    <Trace className="mx-auto max-w-120">
      <TraceLine>
        <TraceIcon>
          <EnvelopeSimpleIcon weight="fill" />
        </TraceIcon>
        <TraceTitle>Read 3 new emails in baked@inkboxmail.com</TraceTitle>
        <TraceDescription>0.8s</TraceDescription>
      </TraceLine>
      <TraceCollapsible defaultOpen>
        <TraceCollapsibleTrigger>
          <TraceLine>
            <TraceIcon>
              <MagnifyingGlassIcon weight="bold" />
            </TraceIcon>
            <TraceTitle>Searched the Agent2Agent directory</TraceTitle>
            <TraceDescription>2 results</TraceDescription>
          </TraceLine>
        </TraceCollapsibleTrigger>
        <TraceCollapsibleContent>
          Found <span className="font-mono text-fg">@summarize</span> and <span className="font-mono text-fg">@translate</span>, both public and accepting delegated tasks.
        </TraceCollapsibleContent>
      </TraceCollapsible>
      <TraceLine status="running">
        <TraceIcon>
          <PaperPlaneTiltIcon weight="fill" />
        </TraceIcon>
        <TraceTitle>Sending the summary to ray@inkbox.ai</TraceTitle>
      </TraceLine>
      <TraceLine status="pending">
        <TraceIcon>
          <PhoneIcon weight="fill" />
        </TraceIcon>
        <TraceTitle>Call +1 650 474 9720 with the result</TraceTitle>
      </TraceLine>
    </Trace>
  );
}

export function Failed() {
  return (
    <Trace className="mx-auto max-w-120">
      <TraceLine>
        <TraceIcon>
          <VaultIcon weight="fill" />
        </TraceIcon>
        <TraceTitle>Unlocked the vault</TraceTitle>
        <TraceDescription>0.2s</TraceDescription>
      </TraceLine>
      <TraceCollapsible>
        <TraceCollapsibleTrigger>
          <TraceLine status="error">
            <TraceIcon>
              <WarningCircleIcon weight="fill" />
            </TraceIcon>
            <TraceTitle>Webhook delivery to https://example.com/inkbox failed</TraceTitle>
          </TraceLine>
        </TraceCollapsibleTrigger>
        <TraceCollapsibleContent>
          The endpoint answered <span className="font-mono text-fg">503 Service Unavailable</span>. Inkbox logs the failure and keeps processing mail.
        </TraceCollapsibleContent>
      </TraceCollapsible>
      <TraceLine>
        <TraceIcon>
          <LightningIcon weight="fill" />
        </TraceIcon>
        <TraceTitle>Retry scheduled</TraceTitle>
        <TraceDescription>in 30s</TraceDescription>
      </TraceLine>
    </Trace>
  );
}

export function Linked() {
  return (
    <Trace className="mx-auto max-w-120">
      <a href="#message">
        <TraceLine>
          <TraceIcon>
            <EnvelopeSimpleIcon weight="fill" />
          </TraceIcon>
          <TraceTitle>Opened Inkbox A2A: publish your Agent Card</TraceTitle>
        </TraceLine>
      </a>
      <button type="button">
        <TraceLine>
          <TraceIcon>
            <PaperPlaneTiltIcon weight="fill" />
          </TraceIcon>
          <TraceTitle>Drafted a reply</TraceTitle>
        </TraceLine>
      </button>
    </Trace>
  );
}
