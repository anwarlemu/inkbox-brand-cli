import { ArrowsClockwiseIcon, PencilSimpleIcon } from "@phosphor-icons/react/ssr";

import { Button } from "@/components/ui/button";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const MAILBOXES = [
  { address: "acme@inkboxmail.com", agent: "@acme", webhooks: "None", storage: "0%", created: "Jul 27, 2026" },
  { address: "support@inkboxmail.com", agent: "@support-desk", webhooks: "2", storage: "4%", created: "Jul 29, 2026" },
  { address: "ops@inkboxmail.com", agent: "@ops-runner", webhooks: "1", storage: "12%", created: "Aug 2, 2026" },
];

export function Preview() {
  return (
    <div className="grid gap-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email address</TableHead>
            <TableHead>Agent</TableHead>
            <TableHead>Webhooks</TableHead>
            <TableHead>Storage</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-12 text-right">
              <Button variant="ghost" size="icon" aria-label="Refresh mailboxes">
                <ArrowsClockwiseIcon />
              </Button>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {MAILBOXES.map((m) => (
            <TableRow key={m.address}>
              <TableCell>{m.address}</TableCell>
              <TableCell className="text-rose">{m.agent}</TableCell>
              <TableCell>{m.webhooks}</TableCell>
              <TableCell>{m.storage}</TableCell>
              <TableCell>{m.created}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" aria-label={`Edit ${m.address}`}>
                  <PencilSimpleIcon weight="fill" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination bar className="mt-1">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href="#" aria-disabled />
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="#" isActive>
              1
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="#">2</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationNext href="#" />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}

export function WithFooter() {
  return (
    <Table>
      <TableCaption>Usage this billing period.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Channel</TableHead>
          <TableHead>Messages</TableHead>
          <TableHead className="text-right">Cost</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>Email</TableCell>
          <TableCell>1,204</TableCell>
          <TableCell className="text-right">$12.04</TableCell>
        </TableRow>
        <TableRow data-state="selected">
          <TableCell>Phone</TableCell>
          <TableCell>86</TableCell>
          <TableCell className="text-right">$4.30</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>iMessage</TableCell>
          <TableCell>412</TableCell>
          <TableCell className="text-right">$8.24</TableCell>
        </TableRow>
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={2}>Total</TableCell>
          <TableCell className="text-right">$24.58</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}
