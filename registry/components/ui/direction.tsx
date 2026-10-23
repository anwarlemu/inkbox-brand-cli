"use client";

import * as React from "react";
import { Direction } from "radix-ui";

// Sets the reading direction (ltr or rtl) for every Radix-based component inside it, so menus, sliders and tabs flip
// for right-to-left text. It renders nothing of its own; set dir on the element you wrap too.
function DirectionProvider({ dir, direction, children }: React.ComponentProps<typeof Direction.DirectionProvider> & { direction?: React.ComponentProps<typeof Direction.DirectionProvider>["dir"] }) {
  return <Direction.DirectionProvider dir={direction ?? dir}>{children}</Direction.DirectionProvider>;
}

const useDirection = Direction.useDirection;

export { DirectionProvider, useDirection };
