import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "../../lib/api";
import { renderWithQuery } from "../../test/render-with-query";
import { CreateUserForm } from "./CreateUserForm";

vi.mock("../../lib/api", () => ({
  apiFetch: vi.fn()
}));

const apiFetchMock = vi.mocked(apiFetch);

afterEach(() => {
  vi.clearAllMocks();
});

describe("CreateUserForm", () => {
  it("renders the create-agent form fields without requesting saved credentials", () => {
    renderWithQuery(<CreateUserForm onCreated={vi.fn()} />);

    const form = screen.getByRole("form", { name: "Create Agent" });

    expect(form).toHaveAttribute("autocomplete", "off");
    expect(within(form).getByLabelText("Name")).toHaveAttribute("autocomplete", "off");
    expect(within(form).getByLabelText("Email")).toHaveAttribute("autocomplete", "off");
    expect(within(form).getByLabelText("Email")).toHaveAttribute("name", "agentEmail");
    expect(within(form).getByLabelText("Password")).toHaveAttribute(
      "autocomplete",
      "new-password"
    );
    expect(within(form).getByLabelText("Password")).toHaveAttribute("name", "agentPassword");
    expect(within(form).getByRole("button", { name: "Create agent" })).toBeInTheDocument();
  });

  it("validates values before submitting", async () => {
    const onCreated = vi.fn();

    renderWithQuery(<CreateUserForm onCreated={onCreated} />);

    const form = screen.getByRole("form", { name: "Create Agent" });
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
    expect(nameInput).toHaveAttribute("aria-invalid", "true");
    expect(emailInput).toHaveAttribute("aria-invalid", "true");
    expect(passwordInput).toHaveAttribute("aria-invalid", "true");
    expect(nameInput).toHaveClass("border-red-500");
    expect(emailInput).toHaveClass("border-red-500");
    expect(passwordInput).toHaveClass("border-red-500");
    expect(apiFetchMock).not.toHaveBeenCalled();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it("submits valid values, calls onCreated, and resets the form", async () => {
    const onCreated = vi.fn();
    apiFetchMock.mockResolvedValue(undefined);

    renderWithQuery(<CreateUserForm onCreated={onCreated} />);

    const form = screen.getByRole("form", { name: "Create Agent" });
    const nameInput = within(form).getByLabelText("Name");
    const emailInput = within(form).getByLabelText("Email");
    const passwordInput = within(form).getByLabelText("Password");

    await userEvent.type(nameInput, "New Agent");
    await userEvent.type(emailInput, "new-agent@example.com");
    await userEvent.type(passwordInput, "password123");
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

    expect(onCreated).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(nameInput).toHaveValue("");
      expect(emailInput).toHaveValue("");
      expect(passwordInput).toHaveValue("");
    });
  });

  it("shows a red form error when creating a user fails", async () => {
    const onCreated = vi.fn();
    apiFetchMock.mockRejectedValue(new Error("Email already exists."));

    renderWithQuery(<CreateUserForm onCreated={onCreated} />);

    const form = screen.getByRole("form", { name: "Create Agent" });

    await userEvent.type(within(form).getByLabelText("Name"), "Existing Agent");
    await userEvent.type(within(form).getByLabelText("Email"), "agent@example.com");
    await userEvent.type(within(form).getByLabelText("Password"), "password123");
    await userEvent.click(within(form).getByRole("button", { name: "Create agent" }));

    const alert = await within(form).findByRole("alert");
    const errorMessage = within(alert).getByText("Email already exists.");

    expect(alert).toHaveTextContent("Email already exists.");
    expect(errorMessage).toHaveClass("text-red-700");
    expect(onCreated).not.toHaveBeenCalled();
  });
});
