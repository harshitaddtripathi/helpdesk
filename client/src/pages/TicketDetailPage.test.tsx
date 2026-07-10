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
  ticketDetail = ticket
}: {
  savedTicket?: Ticket;
  ticketDetail?: Ticket;
} = {}) {
  apiFetchMock.mockImplementation(async (path, options) => {
    if (path === "/api/tickets/1" && options?.method === "PATCH") {
      return { ticket: savedTicket };
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
});
