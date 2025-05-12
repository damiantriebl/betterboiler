-- CreateTable
CREATE TABLE "BankingPromotion" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "organizationId" TEXT NOT NULL,
  "paymentMethodId" INTEGER NOT NULL,
  "cardId" INTEGER,
  "bankId" INTEGER,
  "bankCardId" INTEGER,
  "discountRate" DOUBLE PRECISION,
  "surchargeRate" DOUBLE PRECISION,
  "minAmount" DOUBLE PRECISION,
  "maxAmount" DOUBLE PRECISION,
  "isEnabled" BOOLEAN NOT NULL DEFAULT true,
  "startDate" TIMESTAMP(3),
  "endDate" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BankingPromotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstallmentPlan" (
  "id" SERIAL NOT NULL,
  "bankingPromotionId" INTEGER NOT NULL,
  "installments" INTEGER NOT NULL,
  "interestRate" DOUBLE PRECISION NOT NULL,
  "isEnabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "InstallmentPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BankingPromotion_organizationId_idx" ON "BankingPromotion"("organizationId");

-- CreateIndex
CREATE INDEX "BankingPromotion_paymentMethodId_idx" ON "BankingPromotion"("paymentMethodId");

-- CreateIndex
CREATE INDEX "BankingPromotion_cardId_idx" ON "BankingPromotion"("cardId");

-- CreateIndex
CREATE INDEX "BankingPromotion_bankId_idx" ON "BankingPromotion"("bankId");

-- CreateIndex
CREATE INDEX "BankingPromotion_bankCardId_idx" ON "BankingPromotion"("bankCardId");

-- CreateIndex
CREATE UNIQUE INDEX "InstallmentPlan_bankingPromotionId_installments_key" ON "InstallmentPlan"("bankingPromotionId", "installments");

-- AddForeignKey
ALTER TABLE "BankingPromotion" ADD CONSTRAINT "BankingPromotion_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankingPromotion" ADD CONSTRAINT "BankingPromotion_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankingPromotion" ADD CONSTRAINT "BankingPromotion_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "PaymentCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankingPromotion" ADD CONSTRAINT "BankingPromotion_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "Bank"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankingPromotion" ADD CONSTRAINT "BankingPromotion_bankCardId_fkey" FOREIGN KEY ("bankCardId") REFERENCES "BankCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstallmentPlan" ADD CONSTRAINT "InstallmentPlan_bankingPromotionId_fkey" FOREIGN KEY ("bankingPromotionId") REFERENCES "BankingPromotion"("id") ON DELETE CASCADE ON UPDATE CASCADE; 