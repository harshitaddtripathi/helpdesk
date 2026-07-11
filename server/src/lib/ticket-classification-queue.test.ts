import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgBoss } from "pg-boss";
import { classifyTicketById } from "./ticket-classifier";

const mocks = vi.hoisted(() => ({
  env: {
    DATABASE_URL: "postgresql://helpdesk:helpdesk@localhost:5432/helpdesk",
    OPENAI_API_KEY: "test-openai-key"
  },
  on: vi.fn(),
  start: vi.fn(),
  createQueue: vi.fn(),
  send: vi.fn(),
  work: vi.fn(),
  classifyTicketById: vi.fn()
}));

vi.mock("./env", () => ({
  env: mocks.env
}));

vi.mock("./ticket-classifier", () => ({
  classifyTicketById: mocks.classifyTicketById
}));

vi.mock("pg-boss", () => ({
  PgBoss: vi.fn(function PgBoss() {
    return {
      on: mocks.on,
      start: mocks.start,
      createQueue: mocks.createQueue,
      send: mocks.send,
      work: mocks.work
    };
  })
}));

const PgBossMock = vi.mocked(PgBoss);
const classifyTicketByIdMock = vi.mocked(classifyTicketById);

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  mocks.env.OPENAI_API_KEY = "test-openai-key";
  mocks.start.mockResolvedValue(undefined);
  mocks.createQueue.mockResolvedValue(undefined);
  mocks.send.mockResolvedValue("job-1");
  mocks.work.mockResolvedValue("worker-1");
});

describe("ticket classification queue", () => {
  it("starts pg-boss and enqueues ticket classification jobs", async () => {
    const { enqueueTicketClassification, ticketClassificationQueueName } = await import("./ticket-classification-queue");

    await expect(enqueueTicketClassification(42)).resolves.toBe("job-1");

    expect(PgBossMock).toHaveBeenCalledWith("postgresql://helpdesk:helpdesk@localhost:5432/helpdesk");
    expect(mocks.on).toHaveBeenCalledWith("error", expect.any(Function));
    expect(mocks.start).toHaveBeenCalledOnce();
    expect(mocks.createQueue).toHaveBeenCalledWith(
      ticketClassificationQueueName,
      expect.objectContaining({
        retryLimit: 3,
        retryDelay: 30,
        retryBackoff: true
      })
    );
    expect(mocks.send).toHaveBeenCalledWith(ticketClassificationQueueName, { ticketId: 42 }, { singletonKey: "42" });
  });

  it("starts a worker that classifies queued ticket ids", async () => {
    const { startTicketClassificationWorker, ticketClassificationQueueName } = await import(
      "./ticket-classification-queue"
    );

    await expect(startTicketClassificationWorker()).resolves.toBe("worker-1");

    expect(mocks.work).toHaveBeenCalledWith(
      ticketClassificationQueueName,
      expect.objectContaining({
        localConcurrency: 2,
        pollingIntervalSeconds: 2
      }),
      expect.any(Function)
    );

    const handler = mocks.work.mock.calls[0]?.[2];
    await expect(handler([{ id: "job-1", data: { ticketId: 42 } }])).resolves.toBeUndefined();
    expect(classifyTicketByIdMock).toHaveBeenCalledWith(42);
  });

  it("does not enqueue or start workers without an OpenAI API key", async () => {
    mocks.env.OPENAI_API_KEY = "";
    const { enqueueTicketClassification, startTicketClassificationWorker } = await import("./ticket-classification-queue");

    await expect(enqueueTicketClassification(42)).resolves.toBeNull();
    await expect(startTicketClassificationWorker()).resolves.toBeNull();

    expect(PgBossMock).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
    expect(mocks.work).not.toHaveBeenCalled();
  });
});
