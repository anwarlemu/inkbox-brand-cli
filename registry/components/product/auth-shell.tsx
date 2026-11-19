"use client";

import * as React from "react";
import { EyeIcon, EyeSlashIcon } from "@phosphor-icons/react/ssr";

import { Lockup } from "@/components/site/lockup";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type AuthProvider = { label: string; icon?: React.ReactNode; href: string };

/**
 * The console's sign-in screen: the lockup centered over a 420px column on the white page, Login and Sign up tabs
 * sharing the track, the email and password fields (Forgot password? at the right of the label, a show-password
 * button in the field), the purple pill, "or", the other ways in as lilac pills, then the legal links. `art` draws
 * under the column (the reef). The form only calls `onSubmit`: wire it to your auth.
 */
function AuthShell({ markSrc, providers = [], art, legal = [{ label: "Privacy Policy", href: "/legal/privacy" }, { label: "Terms of Service", href: "/legal/terms" }], onSubmit }: { markSrc?: string; providers?: AuthProvider[]; art?: React.ReactNode; legal?: { label: string; href: string }[]; onSubmit?: (values: { mode: "login" | "signup"; email: string; password: string }) => void }) {
  const [mode, setMode] = React.useState<"login" | "signup">("login");
  const [show, setShow] = React.useState(false);
  return (
    <div data-slot="auth-shell" className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-page px-2 py-4 font-sans text-fg">
      <div className="relative z-1 w-full max-w-105 px-4">
        <div className="mb-4 flex justify-center">
          <a href="/" className="rounded-sm px-4 py-2 outline-none transition-colors duration-150 ease-out hover:bg-wash-hover focus-visible:shadow-focus motion-reduce:transition-none">
            <Lockup markSrc={markSrc} size="lg" />
          </a>
        </div>
        <Tabs value={mode} onValueChange={(v) => setMode(v as "login" | "signup")} className="mb-4">
          <TabsList full>
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Sign up</TabsTrigger>
          </TabsList>
        </Tabs>
        <form
          className="grid gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            onSubmit?.({ mode, email: String(data.get("email") ?? ""), password: String(data.get("password") ?? "") });
          }}
        >
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="auth-email">Email address</FieldLabel>
              <Input id="auth-email" name="email" type="email" autoComplete="email" placeholder="your@email.com" required />
            </Field>
            <Field>
              <div className="flex items-center justify-between gap-3">
                <FieldLabel htmlFor="auth-password">Password</FieldLabel>
                {mode === "login" && (
                  <a href="/forgot-password" className="text-body text-fg-brand underline-offset-4 outline-none hover:underline focus-visible:underline">
                    Forgot password?
                  </a>
                )}
              </div>
              <div className="relative">
                <Input id="auth-password" name="password" type={show ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="••••••••" required className="pr-10" />
                <Button type="button" variant="ghost" size="icon" aria-label={show ? "Hide password" : "Show password"} onClick={() => setShow((s) => !s)} className="absolute top-1/2 right-1 -translate-y-1/2">
                  {show ? <EyeSlashIcon weight="fill" /> : <EyeIcon weight="fill" />}
                </Button>
              </div>
            </Field>
          </FieldGroup>
          <Button type="submit" className="w-full">
            {mode === "login" ? "Log in" : "Create account"}
          </Button>
          {providers.length > 0 && (
            <>
              <FieldSeparator>or</FieldSeparator>
              <div className="grid gap-2.5">
                {providers.map((p) => (
                  <Button key={p.label} asChild variant="secondary" className="w-full">
                    <a href={p.href}>
                      {p.icon}
                      {p.label}
                    </a>
                  </Button>
                ))}
              </div>
            </>
          )}
          <div className="grid gap-3 border-t border-line-subtle pt-4 text-center text-caption leading-relaxed text-fg-secondary">
            <p>
              {mode === "signup" ? "By signing up, you agree to our " : ""}
              {legal.map((l, i) => (
                <React.Fragment key={l.href}>
                  {i > 0 && (mode === "signup" ? " and " : " • ")}
                  <a href={l.href} className="text-fg-brand underline underline-offset-2 outline-none focus-visible:shadow-focus">
                    {l.label}
                  </a>
                </React.Fragment>
              ))}
            </p>
          </div>
        </form>
      </div>
      {art && <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0">{art}</div>}
    </div>
  );
}

export { AuthShell };
