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
