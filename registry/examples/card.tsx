import { BellRingingIcon, CheckCircleIcon, EnvelopeIcon, LightningIcon, PhoneIcon, PlugsIcon } from "@phosphor-icons/react/ssr";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export function Preview() {
  return (
    <div className="grid w-full gap-6 sm:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>
            <LightningIcon weight="fill" />
            Trigger
          </CardTitle>
          <CardDescription>Triggered after an inbound email is accepted and persisted to the mailbox.</CardDescription>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>
            <BellRingingIcon weight="fill" />
            Delivery
          </CardTitle>
          <CardDescription>Fire-and-forget POST. Delivery failures are logged and do not block mail processing.</CardDescription>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>
            <PlugsIcon weight="fill" />
            Response contract
          </CardTitle>
          <CardDescription>Any response body is ignored.</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

function Tile({ children }: { children: React.ReactNode }) {
  return <span className="flex size-7 shrink-0 items-center justify-center rounded-pill bg-pink text-rose">{children}</span>;
}

export function Channel() {
  return (
    <div className="grid w-full max-w-122 gap-2">
      <Card variant="muted">
        <CardHeader className="items-center">
          <CardTitle className="gap-2.5">
            <Tile>
              <EnvelopeIcon weight="fill" className="size-5.5" />
            </Tile>
            Email
          </CardTitle>
          <CardAction className="self-center">
            <Badge variant="success" size="lg">
              <CheckCircleIcon weight="fill" />
              Included
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          <p className="flex h-10 items-center rounded-pill border border-line-field bg-subtle px-3.5 text-body text-fg-muted">acme-support@inboxmail.com</p>
        </CardContent>
      </Card>
      <Card variant="muted">
        <CardHeader className="items-center">
          <CardTitle className="gap-2.5">
            <Tile>
              <PhoneIcon weight="fill" className="size-5.5" />
            </Tile>
            Phone Number
          </CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
}

export function WithFooter() {
  return (
    <Card variant="raised" className="w-full max-w-100">
      <CardHeader>
        <CardTitle className="text-body-lg">Custom domain</CardTitle>
        <CardDescription>Send and receive as you@yourcompany.com. Add the DNS records, then verify.</CardDescription>
        <CardAction>
          <Button variant="ghost" size="sm">Docs</Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="font-mono text-body text-fg">mail.yourcompany.com</p>
      </CardContent>
      <CardFooter className="justify-end">
        <Button variant="outline">Verify domain</Button>
      </CardFooter>
    </Card>
  );
}

export function Small() {
  return (
    <Card size="sm" className="w-full max-w-72">
      <CardHeader>
        <CardTitle>Last connected</CardTitle>
        <CardDescription>Aug 8, 2026, 07:16 PM</CardDescription>
      </CardHeader>
    </Card>
  );
}
