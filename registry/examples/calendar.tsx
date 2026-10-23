"use client";

import * as React from "react";

import { Calendar, type DateRange } from "@/components/ui/calendar";

const TODAY = new Date(2026, 7, 8);
const FRAME = "w-fit rounded-control border border-line-field bg-surface";

export function Preview() {
  const [date, setDate] = React.useState<Date | undefined>(TODAY);
  return <Calendar mode="single" selected={date} onSelect={setDate} today={TODAY} className={FRAME} />;
}

export function Range() {
  const [range, setRange] = React.useState<DateRange | undefined>({ from: new Date(2026, 7, 4), to: new Date(2026, 7, 12) });
  return <Calendar mode="range" selected={range} onSelect={setRange} today={TODAY} numberOfMonths={2} className={FRAME} />;
}

export function Multiple() {
  const [days, setDays] = React.useState<Date[]>([new Date(2026, 7, 3), new Date(2026, 7, 10), new Date(2026, 7, 17)]);
  return <Calendar mode="multiple" selected={days} onSelect={setDays} today={TODAY} weekStartsOn={1} className={FRAME} />;
}

export function Disabled() {
  const [date, setDate] = React.useState<Date | undefined>();
  return <Calendar mode="single" selected={date} onSelect={setDate} today={TODAY} disabled={[{ before: TODAY }, { dayOfWeek: [0, 6] }]} showOutsideDays={false} className={FRAME} />;
}

export function Dropdown() {
  const [date, setDate] = React.useState<Date | undefined>(new Date(1994, 4, 21));
  return <Calendar mode="single" selected={date} onSelect={setDate} today={TODAY} captionLayout="dropdown" fromYear={1940} toYear={2026} className={FRAME} />;
}
