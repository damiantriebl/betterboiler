-- CreateTable
CREATE TABLE "PaymentCard" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationPaymentCard" (
    "id" SERIAL NOT NULL,
    "organizationId" TEXT NOT NULL,
    "cardId" INTEGER NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationPaymentCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentCard_name_key" ON "PaymentCard"("name");

-- CreateIndex
CREATE INDEX "OrganizationPaymentCard_organizationId_order_idx" ON "OrganizationPaymentCard"("organizationId", "order");

-- CreateIndex
CREATE INDEX "OrganizationPaymentCard_cardId_idx" ON "OrganizationPaymentCard"("cardId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationPaymentCard_organizationId_cardId_key" ON "OrganizationPaymentCard"("organizationId", "cardId");

-- AddForeignKey
ALTER TABLE "OrganizationPaymentCard" ADD CONSTRAINT "OrganizationPaymentCard_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationPaymentCard" ADD CONSTRAINT "OrganizationPaymentCard_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "PaymentCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
