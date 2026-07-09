-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM ('general_question', 'technical_question', 'refund_request');

-- Convert TicketStatus enum values from uppercase to lowercase.
ALTER TABLE "Ticket" ALTER COLUMN "status" DROP DEFAULT;
ALTER TYPE "TicketStatus" RENAME TO "TicketStatus_old";
CREATE TYPE "TicketStatus" AS ENUM ('open', 'resolved', 'closed');
ALTER TABLE "Ticket" ALTER COLUMN "status" TYPE "TicketStatus" USING lower("status"::text)::"TicketStatus";
ALTER TABLE "Ticket" ALTER COLUMN "status" SET DEFAULT 'open';
DROP TYPE "TicketStatus_old";

-- Add ticket email body storage and optional assignment.
ALTER TABLE "Ticket"
ADD COLUMN "body" TEXT,
ADD COLUMN "bodyHtml" TEXT,
ADD COLUMN "assignedToId" TEXT;

UPDATE "Ticket"
SET "body" = COALESCE(
  (
    SELECT "TicketMessage"."bodyText"
    FROM "TicketMessage"
    WHERE "TicketMessage"."ticketId" = "Ticket"."id"
    ORDER BY "TicketMessage"."createdAt" ASC
    LIMIT 1
  ),
  ''
);

ALTER TABLE "Ticket" ALTER COLUMN "body" SET NOT NULL;

UPDATE "Ticket"
SET "senderName" = "senderEmail"
WHERE "senderName" IS NULL OR btrim("senderName") = '';

ALTER TABLE "Ticket" ALTER COLUMN "senderName" SET NOT NULL;

-- Convert Ticket ids to integers while preserving related records.
CREATE SEQUENCE "Ticket_id_seq";

ALTER TABLE "Ticket" ADD COLUMN "id_int" INTEGER;
UPDATE "Ticket" SET "id_int" = nextval('"Ticket_id_seq"');
ALTER TABLE "Ticket" ALTER COLUMN "id_int" SET NOT NULL;
ALTER SEQUENCE "Ticket_id_seq" OWNED BY "Ticket"."id_int";
ALTER TABLE "Ticket" ALTER COLUMN "id_int" SET DEFAULT nextval('"Ticket_id_seq"');
SELECT setval(
  '"Ticket_id_seq"',
  COALESCE((SELECT MAX("id_int") FROM "Ticket"), 1),
  (SELECT COUNT(*) > 0 FROM "Ticket")
);

ALTER TABLE "TicketMessage" ADD COLUMN "ticketId_int" INTEGER;
UPDATE "TicketMessage"
SET "ticketId_int" = "Ticket"."id_int"
FROM "Ticket"
WHERE "TicketMessage"."ticketId" = "Ticket"."id";
ALTER TABLE "TicketMessage" ALTER COLUMN "ticketId_int" SET NOT NULL;

ALTER TABLE "AiOutput" ADD COLUMN "ticketId_int" INTEGER;
UPDATE "AiOutput"
SET "ticketId_int" = "Ticket"."id_int"
FROM "Ticket"
WHERE "AiOutput"."ticketId" = "Ticket"."id";
ALTER TABLE "AiOutput" ALTER COLUMN "ticketId_int" SET NOT NULL;

ALTER TABLE "TicketMessage" DROP CONSTRAINT "TicketMessage_ticketId_fkey";
ALTER TABLE "AiOutput" DROP CONSTRAINT "AiOutput_ticketId_fkey";
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_pkey";

DROP INDEX "TicketMessage_ticketId_idx";
DROP INDEX "AiOutput_ticketId_idx";

ALTER TABLE "TicketMessage" DROP COLUMN "ticketId";
ALTER TABLE "TicketMessage" RENAME COLUMN "ticketId_int" TO "ticketId";

ALTER TABLE "AiOutput" DROP COLUMN "ticketId";
ALTER TABLE "AiOutput" RENAME COLUMN "ticketId_int" TO "ticketId";

ALTER TABLE "Ticket" DROP COLUMN "id";
ALTER TABLE "Ticket" RENAME COLUMN "id_int" TO "id";
ALTER SEQUENCE "Ticket_id_seq" OWNED BY "Ticket"."id";
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id");

CREATE INDEX "Ticket_assignedToId_idx" ON "Ticket"("assignedToId");
CREATE INDEX "TicketMessage_ticketId_idx" ON "TicketMessage"("ticketId");
CREATE INDEX "AiOutput_ticketId_idx" ON "AiOutput"("ticketId");

ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TicketMessage" ADD CONSTRAINT "TicketMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiOutput" ADD CONSTRAINT "AiOutput_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
