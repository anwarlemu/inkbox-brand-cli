"use client";

import * as React from "react";
import { Avatar as AvatarPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

// The console's avatars (Figma 427:2715). `square` is the rail's person tile (Robert Ligthart, @baked): a 22px tile
// with 4px corners in the avatar blue and a white 14px initial. `circle` is the agent's portrait (@test-agent is
// ready!). Sizes: sm 22px (the rail), default 32px, lg 40px. The fallback shows until the image has loaded.
function Avatar({ className, size = "default", shape = "square", ...props }: React.ComponentProps<typeof AvatarPrimitive.Root> & { size?: "sm" | "default" | "lg"; shape?: "square" | "circle" }) {
  return (
    <AvatarPrimitive.Root
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

function AvatarImage({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return <AvatarPrimitive.Image data-slot="avatar-image" className={cn("aspect-square size-full rounded-[inherit] object-cover", className)} {...props} />;
}

function AvatarFallback({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
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
        "relative flex size-8 shrink-0 items-center justify-center rounded-sm bg-subtle font-sans text-caption leading-none text-fg-secondary ring-2 ring-surface group-has-data-[shape=circle]/avatar-group:rounded-pill group-has-data-[size=lg]/avatar-group:size-10 group-has-data-[size=sm]/avatar-group:size-5.5 group-has-data-[size=sm]/avatar-group:rounded-xs [&>svg]:size-4",
        className,
      )}
      {...props}
    />
  );
}

export { Avatar, AvatarBadge, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarImage };
