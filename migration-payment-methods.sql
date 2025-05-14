-- Create PaymentMethod table
CREATE TABLE IF NOT EXISTS "PaymentMethod" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "iconUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Create OrganizationPaymentMethod join table
CREATE TABLE IF NOT EXISTS "OrganizationPaymentMethod" (
  "id" SERIAL PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "methodId" INTEGER NOT NULL,
  "isEnabled" BOOLEAN NOT NULL DEFAULT true,
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrganizationPaymentMethod_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("_id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OrganizationPaymentMethod_methodId_fkey" FOREIGN KEY ("methodId") REFERENCES "PaymentMethod"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OrganizationPaymentMethod_organizationId_methodId_key" UNIQUE ("organizationId", "methodId")
);

-- Insert default payment methods
INSERT INTO "PaymentMethod" ("name", "type", "description", "iconUrl", "updatedAt")
VALUES
  ('Efectivo', 'cash', 'Pago en efectivo', '/icons/payment-methods/cash.svg', CURRENT_TIMESTAMP),
  ('Tarjeta de Crédito', 'credit', 'Pago con tarjeta de crédito', '/icons/payment-methods/credit-card.svg', CURRENT_TIMESTAMP),
  ('Tarjeta de Débito', 'debit', 'Pago con tarjeta de débito', '/icons/payment-methods/debit-card.svg', CURRENT_TIMESTAMP),
  ('Transferencia Bancaria', 'transfer', 'Pago por transferencia bancaria', '/icons/payment-methods/bank-transfer.svg', CURRENT_TIMESTAMP),
  ('Cheque', 'check', 'Pago con cheque', '/icons/payment-methods/check.svg', CURRENT_TIMESTAMP),
  ('Depósito Bancario', 'deposit', 'Pago por depósito bancario', '/icons/payment-methods/bank-deposit.svg', CURRENT_TIMESTAMP),
  ('MercadoPago', 'mercadopago', 'Pago a través de MercadoPago', '/icons/payment-methods/mercadopago.svg', CURRENT_TIMESTAMP),
  ('Código QR', 'qr', 'Pago mediante escaneo de código QR', '/icons/payment-methods/qr-code.svg', CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING; 