import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";
import type { DashboardData } from "../types";

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void apiFetch<DashboardData>("/api/dashboard")
      .then(setData)
      .catch((requestError) => {
        setError(requestError instanceof Error ? requestError.message : "Failed to load dashboard.");
      });
  }, []);

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!data) {
    return <p className="text-sm text-slate-500">Loading dashboard...</p>;
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        <Metric label="Open" value={data.stats.open} to="/tickets?status=open" />
        <Metric label="Resolved" value={data.stats.resolved} to="/tickets?status=resolved" />
        <Metric label="Closed" value={data.stats.closed} to="/tickets?status=closed" />
        <Metric label="Total" value={data.stats.total} to="/tickets" />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Category Breakdown
          </h2>
          <div className="mt-4 space-y-3">
            {data.countsByCategory.map((item) => (
              <Link
                className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
                key={item.slug}
                to={`/tickets?category=${item.slug}`}
              >
                <span className="text-slate-700">{item.name}</span>
                <span className="font-semibold text-slate-950">{item.count}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Recent Tickets
          </h2>
          <div className="mt-4 space-y-3">
            {data.recentTickets.map((ticket) => (
              <Link
                className="block rounded-md border border-slate-200 px-3 py-2 hover:bg-slate-50"
                key={ticket.id}
                to={`/tickets/${ticket.id}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-medium text-slate-950">{ticket.subject}</p>
                  <span className="text-xs text-slate-500">{ticket.status}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{ticket.senderEmail}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value, to }: { label: string; value: number; to: string }) {
  return (
    <Link className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50" to={to}>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-950">{value}</p>
    </Link>
  );
}

