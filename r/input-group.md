# Input Group
The console's field with addons inside it: glyphs, text, a lilac suffix segment, buttons, or the handle check's state glyph.

Install: npx inkbox-ds add input-group
Requires: theme, button, utils
Packages: class-variance-authority
Exports: InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText, InputGroupTextarea
Client boundary: yes
Reference: Figma 427:2715: the Email card's handle field with @inboxmail.com and the handle check states (checking, Available, Not Available) in Modal States


## Usage
Use to attach context to a field: a fixed suffix (@inboxmail.com as a segment), a search glyph, a show or copy button, a character count under a textarea, or the live state of a check (spinner, green check-circle, red x-circle). Put InputGroupInput or InputGroupTextarea inside, then InputGroupAddon at inline-start, inline-end, block-start or block-end.
- Avoid: Putting a separate Input inside the group
- Avoid: More than one action at each end
- Avoid: A suffix that people can edit


## Examples
Example components: npx inkbox-ds add input-group kbd label
Example packages: @phosphor-icons/react
[Preview](https://inkbox-ds.vercel.app/preview/input-group/Preview) | [HandleCheck](https://inkbox-ds.vercel.app/preview/input-group/HandleCheck) | [Addons](https://inkbox-ds.vercel.app/preview/input-group/Addons) | [WithTextarea](https://inkbox-ds.vercel.app/preview/input-group/WithTextarea)

examples/input-group.tsx

```tsx
"use client";

import * as React from "react";
import { CheckCircleIcon, CopyIcon, EyeIcon, EyeSlashIcon, MagnifyingGlassIcon, SpinnerIcon, XCircleIcon } from "@phosphor-icons/react/ssr";

import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText, InputGroupTextarea } from "@/components/ui/input-group";
import { Kbd } from "@/components/ui/kbd";
import { Label } from "@/components/ui/label";

export function Preview() {
  const [handle, setHandle] = React.useState("acme-support");
  return (
    <div className="grid w-full max-w-114.5 gap-1">
      <Label htmlFor="mailbox">Mailbox</Label>
      <InputGroup>
        <InputGroupInput id="mailbox" value={handle} onChange={(e) => setHandle(e.target.value)} />
        <InputGroupAddon align="inline-end" variant="segment">
          @inboxmail.com
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
}

export function HandleCheck() {
  return (
    <div className="grid w-full max-w-100.5 gap-3">
      <InputGroup>
        <InputGroupInput aria-label="Checking handle" defaultValue="acme-support" />
        <InputGroupAddon align="inline-end">
          <SpinnerIcon className="animate-spin-steady text-fg-faint" aria-label="Checking" />
        </InputGroupAddon>
      </InputGroup>
      <div className="grid gap-1">
        <InputGroup>
          <InputGroupInput aria-label="Available handle" defaultValue="acme-support" />
          <InputGroupAddon align="inline-end">
            <CheckCircleIcon weight="fill" className="text-success" aria-label="Available" />
          </InputGroupAddon>
        </InputGroup>
        <p className="flex items-center gap-2 text-caption text-fg-secondary">
          Will be displayed as <span className="rounded-pill bg-subtle px-2 py-1 text-fg">@acme-support</span>
        </p>
      </div>
      <div className="grid gap-1">
        <InputGroup>
          <InputGroupInput aria-label="Taken handle" defaultValue="acme-support" aria-invalid aria-describedby="taken" />
          <InputGroupAddon align="inline-end">
            <XCircleIcon weight="fill" className="text-danger-strong" aria-hidden />
          </InputGroupAddon>
        </InputGroup>
        <p id="taken" className="flex items-center gap-2 text-caption text-fg-secondary">
          Will be displayed as <span className="rounded-pill bg-subtle px-2 py-1 text-fg">@acme-support</span>
          <span className="text-danger">(is not available)</span>
        </p>
      </div>
    </div>
  );
}

export function Addons() {
  const [shown, setShown] = React.useState(false);
  return (
    <div className="grid w-full max-w-100.5 gap-3">
      <InputGroup>
        <InputGroupAddon>
          <MagnifyingGlassIcon />
        </InputGroupAddon>
        <InputGroupInput aria-label="Search mailboxes" placeholder="Search mailboxes" />
        <InputGroupAddon align="inline-end">
          <Kbd>⌘K</Kbd>
        </InputGroupAddon>
      </InputGroup>
      <InputGroup>
        <InputGroupInput aria-label="Vault key" type={shown ? "text" : "password"} defaultValue="correct-horse-battery" />
        <InputGroupAddon align="inline-end">
          <InputGroupButton size="icon-xs" aria-label={shown ? "Hide the key" : "Show the key"} onClick={() => setShown((s) => !s)} className="text-fg-brand">
            {shown ? <EyeSlashIcon weight="fill" /> : <EyeIcon weight="fill" />}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      <InputGroup>
        <InputGroupAddon>
          <InputGroupText>https://</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput aria-label="Webhook URL" placeholder="api.example.com/inkbox" className="pl-1" />
        <InputGroupAddon align="inline-end">
          <InputGroupButton size="sm" variant="secondary">
            <CopyIcon weight="duotone" /> Copy
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      <InputGroup>
        <InputGroupInput aria-label="Read-only mailbox" readOnly defaultValue="acme-support" />
        <InputGroupAddon align="inline-end" variant="segment">
          @inboxmail.com
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
}

export function WithTextarea() {
  const [text, setText] = React.useState("");
  return (
    <InputGroup className="max-w-100.5">
      <InputGroupTextarea aria-label="Reply" placeholder="Write a reply to Ray Liao" value={text} onChange={(e) => setText(e.target.value.slice(0, 280))} />
      <InputGroupAddon align="block-end" className="justify-between">
        <InputGroupText className="text-caption">{text.length}/280</InputGroupText>
        <InputGroupButton size="sm" variant="default" className="rounded-pill" disabled={!text}>
          Send
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}

```

## Source

components/ui/input-group.tsx

```tsx
"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// The console's field with things inside it (Figma 427:2715, Create Agent Identity): the field's 40px, fully rounded corners and
// lilac-gray edge around a borderless control, with addons at either end: a muted glyph or text, the trailing state
// glyph of the handle check (a spinner while checking, a green check-circle when free, a red x-circle when taken), or a
// `segment`, the lilac suffix with a divider ("@inboxmail.com" in the Email card). Focus, invalid and read-only states
// belong to the whole group. Addons can also sit above or below a textarea (block-start, block-end).
function InputGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-group"
      role="group"
      className={cn(
        "group/input-group relative flex h-10 w-full min-w-0 items-center overflow-hidden rounded-pill border border-line-field bg-surface transition-[border-color,box-shadow] duration-150 ease-out motion-reduce:transition-none",
        "has-[[data-slot=input-group-control]:focus-visible]:border-line-brand has-[[data-slot=input-group-control]:focus-visible]:shadow-focus",
        "has-[[data-slot][aria-invalid=true]]:border-danger has-[[data-slot][aria-invalid=true]]:shadow-none",
        "has-[[data-slot=input-group-control]:read-only]:border-line-field/50 has-[[data-slot=input-group-control]:read-only]:bg-subtle has-[[data-slot=input-group-control]:disabled]:border-line-field/50 has-[[data-slot=input-group-control]:disabled]:bg-subtle has-[[data-slot=input-group-control]:disabled]:opacity-70",
        "has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>textarea]:h-auto has-[>textarea]:rounded-control has-[>[data-align=block-start]]:rounded-control has-[>[data-align=block-end]]:rounded-control",
        "has-[>[data-align=inline-start]]:[&>input]:pl-2 has-[>[data-align=inline-end]]:[&>input]:pr-2 has-[>[data-align=block-start]]:[&>textarea]:pt-1 has-[>[data-align=block-end]]:[&>textarea]:pb-1",
        className,
      )}
      {...props}
    />
  );
}

const inputGroupAddonVariants = cva(
  "flex h-auto shrink-0 cursor-text items-center justify-center gap-2 font-sans text-body leading-tight text-fg-muted select-none group-has-[[data-slot=input-group-control]:disabled]/input-group:cursor-not-allowed [&>kbd]:rounded-xs [&>svg:not([class*='size-'])]:size-5",
  {
    variants: {
      align: {
        "inline-start": "order-first pl-3.5 has-[>button]:pl-1",
        "inline-end": "order-last pr-3 has-[>button]:pr-1",
        "block-start": "order-first w-full justify-start px-3.5 pt-2.5",
        "block-end": "order-last w-full justify-start px-3.5 pb-2.5",
      },
      variant: {
        plain: "",
        segment: "self-stretch border-line-field bg-subtle px-3.5 group-has-[[data-slot=input-group-control]:read-only]/input-group:border-line-field/50 group-has-[[data-slot=input-group-control]:disabled]/input-group:border-line-field/50",
      },
    },
    compoundVariants: [
      { variant: "segment", align: "inline-end", className: "border-l pr-3.5" },
      { variant: "segment", align: "inline-start", className: "border-r pl-3.5" },
    ],
    defaultVariants: { align: "inline-start", variant: "plain" },
  },
);

function InputGroupAddon({ className, align = "inline-start", variant = "plain", ...props }: React.ComponentProps<"div"> & VariantProps<typeof inputGroupAddonVariants>) {
  return (
    <div
      role="group"
      data-slot="input-group-addon"
      data-align={align}
      data-variant={variant}
      className={cn(inputGroupAddonVariants({ align, variant }), className)}
      onClick={(e) => {
        // A click on the addon (not on a button in it) focuses the control, as a click inside a field would.
        if ((e.target as HTMLElement).closest("button")) return;
        e.currentTarget.parentElement?.querySelector<HTMLElement>("input, textarea")?.focus();
      }}
      {...props}
    />
  );
}

const inputGroupButtonVariants = cva("shadow-none", {
  variants: {
    size: {
      xs: "h-7 gap-1 rounded-pill px-2 text-body-sm [&>svg:not([class*='size-'])]:size-4",
      sm: "h-8 gap-1.5 rounded-pill px-2.5",
      "icon-xs": "size-7 rounded-pill p-0 [&>svg:not([class*='size-'])]:size-4",
      "icon-sm": "size-8 rounded-pill p-0",
    },
  },
  defaultVariants: { size: "xs" },
});

function InputGroupButton({ className, type = "button", variant = "ghost", size = "xs", ...props }: Omit<React.ComponentProps<typeof Button>, "size"> & VariantProps<typeof inputGroupButtonVariants>) {
  return <Button type={type} data-size={size} variant={variant} className={cn(inputGroupButtonVariants({ size }), className)} {...props} />;
}

function InputGroupText({ className, ...props }: React.ComponentProps<"span">) {
  return <span className={cn("flex items-center gap-2 font-sans text-body leading-tight text-fg-muted [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-5.5", className)} {...props} />;
}

function InputGroupInput({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      data-slot="input-group-control"
      className={cn(
        "h-full min-w-0 flex-1 bg-transparent px-3.5 font-sans text-body leading-tight text-fg outline-none placeholder:text-fg-subtle selection:bg-ring-tint read-only:text-fg-muted disabled:cursor-not-allowed disabled:text-fg-muted",
        className,
      )}
      {...props}
    />
  );
}

function InputGroupTextarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="input-group-control"
      className={cn(
        "field-sizing-content flex min-h-16 w-full min-w-0 flex-1 resize-none bg-transparent px-3.5 py-2.5 font-sans text-body leading-5 text-fg outline-none placeholder:text-fg-subtle selection:bg-ring-tint read-only:text-fg-muted disabled:cursor-not-allowed disabled:text-fg-muted",
        className,
      )}
      {...props}
    />
  );
}

export { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText, InputGroupTextarea };

```
