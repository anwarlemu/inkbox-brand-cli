# Form
react-hook-form fields laid out as the console's forms: a 14px label, the control, a muted description and a 12px red message.

Install: npx inkbox-ds add form
Requires: theme, label, utils
Packages: @chakra-ui/react, react-hook-form
Exports: Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, useFormField
Client boundary: yes
Reference: Figma 427:2715: Create Agent Identity (handle check states, Creating Agent Identity...), Login


## Usage
Build a validated form with react-hook-form: wrap it in Form with the useForm result, give each field a FormField with a render function returning FormItem, FormLabel, FormControl around the one control, then FormDescription and FormMessage. FormControl passes the id, the described-by ids and aria-invalid to the control, so the red edge and the message appear together. Finish with one full-width default Button of type submit, showing a Spinner while it works.
- Avoid: A red label on an invalid field
- Avoid: Validating on every keystroke before the first submit
- Avoid: A submit button that stays enabled while the request runs
- Avoid: More than one purple pill in the form


## Examples
Example components: npx inkbox-ds add form badge button input input-group label radio-group spinner switch textarea
Example packages: react-hook-form, @phosphor-icons/react
[Preview](https://inkbox-ds.vercel.app/preview/form/Preview) | [Login](https://inkbox-ds.vercel.app/preview/form/Login)

examples/form.tsx

```tsx
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { AppleLogoIcon, ArrowsLeftRightIcon, CheckCircleIcon, EnvelopeSimpleIcon, GlobeIcon, InfoIcon, PhoneIcon, PlusIcon, XCircleIcon } from "@phosphor-icons/react/ssr";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type Values = { handle: string; displayName: string; description: string; phone: boolean; imessage: boolean; a2a: boolean; tls: "edge" | "passthrough" };

const TAKEN = ["acme", "support", "acme-support"];

// The local example checks immediately. Real availability checks should use the API without delaying typing.
async function isAvailable(handle: string) {
  return !TAKEN.includes(handle);
}

const CHANNELS = [
  { name: "phone", label: "Phone Number", icon: PhoneIcon },
  { name: "imessage", label: "iMessage", icon: AppleLogoIcon },
] as const;

export function Preview() {
  const form = useForm<Values>({ mode: "onSubmit", reValidateMode: "onChange", defaultValues: { handle: "", displayName: "", description: "", phone: false, imessage: false, a2a: false, tls: "edge" } });
  const [check, setCheck] = React.useState<"idle" | "checking" | "free" | "taken">("idle");
  const [created, setCreated] = React.useState<string | null>(null);
  const handle = form.watch("handle");

  // Start validation immediately; discard stale results if the handle changes.
  React.useEffect(() => {
    if (!/^[a-z0-9-]{3,}$/.test(handle)) return setCheck("idle");
    let live = true;
    setCheck("checking");
    void isAvailable(handle).then((ok) => live && setCheck(ok ? "free" : "taken"));
    return () => {
      live = false;
    };
  }, [handle]);

  async function onSubmit(values: Values) {
    if (!(await isAvailable(values.handle))) {
      form.setError("handle", { message: "(is not available)" });
      return;
    }
    setCreated(values.handle);
  }

  const submitting = form.formState.isSubmitting;
  if (created)
    return (
      <div className="mx-auto grid w-full max-w-121.5 justify-items-center gap-3 py-6 text-center">
        <CheckCircleIcon weight="fill" className="size-10 text-success" />
        <p className="text-h3 leading-heading text-fg">@{created} is ready!</p>
        <Button variant="secondary" onClick={() => { form.reset(); setCreated(null); }}>
          Create another
        </Button>
      </div>
    );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="mx-auto grid w-full max-w-121.5 gap-6">
        <fieldset disabled={submitting} className="m-0 grid gap-6 border-0 p-0 disabled:opacity-60">
          <div className="flex gap-5">
            <button type="button" aria-label="Add a picture" className="flex size-16 shrink-0 items-center justify-center rounded-pill bg-subtle text-fg outline-none transition-[background-color] duration-150 ease-out hover:bg-subtle-hover active:brightness-95 active:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring motion-reduce:transition-none">
              <PlusIcon className="size-7" />
            </button>
            <div className="grid min-w-0 flex-1 gap-3">
              <FormField
                control={form.control}
                name="handle"
                rules={{
                  required: "Choose a handle for the agent.",
                  pattern: { value: /^[a-z0-9-]{3,}$/, message: "Use at least 3 lowercase letters, numbers or hyphens." },
                  validate: () => check !== "taken" || "(is not available)",
                }}
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className="sr-only">Agent handle</FormLabel>
                    <InputGroup>
                      <FormControl>
                        <InputGroupInput placeholder="Agent handle" autoComplete="off" spellCheck={false} {...field} aria-invalid={!!fieldState.error || check === "taken"} />
                      </FormControl>
                      <InputGroupAddon align="inline-end">
                        {check === "checking" && <Spinner aria-label="Checking the handle" className="text-fg-faint" />}
                        {check === "free" && <CheckCircleIcon weight="fill" className="text-success" aria-label="Available" />}
                        {check === "taken" && <XCircleIcon weight="fill" className="text-danger-strong" aria-label="Not available" />}
                      </InputGroupAddon>
                    </InputGroup>
                    {handle && check !== "idle" && check !== "checking" ? (
                      <p className="flex flex-wrap items-center gap-2 text-caption leading-body text-fg-secondary">
                        Will be displayed as <span className="rounded-pill bg-subtle px-2 py-0.5 text-fg">@{handle}</span>
                        {check === "taken" && <span className="text-danger">(is not available)</span>}
                      </p>
                    ) : null}
                    {check !== "taken" && <FormMessage />}
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="displayName"
                rules={{ maxLength: { value: 40, message: "Keep the display name under 40 characters." } }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="sr-only">Agent display name</FormLabel>
                    <FormControl>
                      <Input placeholder="Agent display name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="sr-only">Agent description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Agent Description" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="grid gap-2.5">
            <p className="text-body leading-body text-fg">Channels</p>
            <div className="grid gap-3 rounded-control bg-subtle p-3.5">
              <div className="flex items-center gap-2.5">
                <span className="flex size-7 items-center justify-center rounded-pill bg-pink text-rose">
                  <EnvelopeSimpleIcon weight="fill" className="size-5.5" />
                </span>
                <span className="flex-1 text-body-lg font-medium text-fg">Email</span>
                <Badge variant="success" size="lg">
                  <CheckCircleIcon weight="fill" />
                  Included
                </Badge>
              </div>
              <InputGroup>
                <InputGroupInput aria-label="Mailbox" value={handle || "acme-support"} readOnly />
                <InputGroupAddon align="inline-end" variant="segment">
                  @inboxmail.com
                </InputGroupAddon>
              </InputGroup>
            </div>
            {CHANNELS.map(({ name, label, icon: Icon }) => (
              <FormField
                key={name}
                control={form.control}
                name={name}
                render={({ field }) => (
                  <FormItem className="flex h-13 items-center gap-2.5 rounded-pill bg-subtle px-3.5">
                    <span className="flex size-7 items-center justify-center rounded-pill bg-pink text-rose">
                      <Icon weight="fill" className="size-5.5" />
                    </span>
                    <FormLabel className="flex-1 text-body-lg font-medium">{label}</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} onBlur={field.onBlur} />
                    </FormControl>
                  </FormItem>
                )}
              />
            ))}
            <FormField
              control={form.control}
              name="a2a"
              render={({ field }) => (
                <FormItem className="flex h-13 items-center gap-2.5 rounded-pill bg-subtle px-3.5">
                  <ArrowsLeftRightIcon className="size-6 text-icon-secondary" aria-hidden />
                  <FormLabel className="flex-1 text-body-lg font-medium">
                    Agent2Agent <Badge variant="pink">BETA</Badge>
                  </FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} onBlur={field.onBlur} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-2">
            <p className="text-body leading-body text-fg">Your agent will be reachable at:</p>
            <p className="flex h-10 items-center gap-2.5 rounded-pill bg-subtle px-2.5 text-body text-fg">
              <span className="flex size-7 items-center justify-center rounded-pill bg-pink text-rose">
                <GlobeIcon weight="fill" className="size-5.5" />
              </span>
              {handle || "acme-support"}.inkboxwire.com
            </p>
          </div>

          <FormField
            control={form.control}
            name="tls"
            render={({ field }) => (
              <FormItem className="gap-2">
                <FormLabel className="gap-1.5">
                  Tunnel TLS mode <InfoIcon weight="fill" aria-hidden className="size-4.5 text-fg-label" />
                </FormLabel>
                <FormControl>
                  <RadioGroup value={field.value} onValueChange={field.onChange}>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="edge" id="tls-edge" />
                      <Label htmlFor="tls-edge">Edge (default)</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="passthrough" id="tls-passthrough" />
                      <Label htmlFor="tls-passthrough">Passthrough</Label>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormDescription>Edge ends TLS at Inkbox; passthrough sends it to your agent untouched.</FormDescription>
              </FormItem>
            )}
          />
        </fieldset>

        <Button type="submit" className="w-full" disabled={submitting || check === "checking"}>
          {submitting ? (
            <>
              <Spinner aria-hidden className="size-5" />
              Creating Agent Identity...
            </>
          ) : (
            "Create Agent Identity"
          )}
        </Button>
      </form>
    </Form>
  );
}

export function Login() {
  const form = useForm<{ email: string; password: string }>({ defaultValues: { email: "", password: "" } });
  const [done, setDone] = React.useState(false);
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(() => setDone(true))} noValidate className="mx-auto grid w-full max-w-86 gap-3">
        <FormField
          control={form.control}
          name="email"
          rules={{ required: "Enter your email address.", pattern: { value: /^\S+@\S+\.\S+$/, message: "Enter a valid email address." } }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email address</FormLabel>
              <FormControl>
                <Input type="email" placeholder="your@email.com" autoComplete="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          rules={{ required: "Enter your password.", minLength: { value: 8, message: "Passwords have at least 8 characters." } }}
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between gap-3">
                <FormLabel>Password</FormLabel>
                <a href="#forgot" className="text-body leading-body text-fg-brand underline-offset-4 hover:underline">Forgot password?</a>
              </div>
              <FormControl>
                <Input type="password" autoComplete="current-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="mt-1 w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? <Spinner aria-hidden className="size-5" /> : null}
          {done ? "Logged in" : "Log in"}
        </Button>
      </form>
    </Form>
  );
}

```

## Source

components/ui/form.tsx

```tsx
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

```
