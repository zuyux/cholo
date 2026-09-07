export const REWARD_TERMS_VERSION = '2026-09-05';

export function isRewardEligible(row: {
  x_connected?: boolean;
  instagram_connected?: boolean;
  terms_accepted_at?: string | null;
  terms_version?: string | null;
} | null): boolean {
  return !!(row?.terms_accepted_at && row.terms_version === REWARD_TERMS_VERSION && (row.x_connected || row.instagram_connected));
}
