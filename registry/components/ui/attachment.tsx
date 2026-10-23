import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// A file attached to a message or an email, drawn as the console's cards (Figma 427:2715): white with the field edge
// and 8px corners. The file sits in a pink tile with a filled glyph in rose (the channel tiles of Create Agent
// Identity); its name is 14px medium ink and its size or status 12px muted in IBM Plex Mono. A file still waiting has a
// dashed edge, one uploading pulses its name softly, one that failed takes the red edge and a red line.
const attachmentVariants = cva(
  "group/attachment relative flex w-fit max-w-full min-w-0 shrink-0 flex-wrap rounded-control border border-line-field bg-surface text-fg transition-[background-color,border-color] duration-150 ease-out has-[>[data-slot=attachment-trigger]]:hover:bg-subtle has-[>[data-slot=attachment-trigger]:focus-visible]:outline-2 has-[>[data-slot=attachment-trigger]:focus-visible]:outline-offset-2 has-[>[data-slot=attachment-trigger]:focus-visible]:outline-focus-ring data-[state=error]:border-danger data-[state=idle]:border-dashed motion-reduce:transition-none",
  {
    variants: {
      size: {
        default: "gap-3 text-body has-data-[slot=attachment-content]:px-3 has-data-[slot=attachment-content]:py-2.5 has-data-[slot=attachment-media]:p-2.5",
        sm: "gap-2.5 text-body has-data-[slot=attachment-content]:px-2.5 has-data-[slot=attachment-content]:py-2 has-data-[slot=attachment-media]:p-2",
        xs: "gap-2 rounded-sm text-body-sm has-data-[slot=attachment-content]:px-2 has-data-[slot=attachment-content]:py-1.5 has-data-[slot=attachment-media]:p-1.5",
      },
      orientation: {
        horizontal: "min-w-48 items-center",
        vertical: "w-28 flex-col has-data-[slot=attachment-content]:w-36",
      },
    },
    defaultVariants: { size: "default", orientation: "horizontal" },
  },
);

type AttachmentState = "idle" | "uploading" | "processing" | "error" | "done";

function Attachment({ className, state = "done", size = "default", orientation = "horizontal", ...props }: React.ComponentProps<"div"> & VariantProps<typeof attachmentVariants> & { state?: AttachmentState }) {
  return <div data-slot="attachment" data-state={state} data-size={size} data-orientation={orientation} aria-busy={state === "uploading" || state === "processing" || undefined} className={cn(attachmentVariants({ size, orientation }), className)} {...props} />;
}

const attachmentMediaVariants = cva(
  "relative flex aspect-square w-10 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-pink text-rose group-data-[orientation=vertical]/attachment:w-full group-data-[size=sm]/attachment:w-8 group-data-[size=xs]/attachment:w-7 group-data-[size=xs]/attachment:rounded-xs group-data-[state=error]/attachment:bg-subtle group-data-[state=error]/attachment:text-danger [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-5.5 group-data-[orientation=vertical]/attachment:[&_svg:not([class*='size-'])]:size-7 group-data-[size=xs]/attachment:[&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        icon: "",
        // A photo shows itself; it stays faint until it has uploaded.
        image: "bg-subtle opacity-60 group-data-[state=done]/attachment:opacity-100 group-data-[state=idle]/attachment:opacity-100 *:[img]:aspect-square *:[img]:w-full *:[img]:object-cover",
      },
    },
    defaultVariants: { variant: "icon" },
  },
);

function AttachmentMedia({ className, variant = "icon", ...props }: React.ComponentProps<"div"> & VariantProps<typeof attachmentMediaVariants>) {
  return <div data-slot="attachment-media" data-variant={variant} className={cn(attachmentMediaVariants({ variant }), className)} {...props} />;
}

function AttachmentContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="attachment-content" className={cn("max-w-full min-w-0 flex-1 leading-tight group-data-[orientation=vertical]/attachment:px-1 group-data-[orientation=vertical]/attachment:pb-1", className)} {...props} />;
}

function AttachmentTitle({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="attachment-title"
      className={cn("block max-w-full min-w-0 truncate font-sans font-medium text-fg group-data-[state=processing]/attachment:animate-pulse-soft group-data-[state=uploading]/attachment:animate-pulse-soft", className)}
      {...props}
    />
  );
}

function AttachmentDescription({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="attachment-description" className={cn("mt-1 block max-w-full min-w-0 truncate font-mono text-caption leading-tight text-fg-muted group-data-[state=error]/attachment:font-sans group-data-[state=error]/attachment:text-danger", className)} {...props} />;
}

function AttachmentActions({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="attachment-actions" className={cn("relative z-20 flex shrink-0 items-center gap-0.5 group-data-[orientation=vertical]/attachment:absolute group-data-[orientation=vertical]/attachment:top-3.5 group-data-[orientation=vertical]/attachment:right-3.5", className)} {...props} />;
}

/** A row action on the attachment (remove, retry, download): a ghost glyph button. */
function AttachmentAction({ className, variant, size = "icon-sm", ...props }: React.ComponentProps<typeof Button>) {
  return <Button data-slot="attachment-action" variant={variant ?? "ghost"} size={size} className={cn("group-data-[orientation=vertical]/attachment:bg-surface group-data-[orientation=vertical]/attachment:shadow-s", className)} {...props} />;
}

/** Makes the whole card open the file: a button (or a link with asChild) stretched over it. */
function AttachmentTrigger({ className, asChild = false, type, ...props }: React.ComponentProps<"button"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp data-slot="attachment-trigger" type={asChild ? undefined : (type ?? "button")} className={cn("absolute inset-0 z-10 cursor-pointer rounded-control outline-none", className)} {...props} />;
}

function AttachmentGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="attachment-group"
      className={cn("flex min-w-0 snap-x snap-mandatory scroll-px-1 gap-3 overflow-x-auto overscroll-x-contain p-1 [scrollbar-width:none] *:data-[slot=attachment]:flex-none *:data-[slot=attachment]:snap-start", className)}
      {...props}
    />
  );
}

export { Attachment, AttachmentAction, AttachmentActions, AttachmentContent, AttachmentDescription, AttachmentGroup, AttachmentMedia, AttachmentTitle, AttachmentTrigger };
