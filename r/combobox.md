# Combobox
A pill trigger for one value, or a field with 24px corners for multiple lilac pill chips, opening a searchable menu with 16px corners.

Install: npx inkbox-ds add combobox
Requires: theme, surface, utils
Packages: radix-ui, cmdk, @phosphor-icons/react
Exports: Combobox, ComboboxChip, ComboboxChips, ComboboxChipsInput, ComboboxClear, ComboboxCollection, ComboboxContent, ComboboxEmpty, ComboboxGroup, ComboboxInput, ComboboxItem, ComboboxLabel, ComboboxList, ComboboxSeparator, ComboboxTrigger, ComboboxValue, useCombobox, useComboboxAnchor
Client boundary: yes
Reference: Extrapolated from the Inkbox console (Figma 427:2715): the select trigger (Any State), the command menu and the lilac handle chip


## Usage
Use instead of Select when there are more than about ten choices or people know what they are looking for (an agent, a contact, webhook events). Wrap ComboboxTrigger (or ComboboxChips with ComboboxChip and ComboboxChipsInput for several values) and ComboboxContent with ComboboxInput, ComboboxList, ComboboxItem rows and ComboboxEmpty in a Combobox with value and onValueChange (multiple for several). Pass items so the closed field can show labels. To let people add a new value, render an extra item for the search text from useCombobox().
- Avoid: A combobox for five or fewer choices (use Select or a radio group)
- Avoid: Animating the highlight between rows
- Avoid: A list without an empty state
- Avoid: Chips in the purple


