-- CreateTable
CREATE TABLE "suppliers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
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
    "state" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "brandId" INTEGER NOT NULL,
    "modelId" INTEGER NOT NULL,
    "colorId" INTEGER NOT NULL,
    "branchId" INTEGER NOT NULL,
    "supplierId" INTEGER,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "motorcycle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_name_key" ON "suppliers"("name");

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

-- AddForeignKey
ALTER TABLE "motorcycle" ADD CONSTRAINT "motorcycle_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "motorcycle" ADD CONSTRAINT "motorcycle_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "Model"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "motorcycle" ADD CONSTRAINT "motorcycle_colorId_fkey" FOREIGN KEY ("colorId") REFERENCES "MotoColor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "motorcycle" ADD CONSTRAINT "motorcycle_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "motorcycle" ADD CONSTRAINT "motorcycle_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "motorcycle" ADD CONSTRAINT "motorcycle_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;
