import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UserRole, type Ticket } from "../../types";
import { TicketDetail } from "./TicketDetail";

const ticket: Ticket = {
  id: 1,
  subject: "Refund request",
  body: "I need a refund.",
  senderEmail: "customer@example.com",
  senderName: "Customer One",
  status: "open",
  category: null,
  assignedTo: {
    id: "agent-1",
    email: "agent@example.com",
    name: "Agent One",
    role: UserRole.Agent
  },
  messages: [
    {
      id: "message-1",
      direction: "INBOUND",
      senderType: "CUSTOMER",
      fromEmail: "customer@example.com",
      bodyText: "I need a refund.",
      createdAt: "2026-07-01T12:00:00.000Z"
    },
    {
      id: "message-2",
      direction: "OUTBOUND",
      senderType: "AGENT",
      fromEmail: "agent@example.com",
      bodyText: "We can help with that.",
      createdAt: "2026-07-01T12:05:00.000Z"
    }
  ],
  createdAt: "2026-07-01T12:00:00.000Z",
  updatedAt: "2026-07-01T12:05:00.000Z"
};

describe("TicketDetail", () => {
  it("renders the ticket subject, requester, timestamps, and message body", () => {
    render(<TicketDetail ticket={ticket} />);

    expect(screen.getByRole("heading", { name: "Refund request" })).toBeInTheDocument();
    expect(screen.getByText("Subject")).toBeInTheDocument();
    expect(screen.getByText("Raised by")).toBeInTheDocument();
    expect(screen.getByText("Customer One")).toBeInTheDocument();
    expect(screen.getByText("customer@example.com")).toBeInTheDocument();
    expect(screen.getByText("Created")).toBeInTheDocument();
    expect(
      screen.getByText(
        new Date("2026-07-01T12:00:00.000Z").toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short"
        })
      )
    ).toBeInTheDocument();
    expect(screen.getByText("Updated")).toBeInTheDocument();
    expect(
      screen.getByText(
        new Date("2026-07-01T12:05:00.000Z").toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short"
        })
      )
    ).toBeInTheDocument();
    expect(screen.getByText("Message")).toBeInTheDocument();
    expect(screen.getByText("I need a refund.")).toBeInTheDocument();
  });

  it("does not render reply thread messages", () => {
    render(<TicketDetail ticket={ticket} />);

    expect(screen.queryByText("We can help with that.")).not.toBeInTheDocument();
  });
});
