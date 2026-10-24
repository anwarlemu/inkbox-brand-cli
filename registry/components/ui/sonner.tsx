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
