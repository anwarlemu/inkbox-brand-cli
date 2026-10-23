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
