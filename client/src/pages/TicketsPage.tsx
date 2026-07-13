import { TicketsTable } from "./TicketsTable";

export function TicketsPage() {
  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
            Agent workspace
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Ticket queue</h1>
          <p className="mt-1 text-sm text-slate-500">
            Search, filter, and sort incoming customer requests.
          </p>
        </div>
      </div>

      <TicketsTable />
    </div>
  );
}
