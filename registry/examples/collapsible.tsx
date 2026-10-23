"use client";

import * as React from "react";
import { CaretDownIcon } from "@phosphor-icons/react/ssr";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";

export function Preview() {
  const [open, setOpen] = React.useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="w-full max-w-122">
      <CollapsibleTrigger className="group flex w-full items-center justify-between gap-4 rounded-control py-2 text-left text-body text-fg outline-none transition-colors duration-150 ease-out hover:text-fg-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring motion-reduce:transition-none">
        Advanced settings - tunnel mode, phone state, line sharing
        <CaretDownIcon aria-hidden weight="bold" className="size-4 shrink-0 text-icon-default transition-transform duration-200 ease-out group-data-[state=open]:rotate-180 motion-reduce:transition-none" />
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
