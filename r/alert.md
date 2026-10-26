# Alert
The vault box on the lilac, the pale cyan info note, the sand warning banner with a note at the right, and a red error.

Install: npx inkbox-ds add alert
Requires: theme, utils
Packages: class-variance-authority
Exports: Alert, AlertAction, AlertDescription, AlertTitle, alertVariants
Client boundary: not required by this entry file
Reference: Figma 427:2715: Vault (Initialize vault, zero-knowledge note), Modal - Created (Copy this API key now)


## Usage
Use default for a panel that introduces a setup step (Initialize vault: glyph, 16px title, muted description). Use info for a fact the person should know (The vault is zero-knowledge), warning for something to act on now (Copy this API key now, with the reason in AlertAction), destructive for a failure. Lead with a filled Phosphor glyph.
- Avoid: A dark or saturated alert background
- Avoid: More than one alert stacked for one message
- Avoid: Dismissable warnings for security notes
- Avoid: A bold title


## Examples
Example components: npx inkbox-ds add alert button
Example packages: @phosphor-icons/react
[Preview](https://inkbox-ds.vercel.app/preview/alert/Preview) | [Info](https://inkbox-ds.vercel.app/preview/alert/Info) | [Warning](https://inkbox-ds.vercel.app/preview/alert/Warning) | [Destructive](https://inkbox-ds.vercel.app/preview/alert/Destructive)

examples/alert.tsx

```tsx
import { InfoIcon, LockIcon, WarningIcon, XCircleIcon } from "@phosphor-icons/react/ssr";

import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function Preview() {
  return (
    <Alert className="max-w-200">
      <LockIcon weight="fill" />
      <AlertTitle>Initialize vault</AlertTitle>
      <AlertDescription className="grid gap-2">
        <p>Create an encrypted vault for your organization. The vault can store login credentials including MFA one-time passwords (OTP), SSH keys, API keys and other secrets for your agents.</p>
        <Alert variant="info">
          <InfoIcon weight="fill" />
          <AlertTitle>The vault is zero-knowledge: all encryption and decryption happens in your browser. The server never sees your secrets.</AlertTitle>
        </Alert>
      </AlertDescription>
    </Alert>
  );
}

export function Info() {
  return (
    <Alert variant="info" className="max-w-200">
      <InfoIcon weight="fill" />
      <AlertTitle>The vault is zero-knowledge: all encryption and decryption happens in your browser. The server never sees your secrets.</AlertTitle>
    </Alert>
  );
}

export function Warning() {
  return (
    <Alert variant="warning" className="max-w-180">
      <WarningIcon weight="fill" />
      <AlertTitle>Copy this API key now</AlertTitle>
      <AlertAction>For security, the full key cannot be shown again.</AlertAction>
    </Alert>
  );
}

export function Destructive() {
  return (
    <Alert variant="destructive" className="max-w-180">
      <XCircleIcon weight="fill" />
      <AlertTitle>Webhook delivery failed</AlertTitle>
      <AlertDescription>https://hooks.example.com/inkbox returned 502 three times. Deliveries are paused until it responds.</AlertDescription>
      <AlertAction>
        <Button variant="outline" size="sm">Retry</Button>
      </AlertAction>
    </Alert>
  );
}

```

## Source

components/ui/alert.tsx

```tsx
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

```
