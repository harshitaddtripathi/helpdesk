import { expect, test, type Page, type TestInfo } from "@playwright/test";

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin.e2e@example.com";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "password12345";

type TestUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
};

function uniqueEmail(testInfo: TestInfo, label: string) {
  const safeTitle = testInfo.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");

  return `e2e.users.${label}.${testInfo.workerIndex}.${safeTitle}.${Date.now()}@example.com`;
}

async function signInAsAdmin(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
}

async function openUsersPage(page: Page) {
  await page.getByRole("link", { name: "Users" }).click();

  await expect(page).toHaveURL(/\/users$/);
  await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
}

function userRow(page: Page, email: string) {
  return page.getByRole("row").filter({
    has: page.getByRole("cell", { name: email, exact: true })
  });
}

async function createAgentViaApi(page: Page, testInfo: TestInfo, label: string) {
  const email = uniqueEmail(testInfo, label);
  const response = await page.request.post("/api/users", {
    data: {
      email,
      name: `E2E ${label}`,
      password: "agent-password-123"
    }
  });

  expect(response.status()).toBe(201);

  const body = (await response.json()) as { user: TestUser };
  expect(body.user.email).toBe(email);
  expect(body.user.role).toBe("agent");

  return body.user;
}

test.describe("user management", () => {
  test("lists seeded users", async ({ page }) => {
    await signInAsAdmin(page);
    await openUsersPage(page);

    await expect(userRow(page, ADMIN_EMAIL)).toBeVisible();
    await expect(userRow(page, "alex.agent@example.com")).toBeVisible();
    await expect(userRow(page, "jordan.agent@example.com")).toBeVisible();
    await expect(userRow(page, "priya.agent@example.com")).toBeVisible();
  });

  test("creates an agent", async ({ page }, testInfo) => {
    const email = uniqueEmail(testInfo, "create");

    await signInAsAdmin(page);
    await openUsersPage(page);

    await page.getByRole("button", { name: "Create agent" }).click();

    const dialog = page.getByRole("dialog", { name: "Create Agent" });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Name").fill("E2E Created Agent");
    await dialog.getByLabel("Email").fill(email);
    await dialog.getByLabel("Password").fill("created-password-123");
    await dialog.getByRole("button", { name: "Create agent" }).click();

    const row = userRow(page, email);
    await expect(dialog).toBeHidden();
    await expect(row).toBeVisible();
    await expect(row.getByRole("cell", { name: "E2E Created Agent", exact: true })).toBeVisible();
    await expect(row.getByRole("cell", { name: "agent", exact: true })).toBeVisible();
  });

  test("updates an agent", async ({ page }, testInfo) => {
    await signInAsAdmin(page);
    const agent = await createAgentViaApi(page, testInfo, "update");
    const updatedEmail = uniqueEmail(testInfo, "updated");

    await openUsersPage(page);
    const row = userRow(page, agent.email);
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: `Edit ${agent.name}` }).click();

    const dialog = page.getByRole("dialog", { name: "Edit Agent" });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Name").fill("E2E Updated Agent");
    await dialog.getByLabel("Email").fill(updatedEmail);
    await dialog.getByRole("button", { name: "Save changes" }).click();

    const updatedRow = userRow(page, updatedEmail);
    await expect(dialog).toBeHidden();
    await expect(updatedRow).toBeVisible();
    await expect(updatedRow.getByRole("cell", { name: "E2E Updated Agent", exact: true })).toBeVisible();
    await expect(userRow(page, agent.email)).toBeHidden();
  });

  test("deletes an agent", async ({ page }, testInfo) => {
    await signInAsAdmin(page);
    const agent = await createAgentViaApi(page, testInfo, "delete");

    await openUsersPage(page);
    const row = userRow(page, agent.email);
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: `Delete ${agent.name}` }).click();

    const dialog = page.getByRole("alertdialog", { name: "Delete User" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(`Are you sure you want to delete ${agent.name}?`)).toBeVisible();
    await dialog.getByRole("button", { name: "Confirm" }).click();

    await expect(dialog).toBeHidden();
    await expect(userRow(page, agent.email)).toBeHidden();
  });
});
