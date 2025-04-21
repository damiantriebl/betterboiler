/*
  Warnings:

  - The values [AVAILABLE,VENDIDA,RESERVADA] on the enum `MotorcycleState` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "MotorcycleState_new" AS ENUM ('STOCK', 'VENDIDO', 'PAUSADO', 'RESERVADO', 'PROCESANDO', 'ELIMINADO');
ALTER TABLE "motorcycle" ALTER COLUMN "state" DROP DEFAULT;
ALTER TABLE "motorcycle" ALTER COLUMN "state" TYPE "MotorcycleState_new" USING ("state"::text::"MotorcycleState_new");
ALTER TYPE "MotorcycleState" RENAME TO "MotorcycleState_old";
ALTER TYPE "MotorcycleState_new" RENAME TO "MotorcycleState";
DROP TYPE "MotorcycleState_old";
ALTER TABLE "motorcycle" ALTER COLUMN "state" SET DEFAULT 'STOCK';
COMMIT;

-- AlterTable
ALTER TABLE "Client" ALTER COLUMN "status" SET DEFAULT 'activo';

-- AlterTable
ALTER TABLE "motorcycle" ALTER COLUMN "state" SET DEFAULT 'STOCK';
