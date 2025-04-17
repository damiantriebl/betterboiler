/*
  Warnings:

  - You are about to drop the `suppliers` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "motorcycle" DROP CONSTRAINT "motorcycle_supplierId_fkey";

-- DropTable
DROP TABLE "suppliers";

-- CreateTable
CREATE TABLE "Supplier" (
    "id" SERIAL NOT NULL,
    "legalName" TEXT NOT NULL,
    "commercialName" TEXT,
    "taxIdentification" TEXT NOT NULL,
    "vatCondition" TEXT NOT NULL,
    "voucherType" TEXT NOT NULL,
    "grossIncome" TEXT,
    "localTaxRegistration" TEXT,
    "contactName" TEXT,
    "contactPosition" TEXT,
    "landlineNumber" TEXT,
    "mobileNumber" TEXT,
    "email" TEXT,
    "website" TEXT,
    "legalAddress" TEXT,
    "commercialAddress" TEXT,
    "deliveryAddress" TEXT,
    "bank" TEXT,
    "accountTypeNumber" TEXT,
    "cbu" TEXT,
    "bankAlias" TEXT,
    "swiftBic" TEXT,
    "paymentCurrency" TEXT,
    "paymentMethods" TEXT[],
    "paymentTermDays" INTEGER,
    "discountsConditions" TEXT,
    "creditLimit" DOUBLE PRECISION,
    "returnPolicy" TEXT,
    "shippingMethods" TEXT,
    "shippingCosts" TEXT,
    "deliveryTimes" TEXT,
    "transportConditions" TEXT,
    "itemsCategories" TEXT,
    "certifications" TEXT,
    "commercialReferences" TEXT,
    "status" TEXT NOT NULL DEFAULT 'activo',
    "notesObservations" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_taxIdentification_key" ON "Supplier"("taxIdentification");

-- CreateIndex
CREATE INDEX "Supplier_organizationId_idx" ON "Supplier"("organizationId");

-- CreateIndex
CREATE INDEX "Supplier_organizationId_status_idx" ON "Supplier"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_organizationId_taxIdentification_key" ON "Supplier"("organizationId", "taxIdentification");

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "motorcycle" ADD CONSTRAINT "motorcycle_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
