"use client";

import * as React from "react";

import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

export function Preview() {
  const [limit, setLimit] = React.useState([250]);
  return (
    <div className="grid w-full max-w-100 gap-3">
      <div className="flex items-center justify-between">
        <Label id="limit-label">Daily send limit</Label>
        <span className="text-body text-fg-muted">{limit[0]} emails</span>
      </div>
      <Slider aria-labelledby="limit-label" value={limit} onValueChange={setLimit} max={1000} step={50} />
    </div>
  );
}

export function Range() {
  const [hours, setHours] = React.useState([9, 17]);
  return (
    <div className="grid w-full max-w-100 gap-3">
      <div className="flex items-center justify-between">
        <Label id="hours-label">Calling hours</Label>
        <span className="text-body text-fg-muted">
          {hours[0]}:00 to {hours[1]}:00
        </span>
      </div>
      <Slider aria-labelledby="hours-label" value={hours} onValueChange={setHours} min={0} max={24} step={1} minStepsBetweenThumbs={1} />
    </div>
  );
}

export function States() {
  return (
    <div className="grid w-full max-w-100 gap-6">
      <Slider aria-label="Disabled" defaultValue={[40]} disabled />
      <div className="flex h-40 gap-8">
        <Slider aria-label="Vertical" defaultValue={[60]} orientation="vertical" />
        <Slider aria-label="Vertical range" defaultValue={[20, 70]} orientation="vertical" />
      </div>
    </div>
  );
}
