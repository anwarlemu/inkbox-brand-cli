"use client";

import * as React from "react";
import { Collapsible as ChakraCollapsible } from "@chakra-ui/react";

import { cn } from "@/lib/utils";

// A part that shows and hides in place (Figma 427:2715: "Advanced settings - tunnel mode, phone state, line sharing"
// under the channels). The parts carry no look of their own beyond the motion: the content opens with its height
// (200ms, the strong ease-out; closing is quicker). Style the trigger as the row it is (see the example).
type CollapsibleProps = Omit<React.ComponentProps<typeof ChakraCollapsible.Root>, "onOpenChange"> & { onOpenChange?: (open: boolean) => void };
function Collapsible({ onOpenChange, ...props }: CollapsibleProps) {
  return <ChakraCollapsible.Root unstyled data-slot="collapsible" onOpenChange={(details) => onOpenChange?.(details.open)} {...props} />;
}

function CollapsibleTrigger(props: React.ComponentProps<typeof ChakraCollapsible.Trigger>) {
  return <ChakraCollapsible.Trigger unstyled data-slot="collapsible-trigger" {...props} />;
}

function CollapsibleContent({ className, ...props }: React.ComponentProps<typeof ChakraCollapsible.Content>) {
  return <ChakraCollapsible.Content unstyled data-slot="collapsible-content" className={cn("overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down", className)} {...props} />;
}

export { Collapsible, CollapsibleContent, CollapsibleTrigger };
