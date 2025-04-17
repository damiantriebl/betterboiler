/*
  Warnings:

  - You are about to drop the column `color1` on the `MotoColor` table. All the data in the column will be lost.
  - You are about to drop the column `color2` on the `MotoColor` table. All the data in the column will be lost.
  - You are about to drop the column `nombre` on the `MotoColor` table. All the data in the column will be lost.
  - You are about to drop the column `tipo` on the `MotoColor` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[organizationId,name]` on the table `MotoColor` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `colorOne` to the `MotoColor` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `MotoColor` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `MotoColor` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "MotoColor_organizationId_nombre_key";

-- AlterTable
ALTER TABLE "MotoColor" DROP COLUMN "color1",
DROP COLUMN "color2",
DROP COLUMN "nombre",
DROP COLUMN "tipo",
ADD COLUMN     "colorOne" TEXT NOT NULL,
ADD COLUMN     "colorTwo" TEXT,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "type" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "motorcycle" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'ARS';

-- CreateIndex
CREATE UNIQUE INDEX "MotoColor_organizationId_name_key" ON "MotoColor"("organizationId", "name");
