# Navigation Menu
Nav-row triggers and links with panels that open in a raised white viewport.

Install: npx inkbox-ds add navigation-menu
Requires: theme, utils
Packages: radix-ui, @phosphor-icons/react, class-variance-authority
Exports: NavigationMenu, NavigationMenuContent, NavigationMenuIndicator, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger, NavigationMenuViewport, navigationMenuTriggerStyle
Client boundary: yes
Reference: Extrapolated from the Inkbox console (Figma 427:2715): the rail's nav rows and the raised panel


## Usage
Use for a site's top navigation with grouped destinations (Product, Docs). Put NavigationMenuLink rows with a title and a muted line inside each NavigationMenuContent. Pass viewport={false} to open each panel under its own trigger. navigationMenuTriggerStyle styles a plain link as a trigger; call it from a client component.
- Avoid: Actions in a navigation menu
- Avoid: A navigation menu inside the console's rail (use Sidebar)
- Avoid: Panels taller than the screen


## Examples
Example components: npx inkbox-ds add navigation-menu
Example packages: @phosphor-icons/react
[Preview](https://inkbox-ds.vercel.app/preview/navigation-menu/Preview) | [Open](https://inkbox-ds.vercel.app/preview/navigation-menu/Open)

examples/navigation-menu.tsx

```tsx
"use client";


import { ChatCircleTextIcon, EnvelopeSimpleIcon, LockKeyIcon, PhoneIcon, ArrowsLeftRightIcon, WebhooksLogoIcon } from "@phosphor-icons/react/ssr";

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";

const CHANNELS = [
  { title: "Email", body: "A mailbox for every agent, on inkboxmail.com or your domain.", icon: EnvelopeSimpleIcon },
  { title: "Phone", body: "Calls and texts on a number the agent owns.", icon: PhoneIcon },
  { title: "iMessage", body: "Shared or dedicated lines that also handle calls.", icon: ChatCircleTextIcon },
  { title: "Agent2Agent", body: "Publish an Agent Card and take tasks from other agents.", icon: ArrowsLeftRightIcon },
];

function Menu({ defaultValue }: { defaultValue?: string }) {
  return (
    <NavigationMenu defaultValue={defaultValue}>
      <NavigationMenuList>
        <NavigationMenuItem value="channels">
          <NavigationMenuTrigger>Channels</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[min(34rem,calc(100vw-2rem))] gap-1 sm:grid-cols-2">
              {CHANNELS.map(({ title, body, icon: Icon }) => (
                <li key={title}>
                  <NavigationMenuLink href={`#${title.toLowerCase()}`}>
                    <span className="flex items-center gap-2.5 font-medium">
                      <Icon weight="fill" />
                      {title}
                    </span>
                    <span className="text-fg-muted">{body}</span>
                  </NavigationMenuLink>
                </li>
              ))}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem value="shared">
          <NavigationMenuTrigger>Shared</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[min(16rem,calc(100vw-2rem))] gap-1">
              <li>
                <NavigationMenuLink href="#vault">
                  <span className="flex items-center gap-2.5 font-medium">
                    <LockKeyIcon weight="fill" />
                    Vault
                  </span>
                  <span className="text-fg-muted">Zero-knowledge secrets for your agents.</span>
                </NavigationMenuLink>
              </li>
              <li>
                <NavigationMenuLink href="#webhooks">
                  <span className="flex items-center gap-2.5 font-medium">
                    <WebhooksLogoIcon weight="fill" />
                    Webhooks
                  </span>
                  <span className="text-fg-muted">Event payloads, signed and delivered.</span>
                </NavigationMenuLink>
              </li>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink href="#docs" className={navigationMenuTriggerStyle()}>
            Docs
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}

export function Preview() {
  return (
    <div className="flex justify-center">
      <Menu />
    </div>
  );
}

export function Open() {
  return (
    <div className="flex min-h-80 items-start justify-center">
      <Menu defaultValue="channels" />
    </div>
  );
}

```

## Source

components/ui/navigation-menu.tsx

```tsx
"use client";

import * as React from "react";
import { NavigationMenu as NavigationMenuPrimitive } from "radix-ui";
import { CaretDownIcon } from "@phosphor-icons/react/ssr";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Site navigation with panels, extrapolated from the console's nav rows (Figma 427:2715: Agent Workspace, Manage
// Agents): triggers and links are 38px rows with fully rounded corners, 12px of side padding and a 14px regular ink label, the
// lilac under the pointer and under an open trigger; the trigger's 16px caret turns over when open (on-screen motion,
// 200ms in-out). The panel opens below in a raised white viewport (16px corners, the floating shadow) that grows from
// a short fade, with no animated resizing (centered under the menu on phones, at its start from 768px); links inside are nav rows with a 14px title and a 14px muted line.
function NavigationMenu({ className, children, viewport = true, ...props }: React.ComponentProps<typeof NavigationMenuPrimitive.Root> & { viewport?: boolean }) {
  return (
    <NavigationMenuPrimitive.Root data-slot="navigation-menu" data-viewport={viewport} className={cn("group/navigation-menu relative flex max-w-max flex-1 items-center justify-center", className)} {...props}>
      {children}
      {viewport && <NavigationMenuViewport />}
    </NavigationMenuPrimitive.Root>
  );
}

