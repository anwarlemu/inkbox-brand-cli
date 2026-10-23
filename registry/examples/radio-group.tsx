"use client";

import { InfoIcon } from "@phosphor-icons/react/ssr";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export function Preview() {
  return (
    <div className="grid gap-2">
      <p id="tls-mode" className="flex items-center gap-1.5 text-body leading-body text-fg">
        Tunnel TLS mode <InfoIcon weight="fill" aria-hidden className="size-4 text-fg-label" />
      </p>
      <RadioGroup defaultValue="edge" aria-labelledby="tls-mode">
        <div className="flex items-center gap-2">
          <RadioGroupItem value="edge" id="edge" />
          <Label htmlFor="edge">Edge (default)</Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="passthrough" id="passthrough" />
          <Label htmlFor="passthrough">Passthrough</Label>
        </div>
      </RadioGroup>
    </div>
  );
}

export function States() {
  return (
    <RadioGroup defaultValue="shared" aria-label="iMessage line">
      <div className="flex items-center gap-2">
        <RadioGroupItem value="shared" id="shared" />
        <Label htmlFor="shared">Shared line</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="dedicated" id="dedicated" disabled />
        <Label htmlFor="dedicated">Dedicated line (none available)</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="none" id="none" aria-invalid />
        <Label htmlFor="none">No line (invalid)</Label>
      </div>
    </RadioGroup>
  );
}
