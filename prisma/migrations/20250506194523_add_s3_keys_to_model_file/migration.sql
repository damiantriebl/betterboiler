/*
  Warnings:

  - The primary key for the `ModelFile` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Added the required column `s3Key` to the `ModelFile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `size` to the `ModelFile` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Model" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "ModelFile" DROP CONSTRAINT "ModelFile_pkey",
ADD COLUMN     "s3Key" TEXT NOT NULL,
ADD COLUMN     "s3KeySmall" TEXT,
ADD COLUMN     "size" INTEGER NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "ModelFile_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "ModelFile_id_seq";
