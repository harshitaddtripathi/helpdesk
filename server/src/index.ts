import { existsSync } from "node:fs";
import path from "node:path";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { toNodeHandler } from "better-auth/node";
import { aiRouter } from "./routes/ai";
import { categoriesRouter } from "./routes/categories";
import { dashboardRouter } from "./routes/dashboard";
import { emailRouter } from "./routes/email";
import { knowledgeBaseRouter } from "./routes/knowledge-base";
import { ticketsRouter } from "./routes/tickets";
import { usersRouter } from "./routes/users";
import { webhooksRouter } from "./routes/webhooks";
import { auth } from "./lib/auth";
import { env } from "./lib/env";
import { startTicketClassificationWorker } from "./lib/ticket-classification-queue";
import { errorHandler } from "./middleware/error-handler";
import { authRateLimiter } from "./middleware/rate-limit";
import { requireAuth } from "./middleware/require-auth";

const app = express();

if (env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || env.BETTER_AUTH_TRUSTED_ORIGINS.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    credentials: true
  })
);
if (env.NODE_ENV === "production") {
  app.all("/api/auth/{*any}", authRateLimiter, toNodeHandler(auth));
} else {
  app.all("/api/auth/{*any}", toNodeHandler(auth));
}
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

if (!env.WEBHOOK_SECRET) {
  console.warn("WEBHOOK_SECRET is not set; inbound email webhooks will reject requests.");
}

void startTicketClassificationWorker().catch((error) => {
  console.warn("Ticket classification worker failed to start:", error);
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/me", requireAuth, (req, res) => {
  res.json({
    user: req.user,
    session: req.session
      ? {
          id: req.session.id,
          expiresAt: req.session.expiresAt
        }
      : null
  });
});

app.use("/api/users", usersRouter);
app.use("/api/webhooks", webhooksRouter);
app.use("/api/tickets", ticketsRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/knowledge-base", knowledgeBaseRouter);
app.use("/api/ai", aiRouter);
app.use("/api/email", emailRouter);

if (env.NODE_ENV === "production") {
  const clientDist = path.join(process.cwd(), "dist", "client");
  const clientIndex = path.join(clientDist, "index.html");

  if (existsSync(clientIndex)) {
    app.use(express.static(clientDist));
    app.get(/^\/(?!api\/).*/, (_req, res) => {
      res.sendFile(clientIndex);
    });
  } else {
    app.get("/", (_req, res) => {
      res.json({ status: "ok", service: "ai-helpdesk-api" });
    });
  }
}

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}`);
});
