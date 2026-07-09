import { TicketsTable } from "./TicketsTable";

export function TicketsPage() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Tickets</h1>
      </div>

      <TicketsTable />
    </div>
  );
}
