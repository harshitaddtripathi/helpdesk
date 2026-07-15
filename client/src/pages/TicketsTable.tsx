import { useState, type Dispatch, type SetStateAction } from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnFiltersState,
  type ColumnDef,
  type PaginationState,
  type SortingState
} from "@tanstack/react-table";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  X
} from "lucide-react";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { TextLink } from "../components/ui/text-link";
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
import {
  ticketCategories,
  ticketStatuses,
  type TicketListQuery,
  type TicketSortField
} from "core";

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
type TicketFilterStatus = TicketListQuery["status"];
type TicketFilterCategory = TicketListQuery["category"];

type TicketsResponse = {
  tickets: TicketListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    pageCount: number;
  };
};

const statusOptions: Array<{ label: string; value: TicketFilterStatus }> = [
  { label: "All statuses", value: "all" },
  ...ticketStatuses.map((status) => ({ label: formatStatus(status), value: status }))
];

const categoryOptions: Array<{ label: string; value: TicketFilterCategory }> = [
  { label: "All categories", value: "all" },
  ...ticketCategories.map((category) => ({
    label: formatCategory(category),
    value: category
  })),
  { label: "Uncategorized", value: "uncategorized" }
];

const columns: ColumnDef<TicketListItem>[] = [
  {
    accessorKey: "subject",
    header: "Subject",
    cell: ({ row }) => (
      <TextLink to={`/tickets/${row.original.id}`}>{row.original.subject}</TextLink>
    )
  },
  {
    accessorKey: "senderName",
    header: "Sender",
    cell: ({ row }) => (
      <div>
        <div className="font-semibold text-slate-950">{row.original.senderName}</div>
        <div className="text-xs text-slate-500">{row.original.senderEmail}</div>
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
        <span className="text-slate-500">Uncategorized</span>
      )
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => (
      <span className="font-data text-xs text-slate-600">
        {new Date(row.original.createdAt).toLocaleDateString()}
      </span>
    )
  }
];

async function fetchTickets(params: TicketListQuery) {
  const response = await axios.get<TicketsResponse>("/api/tickets", {
    params,
    withCredentials: true
  });

  return response.data;
}

