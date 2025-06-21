/*
  Warnings:

  - You are about to drop the column `resolution` on the `LostPetAlert` table. All the data in the column will be lost.
  - You are about to drop the `pet_claims` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[foundBySightingId]` on the table `PetRecoveryAnalytics` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "DeliveryRequestStatus" AS ENUM ('PENDING', 'CONFIRMED', 'IN_PROGRESS', 'DELIVERED', 'CANCELLED');

-- DropForeignKey
ALTER TABLE "ClaimStatusHistory" DROP CONSTRAINT "ClaimStatusHistory_claimId_fkey";

-- DropForeignKey
ALTER TABLE "pet_claims" DROP CONSTRAINT "pet_claims_claimantId_fkey";

-- DropForeignKey
ALTER TABLE "pet_claims" DROP CONSTRAINT "pet_claims_found_alert_fkey";

-- DropForeignKey
ALTER TABLE "pet_claims" DROP CONSTRAINT "pet_claims_lost_alert_fkey";

-- DropForeignKey
ALTER TABLE "pet_claims" DROP CONSTRAINT "pet_claims_verifiedById_fkey";

-- AlterTable
ALTER TABLE "LostPetAlert" DROP COLUMN "resolution";

-- AlterTable
ALTER TABLE "Pet" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- DropTable
DROP TABLE "pet_claims";

-- CreateTable
CREATE TABLE "PetClaim" (
    "id" TEXT NOT NULL,
    "status" "ClaimStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "claimantId" TEXT NOT NULL,
    "alertType" TEXT NOT NULL,
    "foundAlertId" TEXT,
    "lostAlertId" TEXT,
    "verificationDetails" JSONB,
    "verificationImages" TEXT[],
    "adminNotes" TEXT,
    "rejectionReason" TEXT,
    "meetingLocation" TEXT,
    "meetingDate" TIMESTAMP(3),
    "meetingNotes" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "PetClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SightingDeliveryRequest" (
    "id" TEXT NOT NULL,
    "sightingId" TEXT NOT NULL,
    "status" "DeliveryRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "meetingLocation" TEXT,
    "meetingDate" TIMESTAMP(3),
    "meetingNotes" TEXT,
    "verificationImages" TEXT[],
    "ownerNotes" TEXT,
    "finderNotes" TEXT,
    "confirmedByOwner" BOOLEAN NOT NULL DEFAULT false,
    "confirmedByFinder" BOOLEAN NOT NULL DEFAULT false,
    "deliveredAt" TIMESTAMP(3),

    CONSTRAINT "SightingDeliveryRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryStatusHistory" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "status" "DeliveryRequestStatus" NOT NULL,
    "comment" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PetClaim_claimantId_idx" ON "PetClaim"("claimantId");

-- CreateIndex
CREATE INDEX "PetClaim_status_idx" ON "PetClaim"("status");

-- CreateIndex
CREATE INDEX "PetClaim_foundAlertId_alertType_idx" ON "PetClaim"("foundAlertId", "alertType");

-- CreateIndex
CREATE INDEX "PetClaim_lostAlertId_alertType_idx" ON "PetClaim"("lostAlertId", "alertType");

-- CreateIndex
CREATE UNIQUE INDEX "SightingDeliveryRequest_sightingId_key" ON "SightingDeliveryRequest"("sightingId");

-- CreateIndex
CREATE INDEX "SightingDeliveryRequest_sightingId_idx" ON "SightingDeliveryRequest"("sightingId");

-- CreateIndex
CREATE INDEX "SightingDeliveryRequest_status_idx" ON "SightingDeliveryRequest"("status");

-- CreateIndex
CREATE INDEX "DeliveryStatusHistory_requestId_idx" ON "DeliveryStatusHistory"("requestId");

-- CreateIndex
CREATE INDEX "DeliveryStatusHistory_userId_idx" ON "DeliveryStatusHistory"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PetRecoveryAnalytics_foundBySightingId_key" ON "PetRecoveryAnalytics"("foundBySightingId");

-- AddForeignKey
ALTER TABLE "PetClaim" ADD CONSTRAINT "PetClaim_claimantId_fkey" FOREIGN KEY ("claimantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PetClaim" ADD CONSTRAINT "PetClaim_foundAlertId_fkey" FOREIGN KEY ("foundAlertId") REFERENCES "FoundPetAlert"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PetClaim" ADD CONSTRAINT "PetClaim_lostAlertId_fkey" FOREIGN KEY ("lostAlertId") REFERENCES "LostPetAlert"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PetClaim" ADD CONSTRAINT "PetClaim_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimStatusHistory" ADD CONSTRAINT "ClaimStatusHistory_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "PetClaim"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SightingDeliveryRequest" ADD CONSTRAINT "SightingDeliveryRequest_sightingId_fkey" FOREIGN KEY ("sightingId") REFERENCES "PetSighting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryStatusHistory" ADD CONSTRAINT "DeliveryStatusHistory_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "SightingDeliveryRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
