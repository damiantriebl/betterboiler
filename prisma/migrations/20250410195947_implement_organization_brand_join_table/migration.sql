/*
  Warnings:

  - You are about to drop the column `color` on the `Brand` table. All the data in the column will be lost.
  - You are about to drop the column `order` on the `Brand` table. All the data in the column will be lost.
  - You are about to drop the column `organizationId` on the `Brand` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name]` on the table `Brand` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Brand" DROP CONSTRAINT "Brand_organizationId_fkey";

-- DropIndex
DROP INDEX "Brand_organizationId_name_key";

-- DropIndex
DROP INDEX "Brand_organizationId_order_idx";

-- AlterTable
ALTER TABLE "Brand" DROP COLUMN "color",
DROP COLUMN "order",
DROP COLUMN "organizationId";

-- CreateTable
CREATE TABLE "OrganizationBrand" (
    "id" SERIAL NOT NULL,
    "organizationId" TEXT NOT NULL,
    "brandId" INTEGER NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationBrand_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrganizationBrand_organizationId_order_idx" ON "OrganizationBrand"("organizationId", "order");

-- CreateIndex
CREATE INDEX "OrganizationBrand_brandId_idx" ON "OrganizationBrand"("brandId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationBrand_organizationId_brandId_key" ON "OrganizationBrand"("organizationId", "brandId");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_name_key" ON "Brand"("name");

-- AddForeignKey
ALTER TABLE "OrganizationBrand" ADD CONSTRAINT "OrganizationBrand_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationBrand" ADD CONSTRAINT "OrganizationBrand_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
