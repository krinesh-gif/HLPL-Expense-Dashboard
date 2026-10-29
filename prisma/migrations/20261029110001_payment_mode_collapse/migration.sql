-- Second step: rows cannot move onto a value added in the same transaction,
-- so the collapse and the type rebuild run here.

UPDATE "Expense" SET "paymentMode" = 'ONLINE' WHERE "paymentMode" IN ('UPI', 'BANK', 'CARD');
UPDATE "CashTxn" SET "mode" = 'ONLINE' WHERE "mode" IN ('UPI', 'BANK', 'CARD');

CREATE TYPE "PaymentMode_new" AS ENUM ('CASH', 'ONLINE');

ALTER TABLE "Expense" ALTER COLUMN "paymentMode" DROP DEFAULT;
ALTER TABLE "CashTxn"  ALTER COLUMN "mode" DROP DEFAULT;

ALTER TABLE "Expense"
  ALTER COLUMN "paymentMode" TYPE "PaymentMode_new"
  USING ("paymentMode"::text::"PaymentMode_new");
ALTER TABLE "CashTxn"
  ALTER COLUMN "mode" TYPE "PaymentMode_new"
  USING ("mode"::text::"PaymentMode_new");

ALTER TABLE "Expense" ALTER COLUMN "paymentMode" SET DEFAULT 'CASH';
ALTER TABLE "CashTxn"  ALTER COLUMN "mode" SET DEFAULT 'CASH';

DROP TYPE "PaymentMode";
ALTER TYPE "PaymentMode_new" RENAME TO "PaymentMode";
