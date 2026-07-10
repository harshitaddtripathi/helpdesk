import type { FormEvent } from "react";
import { ticketStatuses } from "core";
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
      <form className="rounded-lg border border-slate-200 bg-white p-4" onSubmit={onSubmit}>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Ticket Controls
        </h3>

        <label className="mt-4 block text-sm font-medium text-slate-700">
          Status
          <select
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
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

        <label className="mt-4 block text-sm font-medium text-slate-700">
          Category
          <select
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
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

        <label className="mt-4 block text-sm font-medium text-slate-700">
          Assigned agent
          <select
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
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

        <button className="mt-4 w-full rounded-md bg-slate-950 px-4 py-2 text-sm text-white" type="submit">
          Save changes
        </button>
      </form>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          AI Assistance
        </h3>
        <p className="mt-3 text-sm text-slate-600">
          Classification, summaries, and suggested replies are scaffolded in the API and ready for
          Codex integration.
        </p>
      </div>
    </aside>
  );
}

function formatStatus(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}
