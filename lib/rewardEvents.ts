export const OPEN_REWARD_CLAIM_EVENT = 'cholo-open-reward-claim';

export interface RewardSocialStatus {
  connected: boolean;
  following: boolean;
  username?: string;
}

export interface RewardClaimStatus {
  x: RewardSocialStatus;
  eligible: boolean;
  claimed: boolean;
}
