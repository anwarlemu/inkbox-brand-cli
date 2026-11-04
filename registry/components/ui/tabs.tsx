"use client";

import * as React from "react";
import { Tabs as ChakraTabs, useTabsContext } from "@chakra-ui/react";

import { cn } from "@/lib/utils";

// The console's segmented tabs (src/components/ui/tabs.tsx and the Tabs theme): a lilac track with 4px of inset and
// 4px between tabs, corners concentric with the tabs (20px), wrapping when it runs out of room. Each tab is 32px tall
// with 12px sides and a 13px regular label in the secondary purple; hover turns the label brand purple, the selected
// tab is ink. A white key with Shadow/S sits under the selected tab and slides to the next one (transform, width and
// height over 160ms, ease-out). It is placed without motion the first time and whenever the track resizes, and never
// moves under reduced motion. `full` stretches the tabs to share the track (Login, Sign up).
type TabsProps = Omit<React.ComponentProps<typeof ChakraTabs.Root>, "onValueChange"> & { onValueChange?: (value: string) => void };
function Tabs({ className, onValueChange, ...props }: TabsProps) {
  return <ChakraTabs.Root unstyled data-slot="tabs" className={cn("flex flex-col gap-4", className)} onValueChange={(details) => onValueChange?.(details.value)} {...props} />;
}

const KEY_MOVE = ["transform", "width", "height"].map((property) => `${property} var(--ds-duration-slow) var(--ds-easing-out)`).join(", ");

/** Puts the key under the selected tab. It slides only once it has been placed, and never under reduced motion. */
function placeKey(box: HTMLElement | null, key: HTMLElement | null, animate: boolean) {
  if (!box || !key) return;
  const tab = box.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
  if (!tab?.offsetWidth) {
    key.style.visibility = "hidden";
    delete box.dataset.sliding;
    return;
  }
  const still = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  key.style.transition = animate && !still && "sliding" in box.dataset ? KEY_MOVE : "none";
  key.style.width = `${tab.offsetWidth}px`;
  key.style.height = `${tab.offsetHeight}px`;
  key.style.transform = `translate(${tab.offsetLeft}px, ${tab.offsetTop}px)`;
  key.style.visibility = "visible";
  box.dataset.sliding = "";
}

function TabsList({ className, full = false, children, ref, ...props }: React.ComponentProps<typeof ChakraTabs.List> & { full?: boolean }) {
  const { value } = useTabsContext();
  const list = React.useRef<HTMLDivElement | null>(null);
  const key = React.useRef<HTMLSpanElement>(null);
  const setRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      list.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  React.useLayoutEffect(() => placeKey(list.current, key.current, true), [value]);
  React.useLayoutEffect(() => {
    const box = list.current;
    if (!box || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => placeKey(box, key.current, false));
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  return (
    <ChakraTabs.List
      ref={setRef}
      data-slot="tabs-list"
      data-full={full ? "true" : undefined}
      className={cn(
        "relative inline-flex w-fit max-w-full flex-wrap items-center gap-1 rounded-[calc(var(--ds-radius-panel)+var(--ds-space-1))] bg-subtle p-1 in-[[role=dialog]]:-ms-1",
        full && "flex w-full",
        className,
      )}
      {...props}
    >
      <span ref={key} aria-hidden data-slot="tabs-key" className="pointer-events-none invisible absolute top-0 left-0 rounded-pill bg-surface shadow-s" />
      {children}
    </ChakraTabs.List>
  );
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof ChakraTabs.Trigger>) {
  return (
    <ChakraTabs.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative z-1 inline-flex h-8 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-pill bg-transparent px-3 font-sans text-body-sm leading-none font-normal whitespace-nowrap text-fg-secondary outline-none transition-[background-color,box-shadow,color] duration-fast ease-out hover:text-fg-brand active:text-fg focus-visible:shadow-focus disabled:pointer-events-none disabled:text-fg-muted data-[selected]:bg-surface data-[selected]:text-fg data-[selected]:shadow-s data-[selected]:hover:text-fg data-[selected]:focus-visible:shadow-focus in-data-[sliding]:data-[selected]:bg-transparent in-data-[sliding]:data-[selected]:shadow-none in-data-[sliding]:data-[selected]:focus-visible:shadow-focus motion-reduce:transition-none in-data-[full=true]:flex-1 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof ChakraTabs.Content>) {
  return <ChakraTabs.Content data-slot="tabs-content" className={cn("min-w-0 rounded-xs outline-none focus-visible:shadow-focus", className)} {...props} />;
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
