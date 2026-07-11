import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { TicketMessage } from "../../types";
import { ReplyThread } from "./ReplyThread";

const messages: TicketMessage[] = [
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
];

describe("ReplyThread", () => {
  it("renders customer and agent replies in order", () => {
    render(<ReplyThread messages={messages} />);

    const replies = screen.getAllByRole("article");

    expect(replies).toHaveLength(2);
    const [customerReply, agentReply] = replies as [HTMLElement, HTMLElement];

    expect(within(customerReply).getByText("Customer")).toBeInTheDocument();
    expect(within(customerReply).getByText("I need a refund.")).toBeInTheDocument();
    expect(
      within(customerReply).getByText(new Date("2026-07-01T12:00:00.000Z").toLocaleString())
    ).toBeInTheDocument();
    expect(within(agentReply).getByText("Agent")).toBeInTheDocument();
    expect(within(agentReply).getByText("We can help with that.")).toBeInTheDocument();
    expect(
      within(agentReply).getByText(new Date("2026-07-01T12:05:00.000Z").toLocaleString())
    ).toBeInTheDocument();
  });

  it("uses message direction when sender type is missing", () => {
    const messageWithoutSenderType: TicketMessage = {
      id: "message-without-sender-type",
      direction: "OUTBOUND",
      senderType: undefined as unknown as TicketMessage["senderType"],
      fromEmail: "agent@example.com",
      bodyText: "We can help with that.",
      createdAt: "2026-07-01T12:05:00.000Z"
    };

    render(
      <ReplyThread
        messages={[messageWithoutSenderType]}
      />
    );

    expect(screen.getByText("Agent")).toBeInTheDocument();
  });

  it("renders no reply articles when there are no messages", () => {
    render(<ReplyThread />);

    expect(screen.queryAllByRole("article")).toHaveLength(0);
  });
});
