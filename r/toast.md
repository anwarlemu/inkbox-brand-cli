# Toast
The Radix toast API in the same white floating look, with an outline action and a red edge for destructive toasts.

Install: npx inkbox-ds add toast
Requires: theme, utils
Packages: radix-ui, class-variance-authority, @phosphor-icons/react
Exports: Toast, ToastAction, ToastClose, ToastDescription, Toaster, ToastProvider, ToastTitle, ToastViewport, toast, useToast, ToastActionElement, ToastProps
Client boundary: yes
Reference: Extrapolated from the Inkbox console (Figma 427:2715): white floating panels and outline keys


## Usage
Use when an app already calls the older toast() and useToast() API. Mount Toaster once and call toast({ title, description, action }); pass variant destructive for failures. For new work, use Sonner.
- Avoid: Stacking more than three toasts
- Avoid: A toast that needs a decision before work continues
- Avoid: A purple or dark toast


## Examples
Example components: npx inkbox-ds add toast button
[Preview](https://inkbox-ds.vercel.app/preview/toast/Preview)

examples/toast.tsx

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { ToastAction, Toaster, useToast } from "@/components/ui/toast";

export function Preview() {
  const { toast } = useToast();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Toaster />
      <Button
        variant="outline"
        onClick={() =>
          toast({
            title: "Mailbox archived",
            description: "support@inkboxmail.com no longer receives mail.",
            action: <ToastAction altText="Undo the archive">Undo</ToastAction>,
          })
        }
      >
        Archive mailbox
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toast({
            variant: "destructive",
            title: "Delivery failed",
            description: "api.acme.dev answered 500 three times.",
            action: <ToastAction altText="Retry the delivery">Retry</ToastAction>,
          })
        }
      >
        Destructive
      </Button>
      <Button variant="outline" onClick={() => toast({ title: "Contact rule saved" })}>
        Title only
      </Button>
    </div>
  );
}

```

## Source

components/ui/toast.tsx

```tsx
"use client";

import * as React from "react";
import { Toast as ToastPrimitive } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { XIcon } from "@phosphor-icons/react/ssr";

import { cn } from "@/lib/utils";

// The Radix toast (shadcn's older toast API; prefer Sonner for new work). Same look as the Sonner toasts (extrapolated
// from the Inkbox console, Figma 427:2715): a white panel with 16px corners, the floating shadow and 16px of padding, a
// 14px medium ink title over a 14px muted description, an outline action key and a faint close glyph. `destructive`
// edges it in red with a red title. It slides in from the right edge it lives on (300ms, the drawer curve) and fades
// out faster; a swipe to the right drags it with the finger and lets it go.
const ToastProvider = ToastPrimitive.Provider;

function ToastViewport({ className, ...props }: React.ComponentProps<typeof ToastPrimitive.Viewport>) {
  return (
    <ToastPrimitive.Viewport
      data-slot="toast-viewport"
      className={cn("fixed right-0 bottom-0 z-[100] flex max-h-dvh w-full flex-col-reverse gap-2 p-4 outline-none sm:max-w-sm sm:flex-col", className)}
      {...props}
    />
  );
}

