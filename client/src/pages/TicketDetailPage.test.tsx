import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";
import { apiFetch } from "../lib/api";
import { renderWithQuery } from "../test/render-with-query";
import { UserRole, type Category, type Ticket, type User } from "../types";
import { TicketDetailPage } from "./TicketDetailPage";

vi.mock("../lib/api", () => ({
  apiFetch: vi.fn()
}));

const apiFetchMock = vi.mocked(apiFetch);

const categories: Category[] = [
  {
    id: "category-refund",
    name: "Refund Request",
    slug: "refund_request"
  }
];

const agents: User[] = [
  {
    id: "agent-1",
    name: "Alex Morgan",
    email: "alex.agent@example.com",
    role: UserRole.Agent,
    active: true
  },
  {
    id: "agent-2",
    name: "Jordan Lee",
    email: "jordan.agent@example.com",
    role: UserRole.Agent,
    active: true
  }
];

const ticket: Ticket = {
  id: 1,
  subject: "Refund request",
  body: "I need a refund.",
  senderEmail: "customer@example.com",
  senderName: "Customer One",
  status: "open",
  category: categories[0],
  assignedTo: null,
  messages: [
    {
      id: "message-1",
      direction: "INBOUND",
      senderType: "CUSTOMER",
      fromEmail: "customer@example.com",
      bodyText: "I need a refund.",
      createdAt: "2026-07-01T12:00:00.000Z"
    }
  ],
  createdAt: "2026-07-01T12:00:00.000Z",
  updatedAt: "2026-07-01T12:00:00.000Z"
};

