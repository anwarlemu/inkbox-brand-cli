"use client";

import * as React from "react";
import { ArrowsClockwiseIcon, PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react/ssr";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";

type Mailbox = { address: string; agent: string; webhooks: number; storage: number; created: Date; status: "active" | "paused" };

const AGENTS = ["baked", "support-desk", "ops-runner", "robert-baked-design", "test-agent-233", "billing-bot"];
const MAILBOXES: Mailbox[] = Array.from({ length: 23 }, (_, i) => {
  const agent = AGENTS[i % AGENTS.length];
  return { address: `${agent}${i > 5 ? `-${i}` : ""}@inkboxmail.com`, agent, webhooks: (i * 7) % 4, storage: (i * 13) % 61, created: new Date(2026, 6, 27 + (i % 20)), status: i % 5 === 3 ? "paused" : "active" };
});

const date = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

const COLUMNS: DataTableColumn<Mailbox>[] = [
  { id: "address", header: "Email address", accessor: (m) => m.address, sortable: true, hideable: false },
  { id: "agent", header: "Agent", accessor: (m) => m.agent, sortable: true, cell: (m) => <span className="text-rose">@{m.agent}</span> },
  { id: "webhooks", header: "Webhooks", accessor: (m) => m.webhooks, sortable: true, cell: (m) => (m.webhooks ? m.webhooks : "None") },
  { id: "storage", header: "Storage", accessor: (m) => m.storage, sortable: true, cell: (m) => `${m.storage}%` },
  { id: "status", header: "Status", accessor: (m) => m.status, hidden: true, cell: (m) => <Badge variant={m.status === "active" ? "green" : "gray"} size="sm">{m.status === "active" ? "Active" : "Paused"}</Badge> },
  { id: "created", header: "Created", accessor: (m) => m.created, sortable: true, cell: (m) => date.format(m.created) },
  {
    id: "actions",
    header: <span className="sr-only">Actions</span>,
    hideable: false,
    align: "end",
    className: "w-14",
    cell: (m) => (
      <Button variant="ghost" size="icon" aria-label={`Edit ${m.address}`}>
        <PencilSimpleIcon weight="fill" />
      </Button>
    ),
  },
];

export function Preview() {
  return <DataTable columns={COLUMNS} data={MAILBOXES} getRowId={(m) => m.address} rowName="mailbox" pageSize={5} filter={{ placeholder: "Filter mailboxes" }} defaultSort={{ id: "created", desc: false }} empty="No mailbox matches." />;
}

export function Selection() {
  const [rows, setRows] = React.useState(MAILBOXES.slice(0, 8));
  const [selected, setSelected] = React.useState<string[]>([]);
  const [refreshing, setRefreshing] = React.useState(false);
  return (
    <DataTable
      columns={COLUMNS}
      data={rows}
      getRowId={(m) => m.address}
      rowName="mailbox"
      selectable
      selection={selected}
      onSelectionChange={setSelected}
      pageSize={5}
      pageSizes={[5, 10, 20]}
      filter={{ placeholder: "Filter mailboxes", columns: ["address", "agent"] }}
      toolbar={
        <>
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label="Refresh"
            disabled={refreshing}
            onClick={() => {
              setRefreshing(true);
              setTimeout(() => setRefreshing(false), 800);
            }}
          >
            <ArrowsClockwiseIcon className={refreshing ? "animate-spin-steady" : undefined} />
          </Button>
          {selected.length > 0 && (
            <Button
              variant="destructive"
              onClick={() => {
                setRows((r) => r.filter((m) => !selected.includes(m.address)));
                setSelected([]);
              }}
            >
              <TrashIcon weight="fill" />
              Delete {selected.length}
            </Button>
          )}
        </>
      }
    />
  );
}

export function Empty() {
  return <DataTable columns={COLUMNS} data={[]} getRowId={(m) => m.address} filter={false} hideViewOptions empty="No mailboxes yet. Mailboxes are created with their agent identity." />;
}
