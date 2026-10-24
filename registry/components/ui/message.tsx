import * as React from "react";

import { cn } from "@/lib/utils";

// One message in an agent conversation (Figma 427:2715, the inbox and iMessage): a 32px avatar tile (the initial on
// the avatar blue, circular, as the rail's "R"), the sender's name in 14px ink with the time in 14px muted beside
// it, the bubbles, and a 12px muted footer (Delivered). Outgoing messages (align end) mirror to the right.
function MessageGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="message-group" className={cn("flex min-w-0 flex-col gap-4", className)} {...props} />;
}

function Message({ className, align = "start", ...props }: React.ComponentProps<"div"> & { align?: "start" | "end" }) {
  return <div data-slot="message" data-align={align} className={cn("group/message relative flex w-full min-w-0 gap-2.5 font-sans text-body data-[align=end]:flex-row-reverse", className)} {...props} />;
}

function MessageAvatar({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="message-avatar"
      className={cn(
        "flex size-8 shrink-0 items-center justify-center self-end overflow-hidden rounded-pill bg-avatar text-body leading-tight font-medium text-white group-has-data-[slot=message-footer]/message:-translate-y-6 *:[img]:size-full *:[img]:object-cover",
        className,
      )}
      {...props}
    />
  );
}

function MessageContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="message-content" className={cn("flex w-full min-w-0 flex-col gap-1.5 break-words group-data-[align=end]/message:items-end", className)} {...props} />;
}

/** The sender and the time: "Ray Liao" in ink, "Yesterday" muted, as an inbox row. */
function MessageHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="message-header"
      className={cn("flex max-w-full min-w-0 items-baseline gap-2 px-1 text-body leading-tight text-fg group-data-[align=end]/message:flex-row-reverse [&_time]:text-fg-muted group-has-data-[variant=ghost]/message:px-0", className)}
      {...props}
    />
  );
}

function MessageFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="message-footer"
      className={cn("flex max-w-full min-w-0 items-center gap-1 px-1 text-caption leading-tight text-fg-muted group-data-[align=end]/message:justify-end group-has-data-[variant=ghost]/message:px-0 [&_svg:not([class*='size-'])]:size-3.5", className)}
      {...props}
    />
  );
}

export { Message, MessageAvatar, MessageContent, MessageFooter, MessageGroup, MessageHeader };
