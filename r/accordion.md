# Accordion
Sections that open in place: 14px ink labels with a caret at the right, ruled by the faint lilac line.

Install: npx inkbox-ds add accordion
Requires: theme, utils
Packages: @chakra-ui/react, @phosphor-icons/react
Exports: Accordion, AccordionContent, AccordionItem, AccordionTrigger
Client boundary: yes
Reference: Figma 427:2715: Create Agent Identity (Advanced settings - tunnel mode, phone state, line sharing)


## Usage
Use for settings or answers people open one at a time (advanced options, FAQs). Pass type="single" collapsible for one open at a time, type="multiple" for several. Keep the label a short phrase; the content is 14px secondary text or a group of fields.
- Avoid: Bold or purple trigger labels
- Avoid: A chevron at the left
- Avoid: Boxing each item in a card
- Avoid: Opening animation longer than 200ms


## Examples
Example components: npx inkbox-ds add accordion
[Preview](https://inkbox-ds.vercel.app/preview/accordion/Preview) | [Multiple](https://inkbox-ds.vercel.app/preview/accordion/Multiple)

examples/accordion.tsx

```tsx
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export function Preview() {
  return (
    <Accordion type="single" collapsible defaultValue="tunnel" className="w-full max-w-120">
      <AccordionItem value="tunnel">
        <AccordionTrigger>What does the tunnel do?</AccordionTrigger>
        <AccordionContent>It gives each agent a stable hostname (acme.inkboxwire.com) and routes inbound traffic to wherever the agent runs, with TLS at the edge or passed through.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="phone">
        <AccordionTrigger>Can one agent have a phone number and iMessage?</AccordionTrigger>
        <AccordionContent>Yes. Turn on Phone Number for calls and SMS, and iMessage for a shared or dedicated line. Each channel keeps its own contact rules.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="vault">
        <AccordionTrigger>Who can read the vault?</AccordionTrigger>
        <AccordionContent>Only people with the vault key. Encryption and decryption happen in the browser, so the server never sees your secrets.</AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export function Multiple() {
  return (
    <Accordion type="multiple" defaultValue={["email", "calls"]} className="w-full max-w-120">
      <AccordionItem value="email">
        <AccordionTrigger>Email</AccordionTrigger>
        <AccordionContent>acme-support@inboxmail.com receives and sends mail for this agent.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="calls">
        <AccordionTrigger>Calls and texts</AccordionTrigger>
        <AccordionContent>Any state. Calls and SMS are on; RCS needs a dedicated line.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="a2a" disabled>
        <AccordionTrigger>Agent2Agent (not enabled)</AccordionTrigger>
        <AccordionContent>Turn on Agent2Agent to publish this identity&apos;s Agent Card.</AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

```

## Source

components/ui/accordion.tsx

```tsx
"use client";

import * as React from "react";
import { Accordion as ChakraAccordion } from "@chakra-ui/react";
import { CaretDownIcon } from "@phosphor-icons/react/ssr";

import { cn } from "@/lib/utils";

// Sections that open in place, drawn as the dialog's Advanced settings row (Figma 427:2715, Create Agent Identity): a
// 14px regular ink label with a 20px caret at the right, items ruled by the faint lilac line. The panel opens with its
// height (200ms, the strong ease-out; closing is quicker) and the caret turns to point up.
type AccordionProps = Omit<React.ComponentProps<typeof ChakraAccordion.Root>, "multiple" | "collapsible" | "value" | "defaultValue"> & { type?: "single" | "multiple"; collapsible?: boolean; value?: string | string[]; defaultValue?: string | string[] };
function Accordion({ type = "single", collapsible, value, defaultValue, ...props }: AccordionProps) {
  return <ChakraAccordion.Root unstyled data-slot="accordion" multiple={type === "multiple"} collapsible={collapsible} value={value === undefined ? undefined : Array.isArray(value) ? value : [value]} defaultValue={defaultValue === undefined ? undefined : Array.isArray(defaultValue) ? defaultValue : [defaultValue]} {...props} />;
}

function AccordionItem({ className, ...props }: React.ComponentProps<typeof ChakraAccordion.Item>) {
  return <ChakraAccordion.Item unstyled data-slot="accordion-item" className={cn("border-b border-line-subtle last:border-b-0", className)} {...props} />;
}

function AccordionTrigger({ className, children, ...props }: React.ComponentProps<typeof ChakraAccordion.ItemTrigger>) {
  return (
    <ChakraAccordion.ItemTrigger
        data-slot="accordion-trigger"
        className={cn(
          "group/accordion-trigger flex flex-1 items-center justify-between gap-4 rounded-pill py-3.5 text-left font-sans text-body leading-body text-fg outline-none transition-colors duration-150 ease-out hover:text-fg-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:pointer-events-none disabled:text-fg-muted motion-reduce:transition-none",
          className,
        )}
        {...props}
      >
        {children}
        <ChakraAccordion.ItemIndicator>
          <CaretDownIcon aria-hidden data-slot="accordion-trigger-icon" weight="bold" className="size-4 shrink-0 text-icon-default transition-transform duration-200 ease-out group-data-[state=open]/accordion-trigger:rotate-180 motion-reduce:transition-none" />
        </ChakraAccordion.ItemIndicator>
      </ChakraAccordion.ItemTrigger>
  );
}

function AccordionContent({ className, children, ...props }: React.ComponentProps<typeof ChakraAccordion.ItemContent>) {
  return (
    <ChakraAccordion.ItemContent data-slot="accordion-content" className="overflow-hidden text-body leading-body text-fg-secondary data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down" {...props}>
      <ChakraAccordion.ItemBody className={cn("pb-4", className)}>{children}</ChakraAccordion.ItemBody>
    </ChakraAccordion.ItemContent>
  );
}

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger };

```
