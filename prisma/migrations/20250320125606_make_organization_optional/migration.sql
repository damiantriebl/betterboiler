/*
  Warnings:

  - You are about to drop the column `image` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `organizationName` on the `user` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "user" DROP COLUMN "image",
DROP COLUMN "organizationName",
ADD COLUMN     "profileCrop" TEXT,
ADD COLUMN     "profileOriginal" TEXT;
