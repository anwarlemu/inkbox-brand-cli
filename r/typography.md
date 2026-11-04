# Typography
The console's type as components: regular titles, 14px body copy, muted lines, lists, quotes and inline keys.

Install: npx inkbox-ds add typography
Requires: theme, utils
Packages: none
Exports: TypographyBlockquote, TypographyH1, TypographyH2, TypographyH3, TypographyH4, TypographyInlineCode, TypographyLarge, TypographyLead, TypographyList, TypographyMuted, TypographyP, TypographySmall, TypographyTable
Client boundary: not required by this entry file
Reference: Figma 427:2715: page titles (Vault, Webhooks), dialog titles, the email body, inline hosts and keys


## Usage
Use for written content (docs, help panes, agent prompts). TypographyH3 is the 20px page or dialog title; TypographyP is body copy; TypographyMuted the line under a title; TypographyInlineCode a key, host or ID. Interfaces built from components rarely need these.
- Avoid: Bold titles
- Avoid: Letter spacing
- Avoid: Text sizes outside the scale
- Avoid: Purple body copy


## Examples
Example components: npx inkbox-ds add typography
[Preview](https://inkbox-ds.vercel.app/preview/typography/Preview) | [Scale](https://inkbox-ds.vercel.app/preview/typography/Scale)

examples/typography.tsx

```tsx
import { TypographyBlockquote, TypographyH1, TypographyH2, TypographyH3, TypographyH4, TypographyInlineCode, TypographyLarge, TypographyLead, TypographyList, TypographyMuted, TypographyP, TypographySmall, TypographyTable } from "@/components/ui/typography";

export function Preview() {
  return (
    <article className="w-full max-w-160">
      <TypographyH3>Tunnel</TypographyH3>
      <TypographyMuted>Stable hostname routing inbound traffic to @acme.</TypographyMuted>
      <TypographyP>
        Each agent gets a public host such as <TypographyInlineCode>acme.inkboxwire.com</TypographyInlineCode>. Traffic reaches the agent wherever it runs, with TLS handled at the edge by default.
      </TypographyP>
      <TypographyBlockquote>Direct card URLs stay public whether or not you list in the directory. Listing only controls discovery.</TypographyBlockquote>
      <TypographyList>
        <li>Opt your card into the public directory with an admin key.</li>
        <li>View the card Inkbox serves for you.</li>
        <li>Find workers in the public directory.</li>
      </TypographyList>
      <TypographyTable>
        <thead>
          <tr>
            <th>Field</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Handle</td>
            <td>@test-agent-233</td>
          </tr>
          <tr>
            <td>Email</td>
            <td>test-agent-233@inkboxmail.com</td>
          </tr>
        </tbody>
      </TypographyTable>
    </article>
  );
}

export function Scale() {
  return (
    <div className="grid w-full max-w-160 gap-3">
      <TypographyH1>Agent Workspace</TypographyH1>
      <TypographyH2>Create Your First Agent</TypographyH2>
      <TypographyH3>Create Agent Identity</TypographyH3>
      <TypographyH4>Email</TypographyH4>
      <TypographyLead>Set up an identity to unlock mailbox, phone, and vault features.</TypographyLead>
      <TypographyLarge>Your agent will be reachable at</TypographyLarge>
      <TypographySmall>Shared lines are assigned when someone connects.</TypographySmall>
      <TypographyList ordered>
        <li>Create the agent.</li>
        <li>Copy its API key.</li>
      </TypographyList>
    </div>
  );
}

```

## Source

components/ui/typography.tsx

```tsx
import * as React from "react";

import { cn } from "@/lib/utils";

// The console's type as components (Figma 427:2715). Inter throughout, no tracking. Titles are regular, not bold: a page
// or dialog title is 20px (H3); H1 and H2 are 24px and 22px for the rare larger heading; H4 is a 16px medium card
// title. Body copy is 14px on a 1.5 line in ink, P under a title in the secondary purple; Muted is the 14px muted line
// under a page title; Small is 12px; Lead is 16px secondary.
function TypographyH1({ className, ...props }: React.ComponentProps<"h1">) {
  return <h1 data-slot="typography-h1" className={cn("font-sans text-h1 leading-heading font-normal text-balance text-fg", className)} {...props} />;
}

function TypographyH2({ className, ...props }: React.ComponentProps<"h2">) {
  return <h2 data-slot="typography-h2" className={cn("font-sans text-h2 leading-heading font-normal text-balance text-fg", className)} {...props} />;
}

function TypographyH3({ className, ...props }: React.ComponentProps<"h3">) {
  return <h3 data-slot="typography-h3" className={cn("font-sans text-h3 leading-heading font-normal text-fg", className)} {...props} />;
}

function TypographyH4({ className, ...props }: React.ComponentProps<"h4">) {
  return <h4 data-slot="typography-h4" className={cn("font-sans text-h4 leading-body font-medium text-fg", className)} {...props} />;
}

function TypographyP({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="typography-p" className={cn("font-sans text-body leading-body text-pretty text-fg [&:not(:first-child)]:mt-4", className)} {...props} />;
}

function TypographyLead({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="typography-lead" className={cn("font-sans text-body-lg leading-body text-fg-secondary", className)} {...props} />;
}

function TypographyLarge({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="typography-large" className={cn("font-sans text-body-lg leading-body font-medium text-fg", className)} {...props} />;
}

function TypographySmall({ className, ...props }: React.ComponentProps<"small">) {
  return <small data-slot="typography-small" className={cn("font-sans text-caption leading-tight text-fg", className)} {...props} />;
}

function TypographyMuted({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="typography-muted" className={cn("font-sans text-body leading-body text-fg-muted", className)} {...props} />;
}

/** A quote: indented behind a 2px pink rule, in the secondary purple. */
function TypographyBlockquote({ className, ...props }: React.ComponentProps<"blockquote">) {
  return <blockquote data-slot="typography-blockquote" className={cn("mt-4 border-l-2 border-pink pl-4 font-sans text-body leading-body text-fg-secondary", className)} {...props} />;
}

function TypographyList({ className, ordered = false, ...props }: Omit<React.ComponentProps<"ul">, "ref"> & { ordered?: boolean }) {
  const classes = cn("my-4 ml-5 grid gap-1.5 font-sans text-body leading-body text-fg marker:text-fg-muted", ordered ? "list-decimal" : "list-disc", className);
  return ordered ? <ol data-slot="typography-list" className={classes} {...props} /> : <ul data-slot="typography-list" className={classes} {...props} />;
}

/** A key, host or ID inside text: IBM Plex Mono on the lilac with 4px corners. */
function TypographyInlineCode({ className, ...props }: React.ComponentProps<"code">) {
  return <code data-slot="typography-inline-code" className={cn("rounded-xs bg-subtle px-1 py-px font-mono text-body-sm text-fg [box-decoration-break:clone]", className)} {...props} />;
}

/** A plain table in running text: the lilac head row and faint rules. For data, use Table. */
function TypographyTable({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div data-slot="typography-table" className="my-4 w-full overflow-x-auto">
      <table
        className={cn(
          "w-full border-collapse font-sans text-body leading-body text-fg [&_td]:border-b [&_td]:border-line-subtle [&_td]:px-4 [&_td]:py-2.5 [&_th]:bg-subtle [&_th]:px-4 [&_th]:py-2.5 [&_th]:text-left [&_th]:font-normal [&_th]:text-fg-muted [&_th:first-child]:rounded-l-panel [&_th:last-child]:rounded-r-panel",
          className,
        )}
        {...props}
      />
    </div>
  );
}

export { TypographyBlockquote, TypographyH1, TypographyH2, TypographyH3, TypographyH4, TypographyInlineCode, TypographyLarge, TypographyLead, TypographyList, TypographyMuted, TypographyP, TypographySmall, TypographyTable };

```
