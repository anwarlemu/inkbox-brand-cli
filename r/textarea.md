# Textarea
The field's 8px corners and lilac-gray edge around several lines of 14px text, 72px tall to start.

Install: npx inkbox-ds add textarea
Requires: theme, utils
Packages: @chakra-ui/react
Exports: Textarea
Client boundary: yes
Reference: Figma 427:2715: Agent Description (Form- Input, 72px) in Create Agent Identity


## Usage
Use for free text longer than a line (Agent Description, a note, a message). Label it above like Input. It grows with its content; set rows or a min-h class to change the starting height.
- Avoid: A textarea without a label
- Avoid: A gray background for an editable value
- Avoid: A fixed height that hides what was typed


## Examples
Example components: npx inkbox-ds add textarea label
[Preview](https://inkbox-ds.vercel.app/preview/textarea/Preview) | [States](https://inkbox-ds.vercel.app/preview/textarea/States)

examples/textarea.tsx

```tsx
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function Preview() {
  return (
    <div className="grid w-full max-w-100.5 gap-1">
      <Label htmlFor="description">Agent description</Label>
      <Textarea id="description" placeholder="Agent Description" />
    </div>
  );
}

export function States() {
  return (
    <div className="grid w-full max-w-100.5 gap-3">
      <Textarea aria-label="Note" defaultValue="Answers billing questions for Acme and forwards anything about refunds to Robert." />
      <Textarea aria-label="Invalid note" defaultValue="" placeholder="Required" aria-invalid />
      <Textarea aria-label="Read-only" readOnly defaultValue="Created by the Inkbox CLI on Jul 27, 2026." />
      <Textarea aria-label="Disabled" disabled placeholder="Disabled" />
    </div>
  );
}

```

## Source

components/ui/textarea.tsx

```tsx
"use client";

import * as React from "react";
import { Textarea as ChakraTextarea } from "@chakra-ui/react";

import { cn } from "@/lib/utils";

// The console's multi-line field (Agent Description in Create Agent Identity, 72px tall): the field's 8px corners and
// lilac-gray edge on white, 14px ink on 20px lines with 10px above and 14px at the sides, the light purple placeholder.
// It grows with its content (field-sizing), from 72px. Focus, invalid and read-only states match Input.
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <ChakraTextarea
      unstyled
      data-slot="textarea"
      className={cn(
        "field-sizing-content flex min-h-18 w-full min-w-0 resize rounded-control border border-line-field bg-surface px-3.5 py-2.5 font-sans text-body leading-5 text-fg outline-none transition-[border-color,box-shadow] duration-150 ease-out placeholder:text-fg-subtle selection:bg-ring-tint focus-visible:border-line-brand focus-visible:shadow-focus aria-invalid:border-danger aria-invalid:focus-visible:shadow-none read-only:bg-subtle read-only:text-fg-muted disabled:cursor-not-allowed disabled:bg-subtle disabled:text-fg-muted motion-reduce:transition-none",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };

```