export function TicketsTable() {
  const [sorting, setSorting] = useState<SortingState>([{ id: "createdAt", desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10
  });
  const currentSort = sorting[0];
  const sortBy = (currentSort?.id as TicketSortField | undefined) ?? "createdAt";
  const sortOrder: TicketSortOrder = currentSort ? (currentSort.desc ? "desc" : "asc") : "desc";
  const status = getColumnFilterValue<TicketFilterStatus>(columnFilters, "status", "all");
  const category = getColumnFilterValue<TicketFilterCategory>(columnFilters, "category", "all");
  const search = globalFilter.trim();
  const ticketQueryParams: TicketListQuery = {
    sortBy,
    sortOrder,
    search,
    status,
    category,
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize
  };

  const ticketsQuery = useQuery({
    queryKey: ["tickets", ticketQueryParams],
    queryFn: () => fetchTickets(ticketQueryParams)
  });

  const tickets = ticketsQuery.data?.tickets ?? [];
  const totalTickets = ticketsQuery.data?.pagination.total ?? 0;
  const hasActiveFilters = Boolean(search) || status !== "all" || category !== "all";
  const table = useReactTable({
    data: tickets,
    columns,
    rowCount: totalTickets,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      pagination
    },
    onSortingChange: (updater) => {
      setSorting(updater);
      setPagination((currentPagination) => ({ ...currentPagination, pageIndex: 0 }));
    },
    onColumnFiltersChange: (updater) => {
      setColumnFilters(updater);
      setPagination((currentPagination) => ({ ...currentPagination, pageIndex: 0 }));
    },
    onGlobalFilterChange: (updater) => {
      setGlobalFilter(updater);
      setPagination((currentPagination) => ({ ...currentPagination, pageIndex: 0 }));
    },
    onPaginationChange: setPagination,
    manualSorting: true,
    manualFiltering: true,
    manualPagination: true,
    enableMultiSort: false,
    getCoreRowModel: getCoreRowModel()
  });

  return (
    <div className="panel-surface overflow-hidden rounded-lg">
      <div className="border-b border-slate-200/80 bg-white/80 p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_180px_210px_auto] md:items-end">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="ticket-search">
              Search
            </label>
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              />
              <input
                className="field-control h-10 w-full rounded-md pl-9 pr-3 text-sm placeholder:text-slate-400"
                id="ticket-search"
                onChange={(event) => setGlobalFilter(event.target.value)}
                placeholder="Subject, sender, or email"
                type="search"
                value={globalFilter}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="ticket-status">
              Status
            </label>
            <select
              className="field-control h-10 w-full rounded-md px-3 text-sm"
              id="ticket-status"
              onChange={(event) =>
                setColumnFilterValue(setColumnFilters, "status", event.target.value)
              }
              value={status}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="ticket-category">
              Category
            </label>
            <select
              className="field-control h-10 w-full rounded-md px-3 text-sm"
              id="ticket-category"
              onChange={(event) =>
                setColumnFilterValue(setColumnFilters, "category", event.target.value)
              }
              value={category}
            >
              {categoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <Button
            className="h-10 md:self-end"
            disabled={!hasActiveFilters}
            onClick={() => {
              setGlobalFilter("");
              setColumnFilters([]);
              setPagination((currentPagination) => ({ ...currentPagination, pageIndex: 0 }));
            }}
            variant="ghost"
          >
            <X aria-hidden="true" className="h-4 w-4" />
            Clear filters
          </Button>
        </div>
      </div>
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
      {!ticketsQuery.isPending && !ticketsQuery.isError ? (
        <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
          <div className="font-data text-xs">
            {totalTickets === 0 ? (
              "0 tickets"
            ) : (
              <>
                Showing {pagination.pageIndex * pagination.pageSize + 1}-
                {Math.min((pagination.pageIndex + 1) * pagination.pageSize, totalTickets)} of{" "}
                {totalTickets}
              </>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm font-semibold text-slate-700" htmlFor="ticket-page-size">
              Rows per page
            </label>
            <select
              className="field-control h-9 rounded-md px-2 text-sm"
              id="ticket-page-size"
              onChange={(event) => {
                table.setPageSize(Number(event.target.value));
                table.setPageIndex(0);
              }}
              value={pagination.pageSize}
            >
              {[10, 25, 50].map((pageSize) => (
                <option key={pageSize} value={pageSize}>
                  {pageSize}
                </option>
              ))}
            </select>
            <span className="font-data min-w-24 text-center text-xs">
              Page {pagination.pageIndex + 1} of {Math.max(table.getPageCount(), 1)}
            </span>
            <Button
              aria-label="First page"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.firstPage()}
              size="sm"
              variant="ghost"
            >
              <ChevronsLeft aria-hidden="true" className="h-4 w-4" />
            </Button>
            <Button
              aria-label="Previous page"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
              size="sm"
              variant="ghost"
            >
              <ChevronLeft aria-hidden="true" className="h-4 w-4" />
            </Button>
            <Button
              aria-label="Next page"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
              size="sm"
              variant="ghost"
            >
              <ChevronRight aria-hidden="true" className="h-4 w-4" />
            </Button>
            <Button
              aria-label="Last page"
              disabled={!table.getCanNextPage()}
              onClick={() => table.lastPage()}
              size="sm"
              variant="ghost"
            >
              <ChevronsRight aria-hidden="true" className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function getColumnFilterValue<TValue>(
  columnFilters: ColumnFiltersState,
  id: string,
  fallback: TValue
) {
  return (columnFilters.find((filter) => filter.id === id)?.value as TValue | undefined) ?? fallback;
}

function setColumnFilterValue(
  setColumnFilters: Dispatch<SetStateAction<ColumnFiltersState>>,
  id: string,
  value: string
) {
  setColumnFilters((currentFilters) => {
    const remainingFilters = currentFilters.filter((filter) => filter.id !== id);

    if (value === "all") {
      return remainingFilters;
    }

    return [...remainingFilters, { id, value }];
  });
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

function formatStatus(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}
