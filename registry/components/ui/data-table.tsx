"use client";

import * as React from "react";
import { ArrowDownIcon, ArrowUpIcon, CaretUpDownIcon, ColumnsIcon, MagnifyingGlassIcon } from "@phosphor-icons/react/ssr";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
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
      className={cn("-mx-2 inline-flex h-8 items-center gap-1.5 rounded-pill px-2 font-sans text-body leading-tight font-normal text-fg-muted outline-none active:brightness-95 active:transition-none transition-colors duration-150 ease-out hover:bg-subtle-hover active:bg-subtle-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-focus-ring data-[sorted=true]:text-fg motion-reduce:transition-none", className)}
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

/** The page numbers around the current one: the ends, its neighbors and ellipses between. */
function pageList(page: number, count: number): (number | "gap")[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i);
  const set = new Set([0, count - 1, page - 1, page, page + 1].filter((p) => p >= 0 && p < count));
  const sorted = [...set].sort((a, b) => a - b);
  return sorted.flatMap((p, i) => (i && p - sorted[i - 1] > 1 ? (["gap", p] as const) : [p]));
}

/** The lilac bar under the table: the selection count, rows per page and the pages. */
function DataTablePagination({ page, pageCount, onPageChange, pageSize, pageSizes, onPageSizeChange, selected, total, className }: { page: number; pageCount: number; onPageChange: (page: number) => void; pageSize?: number; pageSizes?: number[]; onPageSizeChange?: (size: number) => void; selected?: number; total?: number; className?: string }) {
  const go = (p: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    if (p >= 0 && p < pageCount) onPageChange(p);
  };
  return (
    <Pagination bar className={cn("flex-wrap justify-between gap-x-4 gap-y-1", className)}>
      <div className="flex min-h-7.5 flex-wrap items-center gap-x-4 gap-y-1 pl-2 text-body leading-tight text-fg-muted">
        {selected !== undefined && total !== undefined && (
          <span aria-live="polite">
            {selected} of {total} selected
          </span>
        )}
        {pageSizes && pageSize && onPageSizeChange && (
          <span className="flex items-center gap-2">
            <span id="data-table-page-size">Rows per page</span>
            <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
              <SelectTrigger size="sm" aria-labelledby="data-table-page-size" className="h-7.5 w-18 pr-2 pl-2.5">
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
      <PaginationContent className="ml-auto">
        <PaginationItem>
          <PaginationPrevious href="#" onClick={go(page - 1)} aria-disabled={page === 0 || undefined} tabIndex={page === 0 ? -1 : undefined} />
        </PaginationItem>
        {pageList(page, pageCount).map((p, i) =>
          p === "gap" ? (
            <PaginationItem key={`gap-${i}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={p}>
              <PaginationLink href="#" isActive={p === page} onClick={go(p)} aria-label={`Page ${p + 1}`}>
                {p + 1}
              </PaginationLink>
            </PaginationItem>
          ),
        )}
        <PaginationItem>
          <PaginationNext href="#" onClick={go(page + 1)} aria-disabled={page >= pageCount - 1 || undefined} tabIndex={page >= pageCount - 1 ? -1 : undefined} />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
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
  className?: string;
};

function DataTable<T>({ columns, data, getRowId, filter = {}, selectable = false, selection: selectionProp, onSelectionChange, hideViewOptions = false, pageSize: pageSizeProp = 10, pageSizes, defaultSort = null, empty = "No results.", toolbar, rowName = "row", className }: DataTableProps<T>) {
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
                <MagnifyingGlassIcon />
              </InputGroupAddon>
              <InputGroupInput
                type="search"
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
        <Table>
          <TableHeader>
            <TableRow className="hover:[&>td]:bg-transparent">
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
              <TableRow className="hover:[&>td]:bg-surface">
                <TableCell colSpan={shown.length + (selectable ? 1 : 0)} className="h-24 text-center whitespace-normal text-fg-muted">
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
