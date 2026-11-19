# Input
The 40px pill field with the lilac-gray edge, 16px of padding and a light purple placeholder; the edge darkens under the pointer and turns purple with the soft ring on focus.

Install: npx inkbox-ds add input
Requires: theme, utils
Packages: @chakra-ui/react
Exports: Input, inputClassName
Client boundary: yes
Reference: The Inkbox console's Input theme; Figma 427:2715: Form- Input in Create Agent Identity, Login and Vault


## Usage
Use for one line of text: a handle, an email, a key. Pair it with Label (or Field) above it. Set aria-invalid when the value is rejected and say why below it; set readOnly for a value the person cannot change (it sits on the lilac with muted text). For search, put a 16px magnifier at the start with Input Group and keep type text.
- Avoid: A placeholder used as the only label
- Avoid: A square or 8px-cornered field
- Avoid: A gray field background for an editable value
- Avoid: type="search" (its clear button and styling differ by browser)


## Examples
Example components: npx inkbox-ds add input label
[Preview](https://inkbox-ds.vercel.app/preview/input/Preview) | [States](https://inkbox-ds.vercel.app/preview/input/States)

examples/input.tsx

```tsx
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function Preview() {
  return (
    <div className="grid w-full max-w-86 gap-1">
      <Label htmlFor="email">Email address</Label>
      <Input id="email" type="email" placeholder="your@email.com" autoComplete="email" />
    </div>
  );
}

export function States() {
  return (
    <div className="grid w-full max-w-100 gap-3">
      <Input aria-label="Agent display name" placeholder="Agent display name" />
      <Input aria-label="Agent handle" defaultValue="acme-support" aria-invalid />
      <Input aria-label="Mailbox" defaultValue="acme-support" readOnly />
      <Input aria-label="Disabled" placeholder="Disabled" disabled />
    </div>
  );
}

```

## Source

components/ui/input.tsx

```tsx
"use client";

import * as React from "react";
import { Input as ChakraInput } from "@chakra-ui/react";

import { cn } from "@/lib/utils";

// The console's field (its Chakra Input and Figma "Form- Input"): a 40px pill, the lilac-gray edge on white, 14px ink
// text and a lighter purple placeholder, 16px in from the edge. The edge darkens under the pointer; focus takes the
// purple edge and the soft ring; aria-invalid takes the red edge with no ring (Not Available). A read-only or disabled
// field sits on the lilac with muted text (the email local part in a channel card). For a search field put a 16px
// magnifier at its start with an InputGroup; keep type="text".
const FIELD =
  "h-10 w-full min-w-0 rounded-pill border border-line-field bg-surface px-4 font-sans text-body leading-tight text-fg outline-none transition-[border-color,box-shadow] duration-fast ease-out placeholder:text-fg-subtle hover:border-line-strong selection:bg-ring-tint focus-visible:border-line-brand focus-visible:shadow-focus aria-invalid:border-danger aria-invalid:focus-visible:shadow-none read-only:bg-subtle read-only:text-fg-muted disabled:cursor-not-allowed disabled:bg-subtle disabled:text-fg-muted motion-reduce:transition-none file:mr-3 file:border-0 file:bg-transparent file:font-sans file:text-body file:font-medium file:text-fg";

function Input({ className, type = "text", size, ...props }: React.ComponentProps<"input">) {
  return <ChakraInput unstyled type={type} htmlSize={size} data-slot="input" className={cn(FIELD, className)} {...props} />;
}

export { Input, FIELD as inputClassName };

```
