"use client";

import * as React from "react";
import { CaretDownIcon } from "@phosphor-icons/react/ssr";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";

export function Preview() {
  const [open, setOpen] = React.useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="w-full max-w-122">
      <CollapsibleTrigger className="group flex w-full items-center justify-between gap-4 rounded-pill py-2 text-left text-body text-fg outline-none transition-colors duration-fast ease-out hover:text-fg-brand focus-visible:shadow-focus motion-reduce:transition-none">
        Advanced settings - tunnel mode, phone state, line sharing
        <CaretDownIcon aria-hidden weight="bold" className="size-4 shrink-0 text-icon-default transition-transform duration-base ease-out group-data-[state=open]:rotate-180 motion-reduce:transition-none" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="grid gap-2 pt-3" role="radiogroup" aria-label="Tunnel TLS mode">
          <p className="text-body text-fg">Tunnel TLS mode</p>
          <Label className="gap-2">
            <input type="radio" name="tls" defaultChecked className="size-4 accent-[var(--ds-color-action-primary)]" />
            Edge (default)
          </Label>
          <Label className="gap-2">
            <input type="radio" name="tls" className="size-4 accent-[var(--ds-color-action-primary)]" />
            Passthrough
          </Label>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/** The console's collapsible section: a card with the field edge and 24px corners whose content opens at once. */
export function Section() {
  return (
    <Collapsible defaultOpen className="w-full max-w-122 rounded-dialog border border-line-field py-3 ps-3.5 pe-3">
      <CollapsibleTrigger className="group flex w-full items-center gap-1.5 rounded-xs text-left text-body text-fg outline-none focus-visible:shadow-focus">
        Allowed senders
        <CaretDownIcon aria-hidden weight="bold" className="ms-auto size-4 shrink-0 transition-transform duration-base ease-out group-data-[state=open]:rotate-180 motion-reduce:transition-none" />
      </CollapsibleTrigger>
      <CollapsibleContent className="data-[state=closed]:animate-none data-[state=open]:animate-none">
        <p className="pt-2 text-body text-fg-muted">Only these addresses can reach the agent. Everyone else is held for review.</p>
      </CollapsibleContent>
    </Collapsible>
  );
}
