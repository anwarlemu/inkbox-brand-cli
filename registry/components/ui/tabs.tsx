"use client";

import * as React from "react";
import { Tabs as TabsPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

// The console's tabs (Email: Mailboxes, Contact rules, Custom domains; Login and Sign up): a 42px lilac track with
// fully rounded corners and a 2px inset, 38px tabs 8px apart with 9px of side padding and a 14px medium ink label. The selected
// tab is a white key with fully rounded corners and Shadow/S. `full` stretches the tabs to share the track (Login, Sign up).
// Switching is instant: tabs are used many times a day, and the white key moving would only slow the eye.
function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn("flex flex-col gap-4", className)} {...props} />;
}

function TabsList({ className, full = false, ...props }: React.ComponentProps<typeof TabsPrimitive.List> & { full?: boolean }) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-full={full ? "true" : undefined}
      className={cn("inline-flex h-10.5 w-fit max-w-full items-center gap-2 overflow-x-auto rounded-pill bg-subtle p-0.5 [scrollbar-width:none]", full && "flex w-full", className)}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex h-9.5 shrink-0 items-center justify-center gap-2 rounded-pill px-2.25 font-sans text-body leading-tight font-medium whitespace-nowrap text-fg outline-none active:brightness-95 active:transition-none transition-[background-color,box-shadow,color] duration-150 ease-out hover:text-fg-brand focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring disabled:pointer-events-none disabled:text-fg-muted data-[state=active]:bg-surface data-[state=active]:shadow-s data-[state=active]:hover:text-fg motion-reduce:transition-none in-data-[full=true]:flex-1 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5.5",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content data-slot="tabs-content" className={cn("min-w-0 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring", className)} {...props} />;
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
