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
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);
