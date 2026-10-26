# Date Picker
The select trigger with a calendar glyph that opens the calendar in a white panel, for one date or a range, with optional presets.

Install: npx inkbox-ds add date-picker
Requires: theme, calendar, popover, utils
Packages: @phosphor-icons/react
Exports: DatePicker, DateRangePicker, formatDate, formatRange, DatePickerProps, DateRangePickerProps
Client boundary: yes
Reference: Extrapolated from the Inkbox console (Figma 427:2715): the select trigger (Any State) and the menu panel, with the calendar


## Usage
Use DatePicker for one date (a key's expiry, when to send) and DateRangePicker for a period (the delivery log's range). Pass value and onValueChange, a placeholder, and presets for common choices (Today, Last 7 days). Pass calendar props such as disabled days through calendar. Give it a name to submit the date as YYYY-MM-DD with a form.
- Avoid: A text field people must type a date into
- Avoid: A range picker for a single date
- Avoid: More than six presets
- Avoid: Closing a range before both ends are picked


## Examples
Example components: npx inkbox-ds add date-picker calendar label
[Preview](https://inkbox-ds.vercel.app/preview/date-picker/Preview) | [Range](https://inkbox-ds.vercel.app/preview/date-picker/Range) | [Presets](https://inkbox-ds.vercel.app/preview/date-picker/Presets) | [States](https://inkbox-ds.vercel.app/preview/date-picker/States)

examples/date-picker.tsx

```tsx
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

```

## Source

components/ui/date-picker.tsx

```tsx
"use client";

import * as React from "react";
import { CalendarBlankIcon, CaretDownIcon } from "@phosphor-icons/react/ssr";

import { Calendar, type CalendarProps, type DateRange } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// A date field (extrapolated from the Inkbox console, Figma 427:2715: the select trigger "Any State" and its menu
// panel). The trigger is the select's white 40px key with 8px corners and the Shadow/S ring: a 24px calendar glyph in
// the softer purple, the date in 14px ink (the placeholder in the light purple) and the bold caret at the right. The
// calendar opens under it in the popover's white panel, growing from the trigger. Presets sit in a column of 36px rows
// at the panel's left, the chosen one on the lilac. A single date closes the panel when picked; a range closes once both
// ends are set. Opening puts focus on the chosen day (or today), so the arrow keys work at once.
const TRIGGER =
  "flex h-10 w-full min-w-0 cursor-pointer items-center gap-2.5 rounded-pill bg-surface pr-3 pl-3 font-sans text-body leading-tight whitespace-nowrap text-fg shadow-s outline-none transition-[box-shadow] duration-150 ease-out focus-visible:shadow-[var(--ds-shadow-s),var(--ds-shadow-focus)] disabled:cursor-not-allowed disabled:bg-subtle disabled:text-fg-muted aria-invalid:shadow-[0_0_0_1px_var(--ds-color-status-danger)] data-[empty=true]:text-fg-subtle motion-reduce:transition-none";

type Preset<T> = { label: string; value: T };

function formatDate(date: Date, locale?: string, options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }) {
  return new Intl.DateTimeFormat(locale, options).format(date);
}

function formatRange(range: DateRange | undefined, locale?: string) {
  if (!range?.from) return undefined;
  if (!range.to) return `${formatDate(range.from, locale)} -`;
  const sameYear = range.from.getFullYear() === range.to.getFullYear();
  return `${formatDate(range.from, locale, sameYear ? { month: "short", day: "numeric" } : undefined)} - ${formatDate(range.to, locale)}`;
}

function DatePickerTrigger({ empty, label, className, children, ...props }: React.ComponentProps<"button"> & { empty: boolean; label?: string }) {
  return (
    <PopoverTrigger asChild>
      <button type="button" data-slot="date-picker-trigger" data-empty={empty} aria-label={label} className={cn(TRIGGER, className)} {...props}>
        <CalendarBlankIcon aria-hidden weight="fill" className="size-6 shrink-0 text-icon-secondary" />
        <span className="min-w-0 flex-1 truncate text-left">{children}</span>
        <CaretDownIcon aria-hidden weight="bold" className="size-4 shrink-0 text-fg" />
      </button>
    </PopoverTrigger>
  );
}

function Presets<T>({ presets, isActive, onPick }: { presets: Preset<T>[]; isActive: (p: Preset<T>) => boolean; onPick: (value: T) => void }) {
  return (
    <div data-slot="date-picker-presets" role="group" aria-label="Presets" className="flex gap-1 overflow-x-auto border-line-subtle p-1 max-sm:border-b sm:w-40 sm:flex-col sm:border-r">
      {presets.map((p) => (
        <button
          key={p.label}
          type="button"
          aria-pressed={isActive(p)}
          onClick={() => onPick(p.value)}
          className="flex h-9 shrink-0 items-center rounded-pill px-2.5 text-left font-sans text-body leading-tight whitespace-nowrap text-fg outline-none transition-colors duration-150 ease-out hover:bg-subtle focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring aria-pressed:bg-subtle motion-reduce:transition-none"
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

const sameDay = (a?: Date, b?: Date) => !!a && !!b && a.toDateString() === b.toDateString();

type CalendarPassThrough = Omit<CalendarProps, "mode" | "selected" | "onSelect" | "required" | "min" | "max">;

type DatePickerProps = {
  value?: Date;
  defaultValue?: Date;
  onValueChange?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Shortcuts beside the calendar (Today, In a week). */
  presets?: Preset<Date>[];
  /** Props for the calendar inside (disabled days, the first day of the week, today). */
  calendar?: CalendarPassThrough;
  locale?: string;
  id?: string;
  name?: string;
  className?: string;
  "aria-invalid"?: boolean;
  "aria-label"?: string;
};

function DatePicker({ value: valueProp, defaultValue, onValueChange, placeholder = "Pick a date", disabled, presets, calendar, locale, id, name, className, ...aria }: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [inner, setInner] = React.useState(defaultValue);
  const value = valueProp !== undefined ? valueProp : inner;
  const set = (d: Date | undefined) => {
    if (valueProp === undefined) setInner(d);
    onValueChange?.(d);
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <DatePickerTrigger id={id} empty={!value} disabled={disabled} className={className} aria-invalid={aria["aria-invalid"]} label={aria["aria-label"]}>
        {value ? formatDate(value, locale) : placeholder}
      </DatePickerTrigger>
      {name && <input type="hidden" name={name} value={value ? value.toISOString().slice(0, 10) : ""} />}
      <PopoverContent data-slot="date-picker-content" align="start" onOpenAutoFocus={(e) => e.preventDefault()} className="w-auto gap-0 overflow-hidden p-0">
        <div className="flex flex-col sm:flex-row">
          {presets && (
            <Presets
              presets={presets}
              isActive={(p) => sameDay(p.value, value)}
              onPick={(d) => {
                set(d);
                setOpen(false);
              }}
            />
          )}
          <Calendar
            {...calendar}
            mode="single"
            selected={value}
            defaultMonth={value ?? calendar?.defaultMonth}
            locale={locale}
            autoFocus
            onSelect={(d) => {
              set(d);
              if (d) setOpen(false);
            }}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

type DateRangePickerProps = Omit<DatePickerProps, "value" | "defaultValue" | "onValueChange" | "presets"> & {
  value?: DateRange;
  defaultValue?: DateRange;
  onValueChange?: (range: DateRange | undefined) => void;
  presets?: Preset<DateRange>[];
  /** How many months show side by side (two by default; one on a phone). */
  numberOfMonths?: number;
};

function DateRangePicker({ value: valueProp, defaultValue, onValueChange, placeholder = "Pick a date range", disabled, presets, calendar, locale, numberOfMonths = 2, id, name, className, ...aria }: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [inner, setInner] = React.useState(defaultValue);
  const value = valueProp !== undefined ? valueProp : inner;
  const set = (r: DateRange | undefined) => {
    if (valueProp === undefined) setInner(r);
    onValueChange?.(r);
  };
  const [narrow, setNarrow] = React.useState(false);
  React.useEffect(() => {
    const query = window.matchMedia("(max-width: 39.99rem)");
    const update = () => setNarrow(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  const label = formatRange(value, locale);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <DatePickerTrigger id={id} empty={!label} disabled={disabled} className={className} aria-invalid={aria["aria-invalid"]} label={aria["aria-label"]}>
        {label ?? placeholder}
      </DatePickerTrigger>
      {name && (
        <>
          <input type="hidden" name={`${name}From`} value={value?.from ? value.from.toISOString().slice(0, 10) : ""} />
          <input type="hidden" name={`${name}To`} value={value?.to ? value.to.toISOString().slice(0, 10) : ""} />
        </>
      )}
      <PopoverContent data-slot="date-range-picker-content" align="start" onOpenAutoFocus={(e) => e.preventDefault()} className="w-auto max-w-[calc(100vw-2rem)] gap-0 overflow-hidden p-0">
        <div className="flex flex-col sm:flex-row">
          {presets && (
            <Presets
              presets={presets}
              isActive={(p) => sameDay(p.value.from, value?.from) && sameDay(p.value.to, value?.to)}
              onPick={(r) => {
                set(r);
                setOpen(false);
              }}
            />
          )}
          <Calendar
            {...calendar}
            mode="range"
            selected={value}
            defaultMonth={value?.from ?? calendar?.defaultMonth}
            numberOfMonths={narrow ? 1 : numberOfMonths}
            locale={locale}
            autoFocus
            onSelect={(r) => {
              set(r);
              if (r?.from && r.to) setOpen(false);
            }}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { DatePicker, DateRangePicker, formatDate, formatRange };
export type { DatePickerProps, DateRangePickerProps };

```
