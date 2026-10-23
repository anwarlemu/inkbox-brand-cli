import { cn } from "@/lib/utils";

// A placeholder while content loads: the lilac with 8px corners, breathing between full and 55 percent (1.6s, the
// in-out curve). With reduced motion it holds still.
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="skeleton" aria-hidden className={cn("animate-pulse-soft rounded-control bg-subtle motion-reduce:animate-none", className)} {...props} />;
}

export { Skeleton };
