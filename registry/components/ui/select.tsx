"use client";

import * as React from "react";
import { Select as SelectPrimitive } from "radix-ui";
import { CaretDownIcon, CaretUpIcon, CheckIcon } from "@phosphor-icons/react/ssr";

import { usePortalContainer } from "@/lib/surface";
import { cn } from "@/lib/utils";

// The console's select (Figma 427:2715, Create Agent Identity: "Any State" under Phone Number, "Shared" under
// iMessage): a white 40px field with 8px corners and the Shadow/S ring instead of an edge, the value in 14px ink 14px
// in, a 16px bold caret 12px from the right; the placeholder is the light purple. `size="sm"` is 36px. The list is the
// console's menu: white, 8px corners, the floating shadow, 4px inside; 36px rows with 8px corners, 14px ink, the
// highlighted row on the lilac and a purple check at the right of the chosen one. It opens from the trigger (96
// percent and a fade, 200ms) and closes faster.
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
        "flex w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-control bg-surface pr-3 pl-3.5 font-sans text-body leading-tight whitespace-nowrap text-fg shadow-s outline-none transition-[box-shadow] duration-150 ease-out focus-visible:shadow-[var(--ds-shadow-s),var(--ds-shadow-focus)] disabled:cursor-not-allowed disabled:bg-subtle disabled:text-fg-muted aria-invalid:shadow-[0_0_0_1px_var(--ds-color-status-danger)] data-placeholder:text-fg-subtle data-[size=default]:h-10 data-[size=sm]:h-9 motion-reduce:transition-none *:data-[slot=select-value]:flex *:data-[slot=select-value]:min-w-0 *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 *:data-[slot=select-value]:truncate [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <CaretDownIcon weight="bold" className="size-4 text-fg" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({ className, children, position = "popper", align = "center", ...props }: React.ComponentProps<typeof SelectPrimitive.Content>) {
  const container = usePortalContainer();
  return (
    <SelectPrimitive.Portal container={container}>
      <SelectPrimitive.Content
        data-slot="select-content"
        className={cn(
          "relative z-50 max-h-(--radix-select-content-available-height) min-w-36 origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-control bg-surface text-fg shadow-floating data-[state=closed]:animate-pop-out data-[state=open]:animate-pop-in",
          position === "popper" && "w-full min-w-(--radix-select-trigger-width) data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className,
        )}
        position={position}
        align={align}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport data-position={position} className={cn("p-1", position === "popper" && "h-(--radix-select-trigger-height) w-full min-w-(--radix-select-trigger-width) scroll-my-1")}>
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

function SelectLabel({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return <SelectPrimitive.Label data-slot="select-label" className={cn("px-2.5 pt-2 pb-1 text-body-sm leading-tight text-fg-label", className)} {...props} />;
}

function SelectItem({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex h-9 w-full cursor-default items-center gap-2.5 rounded-control pr-9 pl-2.5 font-sans text-body leading-tight text-fg outline-none select-none data-disabled:pointer-events-none data-disabled:text-fg-faint data-highlighted:bg-subtle [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5 [&_svg:not([class*='text-'])]:text-icon-secondary *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2.5",
        className,
      )}
      {...props}
    >
      <span data-slot="select-item-indicator" className="absolute right-2.5 flex size-4 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon weight="bold" className="size-4 text-fg-brand" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return <SelectPrimitive.Separator data-slot="select-separator" className={cn("pointer-events-none -mx-1 my-1 h-px bg-line-subtle", className)} {...props} />;
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
