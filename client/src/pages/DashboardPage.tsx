import { useEffect, useState } from "react";
import { ArrowRight, Bot, CheckCircle2, Clock3, Inbox, Timer } from "lucide-react";
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

  const chartDays = 15;
  const chartData = data.ticketsByDay.slice(-chartDays);
  const totalRecentTickets = chartData.reduce((total, item) => total + item.count, 0);

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-slate-950 p-5 text-white shadow-xl shadow-slate-950/10">
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">
              Queue health
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Support operations
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Monitor incoming tickets, AI resolution coverage, and the work that needs agent attention.
            </p>
          </div>
          <Link
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-white px-4 text-sm font-semibold text-slate-950 transition-colors hover:bg-slate-100"
            to="/tickets"
          >
            Open queue
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <HealthMetric icon={Inbox} label="Total tickets" value={data.stats.total} tone="blue" />
          <HealthMetric icon={Clock3} label="Open tickets" value={data.stats.open} tone="amber" />
          <HealthMetric icon={Bot} label="Resolved by AI" value={data.stats.aiResolved} tone="teal" />
          <HealthMetric
            icon={CheckCircle2}
            label="AI resolution"
            value={`${data.stats.aiResolvedPercent}%`}
            tone="green"
          />
          <HealthMetric
            icon={Timer}
            label="Average resolution"
            value={formatDuration(data.stats.averageResolutionTimeSeconds)}
            tone="slate"
          />
        </div>
      </section>

      <TicketsByDayChart data={chartData} days={chartDays} total={totalRecentTickets} />

      <section className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="panel-surface rounded-lg p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-950">Category load</h2>
              <p className="mt-1 text-sm text-slate-500">Current ticket distribution</p>
            </div>
            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
              Live
            </span>
          </div>
          <div className="mt-4 space-y-2">
            {data.countsByCategory.map((item) => (
              <Link
                className="group flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm transition-colors hover:border-blue-200 hover:bg-blue-50/40"
                key={item.slug}
                to={`/tickets?category=${item.slug}`}
              >
                <span className="capitalize text-slate-700 group-hover:text-blue-700">{item.name}</span>
                <span className="font-data text-sm font-semibold text-slate-950">{item.count}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="panel-surface rounded-lg p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-950">Recent tickets</h2>
              <p className="mt-1 text-sm text-slate-500">Newest work entering the queue</p>
            </div>
            <Link className="text-sm font-semibold text-blue-600 hover:text-blue-700" to="/tickets">
              View all
            </Link>
          </div>
          <div className="mt-4 divide-y divide-slate-100">
            {data.recentTickets.map((ticket) => (
              <Link
                className="block py-3 transition-colors hover:bg-slate-50"
                key={ticket.id}
                to={`/tickets/${ticket.id}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-950">{ticket.subject}</p>
                    <p className="mt-1 truncate text-xs text-slate-500">{ticket.senderEmail}</p>
                  </div>
                  <span className="shrink-0 rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-semibold capitalize text-blue-700">
                    {ticket.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function TicketsByDayChart({
  data,
  days,
  total
}: {
  data: DashboardData["ticketsByDay"];
  days: number;
  total: number;
}) {
  const maxCount = Math.max(...data.map((item) => item.count), 1);
  const chartMax = getNiceChartMax(maxCount);
  const tickValues = getChartTicks(chartMax);

  return (
    <section className="panel-surface rounded-lg p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-950">Ticket intake</h2>
          <p className="mt-1 text-sm text-slate-500">Past {days} days</p>
        </div>
        <p className="font-data rounded-md bg-slate-100 px-2 py-1 text-sm font-semibold text-slate-700">
          {total} total
        </p>
      </div>

      <div className="mt-5 overflow-x-auto">
        <div className="min-w-[560px]">
          <div className="grid grid-cols-[52px_1fr] gap-x-3">
            <div className="relative h-64 font-data text-xs text-slate-400">
              {tickValues.map((tick) => (
                <span
                  className="absolute right-0 -translate-y-1/2"
                  key={tick}
                  style={{ top: `${100 - (tick / chartMax) * 100}%` }}
                >
                  {tick}
                </span>
              ))}
            </div>
            <div className="relative h-64 border-b border-l border-slate-200">
              {tickValues.map((tick) => (
                <div
                  className="absolute inset-x-0 border-t border-slate-100"
                  key={tick}
                  style={{ top: `${100 - (tick / chartMax) * 100}%` }}
                />
              ))}
              <div
                className="absolute inset-x-3 bottom-0 top-0 grid items-end gap-2"
                style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}
              >
                {data.map((item, index) => {
                  const height = item.count > 0 ? Math.max((item.count / chartMax) * 100, 3) : 0;

                  return (
                    <div
                      className="group flex h-full min-w-0 items-end"
                      key={item.date}
                      title={`${item.label}: ${item.count} tickets`}
                    >
                      <div
                        className="chart-bar relative w-full rounded-t-md bg-blue-500/85 transition-colors group-hover:bg-blue-700"
                        style={{
                          height: `${height}%`,
                          animationDelay: `${120 + index * 24}ms`
                        }}
                        aria-label={`${item.count} tickets on ${item.label}`}
                      >
                        <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 rounded-md bg-slate-950 px-2 py-1 font-data text-xs text-white shadow-lg group-hover:block">
                          {item.count}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div />
            <div
              className="mt-3 grid gap-2 px-3 font-data text-xs text-slate-500"
              style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}
            >
              {data.map((item, index) => (
                <span className="truncate text-center" key={item.date}>
                  {shouldShowChartLabel(index, data.length) ? item.label : ""}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function getNiceChartMax(maxCount: number) {
  const roughStep = Math.max(maxCount / 4, 1);
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const normalizedStep = roughStep / magnitude;
  const niceStep =
    normalizedStep <= 1 ? 1 : normalizedStep <= 2 ? 2 : normalizedStep <= 5 ? 5 : 10;

  return niceStep * magnitude * 4;
}

function getChartTicks(chartMax: number) {
  const step = chartMax / 4;

  return Array.from({ length: 5 }, (_, index) => Math.round(chartMax - step * index));
}

function shouldShowChartLabel(index: number, length: number) {
  if (index === 0 || index === length - 1) {
    return true;
  }

  return index % (length <= 15 ? 3 : 5) === 0;
}

function HealthMetric({
  icon: Icon,
  label,
  value,
  tone
}: {
  icon: typeof Inbox;
  label: string;
  value: number | string;
  tone: "blue" | "amber" | "teal" | "green" | "slate";
}) {
  const toneClass = {
    blue: "bg-blue-500/15 text-blue-200",
    amber: "bg-amber-500/15 text-amber-200",
    teal: "bg-teal-500/15 text-teal-200",
    green: "bg-emerald-500/15 text-emerald-200",
    slate: "bg-slate-500/20 text-slate-200"
  }[tone];

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <div className={`flex h-9 w-9 items-center justify-center rounded-md ${toneClass}`}>
        <Icon aria-hidden="true" className="h-4 w-4" />
      </div>
      <p className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="font-data mt-1 text-2xl font-semibold text-white">{value}</p>
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
