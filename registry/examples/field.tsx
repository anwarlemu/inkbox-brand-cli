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
        <span className="rounded-sm bg-subtle px-1.5 py-0.5">@acme-support</span>
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
