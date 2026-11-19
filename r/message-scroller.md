# Message Scroller
A conversation's scroll area that opens at the newest message, stays pinned to it as messages arrive, and offers a white Jump to latest pill once the reader scrolls up.

Install: npx inkbox-ds add message-scroller
Requires: theme, button, utils
Packages: @phosphor-icons/react
Exports: MessageScroller, MessageScrollerButton, MessageScrollerContent, MessageScrollerItem, MessageScrollerProvider, MessageScrollerViewport, useMessageScroller, useMessageScrollerScrollable, useMessageScrollerVisibility
Client boundary: yes
Reference: Extrapolated from the Inkbox console (Figma 427:2715): the inbox list and reading pane, the white key with Shadow/S


## Usage
Wrap a conversation: MessageScroller, then MessageScrollerViewport around MessageScrollerContent, one MessageScrollerItem per message, and a MessageScrollerButton. Give the scroller a fixed height (it fills its parent). Set scrollAnchor on the item the person just sent so the reply grows below it. Use MessageScrollerProvider to reach the scroller from outside (a composer), and the hooks useMessageScroller, useMessageScrollerScrollable and useMessageScrollerVisibility for custom controls.
- Avoid: Sliding the jump pill in and out
- Avoid: Scrolling away from what the reader is reading when a message arrives
- Avoid: A scroller without a fixed height


## Examples
Example components: npx inkbox-ds add message-scroller bubble button input marker message
Example packages: @phosphor-icons/react
[Preview](https://inkbox-ds.vercel.app/preview/message-scroller/Preview) | [Streaming](https://inkbox-ds.vercel.app/preview/message-scroller/Streaming)

examples/message-scroller.tsx

```tsx
"use client";

import * as React from "react";
import { PaperPlaneRightIcon } from "@phosphor-icons/react/ssr";

import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Marker, MarkerContent } from "@/components/ui/marker";
import { Message, MessageContent, MessageHeader } from "@/components/ui/message";
import { MessageScroller, MessageScrollerButton, MessageScrollerContent, MessageScrollerItem, MessageScrollerProvider, MessageScrollerViewport, useMessageScroller } from "@/components/ui/message-scroller";

type Entry = { id: number; from: "contact" | "agent"; text: string };

const START: Entry[] = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  from: i % 3 === 2 ? "agent" : "contact",
  text: i % 3 === 2 ? `Logged ticket #${4100 + i} and replied to the customer.` : `Message ${i + 1}: can you check the delivery log for message.sent?`,
}));

function Composer({ onSend }: { onSend: (text: string) => void }) {
  const { scrollToEnd } = useMessageScroller();
  const [text, setText] = React.useState("");
  return (
    <form
      className="flex items-center gap-2 border-t border-line-subtle p-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!text.trim()) return;
        onSend(text.trim());
        setText("");
        scrollToEnd({ behavior: "auto" });
      }}
    >
      <Input aria-label="Message" value={text} onChange={(e) => setText(e.target.value)} placeholder="Write to your agent" />
      <Button type="submit" size="icon-lg" aria-label="Send">
        <PaperPlaneRightIcon weight="fill" />
      </Button>
    </form>
  );
}

export function Preview() {
  const [entries, setEntries] = React.useState(START);
  return (
    <div className="mx-auto flex h-110 w-full max-w-140 flex-col overflow-hidden rounded-control border border-line-field bg-surface">
      <MessageScrollerProvider>
        <MessageScroller className="min-h-0 flex-1">
          <MessageScrollerViewport>
            <MessageScrollerContent className="gap-4">
              <Marker variant="separator">
                <MarkerContent>Yesterday</MarkerContent>
              </Marker>
              {entries.map((entry) => (
                <MessageScrollerItem key={entry.id}>
                  <Message align={entry.from === "agent" ? "end" : "start"}>
                    <MessageContent>
                      <MessageHeader>{entry.from === "agent" ? "@acme" : "Ray Liao"}</MessageHeader>
                      <Bubble variant={entry.from === "agent" ? "default" : "secondary"} align={entry.from === "agent" ? "end" : "start"}>
                        <BubbleContent>{entry.text}</BubbleContent>
                      </Bubble>
                    </MessageContent>
                  </Message>
                </MessageScrollerItem>
              ))}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton />
        </MessageScroller>
        <Composer onSend={(text) => setEntries((all) => [...all, { id: all.length, from: "agent", text }])} />
      </MessageScrollerProvider>
    </div>
  );
}

export function Streaming() {
  const [count, setCount] = React.useState(3);
  React.useEffect(() => {
    if (count >= 12) return;
    // ds-latency: simulates incoming messages in this example; scrolling and input remain immediate.
    const t = setTimeout(() => setCount((c) => c + 1), 900);
    return () => clearTimeout(t);
  }, [count]);
  return (
    <div className="mx-auto h-80 w-full max-w-140 overflow-hidden rounded-control border border-line-field bg-surface">
      <MessageScroller>
        <MessageScrollerViewport>
          <MessageScrollerContent className="gap-2">
            {Array.from({ length: count }, (_, i) => (
              <MessageScrollerItem key={i}>
                <Bubble variant="secondary">
                  <BubbleContent>{`Delivery ${i + 1}: message.delivered to https://example.com/hooks returned 200.`}</BubbleContent>
                </Bubble>
              </MessageScrollerItem>
            ))}
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton direction="start" />
        <MessageScrollerButton />
      </MessageScroller>
    </div>
  );
}

```

## Source

components/ui/message-scroller.tsx

```tsx
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
        "absolute left-1/2 z-10 -translate-x-1/2 gap-1.5 bg-surface px-3.5 text-body shadow-floating transition-[opacity,background-color] duration-200 ease-out hover:bg-subtle data-[active=false]:pointer-events-none data-[active=false]:opacity-0 data-[direction=end]:bottom-4 data-[direction=start]:top-4 [&_svg:not([class*='size-'])]:size-4",
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

```
