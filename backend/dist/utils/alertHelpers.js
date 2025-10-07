"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPetFromClaim = exports.getAlertImageFromClaim = exports.getAlertOwnerFromClaim = exports.getAlertOwnerIdFromClaim = exports.getAlertFromClaim = void 0;
/**
 * Obtém o alerta correto (found ou lost) com base no tipo
 */
const getAlertFromClaim = (claim) => {
    if (claim.alertType === 'FOUND' && claim.foundAlert) {
        return claim.foundAlert;
    }
    else if (claim.alertType === 'LOST' && claim.lostAlert) {
        return claim.lostAlert;
    }
    return null;
};
exports.getAlertFromClaim = getAlertFromClaim;
/**
 * Obtém o ID do usuário dono do alerta
 */
const getAlertOwnerIdFromClaim = (claim) => {
    const alert = (0, exports.getAlertFromClaim)(claim);
    return alert?.userId;
};
exports.getAlertOwnerIdFromClaim = getAlertOwnerIdFromClaim;
/**
 * Obtém o usuário dono do alerta
 */
const getAlertOwnerFromClaim = (claim) => {
    if (claim.alertType === 'FOUND' && claim.foundAlert) {
        return claim.foundAlert.user;
    }
    else if (claim.alertType === 'LOST' && claim.lostAlert) {
        return claim.lostAlert.user;
    }
    return null;
};
exports.getAlertOwnerFromClaim = getAlertOwnerFromClaim;
/**
 * Obtém a imagem principal do alerta
 */
const getAlertImageFromClaim = (claim) => {
    if (claim.alertType === 'FOUND' && claim.foundAlert) {
        return claim.foundAlert.image;
    }
    else if (claim.alertType === 'LOST' && claim.lostAlert?.pet) {
        return claim.lostAlert.pet.primaryImage;
    }
    return null;
};
exports.getAlertImageFromClaim = getAlertImageFromClaim;
/**
 * Obtém informações do pet do alerta (quando disponível)
 */
const getPetFromClaim = (claim) => {
    if (claim.alertType === 'LOST' && claim.lostAlert?.pet) {
        return claim.lostAlert.pet;
    }
    return null;
};
exports.getPetFromClaim = getPetFromClaim;
