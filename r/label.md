# Label
A field's 14px regular ink label on a 24px line, with a red required mark.

Install: npx inkbox-ds add label
Requires: theme, utils
Packages: @chakra-ui/react
Exports: Label
Client boundary: yes
Reference: Figma 427:2715: Login (Email address, Password), Vault (Vault key)


## Usage
Name every field with a Label tied to it by htmlFor, 4px above the field. For a label with a hint or an action beside it (Forgot password?), use Field. Mark a required field with <span data-slot="label-required" aria-hidden>*</span> inside the label (it turns red) and required on the control.
- Avoid: Bold or caps labels
- Avoid: A label in the action purple


## Examples
Example components: npx inkbox-ds add label input
[Preview](https://inkbox-ds.vercel.app/preview/label/Preview)

examples/label.tsx

```tsx
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function Preview() {
  return (
    <div className="grid w-full max-w-86 gap-1">
      <Label htmlFor="vault-key">Vault key</Label>
      <Input id="vault-key" type="password" placeholder="Enter a vault key" />
    </div>
  );
}

```

## Source

components/ui/label.tsx

```tsx
"use client";

import * as React from "react";
import { chakra } from "@chakra-ui/react";

import { cn } from "@/lib/utils";

// A field's label (the console's FormLabel: Email address, Password, Vault key): 14px regular ink on a 24px line, 4px
// above its field. A required mark inside it (`<span aria-hidden>*</span>` with data-slot="label-required") is red. A
// disabled field's label fades with it.
function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <chakra.label
      data-slot="label"
      className={cn("flex items-center gap-2 font-sans text-body leading-6 font-normal text-fg select-none *:data-[slot=label-required]:-ms-1 *:data-[slot=label-required]:text-danger group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50", className)}
      {...props}
    />
  );
}

export { Label };

```
