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

  test("protects app routes and keeps the browser session in sync with the API", async ({
    page,
    request
  }) => {
    await page.goto("/tickets");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();

    const anonymousMeResponse = await request.get("/api/me");
    expect(anonymousMeResponse.status()).toBe(401);
    await expectJson(
      anonymousMeResponse,
      expect.objectContaining({ message: "Authentication required." })
    );

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

    await signOut(page);

    const signedOutMeResponse = await page.request.get("/api/me");
    expect(signedOutMeResponse.status()).toBe(401);

    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("keeps admin routes unavailable to authenticated agents", async ({ page }, testInfo) => {
    await signInAndExpectApp(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    const agent = await createAgent(page, testInfo, "route-agent");

    await signOut(page);
    await signInAndExpectApp(page, agent.user.email, agent.password);

    await expect(page.getByRole("link", { name: "Users" })).toBeHidden();
    await page.goto("/users");
    await expect(page).toHaveURL(/\/$/);

    const meResponse = await page.request.get("/api/me");
    expect(meResponse.status()).toBe(200);
    await expectJson(
      meResponse,
      expect.objectContaining({
        user: expect.objectContaining({
          email: agent.user.email,
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
});
