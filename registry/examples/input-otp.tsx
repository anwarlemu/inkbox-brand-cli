"use client";

import * as React from "react";

import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot, REGEXP_ONLY_DIGITS, REGEXP_ONLY_DIGITS_AND_CHARS } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";

export function Preview() {
  const [code, setCode] = React.useState("");
  const [done, setDone] = React.useState(false);
  return (
    <div className="grid gap-2">
      <Label htmlFor="login-code">Login code</Label>
      <InputOTP id="login-code" maxLength={6} pattern={REGEXP_ONLY_DIGITS} value={code} onChange={(v) => { setCode(v); setDone(false); }} onComplete={() => setDone(true)}>
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
        </InputOTPGroup>
        <InputOTPSeparator />
        <InputOTPGroup>
          <InputOTPSlot index={3} />
          <InputOTPSlot index={4} />
          <InputOTPSlot index={5} />
        </InputOTPGroup>
      </InputOTP>
      <p className="text-caption text-fg-muted" aria-live="polite">
        {done ? "Code entered. Checking it now." : "Enter the 6-digit code we sent to robert@acme.com."}
      </p>
    </div>
  );
}

export function States() {
  return (
    <div className="grid gap-4">
      <InputOTP aria-label="Recovery code" maxLength={4} pattern={REGEXP_ONLY_DIGITS_AND_CHARS} defaultValue="A7">
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
          <InputOTPSlot index={3} />
        </InputOTPGroup>
      </InputOTP>
      <InputOTP aria-label="Wrong code" maxLength={4} defaultValue="1234" aria-invalid>
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
          <InputOTPSlot index={3} />
        </InputOTPGroup>
      </InputOTP>
      <InputOTP aria-label="Disabled" maxLength={4} defaultValue="12" disabled>
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
          <InputOTPSlot index={3} />
        </InputOTPGroup>
      </InputOTP>
    </div>
  );
}
