import { useEffect, useState } from "react";
import { Link } from "react-router";
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
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Metric label="Total Tickets" value={data.stats.total} />
        <Metric label="Open Tickets" value={data.stats.open} />
        <Metric label="Resolved by AI" value={data.stats.aiResolved} />
        <Metric label="AI Resolution Rate" value={`${data.stats.aiResolvedPercent}%`} />
        <Metric
          label="Average Resolution Time"
          value={formatDuration(data.stats.averageResolutionTimeSeconds)}
        />
      </section>

      <TicketsByDayChart data={data.ticketsByDay} />

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

function TicketsByDayChart({
  data
}: {
  data: DashboardData["ticketsByDay"];
}) {
  const maxCount = Math.max(...data.map((item) => item.count), 1);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Tickets Per Day
          </h2>
          <p className="mt-1 text-sm text-slate-500">Past 30 days</p>
        </div>
        <p className="text-sm font-medium text-slate-700">
          {data.reduce((total, item) => total + item.count, 0)} total
        </p>
      </div>

      <div className="mt-5 overflow-x-auto">
        <div className="grid min-w-[720px] grid-cols-[auto_1fr] gap-x-3">
          <div className="flex h-48 flex-col justify-between text-right text-xs text-slate-400">
            <span>{maxCount}</span>
            <span>{Math.floor(maxCount / 2)}</span>
            <span>0</span>
          </div>
          <div className="relative h-48 border-b border-l border-slate-200">
            <div className="absolute inset-x-0 top-0 border-t border-slate-100" />
            <div className="absolute inset-x-0 top-1/2 border-t border-slate-100" />
            <div
              className="absolute inset-x-2 bottom-0 top-0 grid items-end gap-1"
              style={{ gridTemplateColumns: "repeat(30, minmax(0, 1fr))" }}
            >
              {data.map((item) => (
                <div
                  className="group flex h-full min-w-0 items-end"
                  key={item.date}
                  title={`${item.label}: ${item.count} tickets`}
                >
                  <div
                    className="w-full rounded-t bg-slate-700 transition-colors group-hover:bg-blue-600"
                    style={{
                      height: `${Math.max((item.count / maxCount) * 100, item.count > 0 ? 4 : 0)}%`
                    }}
                    aria-label={`${item.count} tickets on ${item.label}`}
                  />
                </div>
              ))}
            </div>
          </div>
          <div />
          <div
            className="mt-2 grid gap-1 px-2 text-xs text-slate-500"
            style={{ gridTemplateColumns: "repeat(30, minmax(0, 1fr))" }}
          >
            {data.map((item, index) => (
              <span className="truncate text-center" key={item.date}>
                {index % 5 === 0 || index === data.length - 1 ? item.label : ""}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function formatDuration(totalSeconds: number | null) {
  if (totalSeconds === null) {
    return "N/A";
  }

  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }

  const totalMinutes = Math.round(totalSeconds / 60);

  if (totalMinutes < 60) {
    return `${totalMinutes}m`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours < 24) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}
