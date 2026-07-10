import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";
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

describe("TicketsPage", () => {
  it("requests tickets with the default server sort", async () => {
    axiosMock.get.mockResolvedValue({ data: { tickets } });

    renderWithQuery(<TicketsPage />);

    expect(await screen.findByText("Refund request")).toBeInTheDocument();
    expect(axiosMock.get).toHaveBeenCalledWith("/api/tickets", {
      params: { sortBy: "createdAt", sortOrder: "desc" },
      withCredentials: true
    });
  });

  it("refetches tickets sorted by a clicked column ascending", async () => {
    axiosMock.get.mockResolvedValue({ data: { tickets } });

    renderWithQuery(<TicketsPage />);

    expect(await screen.findByText("Refund request")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Subject/ }));

    await waitFor(() => {
      expect(axiosMock.get).toHaveBeenLastCalledWith("/api/tickets", {
        params: { sortBy: "subject", sortOrder: "asc" },
        withCredentials: true
      });
    });
    expect(screen.getByRole("button", { name: /Subject sorted ascending/ })).toBeInTheDocument();
  });

  it("toggles a clicked column from ascending to descending", async () => {
    axiosMock.get.mockResolvedValue({ data: { tickets } });

    renderWithQuery(<TicketsPage />);

    expect(await screen.findByText("Refund request")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Subject/ }));
    await waitFor(() => {
      expect(axiosMock.get).toHaveBeenLastCalledWith("/api/tickets", {
        params: { sortBy: "subject", sortOrder: "asc" },
        withCredentials: true
      });
    });

    await userEvent.click(screen.getByRole("button", { name: /Subject/ }));

    await waitFor(() => {
      expect(axiosMock.get).toHaveBeenLastCalledWith("/api/tickets", {
        params: { sortBy: "subject", sortOrder: "desc" },
        withCredentials: true
      });
    });
    expect(screen.getByRole("button", { name: /Subject sorted descending/ })).toBeInTheDocument();
  });

  it("clears sorting on a third click and refetches the default sort", async () => {
    axiosMock.get.mockResolvedValue({ data: { tickets } });

    renderWithQuery(<TicketsPage />);

    expect(await screen.findByText("Refund request")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Subject/ }));
    await waitFor(() => {
      expect(axiosMock.get).toHaveBeenLastCalledWith("/api/tickets", {
        params: { sortBy: "subject", sortOrder: "asc" },
        withCredentials: true
      });
    });

    await userEvent.click(screen.getByRole("button", { name: /Subject/ }));
    await waitFor(() => {
      expect(axiosMock.get).toHaveBeenLastCalledWith("/api/tickets", {
        params: { sortBy: "subject", sortOrder: "desc" },
        withCredentials: true
      });
    });

    await userEvent.click(screen.getByRole("button", { name: /Subject/ }));

    await waitFor(() => {
      expect(axiosMock.get).toHaveBeenLastCalledWith("/api/tickets", {
        params: { sortBy: "createdAt", sortOrder: "desc" },
        withCredentials: true
      });
    });
    expect(screen.getByRole("button", { name: /Subject not sorted/ })).toBeInTheDocument();
  });
});
