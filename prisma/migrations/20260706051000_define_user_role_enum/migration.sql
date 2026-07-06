CREATE TYPE "UserRole" AS ENUM ('admin', 'agent');

ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole" USING (
  CASE
    WHEN "role" = 'admin' THEN 'admin'::"UserRole"
    ELSE 'agent'::"UserRole"
  END
);
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'agent';
