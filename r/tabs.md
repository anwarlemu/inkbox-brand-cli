# Tabs
A lilac track of medium labels; the selected tab is a white key with Shadow/S.

Install: npx inkbox-ds add tabs
Requires: theme, utils
Packages: @chakra-ui/react
Exports: Tabs, TabsList, TabsTrigger, TabsContent
Client boundary: yes
Reference: Figma 427:2715: Email, iMessage, Webhooks and Login tabs


## Usage
Use to switch between views of the same thing on a page (Mailboxes, Contact rules, Custom domains). Pass full to TabsList for two equal choices that fill a form's width (Login, Sign up).
- Avoid: Underlined tabs
- Avoid: A purple selected tab
- Avoid: Animating the white key between tabs


## Examples
Example components: npx inkbox-ds add tabs
[Preview](https://inkbox-ds.vercel.app/preview/tabs/Preview) | [Full](https://inkbox-ds.vercel.app/preview/tabs/Full)

examples/tabs.tsx

```tsx
"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function Preview() {
  return (
    <Tabs defaultValue="mailboxes" className="w-full">
      <TabsList>
        <TabsTrigger value="mailboxes">Mailboxes</TabsTrigger>
        <TabsTrigger value="rules">Contact rules</TabsTrigger>
        <TabsTrigger value="domains">Custom domains</TabsTrigger>
      </TabsList>
      <TabsContent value="mailboxes" className="text-body text-fg-muted">Manage mailboxes for your organization.</TabsContent>
      <TabsContent value="rules" className="text-body text-fg-muted">Allow or block who can reach each agent.</TabsContent>
      <TabsContent value="domains" className="text-body text-fg-muted">Send and receive from your own domain.</TabsContent>
    </Tabs>
  );
}

export function Full() {
  return (
    <Tabs defaultValue="login" className="w-full max-w-86">
      <TabsList full>
        <TabsTrigger value="login">Login</TabsTrigger>
        <TabsTrigger value="signup">Sign up</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

```

## Source

components/ui/tabs.tsx

```tsx
"use client";

import * as React from "react";
import { Tabs as ChakraTabs } from "@chakra-ui/react";

import { cn } from "@/lib/utils";

// The console's tabs (Email: Mailboxes, Contact rules, Custom domains; Login and Sign up): a 42px lilac track with
// fully rounded corners and a 2px inset, 38px tabs 8px apart with 9px of side padding and a 14px medium ink label. The selected
// tab is a white key with fully rounded corners and Shadow/S. `full` stretches the tabs to share the track (Login, Sign up).
// Switching is instant: tabs are used many times a day, and the white key moving would only slow the eye.
type TabsProps = Omit<React.ComponentProps<typeof ChakraTabs.Root>, "onValueChange"> & { onValueChange?: (value: string) => void };
function Tabs({ className, onValueChange, ...props }: TabsProps) {
  return <ChakraTabs.Root unstyled data-slot="tabs" className={cn("flex flex-col gap-4", className)} onValueChange={(details) => onValueChange?.(details.value)} {...props} />;
}

function TabsList({ className, full = false, ...props }: React.ComponentProps<typeof ChakraTabs.List> & { full?: boolean }) {
  return (
    <ChakraTabs.List
      data-slot="tabs-list"
      data-full={full ? "true" : undefined}
      className={cn("inline-flex h-10.5 w-fit max-w-full items-center gap-2 overflow-x-auto rounded-pill bg-subtle p-0.5 [scrollbar-width:none]", full && "flex w-full", className)}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof ChakraTabs.Trigger>) {
  return (
    <ChakraTabs.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex h-9.5 shrink-0 items-center justify-center gap-2 rounded-pill px-2.25 font-sans text-body leading-tight font-medium whitespace-nowrap text-fg outline-none active:brightness-95 active:transition-none transition-[background-color,box-shadow,color] duration-150 ease-out hover:text-fg-brand focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring disabled:pointer-events-none disabled:text-fg-muted data-[selected]:bg-surface data-[selected]:shadow-s data-[selected]:hover:text-fg motion-reduce:transition-none in-data-[full=true]:flex-1 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5.5",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof ChakraTabs.Content>) {
  return <ChakraTabs.Content data-slot="tabs-content" className={cn("min-w-0 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring", className)} {...props} />;
}

export { Tabs, TabsList, TabsTrigger, TabsContent };

```
