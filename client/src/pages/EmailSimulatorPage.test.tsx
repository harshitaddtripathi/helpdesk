import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "../lib/api";
import { renderWithQuery } from "../test/render-with-query";
import { EmailSimulatorPage } from "./EmailSimulatorPage";

vi.mock("../lib/api", () => ({
  apiFetch: vi.fn()
}));

const apiFetchMock = vi.mocked(apiFetch);

function renderPage() {
  return renderWithQuery(
    <MemoryRouter>
      <EmailSimulatorPage />
    </MemoryRouter>
  );
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("EmailSimulatorPage", () => {
  it("submits a simulated email and links to the created ticket", async () => {
    apiFetchMock.mockResolvedValue({
      simulated: true,
      status: "created",
      ticket: {
        id: 42,
        subject: "Refund request",
        body: "I need a refund.",
        senderEmail: "customer@example.com",
        senderName: "Customer Example",
        status: "open",
        createdAt: "2026-07-16T10:00:00.000Z",
        updatedAt: "2026-07-16T10:00:00.000Z"
      }
    });

    renderPage();

    const form = screen.getByRole("form", { name: "Email simulator" });

    await userEvent.clear(within(form).getByLabelText("Subject"));
    await userEvent.type(within(form).getByLabelText("Subject"), "Refund request");
    await userEvent.type(within(form).getByLabelText("Message"), "I need a refund.");
    await userEvent.click(within(form).getByRole("button", { name: "Send email" }));

    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenCalledWith("/api/email/simulate", {
        method: "POST",
        body: JSON.stringify({
          from: "customer@example.com",
          fromName: "Customer Example",
          subject: "Refund request",
          body: "I need a refund."
        })
      });
    });

    expect(await screen.findByText("Ticket created")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open ticket #42" })).toHaveAttribute(
      "href",
      "/tickets/42"
    );
  });

  it("shows an error when the simulator endpoint is disabled", async () => {
    apiFetchMock.mockRejectedValue(new Error("Email simulator is disabled."));

    renderPage();

    const form = screen.getByRole("form", { name: "Email simulator" });

    await userEvent.type(within(form).getByLabelText("Subject"), "Billing question");
    await userEvent.type(within(form).getByLabelText("Message"), "Can you check this invoice?");
    await userEvent.click(within(form).getByRole("button", { name: "Send email" }));

    expect(await within(form).findByRole("alert")).toHaveTextContent("Email simulator is disabled.");
  });
});
