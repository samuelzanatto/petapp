/*
  Warnings:

  - You are about to drop the `DeliveryStatusHistory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SightingDeliveryRequest` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "DeliveryStatusHistory" DROP CONSTRAINT "DeliveryStatusHistory_requestId_fkey";

-- DropForeignKey
ALTER TABLE "SightingDeliveryRequest" DROP CONSTRAINT "SightingDeliveryRequest_sightingId_fkey";

-- DropTable
DROP TABLE "DeliveryStatusHistory";

-- DropTable
DROP TABLE "SightingDeliveryRequest";

-- DropEnum
DROP TYPE "DeliveryRequestStatus";
