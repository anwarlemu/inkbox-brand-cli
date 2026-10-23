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
      <Skeleton className="size-5.5 rounded-xs" />
      <Skeleton className="h-4 flex-1" />
      <Skeleton className="h-10 w-28 rounded-pill" />
    </div>
  );
}
