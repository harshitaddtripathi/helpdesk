import { useState } from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState
} from "@tanstack/react-table";
import { AlertCircle, ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "../components/ui/table";
import { getRequestErrorMessage } from "../lib/request-error";
import type { Category, TicketStatus } from "../types";
import type { TicketSortField } from "core";

type TicketListItem = {
  id: number;
  subject: string;
  senderName: string;
  senderEmail: string;
  status: TicketStatus;
  category: Category | null;
  createdAt: string;
};

type TicketSortOrder = "asc" | "desc";

const columns: ColumnDef<TicketListItem>[] = [
  {
    accessorKey: "subject",
    header: "Subject",
    cell: ({ row }) => (
      <span className="font-medium text-slate-950">{row.original.subject}</span>
    )
  },
  {
    accessorKey: "senderName",
    header: "Sender",
    cell: ({ row }) => (
      <div>
        <div className="font-medium text-slate-950">{row.original.senderName}</div>
        <div className="text-sm text-slate-500">{row.original.senderEmail}</div>
      </div>
    )
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={getStatusBadgeVariant(row.original.status)}>{row.original.status}</Badge>
    )
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) =>
      row.original.category ? (
        <Badge variant="secondary">{formatCategory(row.original.category.slug)}</Badge>
      ) : (
        <span className="text-slate-500">-</span>
      )
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => (
      <span className="text-slate-600">
        {new Date(row.original.createdAt).toLocaleDateString()}
      </span>
    )
  }
];

async function fetchTickets(params: { sortBy: TicketSortField; sortOrder: TicketSortOrder }) {
  const response = await axios.get<{ tickets: TicketListItem[] }>("/api/tickets", {
    params,
    withCredentials: true
  });

  return response.data.tickets;
}

export function TicketsTable() {
  const [sorting, setSorting] = useState<SortingState>([{ id: "createdAt", desc: true }]);
  const currentSort = sorting[0];
  const sortBy = (currentSort?.id as TicketSortField | undefined) ?? "createdAt";
  const sortOrder: TicketSortOrder = currentSort ? (currentSort.desc ? "desc" : "asc") : "desc";

  const ticketsQuery = useQuery({
    queryKey: ["tickets", { sortBy, sortOrder }],
    queryFn: () => fetchTickets({ sortBy, sortOrder })
  });

  const tickets = ticketsQuery.data ?? [];
  const table = useReactTable({
    data: tickets,
    columns,
    state: {
      sorting
    },
    onSortingChange: setSorting,
    manualSorting: true,
    enableMultiSort: false,
    getCoreRowModel: getCoreRowModel()
  });

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      {ticketsQuery.isPending ? (
        <TicketsTableSkeleton />
      ) : ticketsQuery.isError ? (
        <div className="p-4">
          <Alert className="flex items-start gap-2" variant="destructive">
            <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <AlertDescription>
              {getRequestErrorMessage(ticketsQuery.error, "Failed to load tickets.")}
            </AlertDescription>
          </Alert>
        </div>
      ) : (
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : (
                      <Button
                        aria-label={`${String(
                          header.column.columnDef.header
                        )} ${getSortButtonLabel(header.column.getIsSorted())}`}
                        className="-ml-2 h-8 px-2"
                        onClick={header.column.getToggleSortingHandler()}
                        variant="ghost"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <SortIcon direction={header.column.getIsSorted()} />
                      </Button>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {tickets.length === 0 ? (
              <TableRow>
                <TableCell className="text-slate-500" colSpan={5}>
                  No tickets found.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function SortIcon({ direction }: { direction: false | "asc" | "desc" }) {
  if (direction === "asc") {
    return <ArrowUp aria-hidden="true" className="h-4 w-4" />;
  }

  if (direction === "desc") {
    return <ArrowDown aria-hidden="true" className="h-4 w-4" />;
  }

  return <ArrowUpDown aria-hidden="true" className="h-4 w-4" />;
}

function getSortButtonLabel(direction: false | "asc" | "desc") {
  if (direction === "asc") {
    return "sorted ascending";
  }

  if (direction === "desc") {
    return "sorted descending";
  }

  return "not sorted";
}

function TicketsTableSkeleton() {
  return (
    <Table aria-label="Loading tickets">
      <TableHeader>
        <TableRow>
          <TableHead>Subject</TableHead>
          <TableHead>Sender</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 4 }, (_, index) => (
          <TableRow data-testid="ticket-row-skeleton" key={index}>
            <TableCell>
              <Skeleton className="h-4 w-48" />
            </TableCell>
            <TableCell>
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-52" />
              </div>
            </TableCell>
            <TableCell>
              <Skeleton className="h-6 w-16" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-6 w-32" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-24" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function getStatusBadgeVariant(status: TicketStatus) {
  if (status === "resolved") {
    return "secondary";
  }

  if (status === "closed") {
    return "outline";
  }

  return "default";
}

function formatCategory(category: string) {
  return category.replaceAll("_", " ");
}
