import { expect, test, type APIResponse, type Page, type TestInfo } from "@playwright/test";

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

  return `e2e.${label}.${testInfo.workerIndex}.${safeTitle}.${Date.now()}@example.com`;
}

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

async function signInAndExpectApp(page: Page, email: string, password: string) {
  await signIn(page, email, password);
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
}

async function signOut(page: Page) {
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
}

async function createAgent(page: Page, testInfo: TestInfo, label = "agent") {
  const email = uniqueEmail(testInfo, label);
  const password = "agent-password-123";
  const response = await page.request.post("/api/users", {
    data: {
      email,
      name: `E2E ${label}`,
      password
    }
  });

  expect(response.status()).toBe(201);

  const body = (await response.json()) as { user: TestUser };
  expect(body.user.email).toBe(email);
  expect(body.user.role).toBe("agent");
  expect(body.user.active).toBe(true);

  return {
    user: body.user,
    password
  };
}

async function expectJson(response: APIResponse, expected: unknown) {
  await expect(await response.json()).toEqual(expected);
}

test.describe("authentication", () => {
  test.describe.configure({ mode: "serial" });

  test("redirects unauthenticated users away from protected pages and APIs", async ({
    page,
    request
  }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();

    await page.goto("/users");
    await expect(page).toHaveURL(/\/login$/);

    const meResponse = await request.get("/api/me");
    expect(meResponse.status()).toBe(401);
    await expectJson(meResponse, expect.objectContaining({ message: "Authentication required." }));
  });

  test("validates required login fields before submitting credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText("Email is required.")).toBeVisible();
    await expect(page.getByText("Password is required.")).toBeVisible();
    await expect(page.getByLabel("Email")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByLabel("Password")).toHaveAttribute("aria-invalid", "true");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("validates malformed email addresses before submitting credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("not-an-email");
    await page.getByLabel("Password").fill("anything");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText("Enter a valid email address.")).toBeVisible();
    await expect(page.getByLabel("Email")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByLabel("Password")).toHaveAttribute("aria-invalid", "false");
    await expect(page).toHaveURL(/\/login$/);
  });

  for (const credentials of [
    { name: "unknown email", email: "missing-user@example.com", password: "password12345" },
    { name: "wrong password", email: ADMIN_EMAIL, password: "wrong-password-123" }
  ]) {
    test(`rejects ${credentials.name}`, async ({ page }) => {
      await signIn(page, credentials.email, credentials.password);

      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByText(/invalid|incorrect|wrong|login failed/i)).toBeVisible();
      await expect(page.getByRole("button", { name: "Sign in" })).toBeEnabled();
    });
  }

  test("signs in the seeded admin and redirects authenticated users away from login", async ({
    page
  }) => {
    await signInAndExpectApp(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    await expect(page.getByText("Admin")).toBeVisible();
    await expect(page.getByRole("link", { name: "Users" })).toBeVisible();

    const meResponse = await page.request.get("/api/me");
    expect(meResponse.status()).toBe(200);
    await expectJson(
      meResponse,
      expect.objectContaining({
        user: expect.objectContaining({
          email: ADMIN_EMAIL,
          role: "admin",
          active: true
        }),
        session: expect.objectContaining({
          id: expect.any(String),
          expiresAt: expect.any(String)
        })
      })
    );

    await page.goto("/login");
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  });

  test("signs out and clears access to protected APIs", async ({ page }) => {
    await signInAndExpectApp(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await signOut(page);

    const meResponse = await page.request.get("/api/me");
    expect(meResponse.status()).toBe(401);

    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("keeps public sign-up disabled", async ({ page, request }, testInfo) => {
    const email = uniqueEmail(testInfo, "signup");
    const password = "signup-password-123";

    const signUpResponse = await request.post("/api/auth/sign-up/email", {
      data: {
        email,
        name: "Unauthorized Signup",
        password
      }
    });

    expect(signUpResponse.ok()).toBe(false);

    await signIn(page, email, password);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText(/invalid|incorrect|wrong|login failed/i)).toBeVisible();
  });

  test("lets admins create agents while keeping admin routes unavailable to agents", async ({
    page
  }, testInfo) => {
    await signInAndExpectApp(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    const email = uniqueEmail(testInfo, "created-agent");
    const password = "created-agent-123";

    await page.getByRole("link", { name: "Users" }).click();
    await expect(page).toHaveURL(/\/users$/);
    await page.getByLabel("Name").fill("Created Agent");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Create agent" }).click();
    const createdAgentRow = page.getByRole("row").filter({
      has: page.getByRole("cell", { name: email })
    });
    await expect(createdAgentRow).toBeVisible();
    await expect(createdAgentRow.getByRole("cell", { name: "agent", exact: true })).toBeVisible();

    await signOut(page);
    await signInAndExpectApp(page, email, password);

    await expect(page.getByRole("link", { name: "Users" })).toBeHidden();

    const meResponse = await page.request.get("/api/me");
    expect(meResponse.status()).toBe(200);
    await expectJson(
      meResponse,
      expect.objectContaining({
        user: expect.objectContaining({
          email,
          role: "agent",
          active: true
        })
      })
    );

    const usersResponse = await page.request.get("/api/users");
    expect(usersResponse.status()).toBe(403);
    await expectJson(
      usersResponse,
      expect.objectContaining({ message: "You do not have permission for this action." })
    );
  });

  test("rejects inactive authenticated users from app-protected APIs", async ({
    page
  }, testInfo) => {
    await signInAndExpectApp(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    const agent = await createAgent(page, testInfo, "inactive-agent");
    const deactivateResponse = await page.request.patch(`/api/users/${agent.user.id}`, {
      data: {
        active: false
      }
    });

    expect(deactivateResponse.status()).toBe(200);
    await expectJson(
      deactivateResponse,
      expect.objectContaining({
        user: expect.objectContaining({
          email: agent.user.email,
          active: false
        })
      })
    );

    await signOut(page);
    await signInAndExpectApp(page, agent.user.email, agent.password);

    const meResponse = await page.request.get("/api/me");
    expect(meResponse.status()).toBe(401);
    await expectJson(
      meResponse,
      expect.objectContaining({ message: "Session is invalid or expired." })
    );
  });
});