## Examples
Example components: npx inkbox-ds add combobox label
Example packages: @phosphor-icons/react
[Preview](https://inkbox-ds.vercel.app/preview/combobox/Preview) | [Multiple](https://inkbox-ds.vercel.app/preview/combobox/Multiple) | [Creatable](https://inkbox-ds.vercel.app/preview/combobox/Creatable) | [Groups](https://inkbox-ds.vercel.app/preview/combobox/Groups) | [States](https://inkbox-ds.vercel.app/preview/combobox/States)

examples/combobox.tsx

```tsx
"use client";

import * as React from "react";
import { PlusIcon, RobotIcon } from "@phosphor-icons/react/ssr";

import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxClear,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxSeparator,
  ComboboxTrigger,
  ComboboxValue,
  useCombobox,
} from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";

const AGENTS = [
  { value: "acme", label: "@acme" },
  { value: "acme-support", label: "@acme-support" },
  { value: "support-desk", label: "@support-desk" },
  { value: "ops-runner", label: "@ops-runner" },
  { value: "test-agent-233", label: "@test-agent-233" },
  { value: "billing-bot", label: "@billing-bot", disabled: true },
];

const EVENTS = ["message.received", "message.sent", "message.delivered", "message.bounced", "call.started", "call.ended", "imessage.received", "tunnel.connected", "tunnel.disconnected"];

export function Preview() {
  const [agent, setAgent] = React.useState<string | null>("acme");
  return (
    <div className="grid w-full max-w-80 gap-1">
      <Label id="agent-label">Agent</Label>
      <Combobox items={AGENTS} value={agent} onValueChange={setAgent}>
        <ComboboxTrigger aria-labelledby="agent-label">
          <ComboboxValue placeholder="Choose an agent" />
        </ComboboxTrigger>
        <ComboboxContent>
          <ComboboxInput placeholder="Search agents" />
          <ComboboxList>
            <ComboboxEmpty>No agent with that handle.</ComboboxEmpty>
            {AGENTS.map((a) => (
              <ComboboxItem key={a.value} value={a.value} label={a.label} disabled={a.disabled}>
                <RobotIcon weight="fill" />
                {a.label}
              </ComboboxItem>
            ))}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}

export function Multiple() {
  const [events, setEvents] = React.useState<string[]>(["message.received", "message.delivered"]);
  return (
    <div className="grid w-full max-w-100 gap-1">
      <Label htmlFor="events">Events</Label>
      <Combobox multiple items={EVENTS} value={events} onValueChange={setEvents} name="events">
        <ComboboxChips>
          {events.map((e) => (
            <ComboboxChip key={e} value={e} className="font-mono text-body-sm" />
          ))}
          <ComboboxChipsInput id="events" placeholder={events.length ? "" : "Add events"} />
          <ComboboxClear />
        </ComboboxChips>
        <ComboboxContent>
          <ComboboxList>
            {(item) => (
              <ComboboxItem value={item.value} className="font-mono text-body-sm">
                {item.label}
              </ComboboxItem>
            )}
          </ComboboxList>
          <ComboboxEmpty>No such event.</ComboboxEmpty>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}

// The "Create" row reads the search from the combobox and offers it as a new value; choosing it calls onValueChange.
function CreateRow({ known }: { known: string[] }) {
  const { search } = useCombobox();
  const value = search.trim().toLowerCase();
  if (!value || known.includes(value)) return null;
  return (
    <>
      <ComboboxSeparator />
      <ComboboxItem value={value} label={value}>
        <PlusIcon />
        Create &ldquo;{value}&rdquo;
      </ComboboxItem>
    </>
  );
}

export function Creatable() {
  const [tags, setTags] = React.useState(["vip", "customer", "vendor"]);
  const [tag, setTag] = React.useState<string | null>(null);
  return (
    <div className="grid w-full max-w-80 gap-1">
      <Label id="tag-label">Contact tag</Label>
      <Combobox items={tags} value={tag} onValueChange={(v) => {
        if (v && !tags.includes(v)) setTags((t) => [...t, v]);
        setTag(v);
      }}>
        <ComboboxTrigger aria-labelledby="tag-label">
          <ComboboxValue placeholder="Add a tag" />
        </ComboboxTrigger>
        <ComboboxContent>
          <ComboboxInput placeholder="Search or create a tag" />
          <ComboboxList>
            {tags.map((t) => (
              <ComboboxItem key={t} value={t}>
                {t}
              </ComboboxItem>
            ))}
            <CreateRow known={tags} />
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}

export function Groups() {
  const [line, setLine] = React.useState<string | null>(null);
  return (
    <div className="grid w-full max-w-80 gap-1">
      <Label id="line-label">Route to</Label>
      <Combobox
        value={line}
        onValueChange={setLine}
        items={[
          { value: "+16504749720", label: "+1 650 474 9720" },
          { value: "+14155550134", label: "+1 415 555 0134" },
          { value: "shared", label: "Shared iMessage line" },
        ]}
      >
        <ComboboxTrigger aria-labelledby="line-label">
          <ComboboxValue placeholder="Choose a line" />
        </ComboboxTrigger>
        <ComboboxContent>
          <ComboboxInput placeholder="Search lines" />
          <ComboboxList>
            <ComboboxEmpty />
            <ComboboxGroup heading="Phone">
              <ComboboxItem value="+16504749720">+1 650 474 9720</ComboboxItem>
              <ComboboxItem value="+14155550134">+1 415 555 0134</ComboboxItem>
            </ComboboxGroup>
            <ComboboxSeparator />
            <ComboboxGroup heading="iMessage">
              <ComboboxItem value="shared">Shared iMessage line</ComboboxItem>
            </ComboboxGroup>
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}

export function States() {
  return (
    <div className="grid w-full max-w-80 gap-3">
      <Combobox items={AGENTS} defaultValue="acme" disabled>
        <ComboboxTrigger aria-label="Disabled agent" />
      </Combobox>
      <div className="grid gap-1">
        <Combobox items={AGENTS}>
          <ComboboxTrigger aria-label="Required agent" aria-invalid>
            <ComboboxValue placeholder="Choose an agent" />
          </ComboboxTrigger>
          <ComboboxContent>
            <ComboboxInput placeholder="Search agents" />
            <ComboboxList>
              {(a) => <ComboboxItem value={a.value}>{a.label}</ComboboxItem>}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
        <p className="text-caption leading-body text-danger">Choose the agent that owns this mailbox.</p>
      </div>
    </div>
  );
}

```

## Source

components/ui/combobox.tsx

```tsx
"use client";

import * as React from "react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { Command as CommandPrimitive } from "cmdk";
import { CaretDownIcon, CheckIcon, MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react/ssr";

import { usePortalContainer } from "@/lib/surface";
import { cn } from "@/lib/utils";

// A searchable choice (extrapolated from the Inkbox console, Figma 427:2715: the select trigger "Any State" and the
// command menu). The trigger is a white 40px pill with the Shadow/S ring, the value in 14px ink
// (the placeholder in the light purple) and the bold caret at the right. It opens the menu panel (white, 16px corners,
// the floating shadow) from the trigger: a 44px search row with a magnifying glass, then 36px rows of 14px ink with the
// highlighted row on the lilac and a purple check beside the chosen ones; groups are headed in 13px purple. For several
// values, ComboboxChips is a field with 24px corners: lilac pill chips with an x, and an input that filters as you
// type (Backspace on an empty input removes the last chip). Moving through the rows is instant: it is done by keyboard.

type Item = { value: string; label: string; disabled?: boolean };

type ComboboxContextValue = {
  multiple: boolean;
  values: string[];
  toggle: (value: string) => void;
  remove: (value: string) => void;
  clear: () => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  search: string;
  setSearch: (search: string) => void;
  labelOf: (value: string) => string;
  register: (value: string, label: string) => void;
  items?: Item[];
  disabled?: boolean;
  listRef: React.RefObject<HTMLDivElement | null>;
  chipsRef: React.RefObject<HTMLDivElement | null>;
  chips: boolean;
  setChips: (chips: boolean) => void;
  contentId: string;
};

const ComboboxContext = React.createContext<ComboboxContextValue | null>(null);

function useCombobox() {
  const context = React.useContext(ComboboxContext);
  if (!context) throw new Error("Combobox parts must be used within <Combobox>");
  return context;
}

type ComboboxBaseProps = {
  /** The choices, for labels while the list is closed and for ComboboxList's render function. */
  items?: (Item | string)[];
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  /** The submitted name: one hidden input per chosen value. */
  name?: string;
  children?: React.ReactNode;
};

type ComboboxSingleProps = ComboboxBaseProps & { multiple?: false; value?: string | null; defaultValue?: string | null; onValueChange?: (value: string | null) => void };
type ComboboxMultipleProps = ComboboxBaseProps & { multiple: true; value?: string[]; defaultValue?: string[]; onValueChange?: (value: string[]) => void };

const normalize = (items?: (Item | string)[]) => items?.map((i) => (typeof i === "string" ? { value: i, label: i } : i));

function Combobox(props: ComboboxSingleProps | ComboboxMultipleProps) {
  const { open: openProp, defaultOpen = false, onOpenChange, disabled, name, children } = props;
  const multiple = props.multiple === true;
  const items = React.useMemo(() => normalize(props.items), [props.items]);
  const initial = props.defaultValue == null ? [] : Array.isArray(props.defaultValue) ? props.defaultValue : [props.defaultValue];
  const [inner, setInner] = React.useState<string[]>(initial);
  const controlled = props.value !== undefined;
  const values = controlled ? (props.value == null ? [] : Array.isArray(props.value) ? props.value : [props.value]) : inner;
  const [openInner, setOpenInner] = React.useState(defaultOpen);
  const open = openProp ?? openInner;
  const [search, setSearch] = React.useState("");
  const [chips, setChips] = React.useState(false);
  const labels = React.useRef(new Map<string, string>());
  const listRef = React.useRef<HTMLDivElement>(null);
  const chipsRef = React.useRef<HTMLDivElement>(null);
  const contentId = React.useId();

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (openProp === undefined) setOpenInner(next);
      onOpenChange?.(next);
      if (!next) setSearch("");
    },
    [openProp, onOpenChange],
  );
  const commit = (next: string[]) => {
    if (!controlled) setInner(next);
    if (multiple) (props as ComboboxMultipleProps).onValueChange?.(next);
    else (props as ComboboxSingleProps).onValueChange?.(next[0] ?? null);
  };
  const toggle = (value: string) => {
    if (multiple) {
      commit(values.includes(value) ? values.filter((v) => v !== value) : [...values, value]);
      setSearch("");
    } else {
      // Picking the chosen value again keeps it; ComboboxClear empties the field.
      commit([value]);
      setOpen(false);
    }
  };
  const remove = (value: string) => commit(values.filter((v) => v !== value));
  const labelOf = (value: string) => labels.current.get(value) ?? items?.find((i) => i.value === value)?.label ?? value;
  const register = React.useCallback((value: string, label: string) => labels.current.set(value, label), []);

  return (
    <ComboboxContext.Provider value={{ multiple, values, toggle, remove, clear: () => commit([]), open, setOpen, search, setSearch, labelOf, register, items, disabled, listRef, chipsRef, chips, setChips, contentId }}>
      <PopoverPrimitive.Root data-slot="combobox" open={open} onOpenChange={setOpen}>
        {children}
      </PopoverPrimitive.Root>
      {name && values.map((v) => <input key={v} type="hidden" name={name} value={v} />)}
    </ComboboxContext.Provider>
  );
}

const FIELD =
  "flex min-h-10 w-full min-w-0 items-center gap-2 rounded-pill bg-surface pr-3 pl-3.5 font-sans text-body leading-tight text-fg shadow-s outline-none transition-[box-shadow] duration-150 ease-out aria-invalid:shadow-[0_0_0_1px_var(--ds-color-status-danger)] motion-reduce:transition-none";

/** The closed field: the chosen value (ComboboxValue) and the caret. Opens the list. */
function ComboboxTrigger({ className, children, ...props }: React.ComponentProps<"button">) {
  const { open, disabled, values, contentId } = useCombobox();
  return (
    <PopoverPrimitive.Trigger asChild>
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={contentId}
        data-slot="combobox-trigger"
        data-empty={!values.length}
        disabled={disabled}
        className={cn(FIELD, "h-10 cursor-pointer text-left focus-visible:shadow-[var(--ds-shadow-s),var(--ds-shadow-focus)] disabled:cursor-not-allowed disabled:bg-subtle disabled:text-fg-muted data-[empty=true]:text-fg-subtle", className)}
        {...props}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2 truncate">{children ?? <ComboboxValue />}</span>
        <CaretDownIcon aria-hidden weight="bold" className="size-4 shrink-0 text-fg" />
      </button>
    </PopoverPrimitive.Trigger>
  );
}

/** The chosen value's label, the chosen labels joined, or the placeholder. */
function ComboboxValue({ placeholder = "Select", children }: { placeholder?: string; children?: (values: string[]) => React.ReactNode }) {
  const { values, labelOf } = useCombobox();
  if (children) return <>{children(values)}</>;
  return <span data-slot="combobox-value">{values.length ? values.map(labelOf).join(", ") : placeholder}</span>;
}

/** Clears every chosen value. Put it inside ComboboxChips or beside a trigger. */
function ComboboxClear({ className, ...props }: React.ComponentProps<"button">) {
  const { values, clear, disabled } = useCombobox();
  if (!values.length) return null;
  return (
    <button
      type="button"
      data-slot="combobox-clear"
      aria-label="Clear"
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        clear();
      }}
      className={cn("inline-flex size-6 shrink-0 items-center justify-center rounded-pill text-fg-faint outline-none active:brightness-95 active:transition-none transition-colors duration-150 ease-out hover:text-fg-muted focus-visible:outline-2 focus-visible:outline-focus-ring motion-reduce:transition-none", className)}
      {...props}
    >
      <XIcon weight="bold" className="size-4" />
    </button>
  );
}

function ComboboxContent({ className, children, align = "start", sideOffset = 6, anchor, onInteractOutside, ...props }: React.ComponentProps<typeof PopoverPrimitive.Content> & { anchor?: React.RefObject<HTMLElement | null> }) {
  const container = usePortalContainer();
  const { search, chips, listRef, chipsRef, contentId, open } = useCombobox();
  // With chips cmdk does not filter, so it would keep a hidden row highlighted: highlight the first match instead.
  const [active, setActive] = React.useState("");
  React.useEffect(() => {
    if (!chips || !open) return;
    const frame = requestAnimationFrame(() => setActive(listRef.current?.querySelector("[cmdk-item]:not([data-disabled=true])")?.getAttribute("data-value") ?? ""));
    return () => cancelAnimationFrame(frame);
  }, [chips, open, search, listRef]);
  return (
    <>
    {anchor && <PopoverPrimitive.Anchor virtualRef={anchor as React.RefObject<HTMLElement>} />}
    <PopoverPrimitive.Portal container={container}>
      <PopoverPrimitive.Content
        id={contentId}
        data-slot="combobox-content"
        align={align}
        sideOffset={sideOffset}
        // With chips the typing stays in the field; the list follows it.
        onOpenAutoFocus={chips ? (e) => e.preventDefault() : undefined}
        onInteractOutside={(e) => {
          onInteractOutside?.(e);
          // A press in the chips field keeps the list open: the field is where the typing happens.
          if (chips && chipsRef.current?.contains(e.target as Node)) e.preventDefault();
        }}
        className={cn(
          "z-50 w-(--radix-popover-trigger-width) min-w-56 max-w-[calc(100vw-2rem)] origin-(--radix-popover-content-transform-origin) overflow-hidden rounded-panel bg-surface text-fg shadow-floating outline-none data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in",
          className,
        )}
        {...props}
      >
        <CommandPrimitive ref={listRef} shouldFilter={!chips} {...(chips ? { value: active, onValueChange: setActive } : {})} className="flex flex-col">
          {children}
        </CommandPrimitive>
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
    </>
  );
}

/** The search row at the top of the list. */
function ComboboxInput({ className, placeholder = "Search", ...props }: Omit<React.ComponentProps<typeof CommandPrimitive.Input>, "value" | "onValueChange">) {
  const { search, setSearch } = useCombobox();
  return (
    <div data-slot="combobox-input-wrapper" className="flex h-11 shrink-0 items-center gap-2.5 border-b border-line-subtle px-3.5">
      <MagnifyingGlassIcon aria-hidden className="size-5.5 shrink-0 text-fg-muted" />
      <CommandPrimitive.Input
        data-slot="combobox-input"
        value={search}
        onValueChange={setSearch}
        placeholder={placeholder}
        className={cn("h-full w-full min-w-0 bg-transparent font-sans text-body leading-tight text-fg outline-none placeholder:text-fg-subtle", className)}
        {...props}
      />
    </div>
  );
}

/** The rows. Pass items as children, or a function that renders each of the Combobox's items. */
function ComboboxList({ className, children, ...props }: Omit<React.ComponentProps<typeof CommandPrimitive.List>, "children"> & { children?: React.ReactNode | ((item: Item) => React.ReactNode) }) {
  const { items } = useCombobox();
  return (
    <CommandPrimitive.List data-slot="combobox-list" className={cn("max-h-72 scroll-py-1 overflow-x-hidden overflow-y-auto overscroll-contain p-1", className)} {...props}>
      {typeof children === "function" ? items?.map((item) => <React.Fragment key={item.value}>{children(item)}</React.Fragment>) : children}
    </CommandPrimitive.List>
  );
}

/** Renders a group's own items with a function, inside a ComboboxGroup. */
function ComboboxCollection({ items, children }: { items: (Item | string)[]; children: (item: Item) => React.ReactNode }) {
  return <>{normalize(items)?.map((item) => <React.Fragment key={item.value}>{children(item)}</React.Fragment>)}</>;
}

function ComboboxItem({ value, label, className, children, disabled, ...props }: Omit<React.ComponentProps<typeof CommandPrimitive.Item>, "value" | "onSelect"> & { value: string; label?: string }) {
  const { values, toggle, register, chips, search } = useCombobox();
  const text = label ?? (typeof children === "string" ? children : value);
  React.useEffect(() => {
    register(value, text);
  }, [register, value, text]);
  // With chips, cmdk does not filter (the typing is outside it): hide rows that do not match here.
  if (chips && search && !text.toLowerCase().includes(search.toLowerCase())) return null;
  const selected = values.includes(value);
  return (
    <CommandPrimitive.Item
      data-slot="combobox-item"
      value={`${text} ${value}`}
      disabled={disabled}
      data-checked={selected || undefined}
      onSelect={() => toggle(value)}
      className={cn(
        "relative flex h-9 cursor-default items-center gap-2.5 rounded-pill pr-8 pl-2.5 font-sans text-body leading-tight text-fg outline-none select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-[selected=true]:bg-subtle [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5.5 [&_svg:not([class*='text-'])]:text-icon-secondary",
        className,
      )}
      {...props}
    >
      {children ?? text}
      {selected && <CheckIcon aria-hidden weight="bold" className="absolute right-2.5 size-4 text-fg-brand" />}
    </CommandPrimitive.Item>
  );
}

function ComboboxEmpty({ className, children = "No results.", ...props }: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  const { chips, search, items, labelOf, values } = useCombobox();
  // cmdk's own empty state only knows its filter; with chips, decide here.
  if (chips) {
    const any = (items ?? values.map((v) => ({ value: v, label: labelOf(v) }))).some((i) => !search || i.label.toLowerCase().includes(search.toLowerCase()));
    if (any) return null;
    return (
      <div data-slot="combobox-empty" className={cn("py-6 text-center text-body text-fg-muted", className)}>
        {children}
      </div>
    );
  }
  return (
    <CommandPrimitive.Empty data-slot="combobox-empty" className={cn("py-6 text-center text-body text-fg-muted", className)} {...props}>
      {children}
    </CommandPrimitive.Empty>
  );
}

function ComboboxGroup({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot="combobox-group"
      className={cn("overflow-hidden text-fg [&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-body-sm [&_[cmdk-group-heading]]:leading-tight [&_[cmdk-group-heading]]:text-fg-label", className)}
      {...props}
    />
  );
}

/** A heading inside the list that is not a group's (a note above the rows). */
function ComboboxLabel({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="combobox-label" className={cn("px-2.5 pt-2 pb-1 text-body-sm leading-tight text-fg-label", className)} {...props} />;
}

function ComboboxSeparator({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return <CommandPrimitive.Separator data-slot="combobox-separator" className={cn("-mx-1 my-1 h-px bg-line-subtle", className)} {...props} />;
}

/** The field for several values: chips and a text input, anchoring the list. */
function ComboboxChips({ className, children, ...props }: React.ComponentProps<"div">) {
  const { setChips, setOpen, disabled, chipsRef } = useCombobox();
  React.useEffect(() => {
    setChips(true);
    return () => setChips(false);
  }, [setChips]);
  return (
    <PopoverPrimitive.Anchor asChild>
      <div
        ref={chipsRef}
        data-slot="combobox-chips"
        data-disabled={disabled || undefined}
        onMouseDown={(e) => {
          if (disabled || e.target !== e.currentTarget) return;
          e.preventDefault();
          e.currentTarget.querySelector("input")?.focus();
          setOpen(true);
        }}
        className={cn(FIELD, "flex-wrap gap-1.5 rounded-dialog py-1.5 pl-1.5 has-[input:focus-visible]:shadow-[var(--ds-shadow-s),var(--ds-shadow-focus)] data-disabled:bg-subtle data-disabled:text-fg-muted", className)}
        {...props}
      >
        {children}
      </div>
    </PopoverPrimitive.Anchor>
  );
}

function ComboboxChip({ value, className, children, ...props }: React.ComponentProps<"span"> & { value: string }) {
  const { remove, labelOf, disabled } = useCombobox();
  return (
    <span data-slot="combobox-chip" className={cn("inline-flex h-7 max-w-full items-center gap-1 rounded-pill bg-subtle pr-1 pl-2 text-body leading-tight text-fg", className)} {...props}>
      <span className="truncate">{children ?? labelOf(value)}</span>
      <button
        type="button"
        aria-label={`Remove ${labelOf(value)}`}
        disabled={disabled}
        onClick={() => remove(value)}
        className="inline-flex size-5 items-center justify-center rounded-pill text-fg-muted outline-none active:brightness-95 active:transition-none transition-colors duration-150 ease-out hover:bg-subtle-hover active:bg-subtle-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-focus-ring motion-reduce:transition-none"
      >
        <XIcon weight="bold" className="size-3.5" />
      </button>
    </span>
  );
}

/** The typing part of ComboboxChips: filters the list; arrows and Enter work the list; Backspace removes the last chip. */
function ComboboxChipsInput({ className, onKeyDown, ...props }: React.ComponentProps<"input">) {
  const { search, setSearch, setOpen, open, values, remove, listRef, disabled, contentId } = useCombobox();
  return (
    <input
      data-slot="combobox-chips-input"
      role="combobox"
      aria-expanded={open}
      aria-controls={contentId}
      aria-autocomplete="list"
      disabled={disabled}
      value={search}
      onChange={(e) => {
        setSearch(e.target.value);
        if (!open) setOpen(true);
      }}
      onFocus={() => setOpen(true)}
      onKeyDown={(e) => {
        onKeyDown?.(e);
        if (e.defaultPrevented) return;
        if (e.key === "Backspace" && !search && values.length) remove(values[values.length - 1]);
        else if (["ArrowDown", "ArrowUp", "Enter", "Home", "End"].includes(e.key) && open && listRef.current) {
          e.preventDefault();
          // Hand the key to the list, which moves the highlight or picks the highlighted row.
          listRef.current.dispatchEvent(new KeyboardEvent("keydown", { key: e.key, bubbles: true, cancelable: true }));
        } else if (e.key === "ArrowDown" && !open) setOpen(true);
      }}
      className={cn("h-7 min-w-24 flex-1 bg-transparent font-sans text-body leading-tight text-fg outline-none placeholder:text-fg-subtle disabled:cursor-not-allowed", className)}
      {...props}
    />
  );
}

/** A ref for an element the list should open from, when it is not the trigger (pass it to ComboboxContent's anchor). */
function useComboboxAnchor<T extends HTMLElement = HTMLDivElement>() {
  return React.useRef<T>(null);
}

export {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxClear,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
  ComboboxSeparator,
  ComboboxTrigger,
  ComboboxValue,
  useCombobox,
  useComboboxAnchor,
};

```
