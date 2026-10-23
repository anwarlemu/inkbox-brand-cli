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
