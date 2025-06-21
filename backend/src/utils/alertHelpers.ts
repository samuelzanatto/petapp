/**
 * Este arquivo contém funções auxiliares para trabalhar com alertas em PetClaim.
 * Já que PetClaim tem dois tipos de alertas (foundAlert e lostAlert), estas funções 
 * ajudam a obter o alerta correto com base no alertType.
 */
import { FoundPetAlert, LostPetAlert, PetClaim, User } from '@prisma/client';

type FoundAlertWithUser = FoundPetAlert & { user: User };
type LostAlertWithUserAndPet = LostPetAlert & { user: User; pet: { id: string; name: string; primaryImage: string | null } };

/**
 * Obtém o alerta correto (found ou lost) com base no tipo
 */
export const getAlertFromClaim = (claim: PetClaim & { 
  foundAlert?: FoundAlertWithUser | null; 
  lostAlert?: LostAlertWithUserAndPet | null;
}) => {
  if (claim.alertType === 'FOUND' && claim.foundAlert) {
    return claim.foundAlert;
  } else if (claim.alertType === 'LOST' && claim.lostAlert) {
    return claim.lostAlert;
  }
  return null;
};

/**
 * Obtém o ID do usuário dono do alerta
 */
export const getAlertOwnerIdFromClaim = (claim: PetClaim & { 
  foundAlert?: FoundAlertWithUser | null; 
  lostAlert?: LostAlertWithUserAndPet | null;
}) => {
  const alert = getAlertFromClaim(claim);
  return alert?.userId;
};

/**
 * Obtém o usuário dono do alerta
 */
export const getAlertOwnerFromClaim = (claim: PetClaim & { 
  foundAlert?: { user: User } | null; 
  lostAlert?: { user: User } | null;
}) => {
  if (claim.alertType === 'FOUND' && claim.foundAlert) {
    return claim.foundAlert.user;
  } else if (claim.alertType === 'LOST' && claim.lostAlert) {
    return claim.lostAlert.user;
  }
  return null;
};

/**
 * Obtém a imagem principal do alerta
 */
export const getAlertImageFromClaim = (claim: PetClaim & { 
  foundAlert?: FoundAlertWithUser | null; 
  lostAlert?: LostAlertWithUserAndPet | null;
}) => {
  if (claim.alertType === 'FOUND' && claim.foundAlert) {
    return claim.foundAlert.image;
  } else if (claim.alertType === 'LOST' && claim.lostAlert?.pet) {
    return claim.lostAlert.pet.primaryImage;
  }
  return null;
};

/**
 * Obtém informações do pet do alerta (quando disponível)
 */
export const getPetFromClaim = (claim: PetClaim & { 
  lostAlert?: LostAlertWithUserAndPet | null;
}) => {
  if (claim.alertType === 'LOST' && claim.lostAlert?.pet) {
    return claim.lostAlert.pet;
  }
  return null;
};
