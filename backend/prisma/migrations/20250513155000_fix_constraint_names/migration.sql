-- Se as constraints já existirem, precisamos renomeá-las
-- Primeiro, vamos tentar remover as constraints existentes (se houver)
ALTER TABLE "pet_claims" DROP CONSTRAINT IF EXISTS "pet_claims_alertId_fkey";
ALTER TABLE "pet_claims" DROP CONSTRAINT IF EXISTS "pet_claims_foundAlert_fkey";
ALTER TABLE "pet_claims" DROP CONSTRAINT IF EXISTS "pet_claims_lostAlert_fkey";
