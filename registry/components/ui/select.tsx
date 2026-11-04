"use client";

import * as React from "react";
import { Select as SelectPrimitive } from "radix-ui";
import { CaretDownIcon, CaretUpIcon, CheckIcon } from "@phosphor-icons/react/ssr";

import { usePortalContainer } from "@/lib/surface";
import { cn } from "@/lib/utils";

// The console's select (its Select and Figma 427:2715, Create Agent Identity: "Any State" under Phone Number): a white
// 40px pill with the Shadow/S ring instead of an edge, the value in 14px regular ink 14px in, and a 16px bold caret 8px
// after it and 12px from the right that turns over while the list is open. The placeholder is the light purple; hover
// changes nothing; focus adds the soft ring; disabled sits on the lilac with muted text and no ring. `size="sm"` is
// 36px. The list is the console's menu, 8px from the trigger: white, 16px corners, the floating shadow, 4px inside, at
// least the trigger's width and at most 360px wide and 320px tall. Rows are 36px with 12px corners and sides, 4px apart,
// 14px ink, truncated; the highlighted row turns lilac at once and the chosen one ends in a 16px bold purple check 12px
// after its label. Group labels are 12px purple. The list grows from the trigger (opacity and scale from 0.98 over
// 160ms) and leaves in 100ms.
function Select(props: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />;
}

function SelectGroup({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot="select-group" className={cn("scroll-my-1", className)} {...props} />;
}

function SelectValue(props: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

function SelectTrigger({ className, size = "default", children, ...props }: React.ComponentProps<typeof SelectPrimitive.Trigger> & { size?: "sm" | "default" }) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "group/select-trigger flex w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-pill bg-surface pr-3 pl-[calc(var(--spacing)*3.5)] font-sans text-body leading-tight font-normal whitespace-nowrap text-fg shadow-s outline-none transition-[box-shadow] duration-fast ease-out focus-visible:shadow-[var(--ds-shadow-s),var(--ds-shadow-focus)] disabled:cursor-not-allowed disabled:bg-subtle disabled:text-fg-muted disabled:shadow-none aria-invalid:shadow-[0_0_0_1px_var(--ds-color-status-danger)] data-placeholder:text-fg-subtle data-[size=default]:h-10 data-[size=sm]:h-9 motion-reduce:transition-none *:data-[slot=select-value]:flex *:data-[slot=select-value]:min-w-0 *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 *:data-[slot=select-value]:truncate [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5.5",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <CaretDownIcon weight="bold" className="size-4 text-current transition-transform duration-slow ease-out group-data-[state=open]/select-trigger:rotate-180 motion-reduce:transition-none" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({ className, children, position = "popper", align = "center", sideOffset = 8, ...props }: React.ComponentProps<typeof SelectPrimitive.Content>) {
  const container = usePortalContainer();
  return (
    <SelectPrimitive.Portal container={container}>
      <SelectPrimitive.Content
        data-slot="select-content"
        className={cn(
          "relative z-50 max-h-[min(--spacing(80),var(--radix-select-content-available-height))] max-w-90 min-w-36 origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-panel bg-surface text-fg shadow-floating data-[state=closed]:animate-pop-out data-[state=open]:animate-pop-in motion-reduce:animate-none",
          position === "popper" && "w-full min-w-(--radix-select-trigger-width)",
          className,
        )}
        position={position}
        align={align}
        sideOffset={position === "popper" ? sideOffset : undefined}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport data-position={position} className={cn("flex flex-col gap-1 p-1 *:data-[slot=select-group]:flex *:data-[slot=select-group]:flex-col *:data-[slot=select-group]:gap-1", position === "popper" && "h-(--radix-select-trigger-height) w-full min-w-(--radix-select-trigger-width) scroll-my-1")}>
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

function SelectLabel({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return <SelectPrimitive.Label data-slot="select-label" className={cn("mx-3 my-1 font-sans text-caption leading-line-caption font-normal text-fg-brand", className)} {...props} />;
}

function SelectItem({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex h-9 w-full shrink-0 cursor-default items-center gap-3 rounded-control px-3 font-sans text-body leading-tight font-normal text-fg outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-subtle-hover [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5.5 [&_svg:not([class*='text-'])]:text-icon-secondary",
        className,
      )}
      {...props}
    >
      {/* Radix drops ItemText's className, so the truncating box is a span around it. */}
      <span data-slot="select-item-text" className="min-w-0 flex-1 truncate [&_svg]:me-1.5 [&_svg]:inline-block [&_svg]:align-middle">
        <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      </span>
      <span data-slot="select-item-indicator" className="flex size-4 shrink-0 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon weight="bold" className="size-4 text-fg-brand" />
        </SelectPrimitive.ItemIndicator>
      </span>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return <SelectPrimitive.Separator data-slot="select-separator" className={cn("pointer-events-none -mx-1 h-px shrink-0 bg-line-subtle", className)} {...props} />;
}

function SelectScrollUpButton({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton data-slot="select-scroll-up-button" className={cn("flex h-6 cursor-default items-center justify-center bg-surface text-fg-muted", className)} {...props}>
      <CaretUpIcon weight="bold" className="size-3.5" />
    </SelectPrimitive.ScrollUpButton>
  );
}

function SelectScrollDownButton({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton data-slot="select-scroll-down-button" className={cn("flex h-6 cursor-default items-center justify-center bg-surface text-fg-muted", className)} {...props}>
      <CaretDownIcon weight="bold" className="size-3.5" />
    </SelectPrimitive.ScrollDownButton>
  );
}

export { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectScrollDownButton, SelectScrollUpButton, SelectSeparator, SelectTrigger, SelectValue };
