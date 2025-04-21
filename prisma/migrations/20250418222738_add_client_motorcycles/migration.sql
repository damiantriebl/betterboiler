/*
  Warnings:

  - The `state` column on the `motorcycle` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "MotorcycleState" AS ENUM ('AVAILABLE', 'PROCESANDO', 'VENDIDA', 'RESERVADA');

-- AlterTable
ALTER TABLE "motorcycle" ADD COLUMN     "clientId" TEXT,
DROP COLUMN "state",
ADD COLUMN     "state" "MotorcycleState" NOT NULL DEFAULT 'AVAILABLE';

-- CreateIndex
CREATE INDEX "motorcycle_state_idx" ON "motorcycle"("state");

-- AddForeignKey
ALTER TABLE "motorcycle" ADD CONSTRAINT "motorcycle_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
