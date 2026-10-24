"use client";

import * as React from "react";
import { ArrowSquareOutIcon } from "@phosphor-icons/react/ssr";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { PreviewPanel } from "@www/components/preview";

const PHONE = 390;
const MAX_HEIGHT = 2400;
// Next's development runtime needs cookies and same-origin HMR. Published previews stay isolated.
const PREVIEW_SANDBOX = process.env.NODE_ENV === "development" ? "allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox" : "allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox";

// Each mounted frame owns its height listener, including device changes and navigation.
function MeasuredFrame({ src, label, width, height, onHeightChange }: { src: string; label: string; width: number | string; height: number; onHeightChange: (height: number) => void }) {
  const frame = React.useRef<HTMLIFrameElement>(null);
  const updateHeight = React.useEffectEvent(onHeightChange);
  React.useEffect(() => {
    // Sandboxed previews have an opaque origin, so authenticate the sending window.
    const receiveHeight = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || event.data?.type !== "inkbox:preview-height") return;
      const value = event.data.height;
      if (typeof value === "number" && Number.isFinite(value)) updateHeight(Math.max(120, Math.min(MAX_HEIGHT, Math.ceil(value))));
    };
    window.addEventListener("message", receiveHeight);
    return () => window.removeEventListener("message", receiveHeight);
  }, [src]);
  return <iframe ref={frame} src={src} title={label} loading="lazy" sandbox={PREVIEW_SANDBOX} className="block border-0" style={{ width, height }} />;
}

/**
 * An example that opens an overlay, rendered alone in a frame so its dialog, menu or sheet stays inside the canvas.
 * Desktop fills the panel; phone shows it at 390px.
 */
export function FramePreview({ src, label }: { src: string; label: string }) {
  const [device, setDevice] = React.useState<"desktop" | "phone">("desktop");
  const [height, setHeight] = React.useState(320);
  return (
    <PreviewPanel
      label={label}
      actions={
        <div className="flex items-center gap-2">
          <Tabs value={device} onValueChange={(v) => setDevice(v as "desktop" | "phone")}>
            <TabsList aria-label="Window width" className="h-8.5">
              <TabsTrigger value="desktop" className="h-7.5 text-body-sm">Desktop</TabsTrigger>
              <TabsTrigger value="phone" className="h-7.5 text-body-sm">Phone</TabsTrigger>
            </TabsList>
          </Tabs>
          <a href={src} target="_blank" rel="noreferrer" aria-label={`Open ${label} alone`} className="inline-flex size-8 items-center justify-center rounded-pill text-icon-secondary outline-none transition-colors duration-150 ease-out hover:bg-subtle hover:text-fg focus-visible:outline-2 focus-visible:outline-focus-ring motion-reduce:transition-none">
            <ArrowSquareOutIcon className="size-5" />
          </a>
        </div>
      }
    >
      <div className={cn("flex justify-center", device === "phone" && "bg-subtle")}>
        <MeasuredFrame key={device} src={src} label={label} width={device === "phone" ? PHONE : "100%"} height={height} onHeightChange={setHeight} />
      </div>
    </PreviewPanel>
  );
}
