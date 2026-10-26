# Alert Dialog
The console's dialog for a question that must be answered: title, a secondary line and two pills.

Install: npx inkbox-ds add alert-dialog
Requires: theme, button, surface, utils
Packages: radix-ui
Exports: AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogMedia, AlertDialogOverlay, AlertDialogPortal, AlertDialogTitle, AlertDialogTrigger
Client boundary: yes
Reference: Figma 427:2715: Modal - Create Agent (panel, scrim, title) with the console's pill buttons


## Usage
Use before an action that cannot be undone (delete an agent, rotate an API key) or when the person must acknowledge something. Name the action on its button (Delete agent), use variant="destructive" for it, and keep Cancel beside it.
- Avoid: OK and Cancel as labels
- Avoid: A close glyph on an alert dialog
- Avoid: Closing on a click outside
- Avoid: More than two actions


## Examples
Example components: npx inkbox-ds add alert-dialog button
Example packages: @phosphor-icons/react
[Preview](https://inkbox-ds.vercel.app/preview/alert-dialog/Preview) | [Small](https://inkbox-ds.vercel.app/preview/alert-dialog/Small) | [Open](https://inkbox-ds.vercel.app/preview/alert-dialog/Open)

examples/alert-dialog.tsx

```tsx
"use client";

import { KeyIcon, TrashIcon } from "@phosphor-icons/react/ssr";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogMedia, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

function DeleteAgent() {
  return (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Delete @acme?</AlertDialogTitle>
        <AlertDialogDescription>Its mailbox, phone line and tunnel are deleted with it. Messages it sent stay with their recipients. This cannot be undone.</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction variant="destructive">Delete agent</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  );
}

export function Preview() {
  return (
    <div className="flex justify-center">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive">
            <TrashIcon weight="fill" />
            Delete agent
          </Button>
        </AlertDialogTrigger>
        <DeleteAgent />
      </AlertDialog>
    </div>
  );
}

export function Small() {
  return (
    <div className="flex justify-center">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline">
            <KeyIcon weight="fill" />
            Rotate API key
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia>
              <KeyIcon weight="fill" />
            </AlertDialogMedia>
            <AlertDialogTitle>Rotate the API key?</AlertDialogTitle>
            <AlertDialogDescription>Agents using the old key stop working until you give them the new one.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>Rotate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function Open() {
  return (
    <div className="min-h-100">
      <AlertDialog defaultOpen>
        <DeleteAgent />
      </AlertDialog>
    </div>
  );
}

```

## Source

components/ui/alert-dialog.tsx

```tsx
"use client";

import * as React from "react";
import { AlertDialog as AlertDialogPrimitive } from "radix-ui";

import { buttonVariants } from "@/components/ui/button";
import { usePortalContainer } from "@/lib/surface";
import { cn } from "@/lib/utils";

// A confirmation, drawn as the console's dialog (Figma 427:2715: Create Agent Identity, @test-agent is ready!): a white
// panel with 16px corners over the blurred, ink-tinted page, a 20px regular title and a 14px secondary line, 24px of
// padding, then the actions: the cancel as the lilac pill and the action as the purple pill (red for a destructive
// one), side by side at the end, stacked full width on phones. `size="sm"` is a 320px card with the title centered
// under an optional media tile (AlertDialogMedia). It has no close glyph: the person answers it. Opens from 96 percent
// with a fade, centered; closes faster.
function AlertDialog(props: React.ComponentProps<typeof AlertDialogPrimitive.Root>) {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />;
}

function AlertDialogTrigger(props: React.ComponentProps<typeof AlertDialogPrimitive.Trigger>) {
  return <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />;
}

function AlertDialogPortal(props: React.ComponentProps<typeof AlertDialogPrimitive.Portal>) {
  const container = usePortalContainer();
  return <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" container={container} {...props} />;
}

function AlertDialogOverlay({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Overlay>) {
  return (
    <AlertDialogPrimitive.Overlay
      data-slot="alert-dialog-overlay"
      className={cn("fixed inset-0 z-50 bg-scrim backdrop-blur-[var(--ds-blur-scrim)] data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in", className)}
      {...props}
    />
  );
}

function AlertDialogContent({ className, size = "default", ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Content> & { size?: "default" | "sm" }) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        data-slot="alert-dialog-content"
        data-size={size}
        className={cn(
          "group/alert-dialog fixed top-1/2 left-1/2 z-50 grid max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-6 overflow-y-auto rounded-panel bg-surface p-6 text-fg outline-none data-[size=default]:max-w-112 data-[size=sm]:max-w-80 data-[state=closed]:animate-dialog-out data-[state=open]:animate-dialog-in",
          className,
        )}
        {...props}
      />
    </AlertDialogPortal>
  );
}

function AlertDialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="alert-dialog-header" className={cn("grid gap-1.5 group-data-[size=sm]/alert-dialog:justify-items-center group-data-[size=sm]/alert-dialog:text-center", className)} {...props} />;
}

function AlertDialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn("flex flex-col-reverse gap-3 sm:flex-row sm:justify-end group-data-[size=sm]/alert-dialog:grid group-data-[size=sm]/alert-dialog:grid-cols-2 group-data-[size=sm]/alert-dialog:[&>*]:w-full", className)}
      {...props}
    />
  );
}

/** A 48px tile above the title (the console's pink channel tile): put a filled glyph inside. */
function AlertDialogMedia({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="alert-dialog-media" className={cn("mb-1.5 inline-flex size-12 items-center justify-center rounded-pill bg-pink text-rose [&_svg:not([class*='size-'])]:size-7", className)} {...props} />;
}

function AlertDialogTitle({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return <AlertDialogPrimitive.Title data-slot="alert-dialog-title" className={cn("font-sans text-h3 leading-heading font-normal text-fg", className)} {...props} />;
}

function AlertDialogDescription({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return <AlertDialogPrimitive.Description data-slot="alert-dialog-description" className={cn("text-body leading-body text-fg-secondary", className)} {...props} />;
}

function AlertDialogAction({ className, variant = "default", ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Action> & { variant?: "default" | "destructive" }) {
  return <AlertDialogPrimitive.Action data-slot="alert-dialog-action" className={cn(buttonVariants({ variant }), className)} {...props} />;
}

function AlertDialogCancel({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Cancel>) {
  return <AlertDialogPrimitive.Cancel data-slot="alert-dialog-cancel" className={cn(buttonVariants({ variant: "secondary" }), className)} {...props} />;
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
};

```
