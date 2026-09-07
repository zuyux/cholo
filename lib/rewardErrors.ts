export const X_ACCOUNT_ALREADY_LINKED = 'x_account_already_linked';

export class RewardAccountAlreadyLinkedError extends Error {
  constructor(provider: 'x' | 'instagram' = 'x') {
    super(provider === 'x' ? X_ACCOUNT_ALREADY_LINKED : 'instagram_account_already_linked');
    this.name = 'RewardAccountAlreadyLinkedError';
  }
}

export function getRewardCallbackMessage(error: string): string {
  if (error === X_ACCOUNT_ALREADY_LINKED || error.includes('reward_claims_x_user_id_key')) {
    return 'Esta cuenta de X ya está vinculada a otra billetera CHOLO. Ingresa con esa billetera o cambia de cuenta en X y vuelve a autenticar.';
  }
  if (error === 'instagram_account_already_linked') return 'Esta cuenta de Instagram ya está vinculada a otra billetera CHOLO. Ingresa con esa billetera o autentica otra cuenta de Instagram.';
  if (error === 'instagram_unavailable') return 'La autenticación de Instagram aún no está disponible. Puedes autenticar X para participar.';
  if (error.startsWith('instagram_')) return 'No se pudo autenticar Instagram. Usa una cuenta de creador o empresa e inténtalo de nuevo.';
  return 'No se pudo conectar tu cuenta de X. Vuelve a autenticar para intentarlo de nuevo.';
}
