"use client";

import * as React from "react";
import { CheckIcon, CopyIcon } from "@phosphor-icons/react/ssr";

import { cn } from "@/lib/utils";

/**
 * A value to copy, as the tunnel shows its public host and ID: a 44px lilac well with 8px corners, the value in IBM Plex
 * Mono at 14px, 16px in, and a purple copy glyph at the right that turns into a check for two seconds.
 */
export function CopyText({ value, label = "Copy", className }: { value: string; label?: string; className?: string }) {
  const [copied, setCopied] = React.useState(false);
  React.useEffect(() => {
    if (!copied) return;
    // ds-latency: resets completed clipboard feedback; copying and press feedback are already immediate.
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);
  return (
    <div className={cn("flex h-11 w-full min-w-0 items-center gap-3 rounded-pill bg-subtle pr-1.5 pl-4", className)}>
      <code className="min-w-0 flex-1 truncate font-mono text-body leading-tight text-code-text">{value}</code>
      <button
        type="button"
        aria-label={copied ? "Copied" : label}
        onClick={() => navigator.clipboard.writeText(value).then(() => setCopied(true), () => undefined)}
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-pill text-fg-brand outline-none transition-[background-color] duration-150 ease-out hover:bg-surface active:brightness-95 active:transition-none focus-visible:outline-2 focus-visible:outline-focus-ring motion-reduce:transition-none"
      >
        {copied ? <CheckIcon weight="bold" className="size-5" /> : <CopyIcon weight="duotone" className="size-5" />}
      </button>
      <span aria-live="polite" className="sr-only">
        {copied ? "Copied" : ""}
      </span>
    </div>
  );
}