function renderTicketDetailPage() {
  return renderWithQuery(
    <MemoryRouter initialEntries={["/tickets/1"]}>
      <Routes>
        <Route path="/tickets/:ticketId" element={<TicketDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

function mockTicketDetailRequests({
  savedTicket = ticket,
  ticketDetail = ticket,
  replyError,
  polishError,
  polishedReply = "We can help with that and will review your refund request.",
  summaryError,
  generatedSummary = "- Customer wants a refund.\n- Next step: review the order."
}: {
  savedTicket?: Ticket;
  ticketDetail?: Ticket;
  replyError?: Error;
  polishError?: Error;
  polishedReply?: string;
  summaryError?: Error;
  generatedSummary?: string;
} = {}) {
  apiFetchMock.mockImplementation(async (path, options) => {
    if (path === "/api/tickets/1" && options?.method === "PATCH") {
      return { ticket: savedTicket };
    }

    if (path === "/api/tickets/1/replies" && options?.method === "POST") {
      if (replyError) {
        throw replyError;
      }

      return {
        message: {
          id: "message-2",
          ticketId: 1,
          direction: "OUTBOUND",
          senderType: "AGENT",
          fromEmail: "agent@example.com",
          toEmail: "customer@example.com",
          subject: "Re: Refund request",
          bodyText: "We can help with that.",
          createdAt: "2026-07-01T12:05:00.000Z"
        }
      };
    }

    if (path === "/api/tickets/1/replies/polish" && options?.method === "POST") {
      if (polishError) {
        throw polishError;
      }

      return { reply: polishedReply };
    }

    if (path === "/api/tickets/1/summary" && options?.method === "POST") {
      if (summaryError) {
        throw summaryError;
      }

      return {
        summary: {
          id: "summary-1",
          ticketId: 1,
          type: "SUMMARY",
          content: generatedSummary,
          metadata: { model: "gemini-3.5-flash" },
          createdAt: "2026-07-01T12:10:00.000Z"
        }
      };
    }

    if (path === "/api/tickets/1") {
      return { ticket: ticketDetail, agents };
    }

    if (path === "/api/categories") {
      return { categories };
    }

    throw new Error(`Unexpected request: ${path}`);
  });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("TicketDetailPage", () => {
  it("shows ticket subject, requester, created time, and updated time", async () => {
    mockTicketDetailRequests();

    renderTicketDetailPage();

    expect(await screen.findByRole("link", { name: "Back to tickets" })).toHaveAttribute(
      "href",
      "/tickets"
    );
    expect(await screen.findByRole("heading", { name: "Refund request" })).toBeInTheDocument();
    expect(screen.getByText("Raised by")).toBeInTheDocument();
    expect(screen.getByText("Customer One")).toBeInTheDocument();
    expect(screen.getByText("customer@example.com")).toBeInTheDocument();
    expect(screen.getByText("Created")).toBeInTheDocument();
    expect(screen.getByText("Updated")).toBeInTheDocument();
  });

  it("renders active agents as assignment options", async () => {
    mockTicketDetailRequests();

    renderTicketDetailPage();

    const assigneeSelect = await screen.findByLabelText("Assigned agent");

    expect(assigneeSelect).toHaveValue("");
    expect(screen.getByRole("option", { name: "Unassigned" })).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Alex Morgan (alex.agent@example.com)" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Jordan Lee (jordan.agent@example.com)" })
    ).toBeInTheDocument();
  });

  it("assigns a ticket to an agent", async () => {
    mockTicketDetailRequests({ savedTicket: { ...ticket, assignedTo: agents[0] } });

    renderTicketDetailPage();

    await screen.findByRole("heading", { name: "Refund request" });
    await userEvent.selectOptions(screen.getByLabelText("Assigned agent"), "agent-1");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenCalledWith("/api/tickets/1", {
        method: "PATCH",
        body: JSON.stringify({
          status: "open",
          categorySlug: "refund_request",
          assignedToId: "agent-1"
        })
      });
    });
  });

  it("clears the assigned agent", async () => {
    mockTicketDetailRequests({
      savedTicket: { ...ticket, assignedTo: null },
      ticketDetail: { ...ticket, assignedTo: agents[0] }
    });

    renderTicketDetailPage();

    const assigneeSelect = await screen.findByLabelText("Assigned agent");

    expect(assigneeSelect).toHaveValue("agent-1");

    await userEvent.selectOptions(assigneeSelect, "");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenCalledWith("/api/tickets/1", {
        method: "PATCH",
        body: JSON.stringify({
          status: "open",
          categorySlug: "refund_request",
          assignedToId: ""
        })
      });
    });
  });

  it("disables sending when the reply is empty", async () => {
    mockTicketDetailRequests();

    renderTicketDetailPage();

    await screen.findByRole("heading", { name: "Refund request" });

    expect(screen.getByRole("button", { name: "Send reply" })).toBeDisabled();
    expect(apiFetchMock).not.toHaveBeenCalledWith(
      "/api/tickets/1/replies",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("enables sending after typing a reply", async () => {
    mockTicketDetailRequests();

    renderTicketDetailPage();

    await screen.findByRole("heading", { name: "Refund request" });
    expect(screen.getByRole("button", { name: "Send reply" })).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Reply"), "We can help with that.");

    expect(screen.getByRole("button", { name: "Send reply" })).toBeEnabled();
  });

  it("submits a reply and clears the reply textarea", async () => {
    const refreshedTicket: Ticket = {
      ...ticket,
      messages: [
        ...(ticket.messages ?? []),
        {
          id: "message-2",
          direction: "OUTBOUND",
          senderType: "AGENT",
          fromEmail: "agent@example.com",
          toEmail: "customer@example.com",
          subject: "Re: Refund request",
          bodyText: "We can help with that.",
          createdAt: "2026-07-01T12:05:00.000Z"
        }
      ]
    };
    mockTicketDetailRequests({ ticketDetail: refreshedTicket });

    renderTicketDetailPage();

    const replyInput = await screen.findByLabelText("Reply");
    await userEvent.type(replyInput, "We can help with that.");
    await userEvent.click(screen.getByRole("button", { name: "Send reply" }));

    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenCalledWith("/api/tickets/1/replies", {
        method: "POST",
        body: JSON.stringify({ bodyText: "We can help with that." })
      });
    });
    await waitFor(() => {
      expect(replyInput).toHaveValue("");
    });
    expect(screen.getByText("We can help with that.")).toBeInTheDocument();
  });

  it("shows an error when reply submission fails", async () => {
    mockTicketDetailRequests({ replyError: new Error("Failed to send test reply.") });

    renderTicketDetailPage();

    await userEvent.type(await screen.findByLabelText("Reply"), "We can help with that.");
    await userEvent.click(screen.getByRole("button", { name: "Send reply" }));

    expect(await screen.findByText("Failed to send test reply.")).toBeInTheDocument();
  });

  it("polishes a draft reply", async () => {
    mockTicketDetailRequests();

    renderTicketDetailPage();

    const replyInput = await screen.findByLabelText("Reply");
    await userEvent.type(replyInput, "refund ok");
    await userEvent.click(screen.getByRole("button", { name: "Polish" }));

    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenCalledWith("/api/tickets/1/replies/polish", {
        method: "POST",
        body: JSON.stringify({ draft: "refund ok" })
      });
    });
    expect(replyInput).toHaveValue("We can help with that and will review your refund request.");
  });

  it("shows an error when polishing a reply fails", async () => {
    mockTicketDetailRequests({ polishError: new Error("Failed to polish test reply.") });

    renderTicketDetailPage();

    await userEvent.type(await screen.findByLabelText("Reply"), "refund ok");
    await userEvent.click(screen.getByRole("button", { name: "Polish" }));

    expect(await screen.findByText("Failed to polish test reply.")).toBeInTheDocument();
  });

  it("generates and displays a ticket summary", async () => {
    mockTicketDetailRequests();

    renderTicketDetailPage();

    await screen.findByRole("heading", { name: "Refund request" });
    await userEvent.click(screen.getByRole("button", { name: "Summarize" }));

    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenCalledWith("/api/tickets/1/summary", {
        method: "POST"
      });
    });
    expect(await screen.findByRole("heading", { name: "Summary" })).toBeInTheDocument();
    expect(screen.getByText(/Customer wants a refund/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Regenerate summary" })).toBeInTheDocument();
  });

  it("shows the latest loaded summary and regenerates it", async () => {
    mockTicketDetailRequests({
      ticketDetail: {
        ...ticket,
        aiOutputs: [
          {
            id: "summary-old",
            ticketId: 1,
            type: "SUMMARY",
            content: "Older summary",
            createdAt: "2026-07-01T12:02:00.000Z"
          }
        ]
      },
      generatedSummary: "Fresh summary"
    });

    renderTicketDetailPage();

    expect(await screen.findByText("Older summary")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Regenerate summary" }));

    expect(await screen.findByText("Fresh summary")).toBeInTheDocument();
  });

  it("shows an error when summary generation fails", async () => {
    mockTicketDetailRequests({ summaryError: new Error("Failed to summarize test ticket.") });

    renderTicketDetailPage();

    await screen.findByRole("heading", { name: "Refund request" });
    await userEvent.click(screen.getByRole("button", { name: "Summarize" }));

    expect(await screen.findByText("Failed to summarize test ticket.")).toBeInTheDocument();
  });
});
