"use client";

import * as React from "react";
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";
import { type VariantProps } from "class-variance-authority";

import { toggleVariants } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";

// The console's segmented choice (Figma 427:2715, Modal - Created: "Where does this agent run?"): a lilac track with
// 10px corners and a 2px inset holding 38px choices 8px apart; each choice is a 24px logo tile 8px from a 14px medium
// ink label, 8px from the sides, and the chosen one is a white key with 8px corners and Shadow/S. With `spacing={0}`
// the choices sit flush in the track. `variant="outline"` drops the track: separate keys with the field edge, the chosen
// one white with Shadow/S. Choosing is instant (no sliding key): the choice is made often and must feel immediate.
const ToggleGroupContext = React.createContext<VariantProps<typeof toggleVariants> & { spacing?: number; orientation?: "horizontal" | "vertical" }>({
  size: "default",
  variant: "default",
  spacing: 2,
  orientation: "horizontal",
});

function ToggleGroup({
  className,
  variant = "default",
  size = "default",
  spacing = 2,
  orientation = "horizontal",
  children,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root> & VariantProps<typeof toggleVariants> & { spacing?: number; orientation?: "horizontal" | "vertical" }) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      data-variant={variant}
      data-size={size}
      data-spacing={spacing}
      data-orientation={orientation}
      orientation={orientation}
      style={{ "--gap": spacing } as React.CSSProperties}
      className={cn(
        "group/toggle-group flex w-fit max-w-full items-center gap-[calc(var(--spacing)*var(--gap))] data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch",
        variant === "default" && "overflow-x-auto rounded-pill bg-subtle p-0.5 [scrollbar-width:none]",
        className,
      )}
      {...props}
    >
      <ToggleGroupContext.Provider value={{ variant, size, spacing, orientation }}>{children}</ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  );
}

function ToggleGroupItem({ className, children, variant, size, ...props }: React.ComponentProps<typeof ToggleGroupPrimitive.Item> & VariantProps<typeof toggleVariants>) {
  const context = React.useContext(ToggleGroupContext);
  const v = context.variant || variant || "default";
  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      data-variant={v}
      data-size={context.size || size}
      data-spacing={context.spacing}
      className={cn(
        toggleVariants({ variant: v, size: context.size || size }),
        // In the track the chosen choice is the white key, as in the segmented choice.
        v === "default" && "hover:bg-subtle-hover data-[state=on]:bg-surface data-[state=on]:text-fg data-[state=on]:shadow-s data-[state=on]:hover:bg-surface",
        "focus-visible:z-10",
        className,
      )}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  );
}

export { ToggleGroup, ToggleGroupItem };
