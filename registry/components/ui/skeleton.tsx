import { cn } from "@/lib/utils";

// A placeholder while content loads (the console's Skeleton theme): the lilac with 8px corners, breathing toward the
// lilac hover (1.6s, the in-out curve). It appears only after 300ms (an instant fade held back three fast steps, the
// console's `opacity 0s linear 300ms` from @starting-style), so a quick load never flashes it. With reduced motion the
// breathing stops.
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn(
        "relative overflow-hidden rounded-sm bg-subtle [animation:ds-fade-in_0s_linear_calc(var(--ds-duration-fast)*3)_backwards] after:absolute after:inset-0 after:bg-subtle-hover after:opacity-0 after:content-[''] after:animate-pulse-soft motion-reduce:after:animate-none",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
