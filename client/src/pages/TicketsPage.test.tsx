import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";
import { apiFetch } from "../lib/api";
import { renderWithQuery } from "../test/render-with-query";
import type { Ticket } from "../types";
import { TicketsPage } from "./TicketsPage";

vi.mock("../lib/api", () => {
  return {
    apiFetch: vi.fn()
  };
});

const apiFetchMock = vi.mocked(apiFetch);
const defaultTicketParams = {
  sortBy: "createdAt",
  sortOrder: "desc",
  search: "",
  status: "all",
  category: "all",
  page: 1,
  pageSize: 10
};

const tickets: Array<
  Pick<
    Ticket,
    "id" | "subject" | "senderName" | "senderEmail" | "status" | "category" | "createdAt"
  >
> = [
  {
    id: 1,
    subject: "Refund request",
    senderName: "Customer One",
    senderEmail: "customer@example.com",
    status: "open",
    category: {
      id: "category-refund",
      name: "Refund Request",
      slug: "refund_request"
    },
    createdAt: "2026-07-01T12:00:00.000Z"
  }
];

const ticketPage = {
  tickets,
  pagination: {
    page: 1,
    pageSize: 10,
    total: 25,
    pageCount: 3
  }
};
const defaultTicketsPath =
  "/api/tickets?sortBy=createdAt&sortOrder=desc&search=&status=all&category=all&page=1&pageSize=10";

function ticketsPath(params: Partial<typeof defaultTicketParams> = {}) {
  const searchParams = new URLSearchParams();
  const mergedParams = { ...defaultTicketParams, ...params };

  for (const [key, value] of Object.entries(mergedParams)) {
    searchParams.set(key, String(value));
  }

  return `/api/tickets?${searchParams.toString()}`;
}

afterEach(() => {
  vi.clearAllMocks();
});

function renderTicketsPage() {
  return renderWithQuery(
    <MemoryRouter>
      <TicketsPage />
    </MemoryRouter>
  );
}

describe("TicketsPage", () => {
  it("requests tickets with the default server sort", async () => {
    apiFetchMock.mockResolvedValue(ticketPage);

    renderTicketsPage();

    expect(await screen.findByText("customer@example.com")).toBeInTheDocument();
    expect(apiFetchMock).toHaveBeenCalledWith(defaultTicketsPath);
  });

  it("links each ticket subject to the ticket detail page", async () => {
    apiFetchMock.mockResolvedValue(ticketPage);

    renderTicketsPage();

    expect(await screen.findByRole("link", { name: "Refund request" })).toHaveAttribute(
      "href",
      "/tickets/1"
    );
  });

  it("refetches tickets sorted by a clicked column ascending", async () => {
    apiFetchMock.mockResolvedValue(ticketPage);

    renderTicketsPage();

    expect(await screen.findByText("customer@example.com")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Subject/ }));

    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenLastCalledWith(
        ticketsPath({ sortBy: "subject", sortOrder: "asc" })
      );
    });
    expect(screen.getByRole("button", { name: /Subject sorted ascending/ })).toBeInTheDocument();
  });

  it("toggles a clicked column from ascending to descending", async () => {
    apiFetchMock.mockResolvedValue(ticketPage);

    renderTicketsPage();

    expect(await screen.findByText("customer@example.com")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Subject/ }));
    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenLastCalledWith(
        ticketsPath({ sortBy: "subject", sortOrder: "asc" })
      );
    });

    await userEvent.click(screen.getByRole("button", { name: /Subject/ }));

    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenLastCalledWith(
        ticketsPath({ sortBy: "subject", sortOrder: "desc" })
      );
    });
    expect(screen.getByRole("button", { name: /Subject sorted descending/ })).toBeInTheDocument();
  });

  it("clears sorting on a third click and refetches the default sort", async () => {
    apiFetchMock.mockResolvedValue(ticketPage);

    renderTicketsPage();

    expect(await screen.findByText("customer@example.com")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Subject/ }));
    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenLastCalledWith(
        ticketsPath({ sortBy: "subject", sortOrder: "asc" })
      );
    });

    await userEvent.click(screen.getByRole("button", { name: /Subject/ }));
    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenLastCalledWith(
        ticketsPath({ sortBy: "subject", sortOrder: "desc" })
      );
    });

    await userEvent.click(screen.getByRole("button", { name: /Subject/ }));

    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenLastCalledWith(defaultTicketsPath);
    });
    expect(screen.getByRole("button", { name: /Subject not sorted/ })).toBeInTheDocument();
  });

  it("filters tickets by status on the server", async () => {
    apiFetchMock.mockResolvedValue(ticketPage);

    renderTicketsPage();

    expect(await screen.findByText("customer@example.com")).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText("Status"), "open");

    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenLastCalledWith(ticketsPath({ status: "open" }));
    });
  });

  it("filters tickets by category on the server", async () => {
    apiFetchMock.mockResolvedValue(ticketPage);

    renderTicketsPage();

    expect(await screen.findByText("customer@example.com")).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText("Category"), "refund_request");

    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenLastCalledWith(
        ticketsPath({ category: "refund_request" })
      );
    });
  });

  it("filters tickets by search text on the server", async () => {
    apiFetchMock.mockResolvedValue(ticketPage);

    renderTicketsPage();

    expect(await screen.findByText("customer@example.com")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Search"), "refund");

    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenLastCalledWith(ticketsPath({ search: "refund" }));
    });
  });

  it("clears active filters and refetches the default filter set", async () => {
    apiFetchMock.mockResolvedValue(ticketPage);

    renderTicketsPage();

    expect(await screen.findByText("customer@example.com")).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText("Status"), "closed");
    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenLastCalledWith(ticketsPath({ status: "closed" }));
    });

    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));

    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenLastCalledWith(defaultTicketsPath);
    });
    expect(screen.getByLabelText("Status")).toHaveValue("all");
  });

  it("refetches tickets when moving to the next page", async () => {
    apiFetchMock.mockResolvedValue(ticketPage);

    renderTicketsPage();

    expect(await screen.findByText("customer@example.com")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Next page" }));

    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenLastCalledWith(ticketsPath({ page: 2 }));
    });
  });

  it("refetches tickets when changing rows per page", async () => {
    apiFetchMock.mockResolvedValue(ticketPage);

    renderTicketsPage();

    expect(await screen.findByText("customer@example.com")).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText("Rows per page"), "25");

    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenLastCalledWith(ticketsPath({ pageSize: 25 }));
    });
  });
});
