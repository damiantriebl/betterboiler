-- CreateEnum
CREATE TYPE "MotorcycleState" AS ENUM ('STOCK', 'VENDIDO', 'PAUSADO', 'RESERVADO', 'PROCESANDO', 'ELIMINADO');

-- CreateEnum
CREATE TYPE "PaymentFrequency" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY');

-- CreateEnum
CREATE TYPE "CurrentAccountStatus" AS ENUM ('ACTIVE', 'PAID_OFF', 'OVERDUE', 'DEFAULTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "session" (
    "_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "impersonatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "activeOrganizationId" TEXT,
    "paymentStatus" TEXT,

    CONSTRAINT "session_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "account" (
    "_id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "idToken" TEXT,

    CONSTRAINT "account_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "verification" (
    "_id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "jwks" (
    "_id" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "privateKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jwks_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "organization" (
    "_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "logo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" TEXT,
    "thumbnail" TEXT,

    CONSTRAINT "organization_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "user" (
    "_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "profileOriginal" TEXT,
    "profileCrop" TEXT,
    "profileOriginalVariants" TEXT[],
    "profileCropVariants" TEXT[],
    "premium" BOOLEAN NOT NULL DEFAULT false,
    "role" TEXT NOT NULL DEFAULT 'user',
    "banned" BOOLEAN NOT NULL DEFAULT false,
    "banReason" TEXT,
    "banExpires" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT,

    CONSTRAINT "user_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Model" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "brandId" INTEGER NOT NULL,
    "additionalFilesJson" TEXT,
    "imageUrl" TEXT,
    "specSheetUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Model_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelFile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "modelId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "s3Key" TEXT NOT NULL,
    "s3KeySmall" TEXT,
    "size" INTEGER NOT NULL,

    CONSTRAINT "ModelFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MotoColor" (
    "id" SERIAL NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "colorOne" TEXT NOT NULL,
    "colorTwo" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "MotoColor_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "Sucursal" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "Sucursal_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "companyName" TEXT,
    "taxId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "mobile" TEXT,
    "address" TEXT,
    "vatStatus" TEXT,
    "status" TEXT NOT NULL DEFAULT 'activo',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "motorcycle" (
    "id" SERIAL NOT NULL,
    "chassisNumber" TEXT NOT NULL,
    "engineNumber" TEXT,
    "year" INTEGER NOT NULL,
    "mileage" INTEGER NOT NULL DEFAULT 0,
    "costPrice" DOUBLE PRECISION,
    "retailPrice" DOUBLE PRECISION NOT NULL,
    "wholesalePrice" DOUBLE PRECISION,
    "licensePlate" TEXT,
    "observations" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "brandId" INTEGER NOT NULL,
    "modelId" INTEGER NOT NULL,
    "colorId" INTEGER NOT NULL,
    "branchId" INTEGER NOT NULL,
    "supplierId" INTEGER,
    "organizationId" TEXT NOT NULL,
    "displacement" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "clientId" TEXT,
    "state" "MotorcycleState" NOT NULL DEFAULT 'STOCK',
    "sellerId" TEXT,
    "soldAt" TIMESTAMP(3),

    CONSTRAINT "motorcycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" SERIAL NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "expirationDate" TIMESTAMP(3),
    "notes" TEXT,
    "paymentMethod" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "motorcycleId" INTEGER NOT NULL,
    "clientId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "PaymentMethod" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "iconUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationPaymentMethod" (
    "id" SERIAL NOT NULL,
    "organizationId" TEXT NOT NULL,
    "methodId" INTEGER NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationPaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bank" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CardType_pkey" PRIMARY KEY ("id")
);

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
    "activeDays" TEXT[],

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

-- CreateTable
CREATE TABLE "BankCard" (
    "id" SERIAL NOT NULL,
    "bankId" INTEGER NOT NULL,
    "cardTypeId" INTEGER NOT NULL,
    "organizationId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurrentAccount" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "downPayment" DOUBLE PRECISION NOT NULL,
    "numberOfInstallments" INTEGER NOT NULL,
    "installmentAmount" DOUBLE PRECISION NOT NULL,
    "paymentFrequency" "PaymentFrequency" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" "CurrentAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "reminderLeadTimeDays" INTEGER DEFAULT 3,
    "notes" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "motorcycleId" INTEGER NOT NULL,
    "nextDueDate" TIMESTAMP(3),
    "remainingAmount" DOUBLE PRECISION NOT NULL,
    "interestRate" DOUBLE PRECISION,
    "currency" TEXT DEFAULT 'ARS',

    CONSTRAINT "CurrentAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "currentAccountId" TEXT,
    "paymentDate" TIMESTAMP(3),
    "paymentMethod" TEXT,
    "notes" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "amountPaid" DOUBLE PRECISION NOT NULL,
    "transactionReference" TEXT,
    "installmentNumber" INTEGER,
    "installmentVersion" TEXT,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "organization_slug_key" ON "organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_name_key" ON "Brand"("name");

-- CreateIndex
CREATE INDEX "Model_brandId_idx" ON "Model"("brandId");

-- CreateIndex
CREATE UNIQUE INDEX "Model_name_brandId_key" ON "Model"("name", "brandId");

-- CreateIndex
CREATE INDEX "ModelFile_modelId_idx" ON "ModelFile"("modelId");

-- CreateIndex
CREATE INDEX "MotoColor_organizationId_order_idx" ON "MotoColor"("organizationId", "order");

-- CreateIndex
CREATE INDEX "MotoColor_organizationId_isGlobal_idx" ON "MotoColor"("organizationId", "isGlobal");

-- CreateIndex
CREATE UNIQUE INDEX "MotoColor_organizationId_name_key" ON "MotoColor"("organizationId", "name");

-- CreateIndex
CREATE INDEX "OrganizationBrand_organizationId_order_idx" ON "OrganizationBrand"("organizationId", "order");

-- CreateIndex
CREATE INDEX "OrganizationBrand_brandId_idx" ON "OrganizationBrand"("brandId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationBrand_organizationId_brandId_key" ON "OrganizationBrand"("organizationId", "brandId");

-- CreateIndex
CREATE INDEX "OrganizationModelConfig_organizationId_modelId_order_idx" ON "OrganizationModelConfig"("organizationId", "modelId", "order");

-- CreateIndex
CREATE INDEX "OrganizationModelConfig_modelId_idx" ON "OrganizationModelConfig"("modelId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationModelConfig_organizationId_modelId_key" ON "OrganizationModelConfig"("organizationId", "modelId");

-- CreateIndex
CREATE INDEX "Sucursal_organizationId_order_idx" ON "Sucursal"("organizationId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Sucursal_organizationId_name_key" ON "Sucursal"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_taxIdentification_key" ON "Supplier"("taxIdentification");

-- CreateIndex
CREATE INDEX "Supplier_organizationId_idx" ON "Supplier"("organizationId");

-- CreateIndex
CREATE INDEX "Supplier_organizationId_status_idx" ON "Supplier"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_organizationId_taxIdentification_key" ON "Supplier"("organizationId", "taxIdentification");

-- CreateIndex
CREATE UNIQUE INDEX "motorcycle_chassisNumber_key" ON "motorcycle"("chassisNumber");

-- CreateIndex
CREATE UNIQUE INDEX "motorcycle_engineNumber_key" ON "motorcycle"("engineNumber");

-- CreateIndex
CREATE INDEX "motorcycle_brandId_idx" ON "motorcycle"("brandId");

-- CreateIndex
CREATE INDEX "motorcycle_modelId_idx" ON "motorcycle"("modelId");

-- CreateIndex
CREATE INDEX "motorcycle_colorId_idx" ON "motorcycle"("colorId");

-- CreateIndex
CREATE INDEX "motorcycle_branchId_idx" ON "motorcycle"("branchId");

-- CreateIndex
CREATE INDEX "motorcycle_supplierId_idx" ON "motorcycle"("supplierId");

-- CreateIndex
CREATE INDEX "motorcycle_organizationId_idx" ON "motorcycle"("organizationId");

-- CreateIndex
CREATE INDEX "motorcycle_state_idx" ON "motorcycle"("state");

-- CreateIndex
CREATE INDEX "motorcycle_sellerId_idx" ON "motorcycle"("sellerId");

-- CreateIndex
CREATE INDEX "Reservation_motorcycleId_idx" ON "Reservation"("motorcycleId");

-- CreateIndex
CREATE INDEX "Reservation_clientId_idx" ON "Reservation"("clientId");

-- CreateIndex
CREATE INDEX "Reservation_organizationId_idx" ON "Reservation"("organizationId");

-- CreateIndex
CREATE INDEX "Reservation_status_idx" ON "Reservation"("status");

-- CreateIndex
CREATE INDEX "Reservation_expirationDate_idx" ON "Reservation"("expirationDate");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentCard_name_key" ON "PaymentCard"("name");

-- CreateIndex
CREATE INDEX "OrganizationPaymentCard_organizationId_order_idx" ON "OrganizationPaymentCard"("organizationId", "order");

-- CreateIndex
CREATE INDEX "OrganizationPaymentCard_cardId_idx" ON "OrganizationPaymentCard"("cardId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationPaymentCard_organizationId_cardId_key" ON "OrganizationPaymentCard"("organizationId", "cardId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethod_type_key" ON "PaymentMethod"("type");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationPaymentMethod_organizationId_methodId_key" ON "OrganizationPaymentMethod"("organizationId", "methodId");

-- CreateIndex
CREATE UNIQUE INDEX "Bank_name_key" ON "Bank"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CardType_name_key" ON "CardType"("name");

-- CreateIndex
CREATE INDEX "BankingPromotion_organizationId_idx" ON "BankingPromotion"("organizationId");

-- CreateIndex
CREATE INDEX "BankingPromotion_paymentMethodId_idx" ON "BankingPromotion"("paymentMethodId");

-- CreateIndex
CREATE INDEX "BankingPromotion_bankCardId_idx" ON "BankingPromotion"("bankCardId");

-- CreateIndex
CREATE INDEX "BankingPromotion_cardId_idx" ON "BankingPromotion"("cardId");

-- CreateIndex
CREATE INDEX "BankingPromotion_bankId_idx" ON "BankingPromotion"("bankId");

-- CreateIndex
CREATE UNIQUE INDEX "InstallmentPlan_bankingPromotionId_installments_key" ON "InstallmentPlan"("bankingPromotionId", "installments");

-- CreateIndex
CREATE INDEX "BankCard_organizationId_idx" ON "BankCard"("organizationId");

-- CreateIndex
CREATE INDEX "BankCard_bankId_idx" ON "BankCard"("bankId");

-- CreateIndex
CREATE INDEX "BankCard_cardTypeId_idx" ON "BankCard"("cardTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "BankCard_bankId_cardTypeId_organizationId_key" ON "BankCard"("bankId", "cardTypeId", "organizationId");

-- CreateIndex
CREATE INDEX "CurrentAccount_clientId_idx" ON "CurrentAccount"("clientId");

-- CreateIndex
CREATE INDEX "CurrentAccount_motorcycleId_idx" ON "CurrentAccount"("motorcycleId");

-- CreateIndex
CREATE INDEX "CurrentAccount_organizationId_idx" ON "CurrentAccount"("organizationId");

-- CreateIndex
CREATE INDEX "CurrentAccount_status_idx" ON "CurrentAccount"("status");

-- CreateIndex
CREATE INDEX "Payment_currentAccountId_idx" ON "Payment"("currentAccountId");

-- CreateIndex
CREATE INDEX "Payment_organizationId_idx" ON "Payment"("organizationId");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Model" ADD CONSTRAINT "Model_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelFile" ADD CONSTRAINT "ModelFile_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "Model"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MotoColor" ADD CONSTRAINT "MotoColor_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationBrand" ADD CONSTRAINT "OrganizationBrand_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationBrand" ADD CONSTRAINT "OrganizationBrand_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationModelConfig" ADD CONSTRAINT "OrganizationModelConfig_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "Model"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationModelConfig" ADD CONSTRAINT "OrganizationModelConfig_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sucursal" ADD CONSTRAINT "Sucursal_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "motorcycle" ADD CONSTRAINT "motorcycle_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "motorcycle" ADD CONSTRAINT "motorcycle_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "motorcycle" ADD CONSTRAINT "motorcycle_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "motorcycle" ADD CONSTRAINT "motorcycle_colorId_fkey" FOREIGN KEY ("colorId") REFERENCES "MotoColor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "motorcycle" ADD CONSTRAINT "motorcycle_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "Model"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "motorcycle" ADD CONSTRAINT "motorcycle_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "motorcycle" ADD CONSTRAINT "motorcycle_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "user"("_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "motorcycle" ADD CONSTRAINT "motorcycle_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_motorcycleId_fkey" FOREIGN KEY ("motorcycleId") REFERENCES "motorcycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationPaymentCard" ADD CONSTRAINT "OrganizationPaymentCard_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "PaymentCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationPaymentCard" ADD CONSTRAINT "OrganizationPaymentCard_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationPaymentMethod" ADD CONSTRAINT "OrganizationPaymentMethod_methodId_fkey" FOREIGN KEY ("methodId") REFERENCES "PaymentMethod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationPaymentMethod" ADD CONSTRAINT "OrganizationPaymentMethod_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankingPromotion" ADD CONSTRAINT "BankingPromotion_bankCardId_fkey" FOREIGN KEY ("bankCardId") REFERENCES "BankCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankingPromotion" ADD CONSTRAINT "BankingPromotion_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "Bank"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankingPromotion" ADD CONSTRAINT "BankingPromotion_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "PaymentCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankingPromotion" ADD CONSTRAINT "BankingPromotion_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankingPromotion" ADD CONSTRAINT "BankingPromotion_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstallmentPlan" ADD CONSTRAINT "InstallmentPlan_bankingPromotionId_fkey" FOREIGN KEY ("bankingPromotionId") REFERENCES "BankingPromotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankCard" ADD CONSTRAINT "BankCard_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "Bank"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankCard" ADD CONSTRAINT "BankCard_cardTypeId_fkey" FOREIGN KEY ("cardTypeId") REFERENCES "CardType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankCard" ADD CONSTRAINT "BankCard_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurrentAccount" ADD CONSTRAINT "CurrentAccount_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurrentAccount" ADD CONSTRAINT "CurrentAccount_motorcycleId_fkey" FOREIGN KEY ("motorcycleId") REFERENCES "motorcycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurrentAccount" ADD CONSTRAINT "CurrentAccount_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_currentAccountId_fkey" FOREIGN KEY ("currentAccountId") REFERENCES "CurrentAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("_id") ON DELETE CASCADE ON UPDATE CASCADE;
