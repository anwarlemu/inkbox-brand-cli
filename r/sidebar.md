# Sidebar
The console's rail: 288px of white with a hairline edge, the lockup, 38px rows with filled glyphs, purple group labels and a ruled foot; the lilac second rail for an agent's workspace.

Install: npx inkbox-ds add sidebar
Requires: theme, button, input, separator, sheet, skeleton, tooltip, utils
Packages: @chakra-ui/react, class-variance-authority, @phosphor-icons/react
Exports: Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupAction, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInput, SidebarInset, SidebarMenu, SidebarMenuAction, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, SidebarMenuSkeleton, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem, SidebarProvider, SidebarRail, SidebarSeparator, SidebarTrigger, useSidebar
Client boundary: yes
Reference: Figma 427:2715: the rail in Dashboard - empty state and every console screen; the second rail in Agent Workspace - Inbox


## Usage
Use for an app's main navigation. Wrap the app in SidebarProvider; put the lockup in SidebarHeader, groups of SidebarMenuButton rows (isActive on the current page, a filled Phosphor glyph first) in SidebarContent, and Help, the organization (SidebarMenuBadge with ADMIN) and the account in SidebarFooter; the page goes in SidebarInset. Use variant secondary for a second rail beside it (an agent's workspace), collapsible icon to let it narrow to its glyphs (rows then show their tooltip), and SidebarTrigger or Cmd B to toggle. On phones it opens in a sheet.
- Avoid: A dark or purple rail
- Avoid: Line glyphs in the rows
- Avoid: Bold or purple row labels
- Avoid: A purple pill for the current row
- Avoid: Animating the rail when the keyboard shortcut toggles it


