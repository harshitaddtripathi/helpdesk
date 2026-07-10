import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";
import { renderWithQuery } from "../test/render-with-query";
import type { Ticket } from "../types";
import { TicketsPage } from "./TicketsPage";

vi.mock("axios", () => {
  const axiosMock = {
    get: vi.fn(),
    isAxiosError: vi.fn((error: unknown) => {
      return Boolean(error && typeof error === "object" && "isAxiosError" in error);
    })
  };

  return { default: axiosMock };
});

const axiosMock = vi.mocked(axios);
const defaultTicketParams = {
  sortBy: "createdAt",
  sortOrder: "desc",
  search: "",
  status: "all",
  category: "all"
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
    axiosMock.get.mockResolvedValue({ data: { tickets } });

    renderTicketsPage();

    expect(await screen.findByText("customer@example.com")).toBeInTheDocument();
    expect(axiosMock.get).toHaveBeenCalledWith("/api/tickets", {
      params: defaultTicketParams,
      withCredentials: true
    });
  });

  it("links each ticket subject to the ticket detail page", async () => {
    axiosMock.get.mockResolvedValue({ data: { tickets } });

    renderTicketsPage();

    expect(await screen.findByRole("link", { name: "Refund request" })).toHaveAttribute(
      "href",
      "/tickets/1"
    );
  });

  it("refetches tickets sorted by a clicked column ascending", async () => {
    axiosMock.get.mockResolvedValue({ data: { tickets } });

    renderTicketsPage();

    expect(await screen.findByText("customer@example.com")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Subject/ }));

    await waitFor(() => {
      expect(axiosMock.get).toHaveBeenLastCalledWith("/api/tickets", {
        params: { ...defaultTicketParams, sortBy: "subject", sortOrder: "asc" },
        withCredentials: true
      });
    });
    expect(screen.getByRole("button", { name: /Subject sorted ascending/ })).toBeInTheDocument();
  });

  it("toggles a clicked column from ascending to descending", async () => {
    axiosMock.get.mockResolvedValue({ data: { tickets } });

    renderTicketsPage();

    expect(await screen.findByText("customer@example.com")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Subject/ }));
    await waitFor(() => {
      expect(axiosMock.get).toHaveBeenLastCalledWith("/api/tickets", {
        params: { ...defaultTicketParams, sortBy: "subject", sortOrder: "asc" },
        withCredentials: true
      });
    });

    await userEvent.click(screen.getByRole("button", { name: /Subject/ }));

    await waitFor(() => {
      expect(axiosMock.get).toHaveBeenLastCalledWith("/api/tickets", {
        params: { ...defaultTicketParams, sortBy: "subject", sortOrder: "desc" },
        withCredentials: true
      });
    });
    expect(screen.getByRole("button", { name: /Subject sorted descending/ })).toBeInTheDocument();
  });

  it("clears sorting on a third click and refetches the default sort", async () => {
    axiosMock.get.mockResolvedValue({ data: { tickets } });

    renderTicketsPage();

    expect(await screen.findByText("customer@example.com")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Subject/ }));
    await waitFor(() => {
      expect(axiosMock.get).toHaveBeenLastCalledWith("/api/tickets", {
        params: { ...defaultTicketParams, sortBy: "subject", sortOrder: "asc" },
        withCredentials: true
      });
    });

    await userEvent.click(screen.getByRole("button", { name: /Subject/ }));
    await waitFor(() => {
      expect(axiosMock.get).toHaveBeenLastCalledWith("/api/tickets", {
        params: { ...defaultTicketParams, sortBy: "subject", sortOrder: "desc" },
        withCredentials: true
      });
    });

    await userEvent.click(screen.getByRole("button", { name: /Subject/ }));

    await waitFor(() => {
      expect(axiosMock.get).toHaveBeenLastCalledWith("/api/tickets", {
        params: defaultTicketParams,
        withCredentials: true
      });
    });
    expect(screen.getByRole("button", { name: /Subject not sorted/ })).toBeInTheDocument();
  });

  it("filters tickets by status on the server", async () => {
    axiosMock.get.mockResolvedValue({ data: { tickets } });

    renderTicketsPage();

    expect(await screen.findByText("customer@example.com")).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText("Status"), "open");

    await waitFor(() => {
      expect(axiosMock.get).toHaveBeenLastCalledWith("/api/tickets", {
        params: { ...defaultTicketParams, status: "open" },
        withCredentials: true
      });
    });
  });

  it("filters tickets by category on the server", async () => {
    axiosMock.get.mockResolvedValue({ data: { tickets } });

    renderTicketsPage();

    expect(await screen.findByText("customer@example.com")).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText("Category"), "refund_request");

    await waitFor(() => {
      expect(axiosMock.get).toHaveBeenLastCalledWith("/api/tickets", {
        params: { ...defaultTicketParams, category: "refund_request" },
        withCredentials: true
      });
    });
  });

  it("filters tickets by search text on the server", async () => {
    axiosMock.get.mockResolvedValue({ data: { tickets } });

    renderTicketsPage();

    expect(await screen.findByText("customer@example.com")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Search"), "refund");

    await waitFor(() => {
      expect(axiosMock.get).toHaveBeenLastCalledWith("/api/tickets", {
        params: { ...defaultTicketParams, search: "refund" },
        withCredentials: true
      });
    });
  });

  it("clears active filters and refetches the default filter set", async () => {
    axiosMock.get.mockResolvedValue({ data: { tickets } });

    renderTicketsPage();

    expect(await screen.findByText("customer@example.com")).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText("Status"), "closed");
    await waitFor(() => {
      expect(axiosMock.get).toHaveBeenLastCalledWith("/api/tickets", {
        params: { ...defaultTicketParams, status: "closed" },
        withCredentials: true
      });
    });

    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));

    await waitFor(() => {
      expect(axiosMock.get).toHaveBeenLastCalledWith("/api/tickets", {
        params: defaultTicketParams,
        withCredentials: true
      });
    });
    expect(screen.getByLabelText("Status")).toHaveValue("all");
  });
});
