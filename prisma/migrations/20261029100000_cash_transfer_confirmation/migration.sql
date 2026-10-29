-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED');

-- AlterTable
ALTER TABLE "CashTxn" ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "confirmedById" TEXT,
ADD COLUMN     "initiatedBy" "Role",
ADD COLUMN     "rejectedReason" TEXT,
ADD COLUMN     "status" "TransferStatus" NOT NULL DEFAULT 'CONFIRMED';

-- CreateIndex
CREATE INDEX "CashTxn_status_toCostCenter_idx" ON "CashTxn"("status", "toCostCenter");

-- AddForeignKey
ALTER TABLE "CashTxn" ADD CONSTRAINT "CashTxn_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Existing hand-overs were recorded by the founder, so mark them as such.
UPDATE "CashTxn" SET "initiatedBy" = 'FOUNDER' WHERE "type" = 'ISSUE';

-- The import flagged transfers the receiving team never recorded in its own book.
-- Those are exactly what this flow is for, so they start as PENDING and appear in
-- the team's list waiting to be confirmed.
UPDATE "CashTxn"
   SET "status" = 'PENDING'
 WHERE "type" = 'ISSUE'
   AND "note" LIKE '%not yet acknowledged%';
