import { cn } from "@/lib/utils";

/**
 * A strip of customer names set as text wordmarks in the muted purple, for "Trusted by" rows. Names only: never paste
 * a third-party logo file; use placeholders (Acme) until the brand has permission and the files.
 */
function LogosStrip({ label, names, className }: { label?: string; names: string[]; className?: string }) {
  return (
    <section data-slot="logos-strip" className={cn("mx-auto grid max-w-(--ds-layout-column) gap-5 px-6 py-10", className)}>
      {label && <p className="text-center text-body-sm leading-tight text-fg-muted">{label}</p>}
      <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
        {names.map((n) => (
          <li key={n} className="text-h4 leading-tight font-semibold text-fg-subtle">
            {n}
          </li>
        ))}
      </ul>
    </section>
  );
}

export { LogosStrip };
