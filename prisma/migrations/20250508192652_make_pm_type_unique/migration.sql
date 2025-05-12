/*
  Warnings:

  - You are about to drop the column `modelId` on the `CurrentAccount` table. All the data in the column will be lost.
  - You are about to drop the column `amount` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `receiptNumber` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `scheduledDate` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Payment` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[type]` on the table `PaymentMethod` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `motorcycleId` to the `CurrentAccount` table without a default value. This is not possible if the table is not empty.
  - Added the required column `remainingAmount` to the `CurrentAccount` table without a default value. This is not possible if the table is not empty.
  - Added the required column `amountPaid` to the `Payment` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_currentAccountId_fkey";

-- DropIndex
DROP INDEX "CurrentAccount_startDate_idx";

-- DropIndex
DROP INDEX "Payment_scheduledDate_idx";

-- DropIndex
DROP INDEX "Payment_status_idx";

-- AlterTable
ALTER TABLE "CurrentAccount" DROP COLUMN "modelId",
ADD COLUMN     "motorcycleId" INTEGER NOT NULL,
ADD COLUMN     "nextDueDate" TIMESTAMP(3),
ADD COLUMN     "remainingAmount" DOUBLE PRECISION NOT NULL,
ALTER COLUMN "reminderLeadTimeDays" SET DEFAULT 3;

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "amount",
DROP COLUMN "receiptNumber",
DROP COLUMN "scheduledDate",
DROP COLUMN "status",
ADD COLUMN     "amountPaid" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "transactionReference" TEXT,
ALTER COLUMN "currentAccountId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "CurrentAccount_motorcycleId_idx" ON "CurrentAccount"("motorcycleId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethod_type_key" ON "PaymentMethod"("type");

-- AddForeignKey
ALTER TABLE "CurrentAccount" ADD CONSTRAINT "CurrentAccount_motorcycleId_fkey" FOREIGN KEY ("motorcycleId") REFERENCES "motorcycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_currentAccountId_fkey" FOREIGN KEY ("currentAccountId") REFERENCES "CurrentAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
