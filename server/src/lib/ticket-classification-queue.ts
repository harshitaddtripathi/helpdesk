import { PgBoss } from "pg-boss";
import { z } from "zod";
import { env } from "./env";
import { classifyTicketById } from "./ticket-classifier";

export const ticketClassificationQueueName = "ticket-classification";

const ticketClassificationJobSchema = z.object({
  ticketId: z.number().int().positive()
});

type TicketClassificationJob = z.infer<typeof ticketClassificationJobSchema>;

let boss: PgBoss | null = null;
let bossStartPromise: Promise<PgBoss> | null = null;
let workerStartPromise: Promise<string> | null = null;

export async function enqueueTicketClassification(ticketId: number) {
  if (!env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return null;
  }

  const boss = await getBoss();

  return boss.send(ticketClassificationQueueName, { ticketId }, { singletonKey: String(ticketId) });
}

export async function startTicketClassificationWorker() {
  if (!env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.warn("GOOGLE_GENERATIVE_AI_API_KEY is not configured; ticket classification worker will not start.");
    return null;
  }

  const boss = await getBoss();

  workerStartPromise ??= boss.work<TicketClassificationJob>(
    ticketClassificationQueueName,
    {
      localConcurrency: 2,
      pollingIntervalSeconds: 2
    },
    async (jobs) => {
      for (const job of jobs) {
        const data = ticketClassificationJobSchema.parse(job.data);
        await classifyTicketById(data.ticketId);
      }
    }
  );

  return workerStartPromise;
}

async function getBoss() {
  if (boss) {
    return boss;
  }

  bossStartPromise ??= startBoss().catch((error) => {
    bossStartPromise = null;
    throw error;
  });
  boss = await bossStartPromise;

  return boss;
}

async function startBoss() {
  const instance = new PgBoss(env.DATABASE_URL);

  instance.on("error", (error) => {
    console.warn("pg-boss ticket classification queue error:", getErrorMessage(error));
  });

  await instance.start();
  await instance.createQueue(ticketClassificationQueueName, {
    retryLimit: 3,
    retryDelay: 30,
    retryBackoff: true,
    expireInSeconds: 120,
    retentionSeconds: 7 * 24 * 60 * 60,
    deleteAfterSeconds: 24 * 60 * 60
  });

  return instance;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
