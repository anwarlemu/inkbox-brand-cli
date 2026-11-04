# cn
Merges class names and resolves conflicts between the brand's own scales (text-body, rounded-control, shadow-s).

Install: npx inkbox-ds add utils
Requires: none
Packages: clsx, tailwind-merge
Exports: cn
Client boundary: not required by this entry file

## Usage
Compose every component's classes with cn so a caller's className replaces the default it conflicts with.


## Source

lib/utils.ts

```tsx
import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// The brand's scales have their own names (text-body-sm, rounded-control, shadow-s). Without teaching tailwind-merge,
// it reads text-body-sm as a text color and drops the real color beside it, and keeps a default rounded-md next to a
// brand radius meant to replace it. Brand text sizes do not set line height: keep explicit leading in either order.
const twMerge = extendTailwindMerge<"brand-font-size">({
  extend: {
    theme: {
      leading: ["tight", "heading", "display", "snug", "body", "relaxed", "code"],
      tracking: ["normal", "tight", "caps"],
      radius: ["xs", "sm", "control", "panel", "dialog", "pill"],
      shadow: ["s", "line", "card", "floating", "dialog", "knob", "focus"],
    },
    classGroups: {
      "brand-font-size": [{ text: ["display", "h1", "h2", "h3", "h4", "body-lg", "body", "body-sm", "caption", "micro"] }],
    },
    conflictingClassGroups: {
      "brand-font-size": ["font-size"],
      "font-size": ["brand-font-size"],
    },
    conflictingClassGroupModifiers: { "brand-font-size": ["leading"] },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

```
