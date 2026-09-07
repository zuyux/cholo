import { isRewardEligible, REWARD_TERMS_VERSION } from '@/lib/rewardEligibility';
import { createHash, randomBytes } from 'crypto';
import { RewardAccountAlreadyLinkedError } from '@/lib/rewardErrors';
import { supabaseAdmin } from '@/lib/supabaseClient';
import type { RewardClaimStatus } from '@/lib/rewardEvents';
import { decryptRewardToken, encryptRewardToken, isEncryptedRewardToken } from '@/lib/rewardTokenEncryption';

export const X_SCOPES = 'tweet.read users.read';
export const CHOLO_X_USERNAME = process.env.X_CHOLO_USERNAME || 'cholocoinmeme';
export const CHOLO_X_USER_ID = process.env.X_CHOLO_USER_ID || '1945221268137009152';
export { REWARD_TERMS_VERSION } from '@/lib/rewardEligibility';
const REWARD_COLUMNS = 'address,instagram_connected,instagram_username,x_user_id,x_username,x_access_token,x_refresh_token,x_token_expires_at,x_connected,x_following,claimed,terms_accepted_at,terms_version';

export type RewardRow = {
  address: string;
  instagram_connected?: boolean; instagram_username?: string | null;
  x_user_id: string | null; x_username: string | null; x_access_token: string | null;
  x_refresh_token: string | null; x_token_expires_at: string | null;
  x_connected: boolean; x_following: boolean; claimed: boolean;
  terms_accepted_at: string | null; terms_version: string | null;
};

export function toStatus(row: Partial<RewardRow> | null): RewardClaimStatus {
  return {
    instagram: { connected: !!row?.instagram_connected, username: row?.instagram_username || undefined },
    x: { connected: !!row?.x_connected, following: !!row?.x_following, username: row?.x_username || undefined },
    eligible: isRewardEligible(row),
    claimed: !!row?.claimed,
    termsAccepted: !!row?.terms_accepted_at && row.terms_version === REWARD_TERMS_VERSION,
  };
}

export async function getReward(address: string) {
  const { data, error } = await supabaseAdmin.from('reward_claims').select(REWARD_COLUMNS).eq('address', address).maybeSingle();
  if (error) throw new Error(`Supabase rewards: ${error.message}`);
  if (!data) return null;
  const row = data as RewardRow;
  const encryptedLegacyTokens: Record<string, string> = {};
  if (row.x_access_token && !isEncryptedRewardToken(row.x_access_token)) encryptedLegacyTokens.x_access_token = encryptRewardToken(row.x_access_token);
  if (row.x_refresh_token && !isEncryptedRewardToken(row.x_refresh_token)) encryptedLegacyTokens.x_refresh_token = encryptRewardToken(row.x_refresh_token);
  if (Object.keys(encryptedLegacyTokens).length) {
    const { error: migrationError } = await supabaseAdmin.from('reward_claims').update(encryptedLegacyTokens).eq('address', address);
    if (migrationError) throw new Error(`Supabase rewards token migration: ${migrationError.message}`);
  }
  return {
    ...row,
    x_access_token: decryptRewardToken(row.x_access_token),
    x_refresh_token: decryptRewardToken(row.x_refresh_token),
  };
}

export async function saveReward(address: string, values: Record<string, unknown>) {
  const protectedValues = { ...values };
  if (typeof protectedValues.x_access_token === 'string') protectedValues.x_access_token = encryptRewardToken(protectedValues.x_access_token);
  if (typeof protectedValues.x_refresh_token === 'string') protectedValues.x_refresh_token = encryptRewardToken(protectedValues.x_refresh_token);
  const { data, error } = await supabaseAdmin.from('reward_claims').upsert({ address, ...protectedValues, updated_at: new Date().toISOString() }, { onConflict: 'address' }).select(REWARD_COLUMNS).single();
  if (error?.code === '23505') {
    if (error.message.includes('reward_claims_x_user_id_key')) throw new RewardAccountAlreadyLinkedError();
    if (error.message.includes('reward_claims_instagram_user_id_key')) throw new RewardAccountAlreadyLinkedError('instagram');
  }
  if (error) throw new Error(`Supabase rewards: ${error.message}`);
  const row = data as RewardRow;
  return {
    ...row,
    x_access_token: decryptRewardToken(row.x_access_token),
    x_refresh_token: decryptRewardToken(row.x_refresh_token),
  };
}

export function createPkce() {
  const verifier = randomBytes(48).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge, state: randomBytes(24).toString('base64url') };
}

export function xClientConfig() {
  const clientId = process.env.X_CLIENT_ID;
  const clientSecret = process.env.X_CLIENT_SECRET;
  const redirectUri = process.env.X_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) throw new Error('Faltan X_CLIENT_ID, X_CLIENT_SECRET o X_REDIRECT_URI');
  return { clientId, clientSecret, redirectUri };
}
