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
