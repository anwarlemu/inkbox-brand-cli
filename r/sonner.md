# Sonner
Toasts as white floating panels with a filled status glyph, an ink title, a muted description and a purple action.

Install: npx inkbox-ds add sonner
Requires: theme
Packages: @phosphor-icons/react, sonner
Exports: Toaster
Client boundary: yes
Reference: Extrapolated from the Inkbox console (Figma 427:2715): white floating panels, filled status glyphs and the purple action


## Usage
Use to confirm something that happened in the background or will undo (API key copied, agent created, webhook paused). Mount Toaster once near the root and call toast(), toast.success(), toast.error() or toast.promise() from anywhere. Give undoable actions an action button.
- Avoid: A toast for an error that blocks the task (say it in place instead)
- Avoid: Colored toast backgrounds
- Avoid: More than one sentence of description


## Examples
Example components: npx inkbox-ds add sonner button
Example packages: sonner
[Preview](https://inkbox-ds.vercel.app/preview/sonner/Preview)

examples/sonner.tsx

```tsx
"use client";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";

export function Preview() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Toaster />
      <Button
        variant="outline"
        onClick={() =>
          toast("Webhook paused", {
            description: "message.sent stops delivering to api.acme.dev.",
            action: { label: "Undo", onClick: () => toast.success("Webhook resumed") },
          })
        }
      >
        Pause webhook
      </Button>
      <Button variant="outline" onClick={() => toast.success("Agent created", { description: "@test-agent is ready to send its first email." })}>
        Success
      </Button>
      <Button variant="outline" onClick={() => toast.error("Handle not available", { description: "acme-support is taken. Try another." })}>
        Error
      </Button>
      <Button variant="outline" onClick={() => toast.warning("Copy this API key now", { description: "For security, the full key cannot be shown again." })}>
        Warning
      </Button>
      <Button variant="outline" onClick={() => toast.info("The vault is zero-knowledge", { description: "Encryption happens in your browser." })}>
        Info
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          // ds-latency: demonstrates a pending notification; no control or input waits for the demo timer.
          toast.promise(new Promise((resolve) => setTimeout(resolve, 1600)), {
            loading: "Provisioning phone line...",
            success: "Line +1 650 474 9720 is live",
            error: "Could not provision a line",
          })
        }
      >
        Promise
      </Button>
    </div>
  );
}

```

## Source

components/ui/sonner.tsx

```tsx
"use client";

import * as React from "react";
import { CheckCircleIcon, InfoIcon, SpinnerGapIcon, WarningIcon, XCircleIcon, XIcon } from "@phosphor-icons/react/ssr";
import { Toaster as Sonner, type ToasterProps } from "sonner";

// Toasts (extrapolated from the Inkbox console, Figma 427:2715: its white floating panels, 16px corners, filled status
// glyphs and the purple action). A toast is a white panel with the floating shadow and 16px of padding: a 20px filled
// glyph (green success, red error, amber warning, teal info, a spinning loader), the 14px medium ink title, the 14px
// muted description, and a small purple pill for its action beside a lilac one for cancel. Sonner stacks, swipes and
// times them; its motion (400ms, ease) is kept as Emil Kowalski tuned it.
function Toaster({ toastOptions, ...props }: ToasterProps) {
  return (
    <Sonner
      data-slot="sonner"
      className="toaster group"
      icons={{
        success: <CheckCircleIcon weight="fill" className="size-5.5 text-success" />,
        info: <InfoIcon weight="fill" className="size-5.5 text-info" />,
        warning: <WarningIcon weight="fill" className="size-5.5 text-warning" />,
        error: <XCircleIcon weight="fill" className="size-5.5 text-danger-strong" />,
        loading: <SpinnerGapIcon className="size-5.5 animate-spin-steady text-fg-muted" />,
        close: <XIcon className="size-3.5" />,
      }}
      toastOptions={{
        ...toastOptions,
        classNames: {
          toast: "group/toast flex! w-(--width) items-start! gap-3! rounded-panel bg-surface p-4! font-sans text-fg shadow-floating!",
          icon: "mt-px flex size-5 shrink-0 items-center justify-center",
          content: "grid min-w-0 flex-1 gap-0.5",
          title: "text-body! leading-body font-medium! text-fg",
          description: "text-body! leading-body text-fg-muted!",
          actionButton: "inline-flex h-8! shrink-0 items-center rounded-pill! bg-primary! px-3.5! font-sans text-body! leading-tight font-normal! text-on-primary! outline-none transition-[background-color] duration-150 ease-out hover:bg-primary-hover! active:bg-primary-hover! active:brightness-95 active:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
          cancelButton: "inline-flex h-8! shrink-0 items-center rounded-pill! bg-subtle! px-3.5! font-sans text-body! leading-tight font-normal! text-fg! outline-none transition-[background-color] duration-150 ease-out hover:bg-subtle-hover! active:bg-subtle-hover! active:brightness-95 active:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
          closeButton: "absolute -top-2 -left-2 inline-flex size-5 items-center justify-center rounded-pill bg-surface text-fg-muted shadow-s outline-none active:brightness-95 active:transition-none transition-colors duration-150 ease-out hover:text-fg focus-visible:outline-2 focus-visible:outline-focus-ring",
          ...toastOptions?.classNames,
        },
      }}
      style={
        {
          "--width": "22.25rem",
          "--normal-bg": "var(--ds-color-bg-default)",
          "--normal-text": "var(--ds-color-text-default)",
          "--normal-border": "transparent",
          "--border-radius": "var(--ds-radius-panel)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
}

export { Toaster };

```
