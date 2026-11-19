# Card
White cards with the field edge, white cards on the card shadow, and lilac cards, all with 24px corners.

Install: npx inkbox-ds add card
Requires: theme, utils
Packages: class-variance-authority
Exports: Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, cardVariants
Client boundary: not required by this entry file
Reference: Console Card theme; Figma 427:2715: Webhooks - Event catalog, Create Agent Identity (channel cards)


## Usage
Use default (outline) for a small fact block in a grid (Trigger, Delivery, Response contract): a glyph-led 14px title and a muted description. Use raised (elevated) for a white panel lifted off the page. Use muted (filled) for a grouped setting inside a dialog (a channel with its toggle in CardAction). Put a button or toggle in CardAction at the top right.
- Avoid: Drop shadows on default cards
- Avoid: Corners other than rounded-dialog
- Avoid: A colored header bar
- Avoid: Nesting cards more than one level


## Examples
Example components: npx inkbox-ds add card badge button
Example packages: @phosphor-icons/react
[Preview](https://inkbox-ds.vercel.app/preview/card/Preview) | [Channel](https://inkbox-ds.vercel.app/preview/card/Channel) | [WithFooter](https://inkbox-ds.vercel.app/preview/card/WithFooter) | [Small](https://inkbox-ds.vercel.app/preview/card/Small)

examples/card.tsx

```tsx
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

```

## Source

components/ui/card.tsx

```tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// The console's cards (the Card theme: 24px corners throughout). `default` (also `outline`) is white with the 1px field
// edge, 14px in: the webhook Trigger and Delivery cards, a 14px ink title led by a 16px filled glyph over a 14px muted
// description. `raised` (also `elevated`) is white on the card shadow. `muted` (also `filled`) is the lilac card with no
// edge: the dialog's channel card, 12px above and below with a 16px medium title. Size sm tightens the insides to 12px.
const cardVariants = cva("group/card flex flex-col gap-3 rounded-dialog py-3.5 font-sans text-body leading-body text-fg data-[size=sm]:gap-2 data-[size=sm]:py-3", {
  variants: {
    variant: {
      default: "border border-line-field bg-surface",
      outline: "border border-line-field bg-surface",
      raised: "bg-surface shadow-card",
      elevated: "bg-surface shadow-card",
      muted: "bg-subtle py-3",
      filled: "bg-subtle py-3",
    },
  },
  defaultVariants: { variant: "default" },
});

function Card({ className, variant, size = "default", ...props }: React.ComponentProps<"div"> & VariantProps<typeof cardVariants> & { size?: "default" | "sm" }) {
  return <div data-slot="card" data-variant={variant ?? "default"} data-size={size} className={cn(cardVariants({ variant }), className)} {...props} />;
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("grid auto-rows-min grid-rows-[auto] has-data-[slot=card-description]:grid-rows-[auto_auto] items-start gap-x-3 gap-y-2.5 px-3.5 group-data-[size=sm]/card:px-3 has-data-[slot=card-action]:grid-cols-[minmax(0,1fr)_auto]", className)}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("flex min-w-0 items-center gap-1.5 text-body leading-body text-fg group-data-[variant=muted]/card:text-body-lg group-data-[variant=muted]/card:font-medium group-data-[variant=filled]/card:text-body-lg group-data-[variant=filled]/card:font-medium [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4.5", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-description" className={cn("text-body leading-body text-fg-muted", className)} {...props} />;
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-action" className={cn("col-start-2 row-span-full flex self-start justify-self-end", className)} {...props} />;
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-content" className={cn("px-3.5 group-data-[size=sm]/card:px-3", className)} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-footer" className={cn("flex items-center gap-2 px-3.5 group-data-[size=sm]/card:px-3", className)} {...props} />;
}

export { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, cardVariants };

```
