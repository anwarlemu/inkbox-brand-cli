import { AspectRatio } from "@/components/ui/aspect-ratio";

export function Preview() {
  return (
    <div className="w-full max-w-120">
      <AspectRatio ratio={16 / 9} className="overflow-hidden rounded-control bg-subtle">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/octopus.png" alt="The Inkbox octopus" className="size-full object-contain p-6" />
      </AspectRatio>
    </div>
  );
}

export function Square() {
  return (
    <div className="w-40">
      <AspectRatio ratio={1} className="flex items-center justify-center rounded-control border border-line-field bg-surface text-body text-fg-muted">1:1</AspectRatio>
    </div>
  );
}
