"use client";

import { useEffect } from "react";

/** Report the example's height without giving its frame access to the docs document. */
export function PreviewHeight() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>("[data-preview-root]");
    if (!root) return;
    root.setAttribute("data-preview-ready", "");
    if (window.parent === window) return;
    // Open destinations outside the isolated canvas; keep local anchors within the example.
    const openLink = (event: MouseEvent) => {
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!anchor || anchor.getAttribute("href")?.startsWith("#")) return;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
    };
    root.addEventListener("click", openLink, true);
    const observer = new ResizeObserver(() => {
      window.parent.postMessage({ type: "inkbox:preview-height", height: root.getBoundingClientRect().height }, window.location.origin);
    });
    observer.observe(root);
    return () => { observer.disconnect(); root.removeEventListener("click", openLink, true); };
  }, []);
  return null;
}
