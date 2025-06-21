/*
  Warnings:

  - You are about to drop the column `furType` on the `Pet` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "LostPetAlert" ADD COLUMN     "images" TEXT[];

-- AlterTable
ALTER TABLE "Pet" DROP COLUMN "furType",
ADD COLUMN     "coatType" TEXT;
