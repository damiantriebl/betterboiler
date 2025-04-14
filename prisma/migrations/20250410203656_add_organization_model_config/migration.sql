/*
  Warnings:

  - You are about to drop the column `order` on the `Model` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Model_brandId_order_idx";

-- AlterTable
ALTER TABLE "Model" DROP COLUMN "order";

-- CreateTable
CREATE TABLE "OrganizationModelConfig" (
    "id" SERIAL NOT NULL,
    "organizationId" TEXT NOT NULL,
    "modelId" INTEGER NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationModelConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrganizationModelConfig_organizationId_modelId_order_idx" ON "OrganizationModelConfig"("organizationId", "modelId", "order");

-- CreateIndex
CREATE INDEX "OrganizationModelConfig_modelId_idx" ON "OrganizationModelConfig"("modelId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationModelConfig_organizationId_modelId_key" ON "OrganizationModelConfig"("organizationId", "modelId");

-- CreateIndex
CREATE INDEX "Model_brandId_idx" ON "Model"("brandId");

-- AddForeignKey
ALTER TABLE "OrganizationModelConfig" ADD CONSTRAINT "OrganizationModelConfig_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationModelConfig" ADD CONSTRAINT "OrganizationModelConfig_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "Model"("id") ON DELETE CASCADE ON UPDATE CASCADE;
