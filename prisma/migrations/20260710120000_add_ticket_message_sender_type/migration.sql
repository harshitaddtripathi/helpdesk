-- CreateEnum
CREATE TYPE "SenderType" AS ENUM ('AGENT', 'CUSTOMER');

-- Existing inbound messages were sent by customers; existing outbound messages were sent by agents.
ALTER TABLE "TicketMessage"
ADD COLUMN "senderType" "SenderType";

UPDATE "TicketMessage"
SET "senderType" = CASE
  WHEN "direction" = 'OUTBOUND' THEN 'AGENT'::"SenderType"
  ELSE 'CUSTOMER'::"SenderType"
END;

ALTER TABLE "TicketMessage"
ALTER COLUMN "senderType" SET NOT NULL;
