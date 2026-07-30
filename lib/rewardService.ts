import { createHash, randomBytes } from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseClient';
import type { RewardClaimStatus } from '@/lib/rewardEvents';

export const X_SCOPES = 'tweet.read users.read follows.read follows.write offline.access';
export const CHOLO_X_USERNAME = process.env.X_CHOLO_USERNAME || 'cholocoinmeme';

type RewardRow = {
  address: string;
  x_user_id: string | null; x_username: string | null; x_access_token: string | null;
  x_refresh_token: string | null; x_token_expires_at: string | null;
  x_connected: boolean; x_following: boolean; claimed: boolean;
};

export function toStatus(row: Partial<RewardRow> | null): RewardClaimStatus {
  return {
    x: { connected: !!row?.x_connected, following: !!row?.x_following, username: row?.x_username || undefined },
    eligible: !!row?.x_following,
    claimed: !!row?.claimed,
  };
}

export async function getReward(address: string) {
  const { data, error } = await supabaseAdmin.from('reward_claims').select('*').eq('address', address).maybeSingle();
  if (error) throw new Error(`Supabase rewards: ${error.message}`);
  return data as RewardRow | null;
}

export async function saveReward(address: string, values: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin.from('reward_claims').upsert({ address, ...values, updated_at: new Date().toISOString() }, { onConflict: 'address' }).select('*').single();
  if (error) throw new Error(`Supabase rewards: ${error.message}`);
  return data as RewardRow;
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
