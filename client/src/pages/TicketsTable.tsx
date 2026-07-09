import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
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

type TicketListItem = {
  id: number;
  subject: string;
  senderName: string;
  senderEmail: string;
  status: TicketStatus;
  category: Category | null;
  createdAt: string;
};

async function fetchTickets() {
  const response = await axios.get<{ tickets: TicketListItem[] }>("/api/tickets", {
    withCredentials: true
  });

  return response.data.tickets;
}

export function TicketsTable() {
  const ticketsQuery = useQuery({
    queryKey: ["tickets"],
    queryFn: fetchTickets
  });

  const tickets = ticketsQuery.data ?? [];

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
            <TableRow>
              <TableHead>Subject</TableHead>
              <TableHead>Sender</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.length === 0 ? (
              <TableRow>
                <TableCell className="text-slate-500" colSpan={5}>
                  No tickets found.
                </TableCell>
              </TableRow>
            ) : (
              tickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell className="font-medium text-slate-950">{ticket.subject}</TableCell>
                  <TableCell>
                    <div className="font-medium text-slate-950">{ticket.senderName}</div>
                    <div className="text-sm text-slate-500">{ticket.senderEmail}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(ticket.status)}>{ticket.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {ticket.category ? (
                      <Badge variant="secondary">{formatCategory(ticket.category.slug)}</Badge>
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {new Date(ticket.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
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
