-- AlterTable
ALTER TABLE "CurrentAccount" ADD COLUMN     "currency" TEXT DEFAULT 'ARS',
ADD COLUMN     "interestRate" DOUBLE PRECISION;
