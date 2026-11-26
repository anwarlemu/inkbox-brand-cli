# Spinner
The console's turning eight-spoke glyph, in the color of the text around it.

Install: npx inkbox-ds add spinner
Requires: theme, utils
Packages: @phosphor-icons/react
Exports: Spinner
Client boundary: not required by this entry file
Reference: Figma 427:2715: Modal States (Handle check, Creating...)


## Usage
Use inside the thing that is working: at the right of a field while the handle is checked (text-fg-brand), before the label of a button that is creating (Creating Agent Identity...). Disable the button while it spins.
- Avoid: A full-page spinner for a short wait
- Avoid: A spinner without a label or button text saying what is happening
- Avoid: Colored spinners


## Examples
Example components: npx inkbox-ds add spinner button input
[Preview](https://inkbox-ds.vercel.app/preview/spinner/Preview) | [Sizes](https://inkbox-ds.vercel.app/preview/spinner/Sizes)

examples/spinner.tsx

```tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

export function Preview() {
  return (
    <div className="grid w-full max-w-100 gap-4">
      <div className="relative">
        <Input aria-label="Agent handle" defaultValue="acme-support" className="pr-10" />
        <Spinner className="absolute top-1/2 right-3 -translate-y-1/2 text-fg-brand" />
      </div>
      <Button disabled className="w-full">
        <Spinner />
        Creating Agent Identity...
      </Button>
    </div>
  );
}

export function Sizes() {
  return (
    <div className="flex items-center gap-4 text-fg-brand">
      <Spinner className="size-4" />
      <Spinner />
      <Spinner className="size-8" />
    </div>
  );
}

```

## Source

components/ui/spinner.tsx

```tsx
import { SpinnerIcon } from "@phosphor-icons/react/ssr";

import { cn } from "@/lib/utils";

// The console's loading glyph (Figma 427:2715: the handle check, Creating Agent Identity...): eight short spokes
// turning once every 0.8s at a constant speed, in the color of the text around it (the purple in a field, white on the
// purple pill). It keeps turning with reduced motion: the turning is the only sign that work is happening.
function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return <SpinnerIcon role="status" weight="bold" aria-label="Loading" data-slot="spinner" className={cn("size-5.5 shrink-0 animate-spin-steady", className)} {...props} />;
}

export { Spinner };

```
