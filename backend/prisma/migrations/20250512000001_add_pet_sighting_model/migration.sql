-- CreatePetSightingModelAndUpdateNotificationTypes
-- Adicionar modelo PetSighting para registrar avistamentos de pets perdidos
-- Adicionar PET_SIGHTING ao enum NotificationType

ALTER TYPE "NotificationType" ADD VALUE 'PET_SIGHTING';

CREATE TABLE "PetSighting" (
  "id" TEXT NOT NULL,
  "alertId" TEXT NOT NULL,
  "reportedBy" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "latitude" DOUBLE PRECISION NOT NULL,
  "longitude" DOUBLE PRECISION NOT NULL,
  "locationName" TEXT,
  "sightedAt" TIMESTAMP(3) NOT NULL,
  "image" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  PRIMARY KEY ("id")
);

-- Adicionar índices para melhorar performance
CREATE INDEX "PetSighting_alertId_idx" ON "PetSighting"("alertId");
CREATE INDEX "PetSighting_reportedBy_idx" ON "PetSighting"("reportedBy");

-- Adicionar chaves estrangeiras para garantir integridade referencial
ALTER TABLE "PetSighting" ADD CONSTRAINT "PetSighting_alertId_fkey" 
FOREIGN KEY ("alertId") REFERENCES "LostPetAlert"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PetSighting" ADD CONSTRAINT "PetSighting_reportedBy_fkey" 
FOREIGN KEY ("reportedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
