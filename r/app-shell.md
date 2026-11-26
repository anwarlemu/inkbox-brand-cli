# App shell
The console's frame: the rail on the lilac and the page as a raised white panel, with the page head and body.

Install: npx inkbox-ds add app-shell
Requires: theme, lockup, avatar, badge, sidebar, utils
Packages: @phosphor-icons/react
Exports: AppNavItem, AppNavGroup, CONSOLE_NAV, CONSOLE_FOOT, AppPageBody, AppPageHead, AppShell
Client boundary: yes
Reference: Console components/layout (authenticated-app-shell.tsx: lilac ground, main panel 8px in with 16px corners and Shadow/S; page-head.tsx; sidebar-metrics.ts); rail rows as the Figma console screens and the registry sidebar


## Usage
Wrap every product screen in AppShell; start each with AppPageHead (title, description, actions) and put the content in AppPageBody. Pass nav and current; rows with href are links. The page area scrolls with its edges fading (fade-y), so no row is cut off under the top.
- Avoid: A dark rail
- Avoid: Pages without the head
- Avoid: Nesting two shells


## Examples
Example components: npx inkbox-ds add app-shell button empty
[Preview](https://inkbox-ds.vercel.app/preview/app-shell/Preview)

examples/app-shell.tsx

```tsx
"use client";

import * as React from "react";

import { AppPageBody, AppPageHead, AppShell } from "@/components/product/app-shell";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";

export function Preview() {
  const [current, setCurrent] = React.useState("Vault");
  return (
    <AppShell current={current} onSelect={setCurrent}>
      <AppPageHead title={current} description="Zero-knowledge encrypted secret store for your agents." actions={<Button size="sm">Add secret</Button>} />
      <AppPageBody>
        <Empty className="min-h-80">
          <EmptyHeader>
            <EmptyTitle>Nothing here yet</EmptyTitle>
            <EmptyDescription>Pick a row in the rail: the page head follows it.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </AppPageBody>
    </AppShell>
  );
}

```

## Source

components/product/app-shell.tsx

```tsx
"use client";

import * as React from "react";
import { AppleLogoIcon, ArrowsLeftRightIcon, BuildingOfficeIcon, CirclesThreeIcon, EnvelopeSimpleIcon, KeyIcon, NotepadIcon, PhoneIcon, QuestionIcon, RobotIcon, UsersIcon, VaultIcon, WebhooksLogoIcon } from "@phosphor-icons/react/ssr";

import { Lockup } from "@/components/site/lockup";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export type AppNavItem = { title: string; icon?: React.ReactNode; href?: string; beta?: boolean; count?: number; mark?: string };
export type AppNavGroup = { label?: string; items: AppNavItem[] };

export const CONSOLE_NAV: AppNavGroup[] = [
  { items: [{ title: "Agent Workspace", icon: <RobotIcon weight="fill" /> }, { title: "Manage Agents", icon: <CirclesThreeIcon weight="fill" /> }, { title: "API Keys", icon: <KeyIcon weight="fill" /> }] },
  { label: "Channels", items: [{ title: "Email", icon: <EnvelopeSimpleIcon weight="fill" /> }, { title: "Phone", icon: <PhoneIcon weight="fill" /> }, { title: "iMessage", icon: <AppleLogoIcon weight="fill" /> }, { title: "Agent2Agent", icon: <ArrowsLeftRightIcon weight="regular" />, beta: true }] },
  { label: "Shared", items: [{ title: "Contacts", icon: <UsersIcon weight="fill" /> }, { title: "Notes", icon: <NotepadIcon weight="fill" /> }, { title: "Vault", icon: <VaultIcon weight="fill" /> }, { title: "Webhooks", icon: <WebhooksLogoIcon weight="regular" /> }] },
];

export const CONSOLE_FOOT: AppNavItem[] = [
  { title: "Help", icon: <QuestionIcon weight="fill" /> },
  { title: "My Organisation", icon: <BuildingOfficeIcon weight="fill" />, mark: "ADMIN" },
];

function NavRow({ item, current, onSelect }: { item: AppNavItem; current?: string; onSelect?: (title: string) => void }) {
  const inner = (
    <>
      {item.icon}
      <span>{item.title}</span>
      {item.beta && (
        <Badge variant="pink" className="ml-px">
          BETA
        </Badge>
      )}
    </>
  );
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild={!!item.href} isActive={current === item.title} tooltip={item.title} onClick={onSelect ? () => onSelect(item.title) : undefined}>
        {item.href ? (
          <a href={item.href} aria-current={current === item.title ? "page" : undefined}>
            {inner}
          </a>
        ) : (
          inner
        )}
      </SidebarMenuButton>
      {item.count ? <SidebarMenuBadge variant="count">{item.count}</SidebarMenuBadge> : item.mark ? <SidebarMenuBadge>{item.mark}</SidebarMenuBadge> : null}
    </SidebarMenuItem>
  );
}

/**
 * The console's frame: the rail on the lilac (the lockup, the nav groups, Help, the organization and the account at the
 * foot) and the page as a raised white panel beside it, 8px from the edges with 16px corners. On phones the rail opens
 * in a sheet from the page head's menu button. `current` names the active row; rows with an `href` are links.
 */
function AppShell({ children, nav = CONSOLE_NAV, foot = CONSOLE_FOOT, account = "Jordan at Acme", current, onSelect, logo, className }: { children: React.ReactNode; nav?: AppNavGroup[]; foot?: AppNavItem[]; account?: string; current?: string; onSelect?: (title: string) => void; logo?: React.ReactNode; className?: string }) {
  return (
    <SidebarProvider className={cn("h-svh min-h-0 overflow-hidden", className)}>
      <Sidebar variant="inset" collapsible="offcanvas">
        <SidebarHeader className="px-4 py-5">{logo ?? <Lockup />}</SidebarHeader>
        <SidebarContent>
          {nav.map((group, i) => (
            <SidebarGroup key={group.label ?? i}>
              {group.label && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => (
                    <NavRow key={item.title} item={item} current={current} onSelect={onSelect} />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            {foot.map((item) => (
              <NavRow key={item.title} item={item} current={current} onSelect={onSelect} />
            ))}
            <SidebarMenuItem>
              <SidebarMenuButton tooltip={account}>
                <Avatar size="sm" className="data-[size=sm]:size-4.5">
                  <AvatarFallback className="text-micro">{account.charAt(0)}</AvatarFallback>
                </Avatar>
                <span>{account}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="min-h-0 overflow-hidden">
        <div data-slot="app-shell-scroll" className="fade-y flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}

/**
 * The console's page head: a 20px regular title on a 28px line, the muted description 4px under it, actions at the
 * right, and the row hairline under it all (16px below the words). The menu button opens the rail on phones.
 */
function AppPageHead({ title, description, actions, className }: { title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; className?: string }) {
  return (
    <header data-slot="app-page-head" className={cn("mx-4 mt-4 mb-4 flex flex-wrap items-start gap-3 border-b border-line-row pb-4 md:mx-6 md:mt-5", className)}>
      <SidebarTrigger className="-ml-2 md:hidden" />
      <div className="min-w-0 flex-1">
        <h1 className="text-h3 leading-7 font-normal text-fg">{title}</h1>
        {description && <p className="mt-1 text-body text-fg-muted">{description}</p>}
      </div>
      {actions && <div className="ml-auto flex min-h-7 shrink-0 flex-wrap items-center gap-3">{actions}</div>}
    </header>
  );
}

/** The page's body under the head: the console's 16px (24px on wide screens) gutters. */
function AppPageBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="app-page-body" className={cn("grid gap-4 px-4 pb-6 md:px-6", className)} {...props} />;
}

export { AppPageBody, AppPageHead, AppShell };

```
