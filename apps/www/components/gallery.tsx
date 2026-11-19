import { CLI_COMMAND } from "@www/lib/registry";
import type { Example } from "@www/lib/assets";

const RUN = CLI_COMMAND.replace("npx -y ", "npx ");

/** Pictures the CLI wrote, each with the command that wrote it. Videos play muted and loop only when asked to. */
export function Gallery({ items, columns }: { items: Example[]; columns: string }) {
  return (
    <ul className={`grid gap-6 ${columns}`}>
      {items.map((e) => (
        <li key={e.id} className="flex min-w-0 flex-col gap-2">
          {e.video ? (
            <video src={e.video} poster={e.src} width={e.width} height={e.height} controls muted playsInline preload="none" className="h-auto w-full rounded-control bg-subtle shadow-s" />
          ) : (
            <img src={e.src} width={e.width} height={e.height} alt={`${e.id}, as the CLI draws it`} loading="lazy" className="h-auto w-full rounded-control bg-subtle shadow-s" />
          )}
          <code className="truncate font-mono text-caption text-fg-muted" title={`${RUN} ${e.command}`}>
            {e.command}
          </code>
        </li>
      ))}
    </ul>
  );
}

/** Commands and what each does, as a two-column list. */
export function CommandList({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="grid divide-y divide-line-subtle">
      {rows.map(([cmd, what]) => (
        <div key={cmd} className="grid gap-1 py-4 sm:grid-cols-[18rem_1fr] sm:gap-6">
          <dt className="font-mono text-body-sm text-fg">{cmd}</dt>
          <dd className="text-body-sm text-fg-muted">{what}</dd>
        </div>
      ))}
    </dl>
  );
}
