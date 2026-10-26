# Resizable
Panels split by the console's 1px lilac rule, which can be dragged or moved with the arrow keys.

Install: npx inkbox-ds add resizable
Requires: theme, utils
Packages: @phosphor-icons/react
Exports: ResizableHandle, ResizablePanel, ResizablePanelGroup
Client boundary: yes
Reference: Extrapolated from the Inkbox console (Figma 427:2715): the 1px rules between the rails and the inbox list


## Usage
Use for a workspace whose panes people size themselves (the inbox list beside a message, a log beside its detail). Give each ResizablePanel a defaultSize in percent and sensible minSize; add withHandle when the edge needs to be found.
- Avoid: Thick or colored dividers
- Avoid: Panels that can collapse to nothing without a minSize
- Avoid: Animating the panes while dragging


## Examples
Example components: npx inkbox-ds add resizable
[Preview](https://inkbox-ds.vercel.app/preview/resizable/Preview) | [Nested](https://inkbox-ds.vercel.app/preview/resizable/Nested)

examples/resizable.tsx

```tsx
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";

function Pane({ label, className }: { label: string; className?: string }) {
  return <div className={"flex h-full items-center justify-center p-6 text-body text-fg-muted " + (className ?? "")}>{label}</div>;
}

export function Preview() {
  return (
    <ResizablePanelGroup direction="horizontal" className="min-h-64 max-w-2xl overflow-hidden rounded-panel border border-line-subtle">
      <ResizablePanel defaultSize={36} minSize={20}>
        <Pane label="Inbox" className="bg-subtle" />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={64} minSize={30}>
        <Pane label="Message" />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

export function Nested() {
  return (
    <ResizablePanelGroup direction="horizontal" className="min-h-72 max-w-2xl overflow-hidden rounded-panel border border-line-subtle">
      <ResizablePanel defaultSize={30} minSize={15}>
        <Pane label="Agents" className="bg-subtle" />
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={70}>
        <ResizablePanelGroup direction="vertical">
          <ResizablePanel defaultSize={40} minSize={20}>
            <Pane label="Delivery log" />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={60} minSize={20}>
            <Pane label="Payload" />
          </ResizablePanel>
        </ResizablePanelGroup>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

```

## Source

components/ui/resizable.tsx

```tsx
"use client";

import * as React from "react";
import { DotsSixVerticalIcon } from "@phosphor-icons/react/ssr";

import { cn } from "@/lib/utils";

// Panels with a draggable edge between them (extrapolated from the Inkbox console, Figma 427:2715: the 1px rules
// between its rails and the inbox list). The handle is the console's 1px lilac rule with a wide invisible grip; with
// `withHandle` it carries a 12 by 20 white tab with 4px corners, the field edge and a grip glyph. Drag it, or focus it
// and use the arrow keys (Home and End go to the limits). Sizes are percentages of the group; dragging follows the
// pointer directly, with no animation.

type Direction = "horizontal" | "vertical";
type PanelInfo = { id: string; defaultSize?: number; minSize: number; maxSize: number; order: number };
type GroupContext = {
  direction: Direction;
  sizes: Record<string, number>;
  register: (info: PanelInfo) => () => void;
  resize: (handleEl: HTMLElement, delta: number) => void;
  set: (handleEl: HTMLElement, to: "min" | "max") => void;
  limits: (handleEl: HTMLElement) => { before?: string; value: number; min: number; max: number };
};

const ResizableContext = React.createContext<GroupContext | null>(null);
const useGroup = () => {
  const ctx = React.useContext(ResizableContext);
  if (!ctx) throw new Error("Resizable parts must be used within a <ResizablePanelGroup />");
  return ctx;
};

function ResizablePanelGroup({ direction = "horizontal", className, onLayout, children, ...props }: Omit<React.ComponentProps<"div">, "dir"> & { direction?: Direction; onLayout?: (sizes: number[]) => void }) {
  const [panels, setPanels] = React.useState<PanelInfo[]>([]);
  const [sizes, setSizes] = React.useState<Record<string, number>>({});
  const group = React.useRef<HTMLDivElement>(null);
  const counter = React.useRef(0);

  const register = React.useCallback((info: PanelInfo) => {
    setPanels((p) => [...p.filter((x) => x.id !== info.id), { ...info, order: counter.current++ }]);
    return () => setPanels((p) => p.filter((x) => x.id !== info.id));
  }, []);

  // Panels without a default size share what the others leave.
  React.useEffect(() => {
    setSizes((current) => {
      const ids = panels.map((p) => p.id);
      if (ids.every((id) => id in current) && Object.keys(current).length === ids.length) return current;
      const fixed = panels.filter((p) => p.defaultSize !== undefined).reduce((s, p) => s + (p.defaultSize ?? 0), 0);
      const free = panels.filter((p) => p.defaultSize === undefined).length;
      return Object.fromEntries(panels.map((p) => [p.id, p.defaultSize ?? Math.max(0, (100 - fixed) / Math.max(1, free))]));
    });
  }, [panels]);

  const ordered = React.useCallback(() => {
    const els = Array.from(group.current?.querySelectorAll<HTMLElement>(":scope > [data-slot=resizable-panel]") ?? []);
    return els.map((el) => el.dataset.panelId!);
  }, []);

  const neighbors = React.useCallback((handleEl: HTMLElement) => {
    let prev = handleEl.previousElementSibling as HTMLElement | null;
    while (prev && prev.dataset.slot !== "resizable-panel") prev = prev.previousElementSibling as HTMLElement | null;
    let next = handleEl.nextElementSibling as HTMLElement | null;
    while (next && next.dataset.slot !== "resizable-panel") next = next.nextElementSibling as HTMLElement | null;
    return [prev?.dataset.panelId, next?.dataset.panelId] as const;
  }, []);

  const info = (id?: string) => panels.find((p) => p.id === id);

  const apply = React.useCallback((a: string, b: string, nextA: number) => {
    setSizes((s) => {
      const pa = panels.find((p) => p.id === a);
      const pb = panels.find((p) => p.id === b);
      if (!pa || !pb) return s;
      const total = s[a] + s[b];
      const lo = Math.max(pa.minSize, total - pb.maxSize);
      const hi = Math.min(pa.maxSize, total - pb.minSize);
      const clamped = Math.min(hi, Math.max(lo, nextA));
      if (clamped === s[a]) return s;
      const out = { ...s, [a]: clamped, [b]: total - clamped };
      onLayout?.(ordered().map((id) => out[id]));
      return out;
    });
  }, [onLayout, ordered, panels]);

  const resize = React.useCallback((handleEl: HTMLElement, delta: number) => {
    const [a, b] = neighbors(handleEl);
    if (a && b) apply(a, b, (sizes[a] ?? 0) + delta);
  }, [apply, neighbors, sizes]);

  const set = React.useCallback((handleEl: HTMLElement, to: "min" | "max") => {
    const [a, b] = neighbors(handleEl);
    if (a && b) apply(a, b, to === "min" ? 0 : 100);
  }, [apply, neighbors]);

  const limits = (handleEl: HTMLElement) => {
    const [a] = neighbors(handleEl);
    const p = info(a);
    return { before: a, value: a ? Math.round(sizes[a] ?? 0) : 0, min: p?.minSize ?? 0, max: p?.maxSize ?? 100 };
  };

  return (
    <ResizableContext.Provider value={{ direction, sizes, register, resize, set, limits }}>
      <div
        ref={group}
        data-slot="resizable-panel-group"
        data-panel-group-direction={direction}
        className={cn("flex h-full w-full", direction === "vertical" && "flex-col", className)}
        {...props}
      >
        {children}
      </div>
    </ResizableContext.Provider>
  );
}

function ResizablePanel({ defaultSize, minSize = 0, maxSize = 100, className, style, id: idProp, ...props }: React.ComponentProps<"div"> & { defaultSize?: number; minSize?: number; maxSize?: number }) {
  const { register, sizes } = useGroup();
  const auto = React.useId();
  const id = idProp ?? auto;
  React.useLayoutEffect(() => register({ id, defaultSize, minSize, maxSize, order: 0 }), [register, id, defaultSize, minSize, maxSize]);
  const size = sizes[id] ?? defaultSize;
  return (
    <div
      data-slot="resizable-panel"
      data-panel-id={id}
      data-panel-size={size === undefined ? undefined : Math.round(size)}
      className={cn("min-h-0 min-w-0 overflow-hidden", className)}
      style={{ flexGrow: size ?? 1, flexShrink: 1, flexBasis: 0, ...style }}
      {...props}
    />
  );
}

function ResizableHandle({ withHandle, className, ...props }: React.ComponentProps<"div"> & { withHandle?: boolean }) {
  const { direction, resize, set, limits } = useGroup();
  const ref = React.useRef<HTMLDivElement>(null);
  const drag = React.useRef<{ start: number; size: number; pointer: number } | null>(null);
  const [, force] = React.useReducer((n: number) => n + 1, 0);
  const vertical = direction === "vertical";
  React.useEffect(() => force(), []);
  const lim = ref.current ? limits(ref.current) : { value: 0, min: 0, max: 100 };

  return (
    <div
      ref={ref}
      role="separator"
      tabIndex={0}
      aria-orientation={vertical ? "horizontal" : "vertical"}
      aria-valuenow={lim.value}
      aria-valuemin={lim.min}
      aria-valuemax={lim.max}
      aria-label="Resize"
      data-slot="resizable-handle"
      data-panel-group-direction={direction}
      className={cn(
        "relative flex shrink-0 touch-none items-center justify-center bg-line-subtle outline-none select-none after:absolute focus-visible:bg-line-brand focus-visible:outline-none data-[dragging]:bg-line-brand",
        vertical ? "h-px w-full cursor-row-resize after:inset-x-0 after:-inset-y-1.5" : "w-px cursor-col-resize after:inset-y-0 after:-inset-x-1.5",
        className,
      )}
      onPointerDown={(e) => {
        if (drag.current || e.button !== 0) return;
        const group = ref.current?.parentElement;
        if (!group) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        e.currentTarget.dataset.dragging = "";
        drag.current = { start: vertical ? e.clientY : e.clientX, size: vertical ? group.clientHeight : group.clientWidth, pointer: e.pointerId };
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d || e.pointerId !== d.pointer || !ref.current) return;
        const pos = vertical ? e.clientY : e.clientX;
        const delta = ((pos - d.start) / d.size) * 100;
        if (Math.abs(delta) < 0.1) return;
        resize(ref.current, delta);
        d.start = pos;
      }}
      onPointerUp={(e) => {
        drag.current = null;
        delete e.currentTarget.dataset.dragging;
      }}
      onPointerCancel={(e) => {
        drag.current = null;
        delete e.currentTarget.dataset.dragging;
      }}
      onKeyDown={(e) => {
        if (!ref.current) return;
        const step = e.shiftKey ? 10 : 2;
        const back = vertical ? "ArrowUp" : "ArrowLeft";
        const forward = vertical ? "ArrowDown" : "ArrowRight";
        if (e.key === back || e.key === forward) {
          e.preventDefault();
          resize(ref.current, e.key === back ? -step : step);
        } else if (e.key === "Home" || e.key === "End") {
          e.preventDefault();
          set(ref.current, e.key === "Home" ? "min" : "max");
        }
      }}
      {...props}
    >
      {withHandle && (
        <div className={cn("z-10 flex items-center justify-center rounded-xs border border-line-field bg-surface text-icon-secondary", vertical ? "h-3 w-5" : "h-5 w-3")}>
          <DotsSixVerticalIcon weight="bold" className={cn("size-3", vertical && "rotate-90")} />
        </div>
      )}
    </div>
  );
}

export { ResizableHandle, ResizablePanel, ResizablePanelGroup };

```
