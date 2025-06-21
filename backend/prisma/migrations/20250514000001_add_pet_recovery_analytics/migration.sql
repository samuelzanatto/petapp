-- AddPetRecoveryAnalyticsModel
-- Cria um novo modelo para armazenar análises de recuperação de pets perdidos

-- AlterTable
ALTER TABLE "LostPetAlert" ADD COLUMN     "resolution" TEXT;

-- CreateTable
CREATE TABLE "PetRecoveryAnalytics" (
    "id" TEXT NOT NULL,
    "alertId" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "foundDate" TIMESTAMP(3) NOT NULL,
    "foundBySightingId" TEXT,
    "foundMethod" TEXT NOT NULL,
    "daysToRecover" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PetRecoveryAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PetRecoveryAnalytics_alertId_key" ON "PetRecoveryAnalytics"("alertId");

-- AddForeignKey
ALTER TABLE "PetRecoveryAnalytics" ADD CONSTRAINT "PetRecoveryAnalytics_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "LostPetAlert"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PetRecoveryAnalytics" ADD CONSTRAINT "PetRecoveryAnalytics_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PetRecoveryAnalytics" ADD CONSTRAINT "PetRecoveryAnalytics_foundBySightingId_fkey" FOREIGN KEY ("foundBySightingId") REFERENCES "PetSighting"("id") ON DELETE SET NULL ON UPDATE CASCADE;
