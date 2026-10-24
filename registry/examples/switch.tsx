"use client";

import * as React from "react";
import { AppleLogoIcon, ArrowsLeftRightIcon, PhoneIcon } from "@phosphor-icons/react/ssr";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function Preview() {
  const [phone, setPhone] = React.useState(true);
  const [imessage, setImessage] = React.useState(false);
  const rows = [
    { id: "phone", label: "Phone Number", icon: PhoneIcon, checked: phone, set: setPhone },
    { id: "imessage", label: "iMessage", icon: AppleLogoIcon, checked: imessage, set: setImessage },
  ];
  return (
    <div className="grid w-full max-w-121.5 gap-2">
      {rows.map(({ id, label, icon: Icon, checked, set }) => (
        <div key={id} className="flex h-13 items-center gap-2.5 rounded-pill bg-subtle px-3.5">
          <span className="flex size-7 items-center justify-center rounded-pill bg-pink text-rose">
            <Icon weight="fill" className="size-5" />
          </span>
          <Label htmlFor={id} className="flex-1 text-body-lg font-medium">
            {label}
          </Label>
          <Switch id={id} checked={checked} onCheckedChange={set} />
        </div>
      ))}
    </div>
  );
}

export function States() {
  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-3">
        <Switch id="a2a" />
        <Label htmlFor="a2a">
          <ArrowsLeftRightIcon className="size-5" /> Agent2Agent
        </Label>
      </div>
      <div className="flex items-center gap-3">
        <Switch id="on" defaultChecked />
        <Label htmlFor="on">Shared iMessage line</Label>
      </div>
      <div className="flex items-center gap-3">
        <Switch id="off-disabled" disabled />
        <Label htmlFor="off-disabled">Dedicated line (none available)</Label>
      </div>
      <div className="flex items-center gap-3">
        <Switch id="on-disabled" disabled defaultChecked />
        <Label htmlFor="on-disabled">Email (always on)</Label>
      </div>
      <div className="flex items-center gap-3">
        <Switch id="small" size="sm" defaultChecked />
        <Label htmlFor="small">Small</Label>
      </div>
    </div>
  );
}
