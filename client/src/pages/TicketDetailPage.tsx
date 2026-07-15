import { FormEvent, useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { useParams } from "react-router";
import { ReplyThread } from "../components/tickets/ReplyThread";
import { TicketDetail } from "../components/tickets/TicketDetail";
import { UpdateTicket } from "../components/tickets/UpdateTicket";
import { BackLink } from "../components/ui/back-link";
import { Button } from "../components/ui/button";
import { apiFetch } from "../lib/api";
import type { AiOutput, Category, Ticket, User } from "../types";

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
  const [summaryError, setSummaryError] = useState("");
  const [isPolishingReply, setIsPolishingReply] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
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

  async function handlePolishReply() {
    if (!ticketId) return;
    if (!reply.trim()) {
      setReplyError("Write a message before polishing your reply.");
      return;
    }

    setError("");
    setReplyError("");
    setIsPolishingReply(true);

    try {
      const result = await apiFetch<{ reply: string }>(`/api/tickets/${ticketId}/replies/polish`, {
        method: "POST",
        body: JSON.stringify({ draft: reply })
      });

      setReply(result.reply);
    } catch (requestError) {
      setReplyError(requestError instanceof Error ? requestError.message : "Failed to polish reply.");
    } finally {
      setIsPolishingReply(false);
    }
  }

  async function handleSummarizeTicket() {
    if (!ticketId) return;

    setError("");
    setSummaryError("");
    setIsSummarizing(true);

    try {
      const result = await apiFetch<{ summary: AiOutput }>(`/api/tickets/${ticketId}/summary`, {
        method: "POST"
      });

      setTicket((current) =>
        current
          ? {
              ...current,
              aiOutputs: [
                result.summary,
                ...(current.aiOutputs?.filter((output) => output.id !== result.summary.id) ?? [])
              ]
            }
          : current
      );
    } catch (requestError) {
      setSummaryError(requestError instanceof Error ? requestError.message : "Failed to summarize ticket.");
    } finally {
      setIsSummarizing(false);
    }
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!ticket) {
    return <p className="text-sm text-slate-500">Loading ticket...</p>;
  }

  const latestSummary = ticket.aiOutputs?.find((output) => output.type === "SUMMARY");

  return (
    <div className="space-y-5">
      <BackLink to="/tickets">Back to tickets</BackLink>

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
          Ticket detail
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
          Resolve customer request
        </h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="space-y-4">
          <TicketDetail ticket={ticket} />

          <ReplyThread messages={ticket.messages} />

          <div className="space-y-3">
            <div>
              <Button
                disabled={isSummarizing}
                onClick={handleSummarizeTicket}
                type="button"
                variant="ghost"
              >
                <Sparkles aria-hidden="true" className="h-4 w-4" />
                {isSummarizing ? "Summarizing..." : latestSummary ? "Regenerate summary" : "Summarize"}
              </Button>
            </div>
            {summaryError ? <p className="text-sm text-red-600">{summaryError}</p> : null}
            {latestSummary ? (
              <section className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-blue-950">Summary</h3>
                  <span className="font-data text-xs text-blue-700">
                    Generated {new Date(latestSummary.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-blue-950">
                  {latestSummary.content}
                </p>
              </section>
            ) : null}
          </div>

          <form className="panel-surface rounded-lg p-4" onSubmit={handleReplySubmit}>
            <label className="block text-sm font-semibold text-slate-700">
              Reply
              <textarea
                className="field-control mt-2 min-h-32 w-full rounded-md px-3 py-2 text-sm"
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
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                disabled={isPolishingReply || !reply.trim()}
                onClick={handlePolishReply}
                type="button"
                variant="ghost"
              >
                <Sparkles aria-hidden="true" className="h-4 w-4" />
                {isPolishingReply ? "Polishing..." : "Polish"}
              </Button>
              <Button disabled={isPolishingReply || !reply.trim()} type="submit">
                Send reply
              </Button>
            </div>
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
