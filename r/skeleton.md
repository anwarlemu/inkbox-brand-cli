# Skeleton
A lilac placeholder with 8px corners that breathes softly while content loads.

Install: npx inkbox-ds add skeleton
Requires: theme, utils
Packages: none
Exports: Skeleton
Client boundary: not required by this entry file
Reference: Extrapolated from the Inkbox console (Figma 427:2715): the lilac fill and 8px corners of its wells


## Usage
Use in the shape of what will load (rows of the email list, a table's rows, an avatar), matching each part's size and corners (rounded-pill for buttons, avatars and small icon tiles). Show it only for loads longer than about 300ms.
- Avoid: Shimmer gradients
- Avoid: Skeletons for content already on screen
- Avoid: A skeleton for a single button


## Examples
Example components: npx inkbox-ds add skeleton
[Preview](https://inkbox-ds.vercel.app/preview/skeleton/Preview) | [Row](https://inkbox-ds.vercel.app/preview/skeleton/Row)

examples/skeleton.tsx

```tsx
import { Skeleton } from "@/components/ui/skeleton";

export function Preview() {
  return (
    <div className="grid w-full max-w-96 gap-1" aria-busy="true" aria-label="Loading emails">
      {[0, 1, 2].map((i) => (
        <div key={i} className="grid gap-2.5 p-3">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-12" />
          </div>
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  );
}

export function Row() {
  return (
    <div className="flex w-full max-w-120 items-center gap-4" aria-busy="true" aria-label="Loading mailbox">
      <Skeleton className="size-5.5 rounded-pill" />
      <Skeleton className="h-4 flex-1" />
      <Skeleton className="h-10 w-28 rounded-pill" />
    </div>
  );
}

```

## Source

components/ui/skeleton.tsx

```tsx
import { cn } from "@/lib/utils";

// A placeholder while content loads: the lilac with 8px corners, breathing between full and 55 percent (1.6s, the
// in-out curve). With reduced motion it holds still.
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="skeleton" aria-hidden className={cn("animate-pulse-soft rounded-control bg-subtle motion-reduce:animate-none", className)} {...props} />;
}

export { Skeleton };

```
