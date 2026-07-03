import { FormEvent, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiFetch } from "../lib/api";
import type { Category, Ticket } from "../types";

export function TicketDetailPage() {
  const { ticketId } = useParams();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ticketId) return;

    void Promise.all([
      apiFetch<{ ticket: Ticket }>(`/api/tickets/${ticketId}`),
      apiFetch<{ categories: Category[] }>("/api/categories")
    ])
      .then(([ticketResult, categoryResult]) => {
        setTicket(ticketResult.ticket);
        setCategories(categoryResult.categories);
      })
      .catch((requestError) => {
        setError(requestError instanceof Error ? requestError.message : "Failed to load ticket.");
      });
  }, [ticketId]);

  async function updateTicket(formData: FormData) {
    if (!ticketId) return;

    const result = await apiFetch<{ ticket: Ticket }>(`/api/tickets/${ticketId}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: formData.get("status"),
        categorySlug: formData.get("categorySlug")
      })
    });

    setTicket((current) => (current ? { ...current, ...result.ticket } : result.ticket));
  }

  async function handleMetaSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    try {
      await updateTicket(new FormData(event.currentTarget));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to update ticket.");
    }
  }

  async function handleReplySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ticketId || !reply.trim()) return;
    setError("");

    try {
      await apiFetch(`/api/tickets/${ticketId}/replies`, {
        method: "POST",
        body: JSON.stringify({ bodyText: reply })
      });
      const result = await apiFetch<{ ticket: Ticket }>(`/api/tickets/${ticketId}`);
      setTicket(result.ticket);
      setReply("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to send reply.");
    }
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!ticket) {
    return <p className="text-sm text-slate-500">Loading ticket...</p>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <section className="space-y-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-xl font-semibold text-slate-950">{ticket.subject}</h2>
          <p className="mt-1 text-sm text-slate-500">{ticket.senderEmail}</p>
        </div>

        <div className="space-y-3">
          {ticket.messages?.map((message) => (
            <article className="rounded-lg border border-slate-200 bg-white p-4" key={message.id}>
              <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
                <span>{message.direction}</span>
                <span>{new Date(message.createdAt).toLocaleString()}</span>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{message.bodyText}</p>
            </article>
          ))}
        </div>

        <form className="rounded-lg border border-slate-200 bg-white p-4" onSubmit={handleReplySubmit}>
          <label className="block text-sm font-medium text-slate-700">
            Reply
            <textarea
              className="mt-2 min-h-32 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-950"
              value={reply}
              onChange={(event) => setReply(event.target.value)}
            />
          </label>
          <button className="mt-3 rounded-md bg-slate-950 px-4 py-2 text-sm text-white" type="submit">
            Send reply
          </button>
        </form>
      </section>

      <aside className="space-y-4">
        <form className="rounded-lg border border-slate-200 bg-white p-4" onSubmit={handleMetaSubmit}>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Ticket Controls
          </h3>

          <label className="mt-4 block text-sm font-medium text-slate-700">
            Status
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              defaultValue={ticket.status.toLowerCase()}
              name="status"
            >
              <option value="open">Open</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
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
    </div>
  );
}

