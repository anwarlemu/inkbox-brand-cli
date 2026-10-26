# Native Select
The browser's own select dressed as the console's: a white 40px field with the Shadow/S ring and an ink caret.

Install: npx inkbox-ds add native-select
Requires: theme, utils
Packages: @phosphor-icons/react
Exports: NativeSelect, NativeSelectOptGroup, NativeSelectOption
Client boundary: not required by this entry file
Reference: Figma 427:2715: the Any State and Shared selects in Create Agent Identity


## Usage
Use when the platform's own picker is better: on phones, for long lists such as countries or states, or in forms that must work without script. Otherwise use Select. Use NativeSelectOptGroup to group options.
- Avoid: A field edge instead of the Shadow/S ring
- Avoid: A custom arrow image
- Avoid: A native select styled differently from Select on the same form


## Examples
Example components: npx inkbox-ds add native-select label
[Preview](https://inkbox-ds.vercel.app/preview/native-select/Preview) | [States](https://inkbox-ds.vercel.app/preview/native-select/States)

examples/native-select.tsx

```tsx
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOptGroup, NativeSelectOption } from "@/components/ui/native-select";

export function Preview() {
  return (
    <div className="grid w-full max-w-114.5 gap-1">
      <Label htmlFor="state">Phone number state</Label>
      <NativeSelect id="state" defaultValue="any" className="w-full">
        <NativeSelectOption value="any">Any State</NativeSelectOption>
        <NativeSelectOptGroup label="West">
          <NativeSelectOption value="ca">California</NativeSelectOption>
          <NativeSelectOption value="or">Oregon</NativeSelectOption>
          <NativeSelectOption value="wa">Washington</NativeSelectOption>
        </NativeSelectOptGroup>
        <NativeSelectOptGroup label="East">
          <NativeSelectOption value="ny">New York</NativeSelectOption>
          <NativeSelectOption value="ma">Massachusetts</NativeSelectOption>
        </NativeSelectOptGroup>
      </NativeSelect>
    </div>
  );
}

export function States() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <NativeSelect aria-label="Line" size="sm" defaultValue="shared">
        <NativeSelectOption value="shared">Shared</NativeSelectOption>
        <NativeSelectOption value="dedicated">Dedicated</NativeSelectOption>
      </NativeSelect>
      <NativeSelect aria-label="Disabled" disabled defaultValue="shared">
        <NativeSelectOption value="shared">Shared</NativeSelectOption>
      </NativeSelect>
      <NativeSelect aria-label="Invalid" aria-invalid defaultValue="">
        <NativeSelectOption value="" disabled>
          Choose a mode
        </NativeSelectOption>
        <NativeSelectOption value="edge">Edge</NativeSelectOption>
      </NativeSelect>
    </div>
  );
}

```

## Source

components/ui/native-select.tsx

```tsx
import * as React from "react";
import { CaretDownIcon } from "@phosphor-icons/react/ssr";

import { cn } from "@/lib/utils";

// The browser's own select dressed as the console's select ("Any State", "Shared" in Create Agent Identity): a white
// 40px field with 8px corners and the Shadow/S ring, 14px ink at 14px from the left and a 20px ink caret 12px from the
// right. `size="sm"` is 36px. Use it where the platform picker is better (phones, long lists, forms without script).
type NativeSelectProps = Omit<React.ComponentProps<"select">, "size"> & { size?: "sm" | "default" };

function NativeSelect({ className, size = "default", ...props }: NativeSelectProps) {
  return (
    <div data-slot="native-select-wrapper" data-size={size} className={cn("group/native-select relative w-fit has-[select:disabled]:opacity-50", className)}>
      <select
        data-slot="native-select"
        data-size={size}
        className="h-10 w-full min-w-0 cursor-pointer appearance-none rounded-pill bg-surface py-0 pr-10 pl-3.5 font-sans text-body leading-tight text-fg shadow-s outline-none transition-[box-shadow] duration-150 ease-out focus-visible:shadow-[var(--ds-shadow-s),var(--ds-shadow-focus)] disabled:cursor-not-allowed aria-invalid:shadow-[0_0_0_1px_var(--ds-color-status-danger)] data-[size=sm]:h-9 motion-reduce:transition-none"
        {...props}
      />
      <CaretDownIcon aria-hidden data-slot="native-select-icon" weight="bold" className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-fg" />
    </div>
  );
}

function NativeSelectOption({ className, ...props }: React.ComponentProps<"option">) {
  return <option data-slot="native-select-option" className={cn("bg-surface text-fg", className)} {...props} />;
}

function NativeSelectOptGroup({ className, ...props }: React.ComponentProps<"optgroup">) {
  return <optgroup data-slot="native-select-optgroup" className={cn("bg-surface text-fg", className)} {...props} />;
}

export { NativeSelect, NativeSelectOptGroup, NativeSelectOption };

```
