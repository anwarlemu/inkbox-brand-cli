import { Lockup } from "@/components/site/lockup";

export function Preview() {
  return (
    <div className="flex flex-wrap items-center gap-8">
      <Lockup size="sm" />
      <Lockup />
      <Lockup size="lg" />
      <Lockup markOnly />
    </div>
  );
}
