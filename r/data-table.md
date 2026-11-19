# Data Table
The console's table with a filter field, sortable heads, row checkboxes, a Columns menu and the centered pager.

Install: npx inkbox-ds add data-table
Requires: theme, button, checkbox, dropdown-menu, input-group, select, table, utils
Packages: @phosphor-icons/react
Exports: DataTable, DataTableColumnHeader, DataTablePagination, DataTableViewOptions, DataTableColumn, DataTableProps, SortState
Client boundary: yes
Reference: Console src/components/table/PaginatedTable.tsx (the table and its pager); Figma 427:2715: Email (Mailboxes table)


## Usage
Use for a list of records people manage (mailboxes, agents and lines, webhook subscriptions): pass columns (id, header, an accessor for sorting and filtering, a cell renderer), data and getRowId. Turn on selectable for bulk actions and put those actions in toolbar; set pageSize and pageSizes for long lists. For a short fixed list with no sorting or paging, use Table on its own. Keep row actions as ghost icon buttons in the last column.
- Avoid: Zebra stripes
- Avoid: A border around the whole table instead of the head and body
- Avoid: Animating rows when sorting or paging
- Avoid: More than one purple pill in the toolbar


## Examples
Example components: npx inkbox-ds add data-table badge button
Example packages: @phosphor-icons/react
[Preview](https://inkbox-ds.vercel.app/preview/data-table/Preview) | [Selection](https://inkbox-ds.vercel.app/preview/data-table/Selection) | [Empty](https://inkbox-ds.vercel.app/preview/data-table/Empty)

examples/data-table.tsx

```tsx
"use client";

import * as React from "react";
import { ArrowsClockwiseIcon, PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react/ssr";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";

type Mailbox = { address: string; agent: string; webhooks: number; storage: number; created: Date; status: "active" | "paused" };

const AGENTS = ["acme", "support-desk", "ops-runner", "acme-support", "test-agent-233", "billing-bot"];
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
            onClick={() => {
              setRows(MAILBOXES.slice(0, 8));
              setSelected([]);
            }}
          >
            <ArrowsClockwiseIcon />
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

```

## Source

components/ui/data-table.tsx

```tsx
"use client";

import * as React from "react";
import { ArrowDownIcon, ArrowUpIcon, CaretLeftIcon, CaretRightIcon, CaretUpDownIcon, ColumnsIcon, MagnifyingGlassIcon } from "@phosphor-icons/react/ssr";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

// A table of records people sort, filter, select and page through (the console's Mailboxes table, Figma 427:2715,
// Email). It keeps the table's three panels: the 48px lilac head with 14px muted labels (a sortable label is a ghost key
// with an arrow for its direction), the white Shadow/S body with 64px rows (a selected row on the lilac) and, 8px below,
// the 42px lilac pagination bar with the selection count at its left and the pages at its right. Above it, a toolbar:
// a 40px filter field with a magnifying glass and the outline Columns key that opens a menu of checkboxes. Sorting,
// filtering and paging are instant (no motion): they are repeated many times in a row.

type Value = string | number | Date | boolean | null | undefined;

type DataTableColumn<T> = {
  id: string;
  /** The column's label, in its head and in the Columns menu. */
  header: React.ReactNode;
  /** What the cell shows; defaults to the accessor's value. */
  cell?: (row: T) => React.ReactNode;
  /** The value used to sort and filter. */
  accessor?: (row: T) => Value;
  sortable?: boolean;
  /** Whether the Columns menu can hide it (default true). */
  hideable?: boolean;
  /** Hidden until turned on in the Columns menu. */
  hidden?: boolean;
  align?: "start" | "end";
  className?: string;
};

type SortState = { id: string; desc: boolean } | null;

const text = (v: Value) => (v instanceof Date ? v.toISOString() : v == null ? "" : String(v));
function compare(a: Value, b: Value) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === "number" && typeof b === "number") return a - b;
  return text(a).localeCompare(text(b), undefined, { numeric: true, sensitivity: "base" });
}

/** A sortable head label: a ghost key whose arrow shows the direction (both carets while unsorted). */
function DataTableColumnHeader({ title, sorted, onSort, className }: { title: React.ReactNode; sorted: false | "asc" | "desc"; onSort?: () => void; className?: string }) {
  if (!onSort) return <span className={className}>{title}</span>;
  const Icon = sorted === "asc" ? ArrowUpIcon : sorted === "desc" ? ArrowDownIcon : CaretUpDownIcon;
  return (
    <button
      type="button"
      data-slot="data-table-column-header"
      onClick={onSort}
      className={cn("-mx-2 inline-flex h-8 items-center gap-1.5 rounded-pill px-2 font-sans text-body leading-tight font-normal text-fg-muted outline-none transition-[background-color,color] duration-fast ease-out hover:bg-subtle-hover hover:text-fg focus-visible:shadow-focus active:shadow-[inset_0_0_0_9996px_var(--ds-color-wash-pressed)] active:transition-none data-[sorted=true]:text-fg motion-reduce:transition-none", className)}
      data-sorted={!!sorted}
    >
      {title}
      <Icon aria-hidden weight={sorted ? "bold" : "regular"} className="size-4" />
    </button>
  );
}

/** The Columns key and its menu of checkboxes, one per column that can be hidden. */
function DataTableViewOptions({ columns, visible, onVisibleChange }: { columns: { id: string; header: React.ReactNode }[]; visible: Record<string, boolean>; onVisibleChange: (id: string, on: boolean) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-10 shrink-0">
          <ColumnsIcon weight="fill" />
          Columns
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Show columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {columns.map((c) => (
          <DropdownMenuCheckboxItem key={c.id} checked={visible[c.id] !== false} onCheckedChange={(on) => onVisibleChange(c.id, on === true)} onSelect={(e) => e.preventDefault()}>
            {c.header}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** The pager under the table, as the console draws it: ghost 28px keys with 16px carets around the page number (14px,
 * the secondary purple, at least 32px wide), centered in a row at least 44px tall. The selection count and rows per
 * page sit at its left. */
function DataTablePagination({ page, pageCount, onPageChange, pageSize, pageSizes, onPageSizeChange, selected, total, className }: { page: number; pageCount: number; onPageChange: (page: number) => void; pageSize?: number; pageSizes?: number[]; onPageSizeChange?: (size: number) => void; selected?: number; total?: number; className?: string }) {
  const go = (p: number) => () => {
    if (p >= 0 && p < pageCount) onPageChange(p);
  };
  return (
    <nav aria-label="Pagination" data-slot="data-table-pagination" className={cn("grid min-h-11 grid-cols-1 items-center gap-x-4 gap-y-1 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]", className)}>
      <div className="flex min-h-7 flex-wrap items-center justify-center gap-x-4 gap-y-1 text-body leading-tight text-fg-muted sm:justify-start">
        {selected !== undefined && total !== undefined && (
          <span aria-live="polite">
            {selected} of {total} selected
          </span>
        )}
        {pageSizes && pageSize && onPageSizeChange && (
          <span className="flex items-center gap-2">
            <span id="data-table-page-size">Rows per page</span>
            <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
              <SelectTrigger size="sm" aria-labelledby="data-table-page-size" className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizes.map((s) => (
                  <SelectItem key={s} value={String(s)}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </span>
        )}
      </div>
      <div className="flex items-center justify-center gap-1">
        <Button variant="ghost" size="icon-sm" aria-label="Previous page" onClick={go(page - 1)} disabled={page === 0}>
          <CaretLeftIcon className="size-4" />
        </Button>
        <span aria-current="page" className="min-w-8 text-center text-body leading-tight text-fg-secondary tabular-nums">
          {page + 1}
        </span>
        <Button variant="ghost" size="icon-sm" aria-label="Next page" onClick={go(page + 1)} disabled={page >= pageCount - 1}>
          <CaretRightIcon className="size-4" />
        </Button>
      </div>
    </nav>
  );
}

type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowId: (row: T) => string;
  /** A filter field over these columns' values (all filterable columns when omitted). */
  filter?: { placeholder?: string; columns?: string[] } | false;
  /** A checkbox column for choosing rows. */
  selectable?: boolean;
  selection?: string[];
  onSelectionChange?: (ids: string[]) => void;
  /** Hide the Columns key. */
  hideViewOptions?: boolean;
  pageSize?: number;
  /** Offer these page sizes in the bar. */
  pageSizes?: number[];
  defaultSort?: SortState;
  /** Shown in the body when nothing matches. */
  empty?: React.ReactNode;
  /** Actions at the toolbar's right, before the Columns key. */
  toolbar?: React.ReactNode;
  /** What a row is called in labels ("mailbox"). */
  rowName?: string;
  /** The boxed table (default) or the console's borderless list table. */
  variant?: "default" | "open";
  className?: string;
};

function DataTable<T>({ columns, data, getRowId, filter = {}, selectable = false, selection: selectionProp, onSelectionChange, hideViewOptions = false, pageSize: pageSizeProp = 10, pageSizes, defaultSort = null, empty = "No results.", toolbar, rowName = "row", variant = "default", className }: DataTableProps<T>) {
  const [query, setQuery] = React.useState("");
  const [sort, setSort] = React.useState<SortState>(defaultSort);
  const [page, setPage] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(pageSizeProp);
  const [visible, setVisible] = React.useState<Record<string, boolean>>(() => Object.fromEntries(columns.map((c) => [c.id, !c.hidden])));
  const [selectionInner, setSelectionInner] = React.useState<string[]>([]);
  const selection = selectionProp ?? selectionInner;
  const setSelection = (ids: string[]) => {
    if (!selectionProp) setSelectionInner(ids);
    onSelectionChange?.(ids);
  };

  const shown = columns.filter((c) => visible[c.id] !== false);
  const filterColumns = filter ? columns.filter((c) => c.accessor && (!filter.columns || filter.columns.includes(c.id))) : [];

  const q = query.trim().toLowerCase();
  let rows = q ? data.filter((row) => filterColumns.some((c) => text(c.accessor!(row)).toLowerCase().includes(q))) : data;
  const sortColumn = sort && columns.find((c) => c.id === sort.id);
  if (sort && sortColumn?.accessor) {
    const get = sortColumn.accessor;
    rows = [...rows].sort((a, b) => compare(get(a), get(b)) * (sort.desc ? -1 : 1));
  }

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pageCount - 1);
  const pageRows = rows.slice(current * pageSize, current * pageSize + pageSize);
  const pageIds = pageRows.map(getRowId);
  const allOnPage = pageIds.length > 0 && pageIds.every((id) => selection.includes(id));
  const someOnPage = pageIds.some((id) => selection.includes(id));

  const toggleSort = (id: string) => setSort((s) => (s?.id !== id ? { id, desc: false } : s.desc ? null : { id, desc: true }));

  return (
    <div data-slot="data-table" className={cn("grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3", className)}>
      {(filter || !hideViewOptions || toolbar) && (
        <div data-slot="data-table-toolbar" className="flex flex-wrap items-center gap-2">
          {filter && (
            <InputGroup className="max-w-80 min-w-48 flex-1">
              <InputGroupAddon>
                <MagnifyingGlassIcon className="size-3.5 text-fg-subtle" />
              </InputGroupAddon>
              <InputGroupInput
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
                placeholder={filter.placeholder ?? "Filter"}
                aria-label={filter.placeholder ?? "Filter"}
              />
            </InputGroup>
          )}
          <div className="ml-auto flex items-center gap-2">
            {toolbar}
            {!hideViewOptions && (
              <DataTableViewOptions
                columns={columns.filter((c) => c.hideable !== false)}
                visible={visible}
                onVisibleChange={(id, on) => setVisible((v) => ({ ...v, [id]: on }))}
              />
            )}
          </div>
        </div>
      )}
      <div>
        <Table variant={variant}>
          <TableHeader>
            <TableRow data-empty="">
              {selectable && (
                <TableHead>
                  <Checkbox
                    aria-label={`Select every ${rowName} on this page`}
                    checked={allOnPage ? true : someOnPage ? "indeterminate" : false}
                    onCheckedChange={(on) => setSelection(on === true ? [...new Set([...selection, ...pageIds])] : selection.filter((id) => !pageIds.includes(id)))}
                  />
                </TableHead>
              )}
              {shown.map((c) => (
                <TableHead key={c.id} aria-sort={sort?.id === c.id ? (sort.desc ? "descending" : "ascending") : c.sortable ? "none" : undefined} className={cn(c.align === "end" && "text-right", c.className)}>
                  <DataTableColumnHeader title={c.header} sorted={sort?.id === c.id ? (sort.desc ? "desc" : "asc") : false} onSort={c.sortable && c.accessor ? () => toggleSort(c.id) : undefined} />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length ? (
              pageRows.map((row) => {
                const id = getRowId(row);
                const selected = selection.includes(id);
                return (
                  <TableRow key={id} data-state={selected ? "selected" : undefined}>
                    {selectable && (
                      <TableCell>
                        <Checkbox aria-label={`Select ${rowName} ${id}`} checked={selected} onCheckedChange={(on) => setSelection(on === true ? [...selection, id] : selection.filter((s) => s !== id))} />
                      </TableCell>
                    )}
                    {shown.map((c) => (
                      <TableCell key={c.id} className={cn(c.align === "end" && "text-right", c.className)}>
                        {c.cell ? c.cell(row) : text(c.accessor?.(row))}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            ) : (
              <TableRow data-empty="">
                <TableCell colSpan={shown.length + (selectable ? 1 : 0)} className="h-auto px-6 py-12 text-center whitespace-normal text-fg-muted">
                  {empty}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <DataTablePagination
          className="mt-1"
          page={current}
          pageCount={pageCount}
          onPageChange={setPage}
          pageSize={pageSize}
          pageSizes={pageSizes}
          onPageSizeChange={(s) => {
            setPageSize(s);
            setPage(0);
          }}
          selected={selectable ? selection.length : undefined}
          total={selectable ? data.length : undefined}
        />
      </div>
    </div>
  );
}

export { DataTable, DataTableColumnHeader, DataTablePagination, DataTableViewOptions };
export type { DataTableColumn, DataTableProps, SortState };

```
