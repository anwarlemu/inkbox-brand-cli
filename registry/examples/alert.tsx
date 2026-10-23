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
