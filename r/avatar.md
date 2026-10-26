# Avatar
Circular initial tiles and agent portraits, with a fallback, status dot and group.

Install: npx inkbox-ds add avatar
Requires: theme, utils
Packages: @chakra-ui/react
Exports: Avatar, AvatarBadge, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarImage
Client boundary: yes
Reference: Figma 427:2715: the rail (Robert Ligthart), the agent picker (@acme), Modal - Created (@test-agent)


## Usage
Use the default circle shape for people, identities and agent portraits, including in rails and lists: size sm in a 38px row. Use shape="square" only when an explicit square variation is requested. Always give an AvatarFallback with the first initial. AvatarBadge marks a live agent; AvatarGroup shows who shares a mailbox.
- Avoid: Gradient or random-colored fallbacks
- Avoid: Two-letter initials in the 22px tile


## Examples
Example components: npx inkbox-ds add avatar
Example packages: @phosphor-icons/react
[Preview](https://inkbox-ds.vercel.app/preview/avatar/Preview) | [Sizes](https://inkbox-ds.vercel.app/preview/avatar/Sizes) | [WithBadge](https://inkbox-ds.vercel.app/preview/avatar/WithBadge) | [Group](https://inkbox-ds.vercel.app/preview/avatar/Group) | [Fallback](https://inkbox-ds.vercel.app/preview/avatar/Fallback)

examples/avatar.tsx

```tsx
import { CheckIcon } from "@phosphor-icons/react/ssr";

import { Avatar, AvatarBadge, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarImage } from "@/components/ui/avatar";

export function Preview() {
  return (
    <div className="grid gap-3">
      <div className="flex h-9.5 items-center gap-2.5 px-3">
        <Avatar size="sm">
          <AvatarFallback>R</AvatarFallback>
        </Avatar>
        <span className="text-body text-fg">Robert Ligthart</span>
      </div>
      <div className="flex h-9.5 items-center gap-2.5 px-3">
        <Avatar size="sm">
          <AvatarFallback>A</AvatarFallback>
        </Avatar>
        <span className="text-body text-fg">@acme</span>
      </div>
    </div>
  );
}

export function Sizes() {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <Avatar size="sm">
        <AvatarFallback>R</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback>R</AvatarFallback>
      </Avatar>
      <Avatar size="lg">
        <AvatarFallback>R</AvatarFallback>
      </Avatar>
      <Avatar shape="circle" size="sm">
        <AvatarImage src="/logo-mark.png" alt="@test-agent" />
        <AvatarFallback>T</AvatarFallback>
      </Avatar>
      <Avatar shape="circle">
        <AvatarImage src="/logo-mark.png" alt="@test-agent" />
        <AvatarFallback>T</AvatarFallback>
      </Avatar>
      <Avatar shape="circle" size="lg">
        <AvatarImage src="/logo-mark.png" alt="@test-agent" />
        <AvatarFallback>T</AvatarFallback>
      </Avatar>
    </div>
  );
}

export function WithBadge() {
  return (
    <div className="flex items-center gap-4">
      <Avatar>
        <AvatarFallback>A</AvatarFallback>
        <AvatarBadge />
      </Avatar>
      <Avatar size="lg" shape="circle">
        <AvatarImage src="/logo-mark.png" alt="@test-agent" />
        <AvatarFallback>T</AvatarFallback>
        <AvatarBadge>
          <CheckIcon weight="bold" />
        </AvatarBadge>
      </Avatar>
    </div>
  );
}

export function Group() {
  return (
    <AvatarGroup>
      <Avatar>
        <AvatarFallback>R</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback>A</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback>M</AvatarFallback>
      </Avatar>
      <AvatarGroupCount>+3</AvatarGroupCount>
    </AvatarGroup>
  );
}

export function Fallback() {
  return (
    <div className="flex items-center gap-4">
      <Avatar size="lg" shape="circle">
        <AvatarFallback>R</AvatarFallback>
      </Avatar>
      <Avatar size="lg">
        <AvatarFallback>R</AvatarFallback>
      </Avatar>
    </div>
  );
}

```

## Source

components/ui/avatar.tsx

```tsx
"use client";

import * as React from "react";
import { Avatar as ChakraAvatar } from "@chakra-ui/react";

import { cn } from "@/lib/utils";

// Circular avatars with an avatar-blue fallback and a white initial; `square` remains an explicit shape option.
// Sizes: sm 22px (the rail), default 32px, lg 40px. The fallback shows until the image has loaded.
function Avatar({ className, size = "default", shape = "circle", ...props }: React.ComponentProps<typeof ChakraAvatar.Root> & { size?: "sm" | "default" | "lg"; shape?: "square" | "circle" }) {
  return (
    <ChakraAvatar.Root
      unstyled
      data-slot="avatar"
      data-size={size}
      data-shape={shape}
      className={cn(
        "group/avatar relative flex size-8 shrink-0 select-none data-[size=lg]:size-10 data-[size=sm]:size-5.5",
        shape === "circle" ? "rounded-pill" : "rounded-sm data-[size=lg]:rounded-control data-[size=sm]:rounded-xs",
        className,
      )}
      {...props}
    />
  );
}

function AvatarImage({ className, ...props }: React.ComponentProps<typeof ChakraAvatar.Image>) {
  return <ChakraAvatar.Image data-slot="avatar-image" className={cn("aspect-square size-full rounded-[inherit] object-cover", className)} {...props} />;
}

function AvatarFallback({ className, ...props }: React.ComponentProps<typeof ChakraAvatar.Fallback>) {
  return (
    <ChakraAvatar.Fallback
      data-slot="avatar-fallback"
      className={cn("flex size-full items-center justify-center rounded-[inherit] bg-avatar font-sans text-body leading-none text-white group-data-[size=lg]/avatar:text-body-lg group-data-[size=sm]/avatar:text-body", className)}
      {...props}
    />
  );
}

/** A status dot at the avatar's lower right (an agent online), ringed in white. */
function AvatarBadge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="avatar-badge"
      className={cn(
        "absolute -right-0.5 -bottom-0.5 z-10 inline-flex size-2.5 items-center justify-center rounded-pill bg-success text-white ring-2 ring-surface select-none group-data-[size=lg]/avatar:size-3 group-data-[size=sm]/avatar:size-2 [&>svg]:hidden group-data-[size=lg]/avatar:[&>svg]:block group-data-[size=lg]/avatar:[&>svg]:size-2",
        className,
      )}
      {...props}
    />
  );
}

/** Avatars overlapped by 8px, each ringed in white. */
function AvatarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="avatar-group" className={cn("group/avatar-group flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-surface", className)} {...props} />;
}

/** The count of avatars not shown (+3), on the lilac. */
function AvatarGroupCount({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group-count"
      className={cn(
        "relative flex size-8 shrink-0 items-center justify-center rounded-pill bg-subtle font-sans text-caption leading-none text-fg-secondary ring-2 ring-surface group-has-data-[size=lg]/avatar-group:size-10 group-has-data-[size=sm]/avatar-group:size-5.5 [&>svg]:size-4",
        className,
      )}
      {...props}
    />
  );
}

export { Avatar, AvatarBadge, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarImage };

```
