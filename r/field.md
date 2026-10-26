# Field
A field's label, control, description and error stacked 4px apart, fields 12px apart, with the 'or' hairline between two ways in.

Install: npx inkbox-ds add field
Requires: theme, label, utils
Packages: class-variance-authority
Exports: Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSeparator, FieldSet, FieldTitle
Client boundary: yes
Reference: Figma 427:2715: Login (Email address, Password, Forgot password?, or), Vault (Vault key and its description), Create Agent Identity (is not available, Will be displayed as)


## Usage
Wrap every form control in Field with a FieldLabel above it; add FieldDescription for a hint (Enter a vault key or generate a random one) and FieldError, with data-invalid on the Field and aria-invalid on the control, when the value is rejected. Group fields in FieldGroup, related choices in FieldSet with a FieldLegend. Put an action beside the label (Forgot password?) in a row with justify-between. Use orientation horizontal for a label beside its control, and FieldSeparator with "or" between a form and other ways in.
- Avoid: A red label on an invalid field
- Avoid: A placeholder as the only label
- Avoid: Errors larger than 12px
- Avoid: Fields closer than 12px


## Examples
Example components: npx inkbox-ds add field button input
[Preview](https://inkbox-ds.vercel.app/preview/field/Preview) | [Description](https://inkbox-ds.vercel.app/preview/field/Description) | [Invalid](https://inkbox-ds.vercel.app/preview/field/Invalid) | [Horizontal](https://inkbox-ds.vercel.app/preview/field/Horizontal) | [Fieldset](https://inkbox-ds.vercel.app/preview/field/Fieldset)

examples/field.tsx

```tsx
import { Button } from "@/components/ui/button";
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSeparator, FieldSet, FieldTitle } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function Preview() {
  return (
    <form className="mx-auto w-full max-w-86">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="login-email">Email address</FieldLabel>
          <Input id="login-email" type="email" placeholder="your@email.com" autoComplete="email" />
        </Field>
        <Field>
          <div className="flex items-center justify-between gap-3">
            <FieldLabel htmlFor="login-password">Password</FieldLabel>
            <a href="#forgot" className="text-body leading-body text-fg-brand underline-offset-4 hover:underline">
              Forgot password?
            </a>
          </div>
          <Input id="login-password" type="password" autoComplete="current-password" />
        </Field>
        <Button type="submit" className="w-full">Log in</Button>
        <FieldSeparator>or</FieldSeparator>
        <Button variant="secondary" className="w-full">Continue with Google</Button>
      </FieldGroup>
    </form>
  );
}

export function Description() {
  return (
    <Field className="max-w-162.5">
      <FieldLabel htmlFor="vault-key">Vault key</FieldLabel>
      <FieldDescription>Enter a vault key or generate a random one. You&apos;ll need this to unlock the vault.</FieldDescription>
      <Input id="vault-key" type="password" defaultValue="correct-horse-battery" />
    </Field>
  );
}

export function Invalid() {
  return (
    <Field data-invalid="true" className="max-w-100">
      <FieldLabel htmlFor="handle">Agent handle</FieldLabel>
      <Input id="handle" defaultValue="acme-support" aria-invalid aria-describedby="handle-error" />
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption leading-body text-fg">
        Will be displayed as
        <span className="rounded-pill bg-subtle px-1.5 py-0.5">@acme-support</span>
        <FieldError id="handle-error">(is not available)</FieldError>
      </div>
    </Field>
  );
}

export function Horizontal() {
  return (
    <FieldGroup className="max-w-120">
      <Field orientation="horizontal">
        <FieldContent>
          <FieldTitle>Retention</FieldTitle>
          <FieldDescription>Days to keep delivered messages before they are deleted.</FieldDescription>
        </FieldContent>
        <Input aria-label="Retention in days" type="number" defaultValue={30} className="w-24" />
      </Field>
      <Field orientation="responsive">
        <FieldLabel htmlFor="display-name">Display name</FieldLabel>
        <Input id="display-name" placeholder="Agent display name" className="@md/field-group:w-64" />
      </Field>
    </FieldGroup>
  );
}

export function Fieldset() {
  return (
    <FieldSet className="max-w-120">
      <FieldLegend>Webhook destination</FieldLegend>
      <FieldDescription>Inkbox signs every delivery with the key for this agent identity.</FieldDescription>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="webhook-url">Endpoint URL</FieldLabel>
          <Input id="webhook-url" type="url" placeholder="https://example.com/inkbox" />
        </Field>
        <Field data-invalid="true">
          <FieldLabel htmlFor="webhook-secret">Signing secret</FieldLabel>
          <Input id="webhook-secret" aria-invalid defaultValue="short" />
          <FieldError errors={[{ message: "Use at least 32 characters." }, { message: "Include letters and numbers." }]} />
        </Field>
      </FieldGroup>
    </FieldSet>
  );
}

```

## Source

components/ui/field.tsx

```tsx
"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// A form's fields as the console lays them out (Figma 427:2715, Login, Vault, Create Agent Identity). A field is its
// 14px label on a 24px line, 4px above the control; fields sit 12px apart. A description under it is 14px muted
// (Vault key: "Enter a vault key or generate a random one"); an error is 12px red (is not available). "or" between two
// ways in is 14px muted on a hairline. A field marked data-invalid keeps its label ink: only the control and the
// message turn red.
function FieldSet({ className, ...props }: React.ComponentProps<"fieldset">) {
  return <fieldset data-slot="field-set" className={cn("m-0 flex min-w-0 flex-col gap-4 border-0 p-0 has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3", className)} {...props} />;
}

function FieldLegend({ className, variant = "legend", ...props }: React.ComponentProps<"legend"> & { variant?: "legend" | "label" }) {
  return (
    <legend
      data-slot="field-legend"
      data-variant={variant}
      className={cn("mb-1 p-0 font-sans text-fg data-[variant=label]:text-body data-[variant=label]:leading-body data-[variant=label]:font-normal data-[variant=legend]:text-body-lg data-[variant=legend]:leading-body data-[variant=legend]:font-medium", className)}
      {...props}
    />
  );
}

function FieldGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="field-group" className={cn("group/field-group @container/field-group flex w-full flex-col gap-3 [&>[data-slot=field-group]]:gap-4", className)} {...props} />;
}

const fieldVariants = cva("group/field flex w-full gap-1 data-[disabled=true]:opacity-50", {
  variants: {
    orientation: {
      // Label over control (Email address over its field).
      vertical: "flex-col [&>*]:w-full [&>.sr-only]:w-auto",
      // Label beside its control (a channel row and its switch, a checkbox and its label).
      horizontal: "flex-row items-center gap-3 [&>[data-slot=field-label]]:flex-auto has-[>[data-slot=field-content]]:items-start has-[>[data-slot=field-content]]:[&>[role=checkbox],&>[role=radio]]:mt-0.5",
      // Over on a narrow form, beside from 28rem of container.
      responsive: "flex-col [&>*]:w-full [&>.sr-only]:w-auto @md/field-group:flex-row @md/field-group:items-center @md/field-group:gap-3 @md/field-group:[&>*]:w-auto @md/field-group:[&>[data-slot=field-label]]:flex-auto",
    },
  },
  defaultVariants: { orientation: "vertical" },
});

function Field({ className, orientation = "vertical", ...props }: React.ComponentProps<"div"> & VariantProps<typeof fieldVariants>) {
  return <div role="group" data-slot="field" data-orientation={orientation} className={cn(fieldVariants({ orientation }), className)} {...props} />;
}

function FieldContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="field-content" className={cn("group/field-content flex min-w-0 flex-1 flex-col gap-0.5 leading-body", className)} {...props} />;
}

// A label that wraps a whole field becomes a choice card: the field edge and 8px corners, 14px in; the checked one takes
// the purple edge on the lilac.
function FieldLabel({ className, ...props }: React.ComponentProps<typeof Label>) {
  return (
    <Label
      data-slot="field-label"
      className={cn(
        "group/field-label peer/field-label flex w-fit gap-2 leading-body group-data-[disabled=true]/field:opacity-50",
        "has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col has-[>[data-slot=field]]:rounded-control has-[>[data-slot=field]]:border has-[>[data-slot=field]]:border-line-field has-[>[data-slot=field]]:transition-[background-color,border-color] has-[>[data-slot=field]]:duration-150 has-[>[data-slot=field]]:ease-out *:data-[slot=field]:p-3.5 has-[>[data-slot=field]]:hover:bg-subtle has-data-[state=checked]:border-line-brand has-data-[state=checked]:bg-subtle motion-reduce:transition-none",
        className,
      )}
      {...props}
    />
  );
}

function FieldTitle({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="field-title" className={cn("flex w-fit items-center gap-2 font-sans text-body leading-body font-medium text-fg group-data-[disabled=true]/field:opacity-50", className)} {...props} />;
}

function FieldDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="field-description"
      className={cn(
        "m-0 font-sans text-body leading-body font-normal text-fg-muted group-has-[[data-orientation=horizontal]]/field:text-balance [[data-variant=legend]+&]:-mt-1 [&>a]:text-fg-brand [&>a]:underline-offset-4 [&>a:hover]:underline",
        className,
      )}
      {...props}
    />
  );
}

/** The "or" between two ways in: a hairline across the form with a 14px muted word on the page color. */
function FieldSeparator({ children, className, ...props }: React.ComponentProps<"div"> & { children?: React.ReactNode }) {
  return (
    <div data-slot="field-separator" data-content={!!children} className={cn("relative flex h-6 items-center text-body leading-body", className)} {...props}>
      <div aria-hidden className="absolute inset-x-0 top-1/2 h-px bg-line-subtle" />
      {children && (
        <span data-slot="field-separator-content" className="relative mx-auto block w-fit bg-surface px-3 text-fg-muted">
          {children}
        </span>
      )}
    </div>
  );
}

function FieldError({ className, children, errors, ...props }: React.ComponentProps<"div"> & { errors?: Array<{ message?: string } | undefined> }) {
  const content = React.useMemo(() => {
    if (children) return children;
    if (!errors?.length) return null;
    const unique = [...new Map(errors.map((error) => [error?.message, error])).values()];
    if (unique.length === 1) return unique[0]?.message;
    return <ul className="m-0 flex list-disc flex-col gap-0.5 pl-4">{unique.map((error, index) => error?.message && <li key={index}>{error.message}</li>)}</ul>;
  }, [children, errors]);
  if (!content) return null;
  return (
    <div role="alert" data-slot="field-error" className={cn("font-sans text-caption leading-body font-normal text-danger", className)} {...props}>
      {content}
    </div>
  );
}

export { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSeparator, FieldSet, FieldTitle };

```
