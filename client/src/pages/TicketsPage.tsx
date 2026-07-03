import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiFetch } from "../lib/api";
import type { Category, Ticket } from "../types";

export function TicketsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState("");

  const query = useMemo(() => {
    const params = new URLSearchParams(searchParams);
    return params.toString() ? `?${params.toString()}` : "";
  }, [searchParams]);

  useEffect(() => {
    void Promise.all([
      apiFetch<{ tickets: Ticket[] }>(`/api/tickets${query}`),
      apiFetch<{ categories: Category[] }>("/api/categories")
    ])
      .then(([ticketResult, categoryResult]) => {
        setTickets(ticketResult.tickets);
        setCategories(categoryResult.categories);
      })
      .catch((requestError) => {
        setError(requestError instanceof Error ? requestError.message : "Failed to load tickets.");
      });
  }, [query]);

  function handleFilter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const next = new URLSearchParams();

    for (const key of ["status", "category", "search"]) {
      const value = String(formData.get(key) ?? "");
      if (value) next.set(key, value);
    }

    setSearchParams(next);
  }

  return (
    <div className="space-y-4">
      <form
        className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-[160px_220px_1fr_auto]"
        onSubmit={handleFilter}
      >
        <select
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          defaultValue={searchParams.get("status") ?? ""}
          name="status"
        >
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>

        <select
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          defaultValue={searchParams.get("category") ?? ""}
          name="category"
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.slug}>
              {category.name}
            </option>
          ))}
        </select>

        <input
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          defaultValue={searchParams.get("search") ?? ""}
          name="search"
          placeholder="Search tickets"
        />

        <button className="rounded-md bg-slate-950 px-4 py-2 text-sm text-white" type="submit">
          Filter
        </button>
      </form>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Subject</th>
              <th className="px-4 py-3 font-medium">Sender</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {tickets.map((ticket) => (
              <tr className="hover:bg-slate-50" key={ticket.id}>
                <td className="px-4 py-3">
                  <Link className="font-medium text-slate-950" to={`/tickets/${ticket.id}`}>
                    {ticket.subject}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">{ticket.senderEmail}</td>
                <td className="px-4 py-3 text-slate-600">{ticket.category?.name ?? "None"}</td>
                <td className="px-4 py-3 text-slate-600">{ticket.status}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {tickets.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500">No tickets found.</p>
        ) : null}
      </div>
    </div>
  );
}

