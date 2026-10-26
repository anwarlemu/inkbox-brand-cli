# Toggle Group
The segmented choice: a lilac track of 38px choices where the chosen one is a white key with Shadow/S.

Install: npx inkbox-ds add toggle-group
Requires: theme, toggle, utils
Packages: radix-ui, class-variance-authority
Exports: ToggleGroup, ToggleGroupItem
Client boundary: yes
Reference: Figma 427:2715: Where does this agent run? in Modal - Created


## Usage
Use for a choice among a few options that changes what is shown next (Where does this agent run? Hermes, Openclaw, Codex, Claude Code). Use type single for one choice, multiple for several. Put a 24px logo tile or a 20px glyph before each label. Use variant outline for separate keys.
- Avoid: A purple chosen key
- Avoid: A sliding indicator between choices
- Avoid: More than seven choices in one track


## Examples
Example components: npx inkbox-ds add toggle-group
Example packages: @phosphor-icons/react
[Preview](https://inkbox-ds.vercel.app/preview/toggle-group/Preview) | [Outline](https://inkbox-ds.vercel.app/preview/toggle-group/Outline) | [Sizes](https://inkbox-ds.vercel.app/preview/toggle-group/Sizes)

examples/toggle-group.tsx

```tsx
"use client";

import * as React from "react";
import { CodeIcon, CodeBlockIcon, LightningIcon, RobotIcon, SparkleIcon, TerminalWindowIcon, TextAlignCenterIcon, TextAlignLeftIcon, TextAlignRightIcon } from "@phosphor-icons/react/ssr";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

// The runners as 24px logo tiles; a real app puts each runner's own logo in the tile.
const RUNNERS = [
  { value: "hermes", label: "Hermes", icon: RobotIcon },
  { value: "openclaw", label: "Openclaw", icon: LightningIcon },
  { value: "codex", label: "Codex", icon: TerminalWindowIcon },
  { value: "claude-code", label: "Claude Code", icon: SparkleIcon },
  { value: "opencode", label: "OpenCode", icon: CodeBlockIcon },
];

export function Preview() {
  const [runner, setRunner] = React.useState("hermes");
  return (
    <div className="grid w-full gap-3">
      <p id="runner" className="text-body leading-tight font-medium text-fg">Where does this agent run?</p>
      <ToggleGroup type="single" value={runner} onValueChange={(v) => v && setRunner(v)} aria-labelledby="runner" className="w-full">
        {RUNNERS.map(({ value, label, icon: Icon }) => (
          <ToggleGroupItem key={value} value={value}>
            <span className="flex size-6 items-center justify-center rounded-pill bg-surface text-fg-brand shadow-s">
              <Icon weight="fill" className="size-4" />
            </span>
            {label}
          </ToggleGroupItem>
        ))}
        <ToggleGroupItem value="other">
          <CodeIcon weight="bold" />
          Other
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}

export function Outline() {
  return (
    <ToggleGroup type="multiple" variant="outline" defaultValue={["email"]} aria-label="Channels">
      <ToggleGroupItem value="email">Email</ToggleGroupItem>
      <ToggleGroupItem value="phone">Phone</ToggleGroupItem>
      <ToggleGroupItem value="imessage">iMessage</ToggleGroupItem>
    </ToggleGroup>
  );
}

export function Sizes() {
  return (
    <div className="grid gap-3">
      <ToggleGroup type="single" size="sm" defaultValue="left" aria-label="Alignment, small">
        <ToggleGroupItem value="left" aria-label="Align left">
          <TextAlignLeftIcon weight="bold" />
        </ToggleGroupItem>
        <ToggleGroupItem value="center" aria-label="Align center">
          <TextAlignCenterIcon weight="bold" />
        </ToggleGroupItem>
        <ToggleGroupItem value="right" aria-label="Align right">
          <TextAlignRightIcon weight="bold" />
        </ToggleGroupItem>
      </ToggleGroup>
      <ToggleGroup type="single" spacing={0} defaultValue="day" aria-label="Range">
        <ToggleGroupItem value="day">Day</ToggleGroupItem>
        <ToggleGroupItem value="week">Week</ToggleGroupItem>
        <ToggleGroupItem value="month">Month</ToggleGroupItem>
        <ToggleGroupItem value="year" disabled>
          Year
        </ToggleGroupItem>
      </ToggleGroup>
      <ToggleGroup type="single" orientation="vertical" defaultValue="inbox" aria-label="Folder" className="w-48">
        <ToggleGroupItem value="inbox" className="justify-start">Inbox</ToggleGroupItem>
        <ToggleGroupItem value="sent" className="justify-start">Sent</ToggleGroupItem>
        <ToggleGroupItem value="spam" className="justify-start">Spam</ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}

```

## Source

components/ui/toggle-group.tsx

```tsx
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
        variant === "default" && "overflow-x-auto rounded-pill data-[orientation=vertical]:rounded-dialog bg-subtle p-0.5 [scrollbar-width:none]",
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

```
