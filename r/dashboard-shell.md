# Dashboard shell
A dashboard in the console's frame: usage meters as cards and the agents table.

Install: npx inkbox-ds add dashboard-shell
Requires: theme, app-shell, button, card, progress, table
Packages: @phosphor-icons/react
Exports: Meter, AgentRow, METERS, AGENTS, DashboardShell
Client boundary: yes
Reference: Console usage tab (components/billing/UsageTab.tsx meters) and Manage Agents table columns (config-identities)


## Usage
Start an overview screen from it; pass meters and rows.
- Avoid: Charts with no labels
- Avoid: Colored stat cards


## Examples
Example components: npx inkbox-ds add dashboard-shell
[Preview](https://inkbox-ds.vercel.app/preview/dashboard-shell/Preview)

examples/dashboard-shell.tsx

```tsx
import { DashboardShell } from "@/components/product/dashboard-shell";

export function Preview() {
  return <DashboardShell />;
}

```

## Source

components/product/dashboard-shell.tsx

```tsx
"use client";

import * as React from "react";
import { PencilSimpleIcon, PlusIcon } from "@phosphor-icons/react/ssr";

import { AppPageBody, AppPageHead, AppShell, type AppNavGroup } from "@/components/product/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type Meter = { label: string; used: string; total: string; left: string; value: number };
export type AgentRow = { handle: string; email: string; created: string };

export const METERS: Meter[] = [
  { label: "Agents", used: "4", total: "10", left: "6", value: 40 },
  { label: "Mail storage", used: "1.2 GiB", total: "20 GiB", left: "18.8 GiB", value: 6 },
  { label: "Call minutes", used: "12", total: "30 min", left: "18 min", value: 40 },
  { label: "SMS", used: "84", total: "300", left: "216", value: 28 },
];
export const AGENTS: AgentRow[] = [
  { handle: "@acme", email: "acme@inkboxmail.com", created: "Jul 27, 2026" },
  { handle: "@support-desk", email: "support@inkboxmail.com", created: "Jul 29, 2026" },
  { handle: "@ops-runner", email: "ops@inkboxmail.com", created: "Aug 2, 2026" },
];

/**
 * A dashboard in the console's frame: the page head, the usage meters as cards (used of included, what is left, a
 * purple bar), and the agents table with a create action. Swap the meters and rows through props.
 */
function DashboardShell({ title = "Usage", description = "This billing cycle, across your organization.", meters = METERS, agents = AGENTS, nav, current = "Agent Workspace" }: { title?: string; description?: string; meters?: Meter[]; agents?: AgentRow[]; nav?: AppNavGroup[]; current?: string }) {
  const [active, setActive] = React.useState(current);
  return (
    <AppShell nav={nav} current={active} onSelect={setActive}>
      <AppPageHead
        title={title}
        description={description}
        actions={
          <Button size="sm">
            <PlusIcon />
            Create agent
          </Button>
        }
      />
      <AppPageBody className="gap-6">
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {meters.map((m) => (
            <li key={m.label} className="grid">
              <Card>
                <CardHeader>
                  <CardDescription>{m.label}</CardDescription>
                  <CardTitle className="text-h3 leading-heading">
                    {m.used}
                    <span className="text-body text-fg-muted">of {m.total}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2">
                  <Progress value={m.value} aria-label={`${m.label} used`} />
                  <p className="text-body-sm text-fg-muted">{m.left} left</p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
        <section className="grid gap-3">
          <h2 className="text-body-lg leading-heading font-medium text-fg">Agents</h2>
          <div className="fade-x overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent handle</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((a) => (
                  <TableRow key={a.handle}>
                    <TableCell className="text-rose">{a.handle}</TableCell>
                    <TableCell>{a.email}</TableCell>
                    <TableCell>{a.created}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" aria-label={`Edit ${a.handle}`}>
                        <PencilSimpleIcon weight="fill" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      </AppPageBody>
    </AppShell>
  );
}

export { DashboardShell };

```
