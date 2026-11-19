# Trace
An agent's steps as quiet 14px lines with a glyph, a running step that breathes and steps that open to their detail on a hairline.

Install: npx inkbox-ds add trace
Requires: theme, collapsible, utils
Packages: @phosphor-icons/react
Exports: Trace, TraceCollapsible, TraceCollapsibleContent, TraceCollapsibleTrigger, TraceDescription, TraceIcon, TraceLine, TraceTitle
Client boundary: yes
Reference: Extrapolated from the Inkbox console (Figma 427:2715): the inbox list's muted text and the Advanced settings disclosure


## Usage
Use to show what an agent did or is doing: each TraceLine has a TraceIcon (a filled Phosphor glyph for the tool), a TraceTitle and an optional TraceDescription (a duration or a count). Set status running, pending or error. Put a step with detail in TraceCollapsible with a TraceCollapsibleTrigger around its line and the detail in TraceCollapsibleContent. Wrap a line in a link or button to make it open something.
- Avoid: Bold or ink step titles
- Avoid: A spinner on every running step
- Avoid: Colors other than the muted purple and red
- Avoid: Detail that opens without its hairline


## Examples
Example components: npx inkbox-ds add trace
Example packages: @phosphor-icons/react
[Preview](https://inkbox-ds.vercel.app/preview/trace/Preview) | [Failed](https://inkbox-ds.vercel.app/preview/trace/Failed) | [Linked](https://inkbox-ds.vercel.app/preview/trace/Linked)

examples/trace.tsx

```tsx
import { EnvelopeSimpleIcon, LightningIcon, MagnifyingGlassIcon, PaperPlaneTiltIcon, PhoneIcon, VaultIcon, WarningCircleIcon } from "@phosphor-icons/react/ssr";

import { Trace, TraceCollapsible, TraceCollapsibleContent, TraceCollapsibleTrigger, TraceDescription, TraceIcon, TraceLine, TraceTitle } from "@/components/ui/trace";

export function Preview() {
  return (
    <Trace className="mx-auto max-w-120">
      <TraceLine>
        <TraceIcon>
          <EnvelopeSimpleIcon weight="fill" />
        </TraceIcon>
        <TraceTitle>Read 3 new emails in acme@inkboxmail.com</TraceTitle>
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

```

## Source

components/ui/trace.tsx

```tsx
"use client";

import * as React from "react";
import { CaretRightIcon } from "@phosphor-icons/react/ssr";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

// An agent's steps as it works (extrapolated from the console, Figma 427:2715: the inbox's muted dates and the
// "Advanced settings" disclosure). Each line is 14px muted purple with an 18px glyph 8px before it; a line that is a
// link or button turns ink under the pointer. A running step breathes (1.6s, held still with reduced motion), a pending
// one is faded, a failed one is red. A step that can open shows a caret after its title that turns a quarter when open;
// its detail hangs from a hairline 16px in, in 14px secondary ink, and opens with its height (200ms, the strong ease-out).
function Trace({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="trace"
      className={cn(
        "flex w-full min-w-0 flex-col gap-2 *:has-[>[data-slot=trace-line]]:flex *:has-[>[data-slot=trace-line]]:w-fit *:has-[>[data-slot=trace-line]]:max-w-full *:has-[>[data-slot=trace-line]]:min-w-0 *:has-[>[data-slot=trace-line]]:rounded-pill *:has-[>[data-slot=trace-line]]:text-left *:has-[>[data-slot=trace-line]]:outline-none *:has-[>[data-slot=trace-line]]:focus-visible:outline-2 *:has-[>[data-slot=trace-line]]:focus-visible:outline-offset-2 *:has-[>[data-slot=trace-line]]:focus-visible:outline-focus-ring",
        className,
      )}
      {...props}
    />
  );
}

function TraceLine({ className, status, ...props }: React.ComponentProps<"span"> & { status?: "running" | "error" | "pending" }) {
  return (
    <span
      data-slot="trace-line"
      data-status={status}
      className={cn(
        "flex w-fit max-w-full min-w-0 items-center gap-2 font-sans text-body leading-body text-fg-muted transition-colors duration-150 ease-out in-[a,button]:cursor-pointer in-[a:hover,button:hover]:text-fg data-[status=error]:text-danger data-[status=error]:in-[a:hover,button:hover]:text-danger-strong data-[status=pending]:opacity-60 data-[status=running]:*:data-[slot=trace-title]:animate-pulse-soft motion-reduce:transition-none motion-reduce:data-[status=running]:*:data-[slot=trace-title]:animate-none",
        className,
      )}
      {...props}
    />
  );
}

function TraceIcon({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="trace-icon"
      aria-hidden="true"
      className={cn("flex size-4.5 shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4.5 [[data-slot=trace-title]~&]:-ml-1", className)}
      {...props}
    />
  );
}

function TraceTitle({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="trace-title" className={cn("min-w-0 truncate", className)} {...props} />;
}

/** A step's quiet detail at its end: a duration or a count, in the faint purple with even figures. */
function TraceDescription({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="trace-description" className={cn("shrink-0 text-fg-subtle tabular-nums", className)} {...props} />;
}

function TraceCollapsible({
  className,
  ...props
}: Omit<React.ComponentProps<typeof Collapsible>, "asChild" | "open"> & ({ open?: undefined } | { open: boolean; onOpenChange: NonNullable<React.ComponentProps<typeof Collapsible>["onOpenChange"]> })) {
  return <Collapsible data-slot="trace-collapsible" className={cn("flex w-full min-w-0 flex-col", className)} {...props} />;
}

function TraceCollapsibleTrigger({ className, children, ...props }: Omit<React.ComponentProps<typeof CollapsibleTrigger>, "asChild">) {
  return (
    <CollapsibleTrigger
      data-slot="trace-collapsible-trigger"
      className={cn(
        "group/trace-collapsible-trigger flex w-fit max-w-full min-w-0 cursor-pointer items-center gap-1 rounded-pill text-left text-fg-muted outline-none active:brightness-95 active:transition-none transition-colors duration-150 ease-out hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring has-[[data-status=error]]:text-danger motion-reduce:transition-none",
        className,
      )}
      {...props}
    >
      {children}
      <TraceIcon className="transition-transform duration-200 ease-out group-aria-expanded/trace-collapsible-trigger:rotate-90 motion-reduce:transition-none">
        <CaretRightIcon weight="bold" className="size-3.5" />
      </TraceIcon>
    </CollapsibleTrigger>
  );
}

function TraceCollapsibleContent({ className, children, ...props }: Omit<React.ComponentProps<typeof CollapsibleContent>, "asChild">) {
  return (
    <CollapsibleContent data-slot="trace-collapsible-content" className="min-w-0" {...props}>
      <div data-slot="trace-collapsible-content-inner" className={cn("mt-2 mb-1 ml-2 min-w-0 border-l border-line-field pr-1 pl-4 font-sans text-body leading-body [overflow-wrap:anywhere] text-fg-secondary", className)}>
        {children}
      </div>
    </CollapsibleContent>
  );
}

export { Trace, TraceCollapsible, TraceCollapsibleContent, TraceCollapsibleTrigger, TraceDescription, TraceIcon, TraceLine, TraceTitle };

```
