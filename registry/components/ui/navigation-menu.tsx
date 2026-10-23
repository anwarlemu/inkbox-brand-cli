"use client";

import * as React from "react";
import { NavigationMenu as NavigationMenuPrimitive } from "radix-ui";
import { CaretDownIcon } from "@phosphor-icons/react/ssr";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Site navigation with panels, extrapolated from the console's nav rows (Figma 427:2715: Agent Workspace, Manage
// Agents): triggers and links are 38px rows with 8px corners, 12px of side padding and a 14px regular ink label, the
// lilac under the pointer and under an open trigger; the trigger's 16px caret turns over when open (on-screen motion,
// 200ms in-out). The panel opens below in a raised white viewport (8px corners, the floating shadow) that grows from
// 96 percent with a fade and resizes to each panel (centered under the menu on phones, at its start from 768px); links inside are nav rows with a 14px title and a 14px muted line.
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
  "group inline-flex h-9.5 w-max items-center justify-center gap-1.5 rounded-control px-3 font-sans text-body leading-tight text-fg outline-none transition-colors duration-150 ease-out hover:bg-subtle focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-subtle data-[state=open]:bg-subtle motion-reduce:transition-none [&_svg:not([class*='size-'])]:size-5.5",
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
        "group-data-[viewport=false]/navigation-menu:top-full group-data-[viewport=false]/navigation-menu:mt-1.5 group-data-[viewport=false]/navigation-menu:overflow-hidden group-data-[viewport=false]/navigation-menu:rounded-control group-data-[viewport=false]/navigation-menu:bg-surface group-data-[viewport=false]/navigation-menu:shadow-floating group-data-[viewport=false]/navigation-menu:data-[state=closed]:animate-pop-out group-data-[viewport=false]/navigation-menu:data-[state=open]:animate-pop-in",
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
          "relative mt-1.5 h-(--radix-navigation-menu-viewport-height) w-(--radix-navigation-menu-viewport-width) max-w-[calc(100vw-2rem)] origin-top md:origin-top-left overflow-hidden rounded-control bg-surface text-fg shadow-floating transition-[width,height] duration-200 ease-out data-[state=closed]:animate-pop-out data-[state=open]:animate-pop-in motion-reduce:transition-none",
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
