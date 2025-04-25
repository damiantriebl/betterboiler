-- AlterTable
ALTER TABLE "motorcycle" ADD COLUMN     "sellerId" TEXT,
ADD COLUMN     "soldAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "motorcycle_sellerId_idx" ON "motorcycle"("sellerId");

-- AddForeignKey
ALTER TABLE "motorcycle" ADD CONSTRAINT "motorcycle_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "user"("_id") ON DELETE SET NULL ON UPDATE CASCADE;
