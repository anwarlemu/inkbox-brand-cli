# Button
The 40px purple pill for the main action, the lilac pill, the 36px white outline key, the soft lilac key, 32px ghost glyphs that turn purple under the pointer, and text links. Keys darken with an inset wash while pressed; disabled keys turn lilac at full opacity.

Install: npx inkbox-ds add button
Requires: theme, utils
Packages: @chakra-ui/react, class-variance-authority
Exports: Button, buttonVariants
Client boundary: yes
Reference: The Inkbox console's Button theme; Figma 427:2715: Create Agent, Enable iMessage, Log in, Continue with GitHub, View as formatted, Tunnel quickstart


## Usage
Use one default (purple pill) button per view for the main action, secondary for the alternatives beside it (Continue with GitHub), outline for actions inside content (View as formatted), soft for an action in a page head (Tunnel quickstart), ghost with size icon for row actions, and link for an inline action in text. Use type="submit" in forms, or asChild with a link for navigation. Put a Phosphor glyph first for an action that adds or creates: a Create or Add key takes a bold 16px Plus (size-4) and a medium label. For a destructive outline or ghost key, pass text-danger (and hover:text-danger-strong on a ghost).
- Avoid: Two purple pills side by side
- Avoid: A square or 8px-cornered main action
- Avoid: Bold or caps labels
- Avoid: An icon that moves on hover
- Avoid: A faded (half-opacity) disabled key
- Avoid: A lilac wash behind a ghost key on hover


## Examples
Example components: npx inkbox-ds add button
Example packages: @phosphor-icons/react
[Preview](https://inkbox-ds.vercel.app/preview/button/Preview) | [Variants](https://inkbox-ds.vercel.app/preview/button/Variants) | [States](https://inkbox-ds.vercel.app/preview/button/States)

examples/button.tsx

```tsx
import { CopyIcon, FileTextIcon, GithubLogoIcon, LightningIcon, PencilSimpleIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react/ssr";

import { Button } from "@/components/ui/button";

export function Preview() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button className="font-medium">
        <PlusIcon weight="bold" className="size-4" />
        Create Agent
      </Button>
      <Button variant="secondary">
        <GithubLogoIcon weight="fill" />
        Continue with GitHub
      </Button>
      <Button variant="outline">
        <FileTextIcon weight="fill" />
        View as formatted
      </Button>
      <Button variant="soft">
        <LightningIcon weight="fill" />
        Tunnel quickstart
      </Button>
    </div>
  );
}

export function Variants() {
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button>Log in</Button>
        <Button variant="secondary">Continue</Button>
        <Button variant="destructive">
          <TrashIcon weight="fill" />
          Delete agent
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline">
          <CopyIcon weight="duotone" />
          Copy as markdown
        </Button>
        <Button variant="ghost" size="icon" aria-label="Edit mailbox">
          <PencilSimpleIcon weight="fill" />
        </Button>
        <Button variant="ghost" className="text-danger hover:text-danger-strong">
          <TrashIcon weight="fill" />
          Remove
        </Button>
        <Button variant="link">Generate a random key instead</Button>
      </div>
    </div>
  );
}

export function States() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button disabled>Create Agent Identity</Button>
      <Button variant="secondary" disabled>
        Continue
      </Button>
      <Button variant="outline" disabled>
        View as formatted
      </Button>
      <Button size="sm">Small</Button>
      <Button size="lg">Large</Button>
    </div>
  );
}

```

## Source

components/ui/button.tsx

```tsx
"use client";

import * as React from "react";
import { Button as ChakraButton } from "@chakra-ui/react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// The console's keys (its Chakra theme and Figma 427:2715). The main action is a 40px purple pill with a 14px regular
// white label 20px in from each side and its glyph 8px away (Create Agent, Log in); a Create or Add key with a Plus takes
// a bold 16px Plus and a medium label. `secondary` and `soft` are the same pill in lilac with ink text (soft keeps 12px
// sides). `outline` is the 36px white key with the field edge and a medium purple label (Copy as markdown). `ghost` is a
// bare 32px glyph or label in the secondary icon color that turns purple under the pointer or while its menu is open,
// with no wash. Every key but ghost and link darkens with an inset wash while pressed, at once; focus is the soft ring.
// A disabled key keeps full opacity: filled keys turn lilac with muted text and the pointer shows not-allowed. For a
// destructive outline or ghost key pass `text-danger` (ghost: `hover:text-danger-strong`).
const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-pill font-sans text-body leading-tight font-normal whitespace-nowrap outline-none select-none transition-[background-color,color,box-shadow] duration-fast ease-out focus-visible:shadow-focus disabled:cursor-not-allowed disabled:text-fg-muted motion-reduce:transition-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5.5",
  {
    variants: {
      variant: {
        default: "bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-hover active:shadow-[inset_0_0_0_9996px_var(--ds-color-wash-pressed)] active:transition-none disabled:shadow-none disabled:border-transparent disabled:bg-subtle disabled:text-fg-muted",
        secondary: "bg-subtle text-fg hover:bg-subtle-hover active:bg-subtle-hover active:shadow-[inset_0_0_0_9996px_var(--ds-color-wash-pressed)] active:transition-none disabled:shadow-none disabled:border-transparent disabled:bg-subtle disabled:text-fg-muted",
        destructive: "bg-danger text-white hover:bg-danger-strong active:bg-danger-strong active:shadow-[inset_0_0_0_9996px_var(--ds-color-wash-pressed)] active:transition-none disabled:shadow-none disabled:border-transparent disabled:bg-subtle disabled:text-fg-muted",
        outline: "border border-line-field bg-surface font-medium text-fg-brand hover:bg-subtle active:bg-subtle active:shadow-[inset_0_0_0_9996px_var(--ds-color-wash-pressed)] active:transition-none disabled:shadow-none disabled:border-transparent disabled:bg-subtle disabled:text-fg-muted",
        soft: "bg-subtle text-fg hover:bg-subtle-hover active:bg-subtle-hover active:shadow-[inset_0_0_0_9996px_var(--ds-color-wash-pressed)] active:transition-none disabled:shadow-none disabled:border-transparent disabled:bg-subtle disabled:text-fg-muted",
        ghost: "bg-transparent text-icon-secondary hover:text-fg-brand active:text-fg aria-expanded:text-fg-brand data-[state=open]:text-fg-brand",
        link: "h-auto px-0 text-fg-brand underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5",
        sm: "h-9 px-5",
        lg: "h-11 px-6",
        icon: "size-8 px-0",
        "icon-sm": "size-7 px-0 [&_svg:not([class*='size-'])]:size-4.5",
        "icon-lg": "size-10 px-0",
      },
    },
    compoundVariants: [
      { variant: "outline", size: "default", className: "h-9 px-3" },
      { variant: "soft", size: "default", className: "px-3" },
      { variant: "ghost", size: "default", className: "h-8 px-2" },
      { variant: "link", className: "h-auto px-0" },
    ],
    defaultVariants: { variant: "default", size: "default" },
  },
);

type ButtonProps = Omit<React.ComponentProps<typeof ChakraButton>, "variant" | "size"> & VariantProps<typeof buttonVariants> & { asChild?: boolean };

function Button({ className, variant, size, asChild = false, type, ...props }: ButtonProps) {
  return <ChakraButton unstyled asChild={asChild} data-slot="button" data-variant={variant ?? "default"} type={asChild ? type : (type ?? "button")} className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };

```
