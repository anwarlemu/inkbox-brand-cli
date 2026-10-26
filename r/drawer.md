# Drawer
A panel pulled up from the bottom edge with a handle, dragged away with a flick or a pull.

Install: npx inkbox-ds add drawer
Requires: theme, surface, utils
Packages: radix-ui
Exports: Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerOverlay, DrawerPortal, DrawerTitle, DrawerTrigger
Client boundary: yes
Reference: Extrapolated from the Inkbox console (Figma 427:2715): Modal - Create Agent (panel, title, scrim) and the field-edge lilac


## Usage
Use on phones for a task or a choice from the bottom of the screen (choose a phone line, confirm a key). Pair it with Dialog on larger screens when the same task is needed. Set direction for other edges.
- Avoid: A drawer without its handle
- Avoid: Dragging that fights scrolling content (mark scroll areas data-drawer-no-drag)
- Avoid: A drawer on desktop for long forms


## Examples
Example components: npx inkbox-ds add drawer button
Example packages: @phosphor-icons/react
[Preview](https://inkbox-ds.vercel.app/preview/drawer/Preview) | [Directions](https://inkbox-ds.vercel.app/preview/drawer/Directions) | [Open](https://inkbox-ds.vercel.app/preview/drawer/Open)

examples/drawer.tsx

```tsx
"use client";

import * as React from "react";
import { CheckCircleIcon } from "@phosphor-icons/react/ssr";

import { Button } from "@/components/ui/button";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";

const LINES = [
  { id: "shared", title: "Shared", body: "Assigned when someone connects to this agent." },
  { id: "dedicated", title: "Dedicated", body: "A number only this agent uses." },
];

function ChooseLine({ onChoose }: { onChoose?: () => void }) {
  const [line, setLine] = React.useState("shared");
  return (
    <>
      <DrawerHeader>
        <DrawerTitle>iMessage line</DrawerTitle>
        <DrawerDescription>Choose how recipients connect to @acme.</DrawerDescription>
      </DrawerHeader>
      <div role="radiogroup" aria-label="iMessage line" className="grid gap-2 px-6">
        {LINES.map((l) => (
          <button
            key={l.id}
            type="button"
            role="radio"
            aria-checked={line === l.id}
            onClick={() => setLine(l.id)}
            className="flex items-start gap-3 rounded-control bg-subtle p-3.5 text-left outline-none transition-colors duration-150 ease-out hover:bg-subtle-hover focus-visible:outline-2 focus-visible:outline-focus-ring aria-checked:bg-surface aria-checked:shadow-s motion-reduce:transition-none"
          >
            <span className="grid flex-1 gap-0.5">
              <span className="text-body font-medium text-fg">{l.title}</span>
              <span className="text-body text-fg-muted">{l.body}</span>
            </span>
            {line === l.id && <CheckCircleIcon weight="fill" className="size-5.5 text-success" />}
          </button>
        ))}
      </div>
      <DrawerFooter>
        <Button onClick={onChoose}>Use {line} line</Button>
        <DrawerClose asChild>
          <Button variant="secondary">Cancel</Button>
        </DrawerClose>
      </DrawerFooter>
    </>
  );
}

export function Preview() {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="flex justify-center">
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <Button variant="outline">Choose a line</Button>
        </DrawerTrigger>
        <DrawerContent>
          <div className="mx-auto w-full max-w-md">
            <ChooseLine onChoose={() => setOpen(false)} />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

export function Directions() {
  const directions = ["bottom", "top", "right", "left"] as const;
  return (
    <div className="flex flex-wrap justify-center gap-3">
      {directions.map((direction) => (
        <Drawer key={direction} direction={direction}>
          <DrawerTrigger asChild>
            <Button variant="outline" className="capitalize">
              {direction}
            </Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Drawer from the {direction}</DrawerTitle>
              <DrawerDescription>Drag it back toward its edge, or flick it, to close.</DrawerDescription>
            </DrawerHeader>
            <DrawerFooter>
              <DrawerClose asChild>
                <Button variant="secondary">Close</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ))}
    </div>
  );
}

export function Open() {
  return (
    <div className="min-h-120">
      <Drawer defaultOpen>
        <DrawerContent>
          <div className="mx-auto w-full max-w-md">
            <ChooseLine />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

```

## Source

components/ui/drawer.tsx

```tsx
"use client";

import * as React from "react";
import { Dialog as DrawerPrimitive } from "radix-ui";

import { usePortalContainer } from "@/lib/surface";
import { cn } from "@/lib/utils";

// A drawer, drawn as the console's dialog (Figma 427:2715: Create Agent Identity) and pulled from an edge: white over
// the blurred, ink-tinted page, 16px corners on its inner edge, a 40 by 4px handle in the field-edge lilac, a 20px
// regular title and 24px sides. It slides in on the drawer curve and can be dragged away: a flick (faster than 0.11px
// per ms) or a pull past a third of its size closes it, a shorter pull springs back on the same curve, and pulling the
// other way meets growing resistance instead of a wall. The drag follows the pointer even off the panel (pointer
// capture) and ignores a second finger.
type Direction = "bottom" | "top" | "left" | "right";

const DrawerContext = React.createContext<{ direction: Direction; setOpen: (open: boolean) => void }>({ direction: "bottom", setOpen: () => {} });

function Drawer({ open: openProp, defaultOpen = false, onOpenChange, direction = "bottom", ...props }: React.ComponentProps<typeof DrawerPrimitive.Root> & { direction?: Direction }) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultOpen);
  const open = openProp ?? uncontrolled;
  const setOpen = React.useCallback(
    (next: boolean) => {
      if (openProp === undefined) setUncontrolled(next);
      onOpenChange?.(next);
    },
    [openProp, onOpenChange],
  );
  return (
    <DrawerContext.Provider value={{ direction, setOpen }}>
      <DrawerPrimitive.Root data-slot="drawer" open={open} onOpenChange={setOpen} {...props} />
    </DrawerContext.Provider>
  );
}

function DrawerTrigger(props: React.ComponentProps<typeof DrawerPrimitive.Trigger>) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />;
}

function DrawerPortal(props: React.ComponentProps<typeof DrawerPrimitive.Portal>) {
  const container = usePortalContainer();
  return <DrawerPrimitive.Portal data-slot="drawer-portal" container={container} {...props} />;
}

function DrawerClose(props: React.ComponentProps<typeof DrawerPrimitive.Close>) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />;
}

function DrawerOverlay({ className, ...props }: React.ComponentProps<typeof DrawerPrimitive.Overlay>) {
  return (
    <DrawerPrimitive.Overlay
      data-slot="drawer-overlay"
      className={cn("fixed inset-0 z-50 bg-scrim backdrop-blur-[var(--ds-blur-scrim)] data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in", className)}
      {...props}
    />
  );
}

const PLACE: Record<Direction, string> = {
  bottom: "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-panel data-[state=closed]:animate-sheet-out-bottom data-[state=open]:animate-sheet-in-bottom",
  top: "inset-x-0 top-0 max-h-[85dvh] flex-col-reverse rounded-b-panel data-[state=closed]:animate-sheet-out-top data-[state=open]:animate-sheet-in-top",
  right: "inset-y-0 right-0 w-3/4 flex-row-reverse rounded-l-panel sm:max-w-96 data-[state=closed]:animate-sheet-out-right data-[state=open]:animate-sheet-in-right",
  left: "inset-y-0 left-0 w-3/4 flex-row rounded-r-panel sm:max-w-96 data-[state=closed]:animate-sheet-out-left data-[state=open]:animate-sheet-in-left",
};

// Where a pull closes the drawer: toward its own edge (positive for bottom and right).
const AXIS: Record<Direction, { axis: "x" | "y"; sign: 1 | -1 }> = { bottom: { axis: "y", sign: 1 }, top: { axis: "y", sign: -1 }, right: { axis: "x", sign: 1 }, left: { axis: "x", sign: -1 } };
const VELOCITY = 0.11;
const SKIP = "button, a, input, textarea, select, [role=slider], [contenteditable=true], [data-drawer-no-drag]";

function useDrag(direction: Direction, close: () => void) {
  const panel = React.useRef<HTMLDivElement>(null);
  const drag = React.useRef<{ id: number; start: number; at: number; time: number } | null>(null);
  const { axis, sign } = AXIS[direction];
  const translate = (px: number) => (axis === "y" ? `translateY(${px}px)` : `translateX(${px}px)`);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (drag.current || event.button !== 0) return; // one pointer only
    if ((event.target as Element).closest(SKIP)) return;
    if (window.getSelection()?.toString()) return;
    const start = axis === "y" ? event.clientY : event.clientX;
    drag.current = { id: event.pointerId, start, at: 0, time: performance.now() };
    event.currentTarget.setPointerCapture(event.pointerId);
    if (panel.current) panel.current.style.transition = "none";
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== event.pointerId || !panel.current) return;
    const raw = (axis === "y" ? event.clientY : event.clientX) - d.start;
    const toward = raw * sign;
    // Toward the edge it follows the pointer; away from it, resistance grows with distance.
    const moved = toward >= 0 ? toward : -Math.sqrt(-toward) * 2;
    d.at = moved;
    panel.current.style.transform = translate(moved * sign);
  };

  const end = (event: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== event.pointerId || !panel.current) return;
    drag.current = null;
    const el = panel.current;
    const size = axis === "y" ? el.offsetHeight : el.offsetWidth;
    const velocity = Math.abs(d.at) / Math.max(1, performance.now() - d.time);
    if (d.at > 0 && (d.at > size / 3 || velocity > VELOCITY)) {
      el.style.transition = "";
      close();
      return;
    }
    el.style.transition = "transform 500ms var(--ds-easing-drawer)";
    el.style.transform = "";
    const reset = () => {
      el.style.transition = "";
      el.removeEventListener("transitionend", reset);
    };
    el.addEventListener("transitionend", reset);
  };

  return { panel, handlers: { onPointerDown, onPointerMove, onPointerUp: end, onPointerCancel: end } };
}

function DrawerContent({ className, children, ...props }: React.ComponentProps<typeof DrawerPrimitive.Content>) {
  const { direction, setOpen } = React.useContext(DrawerContext);
  const { panel, handlers } = useDrag(direction, () => setOpen(false));
  const vertical = direction === "bottom" || direction === "top";
  return (
    <DrawerPortal>
      <DrawerOverlay />
      <DrawerPrimitive.Content
        ref={panel}
        data-slot="drawer-content"
        data-direction={direction}
        className={cn("group/drawer fixed z-50 flex touch-none bg-surface text-fg shadow-dialog outline-none", vertical ? "flex-col" : "", PLACE[direction], className)}
        {...handlers}
        {...props}
      >
        <div aria-hidden data-slot="drawer-handle" className={cn("shrink-0 rounded-pill bg-line-field", vertical ? "mx-auto my-3 h-1 w-10" : "my-auto mx-3 h-10 w-1")} />
        <div className="flex min-h-0 min-w-0 flex-1 touch-auto flex-col overflow-auto">{children}</div>
      </DrawerPrimitive.Content>
    </DrawerPortal>
  );
}

function DrawerHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="drawer-header" className={cn("flex flex-col gap-1 px-6 pt-2 pb-4 group-data-[direction=bottom]/drawer:text-center group-data-[direction=top]/drawer:text-center md:text-left md:group-data-[direction=bottom]/drawer:text-left", className)} {...props} />;
}

function DrawerFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="drawer-footer" className={cn("mt-auto flex flex-col gap-3 p-6", className)} {...props} />;
}

function DrawerTitle({ className, ...props }: React.ComponentProps<typeof DrawerPrimitive.Title>) {
  return <DrawerPrimitive.Title data-slot="drawer-title" className={cn("font-sans text-h3 leading-heading font-normal text-fg", className)} {...props} />;
}

function DrawerDescription({ className, ...props }: React.ComponentProps<typeof DrawerPrimitive.Description>) {
  return <DrawerPrimitive.Description data-slot="drawer-description" className={cn("text-body leading-body text-fg-secondary", className)} {...props} />;
}

export { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerOverlay, DrawerPortal, DrawerTitle, DrawerTrigger };

```
