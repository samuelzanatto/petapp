-- Migração para corrigir o schema.prisma para relacionamentos de PetClaim
-- Correção de relacionamento entre PetClaim e ClaimStatusHistory

-- Adicionando relação entre ClaimStatusHistory e PetClaim
ALTER TABLE "ClaimStatusHistory" ADD CONSTRAINT "ClaimStatusHistory_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "pet_claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Adicionando índice para alertId e alertType em PetClaim
CREATE INDEX IF NOT EXISTS "pet_claims_alertId_alertType_idx" ON "pet_claims"("alertId", "alertType");

-- Adicionando índice para status em PetClaim
CREATE INDEX IF NOT EXISTS "pet_claims_status_idx" ON "pet_claims"("status");
