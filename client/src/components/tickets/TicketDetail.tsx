import type { Ticket } from "../../types";

type TicketDetailProps = {
  ticket: Ticket;
};

export function TicketDetail({ ticket }: TicketDetailProps) {
  return (
    <div className="panel-surface rounded-lg p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Subject</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            {ticket.subject}
          </h2>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-right">
          <p className="text-xs font-medium text-slate-500">Status</p>
          <p className="mt-0.5 text-sm font-semibold capitalize text-slate-950">{ticket.status}</p>
        </div>
      </div>

      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
        <MetaItem label="Raised by" value={ticket.senderName} detail={ticket.senderEmail} />
        <MetaItem label="Created" value={formatDateTime(ticket.createdAt)} />
        <MetaItem label="Updated" value={formatDateTime(ticket.updatedAt)} />
      </dl>

      <div className="mt-4 border-t border-slate-200 pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Message</p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{ticket.body}</p>
      </div>
    </div>
  );
}

function MetaItem({
  label,
  value,
  detail
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-slate-950">{value}</dd>
      {detail ? <dd className="mt-0.5 truncate text-xs text-slate-500">{detail}</dd> : null}
    </div>
  );
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  });
}
