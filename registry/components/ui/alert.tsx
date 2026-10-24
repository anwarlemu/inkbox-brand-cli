import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// The console's notes (Figma 427:2715). `default` is the vault box: a lilac panel with 8px corners, a 22px filled ink
// glyph beside a 16px regular title, then a 14px muted description across the full width (it can hold an info note). `info` is the zero-knowledge note: pale cyan, 8px corners,
// a filled info glyph and 14px deep teal text. `warning` is the copy-this-key banner: pale sand, 10px corners, a filled
// warning glyph, a 14px medium title and a 13px note at the right (AlertAction). `destructive` borrows the failed
// field's red. Put a Phosphor glyph first; the title and description line up beside it.
const alertVariants = cva(
  "@container/alert group/alert relative grid w-full grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2.5 gap-y-0.5 font-sans text-body leading-body has-[>svg]:grid-cols-[auto_minmax(0,1fr)_auto] [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "items-center rounded-control bg-subtle px-3.5 py-3 text-fg [&>svg]:size-6 [&>svg]:text-icon-default [&>[data-slot=alert-description]]:col-span-full [&>[data-slot=alert-description]]:col-start-1 [&>[data-slot=alert-description]]:text-fg-muted [&>[data-slot=alert-title]]:text-body-lg [&>[data-slot=alert-title]]:leading-snug",
        info: "rounded-control bg-info-bg px-4 py-2 text-info-fg [&>svg]:size-5 [&>svg]:text-info",
        warning: "rounded-panel bg-warning-bg px-4 py-2 text-warning-fg [&>svg]:size-5.5 [&>svg]:text-warning [&>[data-slot=alert-action]]:text-warning-muted [&>[data-slot=alert-description]]:text-warning-muted [&>[data-slot=alert-title]]:font-medium",
        destructive: "rounded-control border border-danger bg-surface px-3.5 py-3 text-danger [&>svg]:size-5.5 [&>svg]:text-danger-strong [&>[data-slot=alert-description]]:text-fg-secondary [&>[data-slot=alert-title]]:font-medium",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Alert({ className, variant, ...props }: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return <div data-slot="alert" data-variant={variant ?? "default"} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />;
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "col-start-1 min-w-0 leading-body group-has-[>svg]/alert:col-start-2",
        className,
      )}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "col-start-1 min-w-0 text-body leading-body group-has-[>svg]/alert:col-start-2 [&_p]:leading-body",
        className,
      )}
      {...props}
    />
  );
}

/** What sits at the right of an alert: a note (For security, the full key cannot be shown again) or a button. */
function AlertAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-action"
      className={cn("col-start-2 row-span-2 row-start-1 self-center text-right text-body-sm group-has-[>svg]/alert:col-start-3 @max-sm/alert:col-start-1 @max-sm/alert:col-end-[-1] @max-sm/alert:row-start-3 @max-sm/alert:row-span-1 @max-sm/alert:text-left @max-sm/alert:group-has-[>svg]/alert:col-start-2", className)}
      {...props}
    />
  );
}

export { Alert, AlertAction, AlertDescription, AlertTitle, alertVariants };
