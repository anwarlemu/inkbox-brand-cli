"use client";

import * as React from "react";
import { ArrowDownIcon, ArrowUpIcon } from "@phosphor-icons/react/ssr";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// A conversation's scroll area. It opens at the newest message and stays pinned there while new messages arrive, until
// the reader scrolls up; then a white "Jump to latest" pill with Shadow/S appears at the bottom center. The pill only
// fades (200ms, the strong ease-out): it shows while someone is reading, and sliding would pull the eye off the text.
// The jump scrolls smoothly, or instantly with reduced motion.

type ScrollOptions = { behavior?: ScrollBehavior };

type ScrollerState = {
  isAtStart: boolean;
  isAtEnd: boolean;
  scrollable: boolean;
  viewport: HTMLDivElement | null;
  setViewport: (el: HTMLDivElement | null) => void;
  setContent: (el: HTMLDivElement | null) => void;
  update: () => void;
  scrollToEnd: (options?: ScrollOptions) => void;
  scrollToStart: (options?: ScrollOptions) => void;
};

const ScrollerContext = React.createContext<ScrollerState | null>(null);

// How close to the end still counts as reading the newest message.
const END_SLACK = 24;

function smoothUnlessReduced(): ScrollBehavior {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

/** Holds a scroller's state, so controls outside the scroll area (a composer's send button) can reach it. */
function MessageScrollerProvider({ children }: { children: React.ReactNode }) {
  const [viewport, setViewport] = React.useState<HTMLDivElement | null>(null);
  const [content, setContent] = React.useState<HTMLDivElement | null>(null);
  const [edges, setEdges] = React.useState({ isAtStart: true, isAtEnd: true, scrollable: false });
  // Pinned while the reader is at the newest message; new content then keeps the view at the end.
  const pinned = React.useRef(true);

  const update = React.useCallback(() => {
    if (!viewport) return;
    const { scrollTop, scrollHeight, clientHeight } = viewport;
    const isAtEnd = scrollHeight - scrollTop - clientHeight <= END_SLACK;
    const next = { isAtStart: scrollTop <= 1, isAtEnd, scrollable: scrollHeight > clientHeight + 1 };
    pinned.current = isAtEnd;
    setEdges((prev) => (prev.isAtStart === next.isAtStart && prev.isAtEnd === next.isAtEnd && prev.scrollable === next.scrollable ? prev : next));
  }, [viewport]);

  const scrollToEnd = React.useCallback(
    (options?: ScrollOptions) => {
      if (!viewport) return;
      pinned.current = true;
      viewport.scrollTo({ top: viewport.scrollHeight, behavior: options?.behavior ?? smoothUnlessReduced() });
    },
    [viewport],
  );

  const scrollToStart = React.useCallback(
    (options?: ScrollOptions) => {
      if (!viewport) return;
      pinned.current = false;
      viewport.scrollTo({ top: 0, behavior: options?.behavior ?? smoothUnlessReduced() });
    },
    [viewport],
  );

  // Open at the newest message.
  React.useLayoutEffect(() => {
    if (!viewport) return;
    viewport.scrollTop = viewport.scrollHeight;
    update();
  }, [viewport, update]);

  // Keep the newest message in view as content grows, unless the reader has scrolled away.
  React.useEffect(() => {
    if (!viewport || !content) return;
    const observer = new ResizeObserver(() => {
      if (pinned.current) viewport.scrollTop = viewport.scrollHeight;
      update();
    });
    observer.observe(content);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [viewport, content, update]);

  const value = React.useMemo<ScrollerState>(() => ({ ...edges, viewport, setViewport, setContent, update, scrollToEnd, scrollToStart }), [edges, viewport, update, scrollToEnd, scrollToStart]);
  return <ScrollerContext.Provider value={value}>{children}</ScrollerContext.Provider>;
}

function useScrollerContext(part: string) {
  const context = React.useContext(ScrollerContext);
  if (!context) throw new Error(`${part} must be used inside MessageScroller.`);
  return context;
}

/** The scroller's position and controls: whether it is at the start or the end, and functions to jump there. */
function useMessageScroller() {
  const { isAtStart, isAtEnd, scrollToEnd, scrollToStart } = useScrollerContext("useMessageScroller");
  return { isAtStart, isAtEnd, scrollToEnd, scrollToStart };
}

/** Whether there is more to scroll to in each direction. */
function useMessageScrollerScrollable() {
  const { isAtStart, isAtEnd, scrollable } = useScrollerContext("useMessageScrollerScrollable");
  return { scrollable, canScrollStart: scrollable && !isAtStart, canScrollEnd: scrollable && !isAtEnd };
}

/** Whether an element (an unread marker, a message) is in view inside the scroller. */
function useMessageScrollerVisibility(ref: React.RefObject<Element | null>, threshold = 0.5) {
  const { viewport } = useScrollerContext("useMessageScrollerVisibility");
  const [visible, setVisible] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!viewport || !el) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { root: viewport, threshold });
    observer.observe(el);
    return () => observer.disconnect();
  }, [viewport, ref, threshold]);
  return visible;
}

