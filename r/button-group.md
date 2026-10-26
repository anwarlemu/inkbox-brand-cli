# Button Group
Buttons, fields and text segments joined into one bar with shared edges and outer corners only.

Install: npx inkbox-ds add button-group
Requires: theme, utils
Packages: @chakra-ui/react, class-variance-authority
Exports: ButtonGroup, ButtonGroupSeparator, ButtonGroupText, buttonGroupVariants
Client boundary: yes
Reference: Extrapolated from the Inkbox console (Figma 427:2715): the outline keys of the created dialog and the Email channel card's split field


## Usage
Use to join related actions into one control (View as formatted beside Copy as markdown), a field with an action, or a field with a fixed part (the @inboxmail.com suffix as ButtonGroupText). Nest groups to keep space between sets.
- Avoid: Joining a purple pill with an outline key
- Avoid: More than five buttons in a group
- Avoid: Joining unrelated actions


## Examples
Example components: npx inkbox-ds add button-group button input
Example packages: @phosphor-icons/react
[Preview](https://inkbox-ds.vercel.app/preview/button-group/Preview) | [WithField](https://inkbox-ds.vercel.app/preview/button-group/WithField) | [Split](https://inkbox-ds.vercel.app/preview/button-group/Split) | [Vertical](https://inkbox-ds.vercel.app/preview/button-group/Vertical)

examples/button-group.tsx

```tsx
import { CaretDownIcon, CopyIcon, FileTextIcon, MinusIcon, PlusIcon } from "@phosphor-icons/react/ssr";

import { Button } from "@/components/ui/button";
import { ButtonGroup, ButtonGroupSeparator, ButtonGroupText } from "@/components/ui/button-group";
import { Input } from "@/components/ui/input";

export function Preview() {
  return (
    <ButtonGroup aria-label="Prompt actions">
      <Button variant="outline">
        <FileTextIcon weight="fill" />
        View as formatted
      </Button>
      <Button variant="outline">
        <CopyIcon weight="duotone" />
        Copy as markdown
      </Button>
    </ButtonGroup>
  );
}

export function WithField() {
  return (
    <div className="grid w-full max-w-115 gap-4">
      <ButtonGroup className="w-full">
        <Input aria-label="Mailbox name" defaultValue="acme-support" />
        <ButtonGroupText>@inboxmail.com</ButtonGroupText>
      </ButtonGroup>
      <ButtonGroup className="w-full">
        <Input aria-label="Search contacts" placeholder="Search contacts" />
        <Button variant="outline">Search</Button>
      </ButtonGroup>
    </div>
  );
}

export function Split() {
  return (
    <div className="flex flex-wrap items-center gap-6">
      <ButtonGroup>
        <Button>Create Agent</Button>
        <ButtonGroupSeparator />
        <Button size="icon-lg" aria-label="More create options">
          <CaretDownIcon />
        </Button>
      </ButtonGroup>
      <ButtonGroup aria-label="Phone lines">
        <Button variant="outline" size="icon" className="size-9" aria-label="Remove a line">
          <MinusIcon />
        </Button>
        <ButtonGroupText className="min-w-12 justify-center text-fg">2</ButtonGroupText>
        <Button variant="outline" size="icon" className="size-9" aria-label="Add a line">
          <PlusIcon />
        </Button>
      </ButtonGroup>
    </div>
  );
}

export function Vertical() {
  return (
    <ButtonGroup orientation="vertical" aria-label="Zoom">
      <Button variant="outline" size="icon" className="size-9" aria-label="Zoom in">
        <PlusIcon />
      </Button>
      <Button variant="outline" size="icon" className="size-9" aria-label="Zoom out">
        <MinusIcon />
      </Button>
    </ButtonGroup>
  );
}

```

## Source

components/ui/button-group.tsx

```tsx
"use client";

import * as React from "react";
import { chakra } from "@chakra-ui/react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Buttons joined into one control (extrapolated from the Inkbox console, Figma 427:2715: the outline keys of the
// created dialog and the split field of the Email channel card). Inner corners square off and the shared edges merge,
// so outline keys read as one 36px bar with fully rounded outer corners; a field, select or text segment can sit in the bar.
// ButtonGroupText is the lilac segment with muted 14px text (@inboxmail.com); ButtonGroupSeparator is a 1px rule
// between filled buttons.
const buttonGroupVariants = cva(
  "group/button-group flex w-fit items-stretch *:focus-visible:relative *:focus-visible:z-10 has-[>[data-slot=button-group]]:gap-2 has-[>input]:[&>[data-slot=button]]:h-10 has-[>input]:[&>[data-slot=button-group-text]]:h-10 [&>input]:flex-1",
  {
    variants: {
      orientation: {
        horizontal: "[&>*:not(:first-child)]:rounded-l-none [&>*:not(:first-child)]:border-l-0 [&>*:not(:last-child)]:rounded-r-none",
        vertical: "flex-col [&>*:not(:first-child)]:rounded-t-none [&>*:not(:first-child)]:border-t-0 [&>*:not(:last-child)]:rounded-b-none",
      },
    },
    defaultVariants: { orientation: "horizontal" },
  },
);

function ButtonGroup({ className, orientation, ...props }: React.ComponentProps<"div"> & VariantProps<typeof buttonGroupVariants>) {
  return <div role="group" data-slot="button-group" data-orientation={orientation ?? "horizontal"} className={cn(buttonGroupVariants({ orientation }), className)} {...props} />;
}

function ButtonGroupText({ className, asChild = false, ...props }: React.ComponentProps<"div"> & { asChild?: boolean }) {
  const Comp = asChild ? chakra.div : "div";
  // Chakra's factory renders its child in its place only when told to.
  const slotProps = asChild ? { asChild: true } : {};
  return (
    <Comp {...slotProps}
      data-slot="button-group-text"
      className={cn("flex items-center gap-2 rounded-pill border border-line-field bg-subtle px-3.5 font-sans text-body leading-tight whitespace-nowrap text-fg-muted [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-5.5", className)}
      {...props}
    />
  );
}

function ButtonGroupSeparator({ className, orientation = "vertical", ...props }: React.ComponentProps<"div"> & { orientation?: "horizontal" | "vertical" }) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      data-slot="button-group-separator"
      data-orientation={orientation}
      className={cn("relative shrink-0 self-stretch bg-surface/40", orientation === "vertical" ? "w-px" : "h-px", className)}
      {...props}
    />
  );
}

export { ButtonGroup, ButtonGroupSeparator, ButtonGroupText, buttonGroupVariants };

```