const toastVariants = cva(
  "group/toast pointer-events-auto relative flex w-full items-start justify-between gap-3 overflow-hidden rounded-panel bg-surface p-4 pr-10 font-sans text-fg shadow-floating data-[state=closed]:animate-fade-out data-[state=open]:animate-sheet-in-right data-[swipe=cancel]:translate-x-0 data-[swipe=cancel]:transition-[translate] data-[swipe=cancel]:duration-200 data-[swipe=cancel]:ease-out data-[swipe=end]:translate-x-(--radix-toast-swipe-end-x) data-[swipe=end]:animate-fade-out data-[swipe=move]:translate-x-(--radix-toast-swipe-move-x) data-[swipe=move]:transition-none motion-reduce:data-[swipe=cancel]:transition-none",
  {
    variants: {
      variant: {
        default: "",
        destructive: "border border-danger [&_[data-slot=toast-title]]:text-danger-strong",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Toast({ className, variant, ...props }: React.ComponentProps<typeof ToastPrimitive.Root> & VariantProps<typeof toastVariants>) {
  return <ToastPrimitive.Root data-slot="toast" data-variant={variant ?? "default"} className={cn(toastVariants({ variant }), className)} {...props} />;
}

function ToastAction({ className, ...props }: React.ComponentProps<typeof ToastPrimitive.Action>) {
  return (
    <ToastPrimitive.Action
      data-slot="toast-action"
      className={cn(
        "inline-flex h-8 shrink-0 items-center justify-center self-center rounded-pill border border-line-field bg-surface px-2.5 font-sans text-body leading-tight font-medium text-fg-brand outline-none transition-[background-color] duration-150 ease-out hover:bg-subtle active:bg-subtle active:brightness-95 active:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:pointer-events-none disabled:opacity-50 group-data-[variant=destructive]/toast:text-danger-strong motion-reduce:transition-none",
        className,
      )}
      {...props}
    />
  );
}

function ToastClose({ className, ...props }: React.ComponentProps<typeof ToastPrimitive.Close>) {
  return (
    <ToastPrimitive.Close
      data-slot="toast-close"
      aria-label="Close"
      className={cn("absolute top-3 right-3 inline-flex size-6 items-center justify-center rounded-pill text-fg-faint outline-none active:brightness-95 active:transition-none transition-colors duration-150 ease-out hover:text-fg-muted focus-visible:outline-2 focus-visible:outline-focus-ring motion-reduce:transition-none", className)}
      {...props}
    >
      <XIcon className="size-4" />
    </ToastPrimitive.Close>
  );
}

function ToastTitle({ className, ...props }: React.ComponentProps<typeof ToastPrimitive.Title>) {
  return <ToastPrimitive.Title data-slot="toast-title" className={cn("text-body leading-body font-medium text-fg", className)} {...props} />;
}

function ToastDescription({ className, ...props }: React.ComponentProps<typeof ToastPrimitive.Description>) {
  return <ToastPrimitive.Description data-slot="toast-description" className={cn("text-body leading-body text-fg-muted", className)} {...props} />;
}

type ToastProps = React.ComponentProps<typeof Toast>;
type ToastActionElement = React.ReactElement<React.ComponentProps<typeof ToastAction>>;

// The toast queue: a tiny store any part of the app can push to with toast(), read by useToast() and <Toaster />.
const TOAST_LIMIT = 3;
const REMOVE_DELAY = 1000;

type ToasterToast = ToastProps & { id: string; title?: React.ReactNode; description?: React.ReactNode; action?: ToastActionElement };
type State = { toasts: ToasterToast[] };

let count = 0;
const nextId = () => String((count = (count + 1) % Number.MAX_SAFE_INTEGER));
const listeners: Array<(state: State) => void> = [];
let memory: State = { toasts: [] };
const timeouts = new Map<string, ReturnType<typeof setTimeout>>();

function setState(update: (state: State) => State) {
  memory = update(memory);
  listeners.forEach((l) => l(memory));
}

function scheduleRemove(id: string) {
  if (timeouts.has(id)) return;
  // ds-latency: removes an already dismissed toast from memory; dismissal and input stay immediate.
  timeouts.set(id, setTimeout(() => {
    timeouts.delete(id);
    setState((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  }, REMOVE_DELAY));
}

function dismiss(id?: string) {
  setState((s) => ({ toasts: s.toasts.map((t) => (id === undefined || t.id === id ? { ...t, open: false } : t)) }));
  memory.toasts.filter((t) => id === undefined || t.id === id).forEach((t) => scheduleRemove(t.id));
}

function toast(props: Omit<ToasterToast, "id">) {
  const id = nextId();
  const update = (next: Partial<ToasterToast>) => setState((s) => ({ toasts: s.toasts.map((t) => (t.id === id ? { ...t, ...next } : t)) }));
  setState((s) => ({
    toasts: [{ ...props, id, open: true, onOpenChange: (open: boolean) => { if (!open) dismiss(id); props.onOpenChange?.(open); } }, ...s.toasts].slice(0, TOAST_LIMIT),
  }));
  return { id, dismiss: () => dismiss(id), update };
}

function useToast() {
  const [state, setLocal] = React.useState(memory);
  React.useEffect(() => {
    listeners.push(setLocal);
    return () => {
      const i = listeners.indexOf(setLocal);
      if (i > -1) listeners.splice(i, 1);
    };
  }, []);
  return { ...state, toast, dismiss };
}

/** Renders the queue. Mount it once, near the root. */
function Toaster() {
  const { toasts } = useToast();
  return (
    <ToastProvider swipeDirection="right">
      {toasts.map(({ id, title, description, action, ...props }) => (
        <Toast key={id} {...props}>
          <div className="grid min-w-0 gap-0.5">
            {title && <ToastTitle>{title}</ToastTitle>}
            {description && <ToastDescription>{description}</ToastDescription>}
          </div>
          {action}
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}

export { Toast, ToastAction, ToastClose, ToastDescription, Toaster, ToastProvider, ToastTitle, ToastViewport, toast, useToast };
export type { ToastActionElement, ToastProps };

```
