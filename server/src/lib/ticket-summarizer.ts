import { google } from "@ai-sdk/google";
import {
  APICallError,
  LoadAPIKeyError,
  NoSuchModelError,
  RetryError,
  UnsupportedFunctionalityError,
  generateText
} from "ai";
import { env } from "./env";
import { HttpError } from "./http";
import { prisma } from "./prisma";

export type TicketSummaryContext = NonNullable<Awaited<ReturnType<typeof getTicketSummaryContext>>>;

export async function getTicketSummaryContext(ticketId: number) {
  return prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      category: true,
      assignedTo: {
        select: {
          name: true,
          email: true
        }
      },
      messages: {
        orderBy: { createdAt: "asc" }
      }
    }
  });
}

export function ensureTicketSummarizerConfigured() {
  if (!env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new HttpError(501, "GOOGLE_GENERATIVE_AI_API_KEY is not configured.");
  }
}

export async function summarizeTicket(ticket: TicketSummaryContext) {
  try {
    const { text } = await generateText({
      model: google("gemini-2.5-flash"),
      instructions:
        "Summarize a helpdesk ticket and its conversation history for a support agent. " +
        "Use only the ticket content. Do not invent facts, policies, refunds, timelines, or commitments. " +
        "Capture the customer's issue, important context, agent actions already taken, current status, " +
        "and likely next step. Return only the summary text in concise bullet points.",
      prompt: buildSummaryPrompt(ticket),
      maxOutputTokens: 700,
      maxRetries: 0,
      timeout: 20_000
    });

    const summary = text.trim();

    if (!summary) {
      throw new HttpError(502, "AI did not return a ticket summary.");
    }

    return summary;
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }

    throw toAiHttpError(error);
  }
}

function toAiHttpError(error: unknown) {
  if (RetryError.isInstance(error)) {
    return toAiHttpError(error.lastError);
  }

  if (APICallError.isInstance(error)) {
    return new HttpError(getAiErrorStatus(error.statusCode), getAiErrorMessage(error));
  }

  if (LoadAPIKeyError.isInstance(error)) {
    return new HttpError(501, "GOOGLE_GENERATIVE_AI_API_KEY is not configured correctly.");
  }

  if (NoSuchModelError.isInstance(error)) {
    return new HttpError(502, "The configured Google Gemini model is not available.");
  }

  if (UnsupportedFunctionalityError.isInstance(error)) {
    return new HttpError(502, `The configured Google Gemini model does not support this request: ${error.functionality}.`);
  }

  return new HttpError(502, "AI ticket summarization failed.");
}

function getAiErrorStatus(statusCode: number | undefined) {
  if (statusCode === 401 || statusCode === 403) {
    return 502;
  }

  if (statusCode === 408 || statusCode === 429) {
    return 503;
  }

  return 502;
}

function getAiErrorMessage(error: APICallError) {
  if (error.statusCode === 401) {
    return "Google Gemini rejected the API key. Check GOOGLE_GENERATIVE_AI_API_KEY.";
  }

  if (error.statusCode === 403) {
    return "Google Gemini rejected this request. Check that the API key has access to gemini-2.5-flash.";
  }

  if (error.statusCode === 404) {
    return "Google Gemini could not find gemini-2.5-flash for this API key.";
  }

  if (error.statusCode === 429) {
    return "Google Gemini rate limit or quota was reached. Try again later or check billing.";
  }

  if (error.statusCode === 400) {
    return `Google Gemini rejected the summary request: ${error.message}`;
  }

  if (error.statusCode && error.statusCode >= 500) {
    return "Google Gemini is temporarily unavailable. Try again later.";
  }

  return "Google Gemini could not summarize the ticket.";
}

function buildSummaryPrompt(ticket: TicketSummaryContext) {
  const messages = ticket.messages
    .map((message) => {
      const speaker = message.senderType === "AGENT" ? "Agent" : "Customer";
      const createdAt = message.createdAt instanceof Date ? message.createdAt.toISOString() : message.createdAt;
      return `${speaker} at ${createdAt}: ${message.bodyText}`;
    })
    .join("\n\n");

  return [
    `Subject: ${ticket.subject}`,
    `Customer: ${ticket.senderName} <${ticket.senderEmail}>`,
    `Status: ${ticket.status}`,
    `Category: ${ticket.category?.name ?? "Uncategorized"}`,
    `Assigned agent: ${ticket.assignedTo ? `${ticket.assignedTo.name} <${ticket.assignedTo.email}>` : "Unassigned"}`,
    `Original request:\n${ticket.body}`,
    `Conversation history:\n${messages || "No conversation messages yet."}`
  ].join("\n\n---\n\n");
}
