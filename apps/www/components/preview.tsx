import type { ComponentType } from "react";

import { Surface } from "@/lib/surface";
import { cn } from "@/lib/utils";

/** The panel an example sits in: a 14px label over a white canvas with the field edge and 10px corners. */
export function PreviewPanel({ label, actions, children }: { label: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <figure className="m-0 grid min-w-0 gap-2">
      <div className="flex min-h-8 items-center justify-between gap-3">
        <figcaption className="text-body leading-tight font-medium text-fg">{label}</figcaption>
        {actions}
      </div>
      <div className="overflow-hidden rounded-panel border border-line-subtle">{children}</div>
    </figure>
  );
}

// An example rendered in place, centered on the canvas.
export function Preview({ example: Example, label }: { example: ComponentType; label: string }) {
  return (
    <PreviewPanel label={label}>
      <Surface className={cn("relative flex min-h-56 items-center justify-center bg-surface p-6 sm:p-10")}>
        <div className="w-full max-w-full">
          <Example />
        </div>
      </Surface>
    </PreviewPanel>
  );
}
