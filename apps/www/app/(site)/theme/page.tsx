import { readFileSync } from "node:fs";
import path from "node:path";

import { Code, Command, PageBody, PageHead, Section } from "@www/components/chrome";
import { CLI_COMMAND } from "@www/lib/registry";

export const metadata = { title: "Theme" };

type Tokens = { site: Record<string, string> };
const tokens = JSON.parse(readFileSync(path.join(process.cwd(), "../../build/tokens.json"), "utf8")) as Tokens;
const isColor = (v: string) => /^#|^rgb|^hsl|^oklch/.test(v);
const colors = Object.entries(tokens.site).filter(([k, v]) => k.startsWith("--ds-color-") && isColor(v));

// The palette first, then the roles every component reads, by job.
const GROUPS: { title: string; test: RegExp }[] = [
  { title: "Palette", test: /^--ds-color-(brand|black|white|ink|lilac|pink|rose|avatar)$/ },
  { title: "Surfaces", test: /^--ds-color-bg-/ },
  { title: "Text and icons", test: /^--ds-color-(text-|icon-)/ },
  { title: "Lines", test: /^--ds-color-(border-|wash-|ring-)/ },
  { title: "Actions, states and tags", test: /^--ds-color-(action-|status-|focus-|tag-|chart-)/ },
  { title: "Code", test: /^--ds-color-code-/ },
];

const SCALE = Object.entries(tokens.site).filter(([k]) => /^--ds-text-/.test(k));
const RADII = Object.entries(tokens.site).filter(([k]) => k.startsWith("--ds-radius-") && k !== "--ds-radius-pill");
const SHADOWS = ["s", "line", "floating", "dialog", "focus"];

function Swatch({ name, value }: { name: string; value: string }) {
  return (
    <div className="overflow-hidden rounded-control border border-line-field bg-surface">
      <div className="h-12 border-b border-line-subtle" style={{ background: `var(${name})` }} />
      <div className="px-3 py-2">
        <p className="truncate font-mono text-caption text-fg">{name.replace("--ds-color-", "")}</p>
        <p className="truncate font-mono text-caption text-fg-muted">{value}</p>
      </div>
    </div>
  );
}

export default function ThemePage() {
  return (
    <>
      <PageHead title="Theme" description="Use these tokens for colors, type, space, corners, shadows and motion. Components already use them; use the same tokens for custom layouts." />
      <PageBody className="max-w-240">
        <Command command={`${CLI_COMMAND} add theme`} />
        <Section title="Color" description="Choose tokens by their role: surface, text, line, action or status.">
          <div className="grid gap-6">
            {GROUPS.map((g) => {
              const list = colors.filter(([k]) => g.test.test(k));
              return (
                <div key={g.title} className="grid gap-2">
                  <p className="text-body-sm text-fg-label">{g.title}</p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {list.map(([name, value]) => (
                      <Swatch key={name} name={name} value={value} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        <Section title="Type" description="Inter for every word; IBM Plex Mono for keys, hosts and IDs; the system monospace in code blocks.">
          <div className="divide-y divide-line-subtle rounded-control border border-line-field px-4">
            {SCALE.map(([name, value]) => (
              <div key={name} className="grid items-baseline gap-2 py-4 sm:grid-cols-[11rem_1fr]">
                <p className="font-mono text-caption text-fg-muted">
                  {name.replace("--ds-text-", "text-")} {value}
                </p>
                <p className="min-w-0 text-fg" style={{ fontSize: `var(${name})` }}>
                  Create Agent Identity
                </p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Corners and shadows" description="Use the token the component uses; keep the same corner and shadow for the same kind of element.">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {RADII.map(([name, value]) => (
              <div key={name} className="grid gap-2">
                <div className="h-20 border border-line-brand bg-subtle" style={{ borderRadius: `var(${name})` }} />
                <p className="font-mono text-caption text-fg">
                  {name.replace("--ds-radius-", "rounded-")} <span className="text-fg-muted">{value}</span>
                </p>
              </div>
            ))}
          </div>
          <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
            {SHADOWS.map((name) => (
              <div key={name} className="grid gap-2">
                <div className="h-20 rounded-control bg-surface" style={{ boxShadow: `var(--ds-shadow-${name})` }} />
                <p className="font-mono text-caption text-fg">shadow-{name}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Import the theme" description="The CLI writes the brand stylesheet and the Tailwind theme beside the main stylesheet and adds these imports.">
          <Code
            title="app/globals.css"
            lang="css"
            code={`@import "tailwindcss";
@import "./_inkbox-ds/brand.css";
@import "./_inkbox-ds/theme.css";`}
          />
        </Section>
      </PageBody>
    </>
  );
}
