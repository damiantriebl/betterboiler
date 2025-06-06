-- CreateTable
CREATE TABLE "mercadopago_oauth_temp" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "codeVerifier" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mercadopago_oauth_temp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_notification" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "paymentId" TEXT,
    "mercadopagoId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mercadopago_oauth_temp_organizationId_key" ON "mercadopago_oauth_temp"("organizationId");

-- CreateIndex
CREATE INDEX "payment_notification_organizationId_isRead_idx" ON "payment_notification"("organizationId", "isRead");

-- CreateIndex
CREATE INDEX "payment_notification_expiresAt_idx" ON "payment_notification"("expiresAt");

-- AddForeignKey
ALTER TABLE "mercadopago_oauth_temp" ADD CONSTRAINT "mercadopago_oauth_temp_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_notification" ADD CONSTRAINT "payment_notification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("_id") ON DELETE CASCADE ON UPDATE CASCADE;
