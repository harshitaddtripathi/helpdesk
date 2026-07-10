import type { Ticket } from "../../types";

type TicketDetailProps = {
  ticket: Ticket;
};

export function TicketDetail({ ticket }: TicketDetailProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Subject</p>
      <h2 className="mt-1 text-xl font-semibold text-slate-950">{ticket.subject}</h2>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="font-medium text-slate-500">Raised by</dt>
          <dd className="mt-1 text-slate-950">{ticket.senderName}</dd>
          <dd className="text-xs text-slate-500">{ticket.senderEmail}</dd>
        </div>
        <div>
          <dt className="font-medium text-slate-500">Created</dt>
          <dd className="mt-1 text-slate-950">{formatDateTime(ticket.createdAt)}</dd>
        </div>
        <div>
          <dt className="font-medium text-slate-500">Updated</dt>
          <dd className="mt-1 text-slate-950">{formatDateTime(ticket.updatedAt)}</dd>
        </div>
      </dl>
      <div className="mt-4 border-t border-slate-200 pt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Message</p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{ticket.body}</p>
      </div>
    </div>
  );
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  });
}
