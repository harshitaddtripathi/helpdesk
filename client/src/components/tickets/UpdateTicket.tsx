import type { FormEvent } from "react";
import { ticketStatuses } from "core";
import { Bot, CheckCircle2, SlidersHorizontal } from "lucide-react";
import { Button } from "../ui/button";
import type { Category, Ticket, User } from "../../types";

type UpdateTicketProps = {
  agents: User[];
  categories: Category[];
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  ticket: Ticket;
};

export function UpdateTicket({ agents, categories, onSubmit, ticket }: UpdateTicketProps) {
  const agentOptions =
    ticket.assignedTo && !agents.some((agent) => agent.id === ticket.assignedTo?.id)
      ? [ticket.assignedTo, ...agents]
      : agents;

  return (
    <aside className="space-y-4">
      <form className="panel-surface rounded-lg p-4" onSubmit={onSubmit}>
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-950 text-white">
            <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
          </span>
          <h3 className="text-sm font-semibold text-slate-950">Ticket controls</h3>
        </div>

        <label className="mt-4 block text-sm font-semibold text-slate-700">
          Status
          <select
            className="field-control mt-1 h-10 w-full rounded-md px-3 text-sm"
            defaultValue={ticket.status}
            name="status"
          >
            {ticketStatuses.map((status) => (
              <option key={status} value={status}>
                {formatStatus(status)}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-4 block text-sm font-semibold text-slate-700">
          Category
          <select
            className="field-control mt-1 h-10 w-full rounded-md px-3 text-sm"
            defaultValue={ticket.category?.slug ?? ""}
            name="categorySlug"
          >
            <option value="">None</option>
            {categories.map((category) => (
              <option key={category.id} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-4 block text-sm font-semibold text-slate-700">
          Assigned agent
          <select
            className="field-control mt-1 h-10 w-full rounded-md px-3 text-sm"
            defaultValue={ticket.assignedTo?.id ?? ""}
            name="assignedToId"
          >
            <option value="">Unassigned</option>
            {agentOptions.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name} ({agent.email})
              </option>
            ))}
          </select>
        </label>

        <Button className="mt-4 w-full" type="submit">
          Save changes
        </Button>
      </form>

      <div className="rounded-lg border border-teal-200 bg-teal-50 p-4">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-teal-600 text-white">
            <Bot aria-hidden="true" className="h-4 w-4" />
          </span>
          <h3 className="text-sm font-semibold text-teal-950">AI assistance</h3>
        </div>
        <div className="mt-4 space-y-3 text-sm text-teal-900">
          <p className="flex gap-2">
            <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            Summaries and reply polishing are available on this ticket.
          </p>
          <p className="flex gap-2">
            <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            Classification keeps category routing aligned with the queue.
          </p>
        </div>
      </div>
    </aside>
  );
}

function formatStatus(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}
