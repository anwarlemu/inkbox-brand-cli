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
