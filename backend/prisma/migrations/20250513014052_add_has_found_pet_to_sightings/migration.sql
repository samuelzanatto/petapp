/*
  Warnings:

  - Added the required column `alertType` to the `pet_claims` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FoundPetAlert" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Notification" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "PetSighting" ADD COLUMN     "hasFoundPet" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "pet_claims" ADD COLUMN     "alertType" TEXT NOT NULL DEFAULT 'FOUND';

-- RenameForeignKey
ALTER TABLE "pet_claims" RENAME CONSTRAINT "pet_claims_alertId_fkey" TO "pet_claims_found_alert_fkey";

-- Adicionar as chaves estrangeiras de forma condicional
ALTER TABLE "pet_claims" 
DROP CONSTRAINT IF EXISTS "pet_claims_lost_alert_fkey";

-- Para aplicar o relacionamento com LostPetAlert apenas para os novos registros
-- AddForeignKey (comentado)
-- ALTER TABLE "pet_claims" ADD CONSTRAINT "pet_claims_lost_alert_fkey" FOREIGN KEY ("alertId") REFERENCES "LostPetAlert"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_claims" ADD CONSTRAINT "pet_claims_lost_alert_fkey" FOREIGN KEY ("alertId") REFERENCES "LostPetAlert"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
