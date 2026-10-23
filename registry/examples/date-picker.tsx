"use client";

import * as React from "react";

import type { DateRange } from "@/components/ui/calendar";
import { DatePicker, DateRangePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";

// A fixed today, so the examples read the same on every visit.
const TODAY = new Date(2026, 7, 8);
const days = (n: number) => new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + n);

export function Preview() {
  const [date, setDate] = React.useState<Date | undefined>();
  return (
    <div className="grid w-full max-w-72 gap-1">
      <Label htmlFor="expires">Key expires</Label>
      <DatePicker id="expires" value={date} onValueChange={setDate} placeholder="Never" calendar={{ today: TODAY, disabled: { before: TODAY } }} />
    </div>
  );
}

export function Range() {
  const [range, setRange] = React.useState<DateRange | undefined>({ from: days(-6), to: TODAY });
  return (
    <div className="grid w-full max-w-80 gap-1">
      <Label htmlFor="log-range">Delivery log</Label>
      <DateRangePicker id="log-range" value={range} onValueChange={setRange} calendar={{ today: TODAY, disabled: { after: TODAY } }} />
    </div>
  );
}

export function Presets() {
  const [send, setSend] = React.useState<Date | undefined>(days(1));
  const [range, setRange] = React.useState<DateRange | undefined>();
  return (
    <div className="grid w-full max-w-80 gap-4">
      <div className="grid gap-1">
        <Label htmlFor="send-at">Send the summary on</Label>
        <DatePicker
          id="send-at"
          value={send}
          onValueChange={setSend}
          calendar={{ today: TODAY, disabled: { before: TODAY } }}
          presets={[
            { label: "Today", value: TODAY },
            { label: "Tomorrow", value: days(1) },
            { label: "In a week", value: days(7) },
            { label: "In a month", value: days(30) },
          ]}
        />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="usage-range">Usage</Label>
        <DateRangePicker
          id="usage-range"
          value={range}
          onValueChange={setRange}
          placeholder="All time"
          calendar={{ today: TODAY, disabled: { after: TODAY } }}
          presets={[
            { label: "Last 7 days", value: { from: days(-6), to: TODAY } },
            { label: "Last 30 days", value: { from: days(-29), to: TODAY } },
            { label: "Last 90 days", value: { from: days(-89), to: TODAY } },
          ]}
        />
      </div>
    </div>
  );
}

export function States() {
  return (
    <div className="grid w-full max-w-72 gap-3">
      <DatePicker aria-label="Disabled date" defaultValue={TODAY} disabled />
      <div className="grid gap-1">
        <DatePicker aria-label="Start date" aria-invalid calendar={{ today: TODAY }} />
        <p className="text-caption leading-body text-danger">Choose a start date.</p>
      </div>
    </div>
  );
}
