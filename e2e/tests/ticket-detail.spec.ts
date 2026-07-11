import { expect, test, type Page, type TestInfo } from "@playwright/test";

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin.e2e@example.com";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "password12345";

type CreatedTicket = {
  id: number;
  subject: string;
  body: string;
  senderEmail: string;
  senderName: string;
};

function uniqueEmail(testInfo: TestInfo, label: string) {
  const safeTitle = testInfo.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");

  return `e2e.ticket-detail.${label}.${testInfo.workerIndex}.${safeTitle}.${Date.now()}@example.com`;
}

async function signInAsAdmin(page: Page) {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    await page.goto("/login");
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Password").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();

    try {
      await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible({
        timeout: 15_000
      });
      return;
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }
    }
  }
}

async function createTicketViaApi(page: Page, testInfo: TestInfo, label: string) {
  const subject = `E2E ${label} ${Date.now()}`;
  const senderEmail = uniqueEmail(testInfo, label);
  const response = await page.request.post("/api/tickets", {
    data: {
      subject,
      senderEmail,
      senderName: "E2E Customer",
      bodyText: `Customer message for ${subject}.`
    }
  });

  expect(response.status()).toBe(201);

  const body = (await response.json()) as { ticket: CreatedTicket };
  expect(body.ticket.subject).toBe(subject);
  expect(body.ticket.senderEmail).toBe(senderEmail);

  return body.ticket;
}

test.describe("ticket detail page", () => {
  test.describe.configure({ mode: "serial" });

  test("shows ticket details and the initial customer message", async ({ page }, testInfo) => {
    await signInAsAdmin(page);
    const ticket = await createTicketViaApi(page, testInfo, "render");

    await page.goto(`/tickets/${ticket.id}`);

    await expect(page.getByRole("link", { name: "Back to tickets" })).toHaveAttribute(
      "href",
      "/tickets"
    );
    await expect(page.getByRole("heading", { name: ticket.subject })).toBeVisible();
    await expect(page.getByText("Raised by")).toBeVisible();
    await expect(page.getByText(ticket.senderName)).toBeVisible();
    await expect(page.getByText(ticket.senderEmail)).toBeVisible();
    await expect(page.getByText("Created")).toBeVisible();
    await expect(page.getByText("Updated")).toBeVisible();
    await expect(page.getByText("Message", { exact: true })).toBeVisible();

    const threadMessage = page.getByRole("article").filter({
      hasText: ticket.body
    });
    await expect(threadMessage).toBeVisible();
    await expect(threadMessage.getByText("Customer", { exact: true })).toBeVisible();
  });

  test("updates status and assigned agent", async ({ page }, testInfo) => {
    await signInAsAdmin(page);
    const ticket = await createTicketViaApi(page, testInfo, "metadata");

    await page.goto(`/tickets/${ticket.id}`);
    await expect(page.getByRole("heading", { name: ticket.subject })).toBeVisible();

    await page.getByLabel("Status").selectOption("resolved");
    await page
      .getByLabel("Assigned agent")
      .selectOption({ label: "Alex Morgan (alex.agent@example.com)" });
    await page.getByRole("button", { name: "Save changes" }).click();

    await page.reload();
    await expect(page.getByRole("heading", { name: ticket.subject })).toBeVisible();
    await expect(page.getByLabel("Status").locator("option:checked")).toHaveText("Resolved");
    await expect(page.getByLabel("Assigned agent").locator("option:checked")).toHaveText(
      "Alex Morgan (alex.agent@example.com)"
    );
  });

  test("validates and sends an agent reply", async ({ page }, testInfo) => {
    await signInAsAdmin(page);
    const ticket = await createTicketViaApi(page, testInfo, "reply");
    const replyText = `Agent reply for ${ticket.subject}.`;

    await page.goto(`/tickets/${ticket.id}`);
    await expect(page.getByRole("heading", { name: ticket.subject })).toBeVisible();

    await page.getByRole("button", { name: "Send reply" }).click();
    await expect(page.getByText("Write a message before sending your reply.")).toBeVisible();

    await page.getByLabel("Reply").fill(replyText);
    await expect(page.getByText("Write a message before sending your reply.")).toBeHidden();
    await page.getByRole("button", { name: "Send reply" }).click();

    await expect(page.getByLabel("Reply")).toHaveValue("");

    const agentReply = page.getByRole("article").filter({
      hasText: replyText
    });
    await expect(agentReply).toBeVisible();
    await expect(agentReply.getByText("Agent", { exact: true })).toBeVisible();
  });
});
