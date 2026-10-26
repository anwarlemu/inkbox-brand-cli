# Input
The 40px field with 8px corners, the lilac-gray edge and a light purple placeholder.

Install: npx inkbox-ds add input
Requires: theme, utils
Packages: @chakra-ui/react
Exports: Input, inputClassName
Client boundary: yes
Reference: Figma 427:2715: Form- Input in Create Agent Identity, Login and Vault


## Usage
Use for one line of text: a handle, an email, a key. Pair it with Label (or Field) above it. Set aria-invalid when the value is rejected and say why below it; set readOnly for a value the person cannot change (it sits on the lilac).
- Avoid: A placeholder used as the only label
- Avoid: A pill-shaped field
- Avoid: A gray field background for an editable value


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

// The console's field (Figma "Form- Input"): 40px tall, fully rounded corners, the lilac-gray edge on white, 14px ink text and a
// lighter purple placeholder, 14px in from the edge. Focus takes the purple edge and a soft ring; aria-invalid takes
// the red edge (Not Available). A read-only or disabled field sits on the lilac (the email local part in a channel
// card).
const FIELD =
  "h-10 w-full min-w-0 rounded-pill border border-line-field bg-surface px-3.5 font-sans text-body leading-tight text-fg outline-none transition-[border-color,box-shadow] duration-150 ease-out placeholder:text-fg-subtle selection:bg-ring-tint focus-visible:border-line-brand focus-visible:shadow-focus aria-invalid:border-danger aria-invalid:focus-visible:shadow-none read-only:bg-subtle read-only:text-fg-muted disabled:cursor-not-allowed disabled:bg-subtle disabled:text-fg-muted motion-reduce:transition-none file:mr-3 file:border-0 file:bg-transparent file:font-sans file:text-body file:font-medium file:text-fg";

function Input({ className, type = "text", size, ...props }: React.ComponentProps<"input">) {
  return <ChakraInput unstyled type={type} htmlSize={size} data-slot="input" className={cn(FIELD, className)} {...props} />;
}

export { Input, FIELD as inputClassName };

```
