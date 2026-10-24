"use client";

import * as React from "react";
import { chakra } from "@chakra-ui/react";
import { Controller, FormProvider, useFormContext, useFormState, type ControllerProps, type FieldPath, type FieldValues } from "react-hook-form";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// A react-hook-form form laid out as the console's (Figma 427:2715, Create Agent Identity, Login, Vault). Each FormItem
// is a field: its 14px regular ink label on a 24px line, 4px above the control; fields sit 12px apart in the form. A
// FormDescription is 14px muted under the control; a FormMessage is the 12px red line ("(is not available)"). A field
// that fails keeps its label ink: only the control (aria-invalid, the red edge) and the message turn red.
const Form = FormProvider;

type FormFieldContextValue<TFieldValues extends FieldValues = FieldValues, TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>> = { name: TName };

const FormFieldContext = React.createContext<FormFieldContextValue | null>(null);

function FormField<TFieldValues extends FieldValues = FieldValues, TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>>(props: ControllerProps<TFieldValues, TName>) {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
}

type FormItemContextValue = { id: string };

const FormItemContext = React.createContext<FormItemContextValue | null>(null);

/** The state of the field around it: its ids for labels and messages, and react-hook-form's error, dirty and touched state. */
function useFormField() {
  const fieldContext = React.useContext(FormFieldContext);
  const itemContext = React.useContext(FormItemContext);
  const { getFieldState } = useFormContext();
  if (!fieldContext) throw new Error("useFormField should be used within <FormField>");
  if (!itemContext) throw new Error("useFormField should be used within <FormItem>");
  const formState = useFormState({ name: fieldContext.name });
  const fieldState = getFieldState(fieldContext.name, formState);
  const { id } = itemContext;
  return { id, name: fieldContext.name, formItemId: `${id}-form-item`, formDescriptionId: `${id}-form-item-description`, formMessageId: `${id}-form-item-message`, ...fieldState };
}

function FormItem({ className, ...props }: React.ComponentProps<"div">) {
  const id = React.useId();
  return (
    <FormItemContext.Provider value={{ id }}>
      <div data-slot="form-item" className={cn("grid min-w-0 gap-1", className)} {...props} />
    </FormItemContext.Provider>
  );
}

function FormLabel({ className, ...props }: React.ComponentProps<typeof Label>) {
  const { error, formItemId } = useFormField();
  return <Label data-slot="form-label" data-error={!!error} htmlFor={formItemId} className={cn("w-fit", className)} {...props} />;
}

/** Hands the field's id, its description and message ids and aria-invalid to the one control inside it. */
function FormControl(props: React.ComponentProps<typeof chakra.div>) {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField();
  return <chakra.div data-slot="form-control" id={formItemId} aria-describedby={!error ? formDescriptionId : `${formDescriptionId} ${formMessageId}`} aria-invalid={!!error} {...props} />;
}

function FormDescription({ className, ...props }: React.ComponentProps<"p">) {
  const { formDescriptionId } = useFormField();
  return <p data-slot="form-description" id={formDescriptionId} className={cn("m-0 font-sans text-body leading-body text-fg-muted", className)} {...props} />;
}

function FormMessage({ className, children, ...props }: React.ComponentProps<"p">) {
  const { error, formMessageId } = useFormField();
  const body = error ? String(error.message ?? "") : children;
  if (!body) return null;
  return (
    <p data-slot="form-message" id={formMessageId} role={error ? "alert" : undefined} className={cn("m-0 font-sans text-caption leading-body text-danger", className)} {...props}>
      {body}
    </p>
  );
}

export { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, useFormField };
