/*
  Warnings:

  - You are about to drop the column `coatType` on the `Pet` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Pet" DROP COLUMN "coatType",
ADD COLUMN     "furType" TEXT;
