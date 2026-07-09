import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "../lib/api";
import { renderWithQuery } from "../test/render-with-query";
import { UserRole, type UserListItem } from "../types";
import { UsersPage } from "./UsersPage";

vi.mock("axios", () => {
  const axiosMock = {
    get: vi.fn(),
    isAxiosError: vi.fn((error: unknown) => {
      return Boolean(error && typeof error === "object" && "isAxiosError" in error);
    })
  };

  return { default: axiosMock };
});

vi.mock("../lib/api", () => ({
  apiFetch: vi.fn()
}));

const axiosMock = vi.mocked(axios);
const apiFetchMock = vi.mocked(apiFetch);

const users: UserListItem[] = [
  {
    id: "user-admin",
    name: "Admin User",
    email: "admin@example.com",
    role: UserRole.Admin,
    createdAt: "2026-07-01T12:00:00.000Z"
  },
  {
    id: "user-agent",
    name: "Agent User",
    email: "agent@example.com",
    role: UserRole.Agent,
    createdAt: "2026-07-02T12:00:00.000Z"
  }
];

async function openCreateAgentDialog() {
  await userEvent.click(screen.getByRole("button", { name: "Create agent" }));
  return screen.findByRole("dialog", { name: "Create Agent" });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("UsersPage", () => {
  it("shows skeleton rows while users are loading", () => {
    axiosMock.get.mockReturnValue(new Promise(() => undefined));

    renderWithQuery(<UsersPage />);

    expect(screen.getByRole("heading", { name: "Users" })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Loading users" })).toBeInTheDocument();
    expect(screen.getAllByTestId("user-row-skeleton")).toHaveLength(4);
  });

  it("renders users returned by the API", async () => {
    axiosMock.get.mockResolvedValue({ data: { users } });

    renderWithQuery(<UsersPage />);

    expect(await screen.findByText("Admin User")).toBeInTheDocument();
    expect(screen.getByText("admin@example.com")).toBeInTheDocument();
    expect(screen.getByText("Agent User")).toBeInTheDocument();
    expect(screen.getByText("agent@example.com")).toBeInTheDocument();
    expect(screen.getByText(UserRole.Admin)).toBeInTheDocument();
    expect(screen.getByText(UserRole.Agent)).toBeInTheDocument();
    expect(screen.getByText(new Date(users[0]!.createdAt).toLocaleDateString())).toBeInTheDocument();
    expect(axiosMock.get).toHaveBeenCalledWith("/api/users", { withCredentials: true });
  });

  it("shows the create-agent dialog when the create button is clicked", async () => {
    axiosMock.get.mockResolvedValue({ data: { users } });

    renderWithQuery(<UsersPage />);

    expect(screen.queryByRole("dialog", { name: "Create Agent" })).not.toBeInTheDocument();

    const dialog = await openCreateAgentDialog();

    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByRole("form", { name: "Create Agent" })).toBeInTheDocument();
  });

  it("hides the create-agent dialog when clicking outside it", async () => {
    axiosMock.get.mockResolvedValue({ data: { users } });

    renderWithQuery(<UsersPage />);

    await openCreateAgentDialog();
    await userEvent.click(screen.getByTestId("create-agent-dialog-backdrop"));

    expect(screen.queryByRole("dialog", { name: "Create Agent" })).not.toBeInTheDocument();
  });

  it("hides the create-agent dialog when Escape is pressed", async () => {
    axiosMock.get.mockResolvedValue({ data: { users } });

    renderWithQuery(<UsersPage />);

    await openCreateAgentDialog();
    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog", { name: "Create Agent" })).not.toBeInTheDocument();
  });

  it("prevents the create-agent form from requesting saved credentials", async () => {
    axiosMock.get.mockReturnValue(new Promise(() => undefined));

    renderWithQuery(<UsersPage />);

    const dialog = await openCreateAgentDialog();

    expect(within(dialog).getByRole("form", { name: "Create Agent" })).toHaveAttribute(
      "autocomplete",
      "off"
    );
    expect(within(dialog).getByLabelText("Email")).toHaveAttribute("autocomplete", "off");
    expect(within(dialog).getByLabelText("Email")).toHaveAttribute("name", "agentEmail");
    expect(within(dialog).getByLabelText("Password")).toHaveAttribute(
      "autocomplete",
      "new-password"
    );
    expect(within(dialog).getByLabelText("Password")).toHaveAttribute("name", "agentPassword");
  });

  it("shows an error alert when users cannot be loaded", async () => {
    axiosMock.get.mockRejectedValue({
      isAxiosError: true,
      message: "Request failed",
      response: { data: { message: "Admins only." } }
    });

    renderWithQuery(<UsersPage />);

    const alert = await screen.findByRole("alert");

    expect(alert).toHaveTextContent("Admins only.");
  });

  it("creates an agent and refreshes the users query", async () => {
    const updatedUsers = [
      ...users,
      {
        id: "user-new",
        name: "New Agent",
        email: "new-agent@example.com",
        role: UserRole.Agent,
        createdAt: "2026-07-03T12:00:00.000Z"
      }
    ];

    axiosMock.get
      .mockResolvedValueOnce({ data: { users } })
      .mockResolvedValueOnce({ data: { users: updatedUsers } });
    apiFetchMock.mockResolvedValue(undefined);

    renderWithQuery(<UsersPage />);

    await screen.findByText("Admin User");

    const dialog = await openCreateAgentDialog();
    const form = within(dialog).getByRole("form", { name: "Create Agent" });

    await userEvent.type(within(form).getByLabelText("Name"), "New Agent");
    await userEvent.type(within(form).getByLabelText("Email"), "new-agent@example.com");
    await userEvent.type(within(form).getByLabelText("Password"), "password123");
    await userEvent.click(within(form).getByRole("button", { name: "Create agent" }));

    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenCalledWith("/api/users", {
        method: "POST",
        body: JSON.stringify({
          name: "New Agent",
          email: "new-agent@example.com",
          password: "password123"
        })
      });
    });

    expect(await screen.findByText("new-agent@example.com")).toBeInTheDocument();
    expect(axiosMock.get).toHaveBeenCalledTimes(2);
  });

  it("validates create-agent values before submitting", async () => {
    axiosMock.get.mockResolvedValue({ data: { users } });

    renderWithQuery(<UsersPage />);

    await screen.findByText("Admin User");

    const dialog = await openCreateAgentDialog();
    const form = within(dialog).getByRole("form", { name: "Create Agent" });
    const nameInput = within(form).getByLabelText("Name");
    const emailInput = within(form).getByLabelText("Email");
    const passwordInput = within(form).getByLabelText("Password");

    await userEvent.type(nameInput, "Al");
    await userEvent.type(emailInput, "not-an-email");
    await userEvent.type(passwordInput, "short");
    await userEvent.click(within(form).getByRole("button", { name: "Create agent" }));

    expect(await within(form).findByText("Name must be at least 3 letters.")).toBeInTheDocument();
    expect(within(form).getByText("Enter a valid email address.")).toBeInTheDocument();
    expect(within(form).getByText("Password must be at least 8 letters.")).toBeInTheDocument();
    expect(nameInput).toHaveClass("border-red-500");
    expect(emailInput).toHaveClass("border-red-500");
    expect(passwordInput).toHaveClass("border-red-500");
    expect(apiFetchMock).not.toHaveBeenCalled();
  });

  it("shows a form error when creating an agent fails", async () => {
    axiosMock.get.mockResolvedValue({ data: { users } });
    apiFetchMock.mockRejectedValue(new Error("Email already exists."));

    renderWithQuery(<UsersPage />);

    await screen.findByText("Admin User");

    const dialog = await openCreateAgentDialog();
    const form = within(dialog).getByRole("form", { name: "Create Agent" });

    await userEvent.type(within(form).getByLabelText("Name"), "Existing Agent");
    await userEvent.type(within(form).getByLabelText("Email"), "agent@example.com");
    await userEvent.type(within(form).getByLabelText("Password"), "password123");
    await userEvent.click(within(form).getByRole("button", { name: "Create agent" }));

    const alert = await within(form).findByRole("alert");
    const errorMessage = within(alert).getByText("Email already exists.");

    expect(alert).toHaveTextContent("Email already exists.");
    expect(errorMessage).toHaveClass("text-red-700");
  });
});