## Examples
Example components: npx inkbox-ds add sidebar avatar badge
Example packages: @phosphor-icons/react
[Preview](https://inkbox-ds.vercel.app/preview/sidebar/Preview) | [Icons](https://inkbox-ds.vercel.app/preview/sidebar/Icons) | [SecondRail](https://inkbox-ds.vercel.app/preview/sidebar/SecondRail) | [Loading](https://inkbox-ds.vercel.app/preview/sidebar/Loading)

examples/sidebar.tsx

```tsx
"use client";

import * as React from "react";
import {
  AppleLogoIcon,
  ArrowsClockwiseIcon,
  ArrowsLeftRightIcon,
  BuildingOfficeIcon,
  CaretDownIcon,
  ChatTextIcon,
  CirclesThreeIcon,
  EnvelopeSimpleIcon,
  KeyIcon,
  NotepadIcon,
  PaperPlaneTiltIcon,
  PhoneIcon,
  ProhibitIcon,
  QuestionIcon,
  RobotIcon,
  SidebarSimpleIcon,
  SlidersHorizontalIcon,
  TerminalWindowIcon,
  TrayIcon,
  UsersIcon,
  VaultIcon,
  WarningIcon,
  WebhooksLogoIcon,
} from "@phosphor-icons/react/ssr";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

type Row = { title: string; icon: React.ComponentType<{ weight?: "fill" | "regular"; className?: string }>; weight?: "fill" | "regular"; beta?: boolean };

const TOP: Row[] = [
  { title: "Agent Workspace", icon: RobotIcon },
  { title: "Manage Agents", icon: CirclesThreeIcon },
  { title: "API Keys", icon: KeyIcon },
];
const CHANNELS: Row[] = [
  { title: "Email", icon: EnvelopeSimpleIcon },
  { title: "Phone", icon: PhoneIcon },
  { title: "iMessage", icon: AppleLogoIcon },
  { title: "Agent2Agent", icon: ArrowsLeftRightIcon, weight: "regular", beta: true },
];
const SHARED: Row[] = [
  { title: "Contacts", icon: UsersIcon },
  { title: "Notes", icon: NotepadIcon },
  { title: "Vault", icon: VaultIcon },
  { title: "Webhooks", icon: WebhooksLogoIcon, weight: "regular" },
];

function Rows({ rows, current, onSelect }: { rows: Row[]; current: string; onSelect: (title: string) => void }) {
  return (
    <SidebarMenu>
      {rows.map(({ title, icon: Icon, weight = "fill", beta }) => (
        <SidebarMenuItem key={title}>
          <SidebarMenuButton isActive={current === title} tooltip={title} onClick={() => onSelect(title)}>
            <Icon weight={weight} />
            <span>{title}</span>
            {beta && (
              <Badge variant="pink" className="ml-px">
                BETA
              </Badge>
            )}
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

function Lockup() {
  return (
    <div className="flex h-6 items-center gap-1.5 px-1">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-mark.png" alt="" width={28} height={28} className="size-7 shrink-0" />
      <svg viewBox="0 0 81.7305 18.6738" role="img" aria-label="Inkbox" fill="currentColor" className="h-4.5 w-auto text-ink group-data-[collapsible=icon]/sidebar:hidden">
        <path d="M41.5693 6.50098C41.8857 6.15243 42.2423 5.86128 42.6406 5.62695C43.4871 5.1291 44.4744 4.87988 45.6035 4.87988C46.8644 4.87993 47.9964 5.1613 49.001 5.72656C50.0057 6.29043 50.8028 7.08757 51.3916 8.11719C51.9801 9.1466 52.2763 10.3825 52.2764 11.7764C52.2764 13.1706 51.9803 14.3825 51.3916 15.4121C50.8029 16.4402 50.0056 17.2408 49.001 17.8135C47.9964 18.3861 46.8644 18.6738 45.6035 18.6738C44.4245 18.6738 43.412 18.4247 42.5654 17.9268C42.1202 17.6646 41.7294 17.329 41.3955 16.9219V18.4746H37.6855V0H41.5693V6.50098ZM60.8281 4.88184C62.2559 4.88189 63.5008 5.17593 64.6123 5.76465C65.7239 6.35342 66.5953 7.16375 67.2266 8.19336C67.8577 9.22291 68.1729 10.4178 68.1729 11.7783C68.1729 13.1388 67.8577 14.2883 67.2266 15.3252C66.5953 16.3621 65.7239 17.1813 64.6123 17.7773C63.5008 18.3748 62.2384 18.6738 60.8281 18.6738C59.4002 18.6738 58.1345 18.3748 57.0303 17.7773C55.926 17.1798 55.0546 16.3621 54.416 15.3252C53.7775 14.2883 53.458 13.1052 53.458 11.7783C53.458 10.4515 53.7775 9.24345 54.416 8.20508C55.0546 7.16814 55.926 6.35342 57.0303 5.76465C58.1345 5.17595 59.4002 4.88184 60.8281 4.88184ZM4.0332 18.4746H0V1.0459H4.0332V18.4746ZM14.3066 4.87988C15.3683 4.87994 16.3186 5.09144 17.1562 5.51465C17.9954 5.93791 18.6549 6.58469 19.1367 7.45605C19.6171 8.32746 19.8584 9.44366 19.8584 10.8057V18.4746H15.9746V11.4033C15.9746 10.3239 15.7367 9.52676 15.2637 9.0127C14.7907 8.4975 14.123 8.24127 13.2607 8.24121C12.6471 8.24121 12.0942 8.37065 11.6035 8.62695C11.1147 8.88467 10.7327 9.27832 10.459 9.80957C10.1851 10.3398 10.0488 11.0211 10.0488 11.8516V18.4746H6.16406V5.0791H9.87402V6.6709C10.2577 6.2418 10.7154 5.88666 11.2441 5.60254C12.1404 5.12074 13.1614 4.87988 14.3066 4.87988ZM25.5254 10.4619L31.2021 5.0791H35.833L30.2539 10.75L36.3311 18.4746H31.625L27.4014 13.2295L25.5254 15.0752V18.4746H21.6406V0H25.5254V10.4619ZM74.4883 8.99121L77.3984 5.0791H81.5312L76.5488 11.6309L81.7305 18.4746H77.3223L74.3896 14.3721L71.3477 18.4746H67.1152L72.2676 11.7188L67.2891 5.0791H71.6465L74.4883 8.99121ZM44.9307 8.06738C44.2835 8.06742 43.7025 8.21694 43.1885 8.51562C42.6729 8.8144 42.2666 9.2374 41.9678 9.78516C41.6691 10.3328 41.5196 11.0136 41.5195 11.7764C41.5195 12.5394 41.669 13.2008 41.9678 13.7559C42.2665 14.3123 42.673 14.7393 43.1885 15.0381C43.7025 15.3368 44.2835 15.4863 44.9307 15.4863C45.578 15.4863 46.1534 15.3368 46.6602 15.0381C47.1669 14.7393 47.5733 14.3123 47.8809 13.7559C48.1884 13.2008 48.3418 12.557 48.3418 11.7764C48.3417 10.9961 48.1883 10.3328 47.8809 9.78516C47.5733 9.2374 47.1669 8.8144 46.6602 8.51562C46.1534 8.2169 45.578 8.06738 44.9307 8.06738ZM60.8281 8.06543C60.1808 8.06543 59.599 8.21493 59.085 8.51367C58.5709 8.81241 58.1591 9.23554 57.8516 9.7832C57.544 10.331 57.3906 10.9948 57.3906 11.7754C57.3906 12.556 57.544 13.1993 57.8516 13.7559C58.1591 14.3123 58.5695 14.7379 59.085 15.0381C59.599 15.3369 60.1808 15.4863 60.8281 15.4863C61.4753 15.4863 62.0564 15.3368 62.5703 15.0381C63.0844 14.7393 63.4922 14.3124 63.791 13.7559C64.0898 13.1993 64.2393 12.5399 64.2393 11.7754C64.2393 11.0109 64.0898 10.331 63.791 9.7832C63.4922 9.23548 63.0844 8.81243 62.5703 8.51367C62.0564 8.21505 61.4752 8.06549 60.8281 8.06543Z" />
      </svg>
    </div>
  );
}

function CollapseRow() {
  const { toggleSidebar, state } = useSidebar();
  return (
    <SidebarMenuItem>
      <SidebarMenuButton tooltip="Expand" onClick={toggleSidebar} aria-expanded={state === "expanded"}>
        <SidebarSimpleIcon weight="fill" />
        <span>{state === "expanded" ? "Collapse" : "Expand"}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function ConsoleRail({ collapsible = "offcanvas" }: { collapsible?: "offcanvas" | "icon" | "none" }) {
  const [current, setCurrent] = React.useState("Agent Workspace");
  return (
    <Sidebar collapsible={collapsible}>
      <SidebarHeader className="px-4 py-5">
        <Lockup />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <Rows rows={TOP} current={current} onSelect={setCurrent} />
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Channels</SidebarGroupLabel>
          <SidebarGroupContent>
            <Rows rows={CHANNELS} current={current} onSelect={setCurrent} />
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Shared</SidebarGroupLabel>
          <SidebarGroupContent>
            <Rows rows={SHARED} current={current} onSelect={setCurrent} />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Help">
              <QuestionIcon weight="fill" />
              <span>Help</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="My Organisation">
              <BuildingOfficeIcon weight="fill" />
              <span>My Organisation</span>
            </SidebarMenuButton>
            <SidebarMenuBadge>ADMIN</SidebarMenuBadge>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Robert Ligthart">
              <Avatar size="sm" className="m-px size-5">
                <AvatarFallback className="text-body-sm">R</AvatarFallback>
              </Avatar>
              <span className="ml-0.5">Robert Ligthart</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {collapsible === "icon" && <CollapseRow />}
          {collapsible !== "icon" && (
            <SidebarMenuItem>
              <SidebarMenuButton>
                <SidebarSimpleIcon weight="fill" />
                <span>Collapse</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function PageHead({ title, description }: { title: string; description: string }) {
  return (
    <header className="flex items-start gap-3 border-b border-line-subtle px-6 py-4">
      <SidebarTrigger className="-ml-2 md:hidden" />
      <div>
        <h1 className="text-h3 leading-heading font-normal text-fg">{title}</h1>
        <p className="text-body text-fg-muted">{description}</p>
      </div>
    </header>
  );
}

export function Preview() {
  return (
    <SidebarProvider className="h-270 min-h-0 overflow-hidden rounded-panel border border-line-subtle">
      <ConsoleRail />
      <SidebarInset>
        <PageHead title="Vault" description="Zero-knowledge encrypted secret store for your agents." />
      </SidebarInset>
    </SidebarProvider>
  );
}

export function Icons() {
  return (
    <SidebarProvider defaultOpen={false} className="h-270 min-h-0 overflow-hidden rounded-panel border border-line-subtle">
      <ConsoleRail collapsible="icon" />
      <SidebarInset>
        <PageHead title="Agent Workspace" description="Press Cmd B, or Collapse, to switch between the full rail and its glyphs." />
      </SidebarInset>
    </SidebarProvider>
  );
}

const WORKSPACE: { label: string; action?: boolean; rows: Row[] }[] = [
  { label: "Email", action: true, rows: [{ title: "Inkbox", icon: TrayIcon }, { title: "Sent", icon: PaperPlaneTiltIcon }, { title: "Spam", icon: WarningIcon }, { title: "Blocked", icon: ProhibitIcon, weight: "regular" }] },
  { label: "Phone", rows: [{ title: "Calls", icon: PhoneIcon }, { title: "Texts", icon: ChatTextIcon }, { title: "iMessage ", icon: AppleLogoIcon }, { title: "Blocked ", icon: ProhibitIcon, weight: "regular" }] },
  { label: "Agent2Agent", action: true, rows: [{ title: "Sessions", icon: ArrowsClockwiseIcon, weight: "regular" }] },
  { label: "Tunnel", rows: [{ title: "Tunnel", icon: ArrowsLeftRightIcon, weight: "regular" }] },
  { label: "Other", rows: [{ title: "Contacts", icon: UsersIcon }, { title: "Notes", icon: NotepadIcon }, { title: "Vault", icon: VaultIcon }] },
];

export function SecondRail() {
  const [current, setCurrent] = React.useState("Inkbox");
  return (
    <SidebarProvider className="h-270 min-h-0 overflow-hidden rounded-panel border border-line-subtle">
      <Sidebar variant="secondary" collapsible="none">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton aria-haspopup="menu">
                <Avatar size="sm" className="m-px size-5">
                  <AvatarFallback className="text-body-sm">A</AvatarFallback>
                </Avatar>
                <span className="ml-0.5 flex-1">@acme</span>
                <CaretDownIcon weight="bold" className="size-4 text-fg" />
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <Rows rows={[{ title: "Quickstart", icon: TerminalWindowIcon }]} current={current} onSelect={setCurrent} />
          </SidebarGroup>
          {WORKSPACE.map((group) => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              {group.action && (
                <SidebarGroupAction aria-label={`${group.label} settings`}>
                  <SlidersHorizontalIcon weight="fill" />
                </SidebarGroupAction>
              )}
              <SidebarGroupContent>
                <Rows rows={group.rows} current={current} onSelect={setCurrent} />
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <PageHead title="Inbox" description="acme@inkboxmail.com" />
      </SidebarInset>
    </SidebarProvider>
  );
}

export function Loading() {
  return (
    <SidebarProvider className="h-120 min-h-0 overflow-hidden rounded-panel border border-line-subtle">
      <Sidebar collapsible="none">
        <SidebarHeader className="px-4 py-5">
          <Lockup />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Channels</SidebarGroupLabel>
            <SidebarMenu>
              {Array.from({ length: 5 }, (_, i) => (
                <SidebarMenuItem key={i}>
                  <SidebarMenuSkeleton showIcon />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <PageHead title="Email" description="Loading mailboxes" />
      </SidebarInset>
    </SidebarProvider>
  );
}

```

## Source

components/ui/sidebar.tsx

```tsx
"use client";

import * as React from "react";
import { chakra } from "@chakra-ui/react";
import { cva, type VariantProps } from "class-variance-authority";
import { SidebarSimpleIcon } from "@phosphor-icons/react/ssr";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// The console's rail (Figma 427:2715: Dashboard - empty state, Agent Workspace - Inbox). The rail is 288px of white
// with a 1px #F3F1F5 edge; a 64px head holds the lockup 16px in. Rows are 38px with 8px corners on a 40px pitch, 12px in
// from the rail's sides: a filled glyph (the design's 22px, Phosphor's 24px) and a 14px regular ink label at 44px; the
// current row sits on the lilac. A labeled group starts 12px below the last one with a 13px purple label 16px in and its
// rows 8px under it; a group's action (the sliders glyph) sits 16px from the rail's right edge. The foot is ruled off
// above. `secondary` is the agent workspace's second rail: lilac, with the current row in white. Collapsing to icons
// narrows the rail to 63px (200ms, the strong ease-out); the keyboard shortcut toggles it instantly.
const SIDEBAR_WIDTH = "var(--ds-layout-rail)";
const SIDEBAR_WIDTH_ICON = "calc(var(--ds-space-9-5) + var(--ds-space-6) + 1px)";
const SIDEBAR_KEYBOARD_SHORTCUT = "b";
const MOBILE_QUERY = "(max-width: 767px)";

type SidebarContextProps = {
  state: "expanded" | "collapsed";
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  instant: boolean;
  toggleSidebar: () => void;
};

const SidebarContext = React.createContext<SidebarContextProps | null>(null);

function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) throw new Error("useSidebar must be used within a SidebarProvider.");
  return context;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const query = window.matchMedia(MOBILE_QUERY);
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return isMobile;
}

/**
 * Holds whether the rail is open (expanded or collapsed on a desktop, shown in a sheet on a phone). Uncontrolled with
 * `defaultOpen`, or controlled with `open` and `onOpenChange`. Nothing is stored: keep the state yourself if it should
 * survive a reload. Cmd or Ctrl and B toggles it.
 */
function SidebarProvider({ defaultOpen = true, open: openProp, onOpenChange: setOpenProp, className, style, children, ...props }: React.ComponentProps<"div"> & { defaultOpen?: boolean; open?: boolean; onOpenChange?: (open: boolean) => void }) {
  const isMobile = useIsMobile();
  const [openMobile, setOpenMobile] = React.useState(false);
  const [instant, setInstant] = React.useState(false);
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const open = openProp ?? internalOpen;
  const setOpen = React.useCallback(
    (value: boolean | ((value: boolean) => boolean)) => {
      const next = typeof value === "function" ? value(open) : value;
      if (setOpenProp) setOpenProp(next);
      else setInternalOpen(next);
    },
    [setOpenProp, open],
  );
  const toggleSidebar = React.useCallback(() => {
    setInstant(false);
    return isMobile ? setOpenMobile((o) => !o) : setOpen((o) => !o);
  }, [isMobile, setOpen]);

  React.useEffect(() => {
    // A shortcut is pressed many times a day: it changes the rail at once, with no motion.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== SIDEBAR_KEYBOARD_SHORTCUT || !(event.metaKey || event.ctrlKey)) return;
      event.preventDefault();
      setInstant(true);
      if (isMobile) setOpenMobile((o) => !o);
      else setOpen((o) => !o);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isMobile, setOpen]);

  const state = open ? "expanded" : "collapsed";
  const value = React.useMemo<SidebarContextProps>(() => ({ state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar, instant }), [state, open, setOpen, isMobile, openMobile, toggleSidebar, instant]);

  return (
    <SidebarContext.Provider value={value}>
      <TooltipProvider delayDuration={0}>
        <div
          data-slot="sidebar-wrapper"
          data-instant={instant || undefined}
          style={{ "--sidebar-width": SIDEBAR_WIDTH, "--sidebar-width-icon": SIDEBAR_WIDTH_ICON, ...style } as React.CSSProperties}
          className={cn("group/sidebar-wrapper flex min-h-svh w-full has-data-[variant=inset]:bg-subtle", className)}
          {...props}
        >
          {children}
        </div>
      </TooltipProvider>
    </SidebarContext.Provider>
  );
}

/**
 * The rail. `variant`: sidebar (the console's white rail), secondary (the lilac second rail), floating (a white panel
 * with Shadow/S, 8px from the edges) or inset (the rail on the lilac with the page as a raised white panel beside it).
 * `collapsible`: offcanvas (slides away), icon (narrows to its glyphs) or none.
 */
function Sidebar({
  side = "left",
  variant = "sidebar",
  collapsible = "offcanvas",
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & { side?: "left" | "right"; variant?: "sidebar" | "secondary" | "floating" | "inset"; collapsible?: "offcanvas" | "icon" | "none" }) {
  const { isMobile, state, openMobile, setOpenMobile, instant } = useSidebar();
  const ground = variant === "secondary" || variant === "inset" ? "bg-subtle" : "bg-surface";

  if (collapsible === "none") {
    return (
      <div data-slot="sidebar" data-variant={variant} className={cn("group/sidebar flex h-full w-(--sidebar-width) flex-col text-fg", ground, variant === "sidebar" && "border-r border-line-subtle", className)} {...props}>
        {children}
      </div>
    );
  }

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent instant={instant} data-slot="sidebar" data-sidebar="sidebar" data-mobile="true" data-variant={variant} side={side} showCloseButton={false} className={cn("group/sidebar w-(--ds-layout-rail) max-w-[calc(100vw-var(--ds-space-12))] p-0 text-fg sm:max-w-(--ds-layout-rail) [&>button]:hidden", ground)}>
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
            <SheetDescription>The app's sections and settings.</SheetDescription>
          </SheetHeader>
          <div className="flex h-full w-full flex-col">{children}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div
      data-slot="sidebar"
      data-state={state}
      data-collapsible={state === "collapsed" ? collapsible : ""}
      data-variant={variant}
      data-side={side}
      className="group/sidebar peer hidden shrink-0 text-fg md:block"
    >
      {/* Holds the rail's room in the row, so the page beside it moves as it opens and closes. */}
      <div
        data-slot="sidebar-gap"
        className={cn(
          "relative h-full w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-out group-data-[collapsible=offcanvas]/sidebar:w-0 group-data-[collapsible=icon]/sidebar:w-(--sidebar-width-icon) in-data-[instant=true]:transition-none motion-reduce:transition-none",
          (variant === "floating" || variant === "inset") && "group-data-[collapsible=icon]/sidebar:w-[calc(var(--sidebar-width-icon)+var(--ds-space-4))]",
        )}
      >
        <div
          data-slot="sidebar-container"
          className={cn(
            "sticky top-0 z-10 flex h-svh max-h-full w-(--sidebar-width) overflow-hidden transition-[translate,width] duration-200 ease-out in-data-[instant=true]:transition-none motion-reduce:transition-none",
            side === "left" ? "left-0 group-data-[collapsible=offcanvas]/sidebar:-translate-x-full" : "ml-auto group-data-[collapsible=offcanvas]/sidebar:translate-x-full",
            variant === "floating" || variant === "inset" ? "p-2 group-data-[collapsible=icon]/sidebar:w-[calc(var(--sidebar-width-icon)+var(--ds-space-4))]" : "group-data-[collapsible=icon]/sidebar:w-(--sidebar-width-icon)",
            variant === "sidebar" && (side === "left" ? "border-r border-line-subtle" : "border-l border-line-subtle"),
            className,
          )}
          {...props}
        >
          <div data-sidebar="sidebar" data-slot="sidebar-inner" className={cn("flex h-full w-full flex-col", ground, variant === "floating" && "rounded-panel shadow-s")}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarTrigger({ className, onClick, ...props }: React.ComponentProps<typeof Button>) {
  const { toggleSidebar, open, isMobile, openMobile } = useSidebar();
  return (
    <Button
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      variant="ghost"
      size="icon"
      aria-expanded={isMobile ? openMobile : open}
      className={cn("text-icon-default", className)}
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      {...props}
    >
      <SidebarSimpleIcon weight="fill" className="size-6" />
      <span className="sr-only">Toggle the rail</span>
    </Button>
  );
}

/** A thin strip along the rail's edge that toggles it, with a 2px line in the field edge color under the pointer. */
function SidebarRail({ className, ...props }: React.ComponentProps<"button">) {
  const { toggleSidebar } = useSidebar();
  return (
    <button
      data-sidebar="rail"
      data-slot="sidebar-rail"
      aria-label="Toggle the rail"
      tabIndex={-1}
      onClick={toggleSidebar}
      title="Toggle the rail"
      className={cn(
        "absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 outline-none after:absolute after:inset-y-0 after:left-1/2 after:w-0.5 after:bg-transparent after:transition-colors after:duration-150 after:ease-out hover:after:bg-line-field sm:flex",
        "in-data-[side=left]:-right-4 in-data-[side=left]:cursor-w-resize in-data-[side=right]:left-0 in-data-[side=right]:cursor-e-resize",
        "[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize",
        className,
      )}
      {...props}
    />
  );
}

/** The page beside the rail. With the inset rail it becomes a raised white panel with Shadow/S and 10px corners. */
function SidebarInset({ className, ...props }: React.ComponentProps<"main">) {
  return (
    <main
      data-slot="sidebar-inset"
      className={cn("relative flex w-full min-w-0 flex-1 flex-col bg-surface", "md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-panel md:peer-data-[variant=inset]:shadow-s", className)}
      {...props}
    />
  );
}

function SidebarInput({ className, ...props }: React.ComponentProps<typeof Input>) {
  return <Input data-slot="sidebar-input" data-sidebar="input" className={cn("h-9 bg-surface", className)} {...props} />;
}

/** The rail's 64px head: the lockup 16px in, or the second rail's agent switcher. */
function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sidebar-header" data-sidebar="header" className={cn("flex min-h-16 shrink-0 flex-col justify-center gap-2 px-3 py-3", className)} {...props} />;
}

/** The rail's foot (Help, the organization, the account, Collapse), ruled off above. */
function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sidebar-footer" data-sidebar="footer" className={cn("flex shrink-0 flex-col gap-0.5 border-t border-line-subtle p-3", className)} {...props} />;
}

function SidebarSeparator({ className, ...props }: React.ComponentProps<typeof Separator>) {
  return <Separator data-slot="sidebar-separator" data-sidebar="separator" className={cn("mx-3 w-auto", className)} {...props} />;
}

function SidebarContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-content"
      data-sidebar="content"
      className={cn("flex min-h-0 flex-1 flex-col overflow-auto overscroll-contain [scrollbar-width:none] group-data-[collapsible=icon]/sidebar:overflow-hidden", className)}
      {...props}
    />
  );
}

/** A group of rows. A labeled group keeps 12px above and below it; an unlabeled one (the rows under the head) none. */
function SidebarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sidebar-group" data-sidebar="group" className={cn("relative flex w-full min-w-0 flex-col px-3 py-3 [&:not(:has(>[data-slot=sidebar-group-label]))]:py-0", className)} {...props} />;
}

/** A group's 13px purple label, 16px in from the rail; it folds away when the rail is narrowed to its glyphs. */
function SidebarGroupLabel({ className, asChild = false, ...props }: React.ComponentProps<"div"> & { asChild?: boolean }) {
  const Comp = asChild ? chakra.div : "div";
  // Chakra's factory renders its child in its place only when told to.
  const slotProps = asChild ? { asChild: true } : {};
  return (
    <Comp {...slotProps}
      data-slot="sidebar-group-label"
      data-sidebar="group-label"
      className={cn(
        "mb-2 flex h-4 shrink-0 items-center px-1 font-sans text-body-sm leading-4 whitespace-nowrap text-fg-label outline-none transition-[margin,opacity] duration-200 ease-out focus-visible:outline-2 focus-visible:outline-focus-ring group-data-[collapsible=icon]/sidebar:-mt-4 group-data-[collapsible=icon]/sidebar:opacity-0 motion-reduce:transition-none [&>svg]:size-4 [&>svg]:shrink-0",
        className,
      )}
      {...props}
    />
  );
}

/** A group's action beside its label (the sliders glyph by Email and Agent2Agent): a 16px glyph, 16px from the edge. */
function SidebarGroupAction({ className, asChild = false, ...props }: React.ComponentProps<"button"> & { asChild?: boolean }) {
  const Comp = asChild ? chakra.button : "button";
  // Chakra's factory renders its child in its place only when told to.
  const slotProps = asChild ? { asChild: true } : {};
  return (
    <Comp {...slotProps}
      data-slot="sidebar-group-action"
      data-sidebar="group-action"
      className={cn(
        "absolute top-2 right-3 flex size-6 cursor-pointer items-center justify-center rounded-pill text-icon-secondary outline-none active:brightness-95 active:transition-none transition-colors duration-150 ease-out hover:bg-subtle-hover active:bg-subtle-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-focus-ring group-data-[collapsible=icon]/sidebar:hidden motion-reduce:transition-none [&>svg]:size-4.5 [&>svg]:shrink-0 after:absolute after:-inset-2 md:after:hidden",
        className,
      )}
      {...props}
    />
  );
}

function SidebarGroupContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sidebar-group-content" data-sidebar="group-content" className={cn("w-full", className)} {...props} />;
}

function SidebarMenu({ className, ...props }: React.ComponentProps<"ul">) {
  return <ul data-slot="sidebar-menu" data-sidebar="menu" className={cn("flex w-full min-w-0 flex-col gap-0.5", className)} {...props} />;
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<"li">) {
  return <li data-slot="sidebar-menu-item" data-sidebar="menu-item" className={cn("group/menu-item relative", className)} {...props} />;
}

// A row: the glyph sits 11px in (Phosphor's 24px box puts its center where the design's 22px glyph at 12px has it), the
// label 9px after it, at the design's 44px. Hover washes the row; the current row takes the lilac (white on the lilac
// rail). Narrowed to icons, the row is a 38px square around its glyph.
const sidebarMenuButtonVariants = cva(
  "peer/menu-button active:brightness-95 active:transition-none flex w-full cursor-pointer items-center gap-2.25 overflow-hidden rounded-pill pr-3 pl-2.75 text-left font-sans text-fg outline-none transition-[background-color,color] duration-150 ease-out group-has-data-[sidebar=menu-action]/menu-item:pr-9 group-data-[collapsible=icon]/sidebar:size-9.5! group-data-[collapsible=icon]/sidebar:justify-center group-data-[collapsible=icon]/sidebar:p-0! group-data-[collapsible=icon]/sidebar:[&>span:not([data-slot=avatar])]:sr-only focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-subtle group-data-[variant=secondary]/sidebar:data-[active=true]:bg-surface group-data-[variant=inset]/sidebar:data-[active=true]:bg-surface data-[state=open]:bg-subtle motion-reduce:transition-none [&>span:last-child]:truncate [&>svg]:shrink-0 [&>svg:not([class*='size-'])]:size-6",
  {
    variants: {
      variant: {
        default: "hover:bg-subtle group-data-[variant=secondary]/sidebar:hover:bg-subtle-hover group-data-[variant=secondary]/sidebar:data-[active=true]:hover:bg-surface group-data-[variant=inset]/sidebar:hover:bg-subtle-hover",
        outline: "bg-surface shadow-s hover:bg-subtle",
      },
      size: {
        default: "h-9.5 text-body leading-tight",
        sm: "h-8 text-body-sm leading-tight [&>svg:not([class*='size-'])]:size-5",
        lg: "h-12 text-body leading-tight group-data-[collapsible=icon]/sidebar:p-0!",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function SidebarMenuButton({
  asChild = false,
  isActive = false,
  variant = "default",
  size = "default",
  tooltip,
  className,
  ...props
}: React.ComponentProps<"button"> & { asChild?: boolean; isActive?: boolean; tooltip?: string | React.ComponentProps<typeof TooltipContent> } & VariantProps<typeof sidebarMenuButtonVariants>) {
  const Comp = asChild ? chakra.button : "button";
  // Chakra's factory renders its child in its place only when told to.
  const slotProps = asChild ? { asChild: true } : {};
  const { isMobile, state } = useSidebar();
  // The tooltip names a row only while the rail shows glyphs alone; otherwise it stays shut, so it never catches Escape.
  const [tipOpen, setTipOpen] = React.useState(false);
  const showTip = state === "collapsed" && !isMobile;
  const button = (
    <Comp {...slotProps}
      data-slot="sidebar-menu-button"
      data-sidebar="menu-button"
      data-size={size}
      data-active={isActive || undefined}
      aria-current={isActive ? "page" : undefined}
      className={cn(sidebarMenuButtonVariants({ variant, size }), className)}
      {...props}
    />
  );
  if (!tooltip) return button;
  const content = typeof tooltip === "string" ? { children: tooltip } : tooltip;
  return (
    <Tooltip open={showTip && tipOpen} onOpenChange={setTipOpen}>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right" align="center" {...content} />
    </Tooltip>
  );
}

/** An action at a row's right end (a row's more glyph). `showOnHover` keeps it hidden until the row is hovered or open. */
function SidebarMenuAction({ className, asChild = false, showOnHover = false, ...props }: React.ComponentProps<"button"> & { asChild?: boolean; showOnHover?: boolean }) {
  const Comp = asChild ? chakra.button : "button";
  // Chakra's factory renders its child in its place only when told to.
  const slotProps = asChild ? { asChild: true } : {};
  return (
    <Comp {...slotProps}
      data-slot="sidebar-menu-action"
      data-sidebar="menu-action"
      className={cn(
        "absolute top-1.25 right-1.5 flex size-7 cursor-pointer items-center justify-center rounded-pill text-icon-secondary outline-none active:brightness-95 active:transition-none transition-[background-color,color,opacity] duration-150 ease-out hover:bg-subtle-hover active:bg-subtle-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-focus-ring group-data-[collapsible=icon]/sidebar:hidden motion-reduce:transition-none [&>svg]:size-5 [&>svg]:shrink-0 after:absolute after:-inset-2 md:after:hidden",
        "peer-data-[size=sm]/menu-button:top-0.5 peer-data-[size=lg]/menu-button:top-2.5",
        showOnHover && "group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100 peer-data-[active=true]/menu-button:text-fg md:opacity-0",
        className,
      )}
      {...props}
    />
  );
}

/**
 * A mark at a row's right end, 12px in (ADMIN by My Organisation): the pink edge, pill corners and 12px pink text.
 * `count` is a quiet 13px number instead (unread mail). For a mark right after the label (BETA by Agent2Agent), put a
 * Badge with variant pink inside the row's button.
 */
function SidebarMenuBadge({ className, variant = "mark", ...props }: React.ComponentProps<"div"> & { variant?: "mark" | "count" }) {
  return (
    <div
      data-slot="sidebar-menu-badge"
      data-sidebar="menu-badge"
      className={cn(
        "pointer-events-none absolute top-2 right-3 flex h-5.5 items-center justify-center font-sans whitespace-nowrap select-none group-data-[collapsible=icon]/sidebar:hidden",
        "peer-data-[size=sm]/menu-button:top-1.25 peer-data-[size=lg]/menu-button:top-3.25",
        variant === "mark" ? "rounded-pill border border-pink bg-surface px-1.5 pt-px text-caption leading-none text-pink" : "min-w-5 px-1 text-body-sm text-fg-muted tabular-nums",
        className,
      )}
      {...props}
    />
  );
}

/** A row's placeholder while the rail loads: a glyph circle and a label of varying width on the lilac. */
function SidebarMenuSkeleton({ className, showIcon = false, ...props }: React.ComponentProps<"div"> & { showIcon?: boolean }) {
  // A width between 50 and 90 percent that differs from row to row but is the same on the server and in the browser.
  const id = React.useId();
  const width = `${50 + (([...id].reduce((sum, c) => (sum * 31 + c.charCodeAt(0)) % 997, 7) % 41))}%`;
  return (
    <div data-slot="sidebar-menu-skeleton" data-sidebar="menu-skeleton" className={cn("flex h-9.5 items-center gap-2.25 rounded-pill pr-3 pl-2.75", className)} {...props}>
      {showIcon && <Skeleton className="size-5.5 rounded-pill" data-sidebar="menu-skeleton-icon" />}
      <Skeleton className="h-3.5 max-w-(--skeleton-width) flex-1 rounded-xs" data-sidebar="menu-skeleton-text" style={{ "--skeleton-width": width } as React.CSSProperties} />
    </div>
  );
}

/** Rows nested under a row, hung from a hairline under the parent's glyph. */
function SidebarMenuSub({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="sidebar-menu-sub"
      data-sidebar="menu-sub"
      className={cn("mx-5.5 mt-0.5 flex min-w-0 flex-col gap-0.5 border-l border-line-subtle py-0.5 pl-2.5 group-data-[collapsible=icon]/sidebar:hidden", className)}
      {...props}
    />
  );
}

function SidebarMenuSubItem({ className, ...props }: React.ComponentProps<"li">) {
  return <li data-slot="sidebar-menu-sub-item" data-sidebar="menu-sub-item" className={cn("group/menu-sub-item relative", className)} {...props} />;
}

function SidebarMenuSubButton({ asChild = false, size = "md", isActive = false, className, ...props }: React.ComponentProps<"a"> & { asChild?: boolean; size?: "sm" | "md"; isActive?: boolean }) {
  const Comp = asChild ? chakra.a : "a";
  // Chakra's factory renders its child in its place only when told to.
  const slotProps = asChild ? { asChild: true } : {};
  return (
    <Comp {...slotProps}
      data-slot="sidebar-menu-sub-button"
      data-sidebar="menu-sub-button"
      data-size={size}
      data-active={isActive || undefined}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex h-8 min-w-0 cursor-pointer items-center gap-2 overflow-hidden rounded-pill px-2.5 font-sans text-fg-secondary outline-none active:brightness-95 active:transition-none transition-[background-color,color] duration-150 ease-out hover:bg-subtle active:bg-subtle hover:text-fg focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-subtle data-[active=true]:text-fg group-data-[variant=secondary]/sidebar:hover:bg-subtle-hover group-data-[variant=secondary]/sidebar:data-[active=true]:bg-surface motion-reduce:transition-none [&>span:last-child]:truncate [&>svg]:size-5 [&>svg]:shrink-0",
        size === "sm" ? "text-body-sm" : "text-body",
        className,
      )}
      {...props}
    />
  );
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
};

```