function NavigationMenuList({ className, ...props }: React.ComponentProps<typeof NavigationMenuPrimitive.List>) {
  return <NavigationMenuPrimitive.List data-slot="navigation-menu-list" className={cn("group flex flex-1 list-none items-center justify-center gap-1", className)} {...props} />;
}

function NavigationMenuItem({ className, ...props }: React.ComponentProps<typeof NavigationMenuPrimitive.Item>) {
  return <NavigationMenuPrimitive.Item data-slot="navigation-menu-item" className={cn("relative", className)} {...props} />;
}

const navigationMenuTriggerStyle = cva(
  "group inline-flex h-9.5 w-max items-center justify-center gap-1.5 rounded-pill px-3 font-sans text-body leading-tight text-fg outline-none active:brightness-95 active:transition-none transition-colors duration-150 ease-out hover:bg-subtle active:bg-subtle focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-subtle data-[state=open]:bg-subtle motion-reduce:transition-none [&_svg:not([class*='size-'])]:size-5.5",
);

function NavigationMenuTrigger({ className, children, ...props }: React.ComponentProps<typeof NavigationMenuPrimitive.Trigger>) {
  return (
    <NavigationMenuPrimitive.Trigger data-slot="navigation-menu-trigger" className={cn(navigationMenuTriggerStyle(), className)} {...props}>
      {children}
      <CaretDownIcon aria-hidden className="size-4.5 text-fg-muted transition-transform duration-200 ease-in-out group-data-[state=open]:rotate-180 motion-reduce:transition-none" />
    </NavigationMenuPrimitive.Trigger>
  );
}

function NavigationMenuContent({ className, ...props }: React.ComponentProps<typeof NavigationMenuPrimitive.Content>) {
  return (
    <NavigationMenuPrimitive.Content
      data-slot="navigation-menu-content"
      className={cn(
        "top-0 left-0 w-full p-1.5 md:absolute md:w-auto",
        "group-data-[viewport=false]/navigation-menu:top-full group-data-[viewport=false]/navigation-menu:mt-1.5 group-data-[viewport=false]/navigation-menu:overflow-hidden group-data-[viewport=false]/navigation-menu:rounded-panel group-data-[viewport=false]/navigation-menu:bg-surface group-data-[viewport=false]/navigation-menu:shadow-floating group-data-[viewport=false]/navigation-menu:data-[state=closed]:animate-fade-out group-data-[viewport=false]/navigation-menu:data-[state=open]:animate-fade-in",
        "data-[motion^=from-]:animate-fade-in data-[motion^=to-]:animate-fade-out",
        className,
      )}
      {...props}
    />
  );
}

function NavigationMenuViewport({ className, ...props }: React.ComponentProps<typeof NavigationMenuPrimitive.Viewport>) {
  return (
    <div className="absolute top-full left-1/2 isolate z-50 flex -translate-x-1/2 justify-center md:left-0 md:translate-x-0">
      <NavigationMenuPrimitive.Viewport
        data-slot="navigation-menu-viewport"
        className={cn(
          "relative mt-1.5 h-(--radix-navigation-menu-viewport-height) w-(--radix-navigation-menu-viewport-width) max-w-[calc(100vw-2rem)] origin-top md:origin-top-left overflow-hidden rounded-panel bg-surface text-fg shadow-floating data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in motion-reduce:transition-none",
          className,
        )}
        {...props}
      />
    </div>
  );
}

function NavigationMenuLink({ className, ...props }: React.ComponentProps<typeof NavigationMenuPrimitive.Link>) {
  return (
    <NavigationMenuPrimitive.Link
      data-slot="navigation-menu-link"
      className={cn(
        "flex flex-col gap-0.5 rounded-control p-3 text-body leading-tight text-fg outline-none transition-colors duration-150 ease-out hover:bg-subtle focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring data-[active=true]:bg-subtle motion-reduce:transition-none [&_svg:not([class*='size-'])]:size-5.5 [&_svg:not([class*='text-'])]:text-icon-default",
        className,
      )}
      {...props}
    />
  );
}

function NavigationMenuIndicator({ className, ...props }: React.ComponentProps<typeof NavigationMenuPrimitive.Indicator>) {
  return (
    <NavigationMenuPrimitive.Indicator
      data-slot="navigation-menu-indicator"
      className={cn("top-full z-10 flex h-1.5 items-end justify-center overflow-hidden data-[state=hidden]:animate-fade-out data-[state=visible]:animate-fade-in", className)}
      {...props}
    >
      <div className="relative top-[60%] size-2.5 rotate-45 rounded-tl-xs bg-surface shadow-floating" />
    </NavigationMenuPrimitive.Indicator>
  );
}

export {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuViewport,
  navigationMenuTriggerStyle,
};

```
