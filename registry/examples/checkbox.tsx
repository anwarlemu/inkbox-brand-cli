"use client";

import * as React from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const EVENTS = ["message.received", "message.sent", "message.delivered"];

export function Preview() {
  const [chosen, setChosen] = React.useState<string[]>(["message.received"]);
  const all = chosen.length === EVENTS.length ? true : chosen.length ? "indeterminate" : false;
  return (
    <div className="grid gap-2.5">
      <div className="flex items-center gap-2">
        <Checkbox id="all-events" checked={all} onCheckedChange={(v) => setChosen(v === true ? EVENTS : [])} />
        <Label htmlFor="all-events" className="font-medium">All email events</Label>
      </div>
      <div className="grid gap-2.5 pl-6.5">
        {EVENTS.map((e) => (
          <div key={e} className="flex items-center gap-2">
            <Checkbox id={e} checked={chosen.includes(e)} onCheckedChange={(v) => setChosen((c) => (v === true ? [...c, e] : c.filter((x) => x !== e)))} />
            <Label htmlFor={e} className="font-mono">{e}</Label>
          </div>
        ))}
      </div>
    </div>
  );
}

export function States() {
  return (
    <div className="grid gap-2.5">
      <div className="flex items-center gap-2">
        <Checkbox id="c1" />
        <Label htmlFor="c1">Unchecked</Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="c2" defaultChecked />
        <Label htmlFor="c2">Checked</Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="c3" checked="indeterminate" />
        <Label htmlFor="c3">Some of them</Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="c4" disabled />
        <Label htmlFor="c4">Disabled</Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="c5" aria-invalid />
        <Label htmlFor="c5">I accept the Terms of Service (required)</Label>
      </div>
    </div>
  );
}
