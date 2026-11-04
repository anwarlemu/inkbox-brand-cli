import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// The console's notes (the Alert theme). 12px corners, 16px sides and 12px above and below, 14px text on 20px lines; a
// 20px filled Phosphor glyph in the text's color leads, 12px before the words. The title is medium. An alert is as wide
// as its words and centered, except inside a dialog, a form or an aside (or under data-alerts="fill"), where it fills
// the width. `default` and `info` are the pale cyan note in deep teal; `warning` the sand with its brown; `success` the
// pale green with ink; `destructive` white with the red edge and red text. `muted` is the lilac vault box (a 16px
// regular title, then a muted description across the full width, which can hold an info note).
const alertVariants = cva(
  "group/alert relative mx-auto grid w-fit max-w-full grid-cols-[minmax(0,auto)_auto] items-start gap-x-3 gap-y-0.5 rounded-control px-4 py-3 font-sans text-body leading-line-body has-[>svg]:grid-cols-[auto_minmax(0,auto)_auto] in-[[role=dialog]]:mx-0 in-[[role=dialog]]:w-full in-[form]:mx-0 in-[form]:w-full in-[aside]:mx-0 in-[aside]:w-full in-data-[alerts=fill]:mx-0 in-data-[alerts=fill]:w-full [&>svg]:size-5 [&>svg]:shrink-0 [&>svg]:text-current",
  {
    variants: {
      variant: {
        default: "bg-info-bg text-info-fg",
        info: "bg-info-bg text-info-fg",
        warning: "bg-warning-bg text-warning-fg [&>[data-slot=alert-action]]:text-warning-muted",
        success: "bg-success-bg text-fg",
        destructive: "border border-danger bg-surface text-danger",
        muted: "items-center bg-subtle py-3 text-fg [&>svg]:size-6 [&>svg]:text-icon-default [&>[data-slot=alert-description]]:col-span-full [&>[data-slot=alert-description]]:col-start-1 [&>[data-slot=alert-description]]:text-fg-muted [&>[data-slot=alert-title]]:text-body-lg [&>[data-slot=alert-title]]:leading-snug [&>[data-slot=alert-title]]:font-normal",
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
        "col-start-1 min-w-0 leading-line-body font-medium group-has-[>svg]/alert:col-start-2",
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
        "col-start-1 min-w-0 text-body leading-line-body group-has-[>svg]/alert:col-start-2 [&_p]:leading-line-body",
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
      className={cn("col-start-2 row-span-2 row-start-1 self-center text-right text-body-sm group-has-[>svg]/alert:col-start-3 max-sm:col-start-1 max-sm:col-end-[-1] max-sm:row-start-3 max-sm:row-span-1 max-sm:text-left max-sm:group-has-[>svg]/alert:col-start-2", className)}
      {...props}
    />
  );
}

export { Alert, AlertAction, AlertDescription, AlertTitle, alertVariants };
