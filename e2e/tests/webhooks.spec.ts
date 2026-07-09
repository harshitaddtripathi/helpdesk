import { expect, test, type TestInfo } from "@playwright/test";

const WEBHOOK_SECRET = requireEnv("WEBHOOK_SECRET");
const API_BASE_URL = requireEnv("API_BASE_URL");
const INBOUND_EMAIL_URL = `${API_BASE_URL}/api/webhooks/inbound-email`;

type WebhookTicket = {
  id: number;
  subject: string;
  body: string;
  bodyHtml: string | null;
  senderEmail: string;
  senderName: string;
  status: string;
  category: unknown | null;
  messages: Array<{
    id: string;
    ticketId: number;
    direction: string;
    fromEmail: string;
    subject: string | null;
    bodyText: string;
  }>;
};

type WebhookMessage = {
  id: string;
  ticketId: number;
  direction: string;
  fromEmail: string;
  subject: string | null;
  bodyText: string;
};

function uniqueEmail(testInfo: TestInfo, label: string) {
  const safeTitle = testInfo.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");

  return `e2e.webhooks.${label}.${testInfo.workerIndex}.${safeTitle}.${Date.now()}@example.com`;
}

function webhookHeaders(secret = WEBHOOK_SECRET) {
  return {
    "x-webhook-secret": secret
  };
}

function requireEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} must be set in server/.env.test before running webhook E2E tests.`);
  }

  return value;
}

test.describe("inbound email webhook", () => {
  test("creates a ticket from a valid inbound email", async ({ request }, testInfo) => {
    const from = uniqueEmail(testInfo, "create");
    const response = await request.post(INBOUND_EMAIL_URL, {
      headers: webhookHeaders(),
      data: {
        from,
        fromName: "Jane Customer",
        subject: "Cannot access course",
        body: "Hi, I need help.",
        bodyHtml: "<p>Hi, I need help.</p>"
      }
    });

    expect(response.status()).toBe(201);

    const body = (await response.json()) as { ticket: WebhookTicket };
    expect(body.ticket).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        subject: "Cannot access course",
        body: "Hi, I need help.",
        bodyHtml: "<p>Hi, I need help.</p>",
        senderEmail: from,
        senderName: "Jane Customer",
        status: "open",
        category: null
      })
    );
    expect(body.ticket.messages).toHaveLength(1);
    expect(body.ticket.messages[0]).toEqual(
      expect.objectContaining({
        ticketId: body.ticket.id,
        direction: "INBOUND",
        fromEmail: from,
        subject: "Cannot access course",
        bodyText: "Hi, I need help."
      })
    );
  });

  test("threads replies into an existing open ticket by sender and normalized subject", async ({
    request
  }, testInfo) => {
    const from = uniqueEmail(testInfo, "thread");
    const createResponse = await request.post(INBOUND_EMAIL_URL, {
      headers: webhookHeaders(),
      data: {
        from,
        fromName: "Threaded Customer",
        subject: "Cannot access course",
        body: "Opening request."
      }
    });

    expect(createResponse.status()).toBe(201);
    const created = (await createResponse.json()) as { ticket: WebhookTicket };

    const replyResponse = await request.post(INBOUND_EMAIL_URL, {
      headers: webhookHeaders(),
      data: {
        from,
        fromName: "Threaded Customer",
        subject: "Fwd: Re: cannot access course",
        body: "Following up."
      }
    });

    expect(replyResponse.status()).toBe(200);

    const threaded = (await replyResponse.json()) as {
      ticket: WebhookTicket;
      message: WebhookMessage;
    };
    expect(threaded.ticket.id).toBe(created.ticket.id);
    expect(threaded.ticket.subject).toBe("Cannot access course");
    expect(threaded.message).toEqual(
      expect.objectContaining({
        ticketId: created.ticket.id,
        direction: "INBOUND",
        fromEmail: from,
        subject: "Fwd: Re: cannot access course",
        bodyText: "Following up."
      })
    );
  });

  test("requires the webhook secret header or query parameter", async ({ request }, testInfo) => {
    const from = uniqueEmail(testInfo, "secret");
    const payload = {
      from,
      fromName: "Secret Customer",
      subject: "Secret check",
      body: "Testing secret handling."
    };

    const missingSecretResponse = await request.post(INBOUND_EMAIL_URL, {
      data: payload
    });

    expect(missingSecretResponse.status()).toBe(401);
    await expect(missingSecretResponse.json()).resolves.toEqual(
      expect.objectContaining({ message: "Invalid webhook secret." })
    );

    const invalidSecretResponse = await request.post(INBOUND_EMAIL_URL, {
      headers: webhookHeaders("wrong-secret"),
      data: payload
    });

    expect(invalidSecretResponse.status()).toBe(401);
    await expect(invalidSecretResponse.json()).resolves.toEqual(
      expect.objectContaining({ message: "Invalid webhook secret." })
    );

    const querySecretResponse = await request.post(
      `${INBOUND_EMAIL_URL}?secret=${encodeURIComponent(WEBHOOK_SECRET)}`,
      {
        data: payload
      }
    );

    expect(querySecretResponse.status()).toBe(201);
  });

  test("rejects invalid inbound email payloads", async ({ request }) => {
    const response = await request.post(INBOUND_EMAIL_URL, {
      headers: webhookHeaders(),
      data: {
        from: "not-an-email",
        fromName: "",
        subject: "",
        body: ""
      }
    });

    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body).toEqual(
      expect.objectContaining({
        message: "Invalid request.",
        details: expect.objectContaining({
          fieldErrors: expect.objectContaining({
            from: expect.any(Array),
            fromName: expect.any(Array),
            subject: expect.any(Array),
            body: expect.any(Array)
          })
        })
      })
    );
  });
});