function ScrollerRoot({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="message-scroller" className={cn("group/message-scroller relative flex size-full min-h-0 flex-col overflow-hidden", className)} {...props} />;
}

function MessageScroller(props: React.ComponentProps<"div">) {
  const parent = React.useContext(ScrollerContext);
  if (parent) return <ScrollerRoot {...props} />;
  return (
    <MessageScrollerProvider>
      <ScrollerRoot {...props} />
    </MessageScrollerProvider>
  );
}

function MessageScrollerViewport({ className, onScroll, ...props }: React.ComponentProps<"div">) {
  const { setViewport, update } = useScrollerContext("MessageScrollerViewport");
  return (
    <div
      ref={setViewport}
      data-slot="message-scroller-viewport"
      tabIndex={0}
      role="log"
      aria-live="polite"
      onScroll={(event) => {
        update();
        onScroll?.(event);
      }}
      className={cn("size-full min-h-0 min-w-0 overflow-y-auto overscroll-contain outline-none [scrollbar-gutter:stable] [scrollbar-width:thin] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring", className)}
      {...props}
    />
  );
}

function MessageScrollerContent({ className, ...props }: React.ComponentProps<"div">) {
  const { setContent } = useScrollerContext("MessageScrollerContent");
  return <div ref={setContent} data-slot="message-scroller-content" className={cn("flex h-max min-h-full flex-col justify-end gap-6 p-4", className)} {...props} />;
}

/**
 * One entry of the conversation. `scrollAnchor` brings it to the top of the view when it mounts (the message just
 * sent, so its reply grows below it).
 */
function MessageScrollerItem({ className, scrollAnchor = false, ...props }: React.ComponentProps<"div"> & { scrollAnchor?: boolean }) {
  const { viewport } = useScrollerContext("MessageScrollerItem");
  const ref = React.useRef<HTMLDivElement>(null);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!scrollAnchor || !viewport || !el) return;
    viewport.scrollTop += el.getBoundingClientRect().top - viewport.getBoundingClientRect().top;
  }, [scrollAnchor, viewport]);
  return <div ref={ref} data-slot="message-scroller-item" data-scroll-anchor={scrollAnchor || undefined} className={cn("min-w-0 shrink-0", className)} {...props} />;
}

function MessageScrollerButton({ direction = "end", className, children, variant = "secondary", size = "sm", onClick, ...props }: React.ComponentProps<typeof Button> & { direction?: "start" | "end" }) {
  const { isAtStart, isAtEnd, scrollable, scrollToEnd, scrollToStart } = useScrollerContext("MessageScrollerButton");
  const active = scrollable && (direction === "end" ? !isAtEnd : !isAtStart);
  return (
    <Button
      data-slot="message-scroller-button"
      data-direction={direction}
      data-active={active}
      aria-hidden={!active || undefined}
      tabIndex={active ? undefined : -1}
      variant={variant}
      size={size}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) (direction === "end" ? scrollToEnd : scrollToStart)();
      }}
      className={cn(
        "absolute left-1/2 z-10 -translate-x-1/2 gap-1.5 bg-surface px-3.5 text-body shadow-floating transition-[opacity,background-color,scale] duration-200 ease-out hover:bg-subtle data-[active=false]:pointer-events-none data-[active=false]:opacity-0 data-[direction=end]:bottom-4 data-[direction=start]:top-4 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      {children ?? (
        <>
          {direction === "end" ? <ArrowDownIcon weight="bold" /> : <ArrowUpIcon weight="bold" />}
          {direction === "end" ? "Jump to latest" : "Jump to first"}
        </>
      )}
    </Button>
  );
}

export {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
  useMessageScroller,
  useMessageScrollerScrollable,
  useMessageScrollerVisibility,
};
