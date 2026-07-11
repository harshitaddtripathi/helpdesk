import { FormEvent, useEffect, useState } from "react";
import { useParams } from "react-router";
import { ReplyThread } from "../components/tickets/ReplyThread";
import { TicketDetail } from "../components/tickets/TicketDetail";
import { UpdateTicket } from "../components/tickets/UpdateTicket";
import { BackLink } from "../components/ui/back-link";
import { apiFetch } from "../lib/api";
import type { Category, Ticket, User } from "../types";

type TicketDetailResponse = {
  ticket: Ticket;
  agents: User[];
};

export function TicketDetailPage() {
  const { ticketId } = useParams();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [agents, setAgents] = useState<User[]>([]);
  const [reply, setReply] = useState("");
  const [replyError, setReplyError] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ticketId) return;

    void Promise.all([
      apiFetch<TicketDetailResponse>(`/api/tickets/${ticketId}`),
      apiFetch<{ categories: Category[] }>("/api/categories")
    ])
      .then(([ticketResult, categoryResult]) => {
        setTicket(ticketResult.ticket);
        setAgents(ticketResult.agents);
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
        categorySlug: formData.get("categorySlug"),
        assignedToId: formData.get("assignedToId")
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
    if (!ticketId) return;
    if (!reply.trim()) {
      setReplyError("Write a message before sending your reply.");
      return;
    }
    setError("");
    setReplyError("");

    try {
      await apiFetch(`/api/tickets/${ticketId}/replies`, {
        method: "POST",
        body: JSON.stringify({ bodyText: reply })
      });
      const result = await apiFetch<{ ticket: Ticket }>(`/api/tickets/${ticketId}`);
      setTicket(result.ticket);
      setReply("");
    } catch (requestError) {
      setReplyError(requestError instanceof Error ? requestError.message : "Failed to send reply.");
    }
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!ticket) {
    return <p className="text-sm text-slate-500">Loading ticket...</p>;
  }

  return (
    <div className="space-y-4">
      <BackLink to="/tickets">Back to tickets</BackLink>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="space-y-4">
          <TicketDetail ticket={ticket} />

          <ReplyThread messages={ticket.messages} />

          <form className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm" onSubmit={handleReplySubmit}>
            <label className="block text-sm font-medium text-slate-700">
              Reply
              <textarea
                className="mt-2 min-h-28 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-slate-950 focus:bg-white focus:ring-2 focus:ring-slate-200"
                value={reply}
                onChange={(event) => {
                  setReply(event.target.value);
                  if (replyError) {
                    setReplyError("");
                  }
                }}
              />
            </label>
            {replyError ? <p className="mt-2 text-sm text-red-600">{replyError}</p> : null}
            <button className="mt-3 rounded-full bg-slate-950 px-4 py-2 text-sm text-white" type="submit">
              Send reply
            </button>
          </form>
        </section>

        <UpdateTicket
          agents={agents}
          categories={categories}
          onSubmit={handleMetaSubmit}
          ticket={ticket}
        />
      </div>
    </div>
  );
}
