import { NextRequest, NextResponse } from 'next/server';
import { requireRewardAddress } from '@/lib/rewardAuth';
import { saveReward } from '@/lib/rewardService';
import { RewardAccountAlreadyLinkedError } from '@/lib/rewardErrors';
import { instagramClientConfig } from '@/lib/instagramAuth';

export async function GET(request: NextRequest) {
  let destination = new URL('/', request.nextUrl.origin);
  try {
    const raw = request.cookies.get('cholo_instagram_oauth')?.value;
    if (!raw) throw new Error('Instagram session expired');
    const session = JSON.parse(Buffer.from(raw, 'base64url').toString()) as { state: string; address: string; returnTo: string };
    const address = requireRewardAddress(request);
    if (address.toLowerCase() !== session.address.toLowerCase()) throw new Error('Wallet mismatch');
    const returnTo = new URL(session.returnTo, request.nextUrl.origin);
    if (returnTo.origin === request.nextUrl.origin) destination = returnTo;
    destination.searchParams.delete('rewardError');
    destination.searchParams.delete('rewardInstagramConnected');
    destination.searchParams.delete('rewardXConnected');
    const code = request.nextUrl.searchParams.get('code');
    if (!code || !session.state || request.nextUrl.searchParams.get('state') !== session.state) throw new Error('Invalid OAuth response');
    const { clientId, clientSecret, redirectUri } = instagramClientConfig();
    const tokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: 'authorization_code', redirect_uri: redirectUri, code }),
      cache: 'no-store',
    });
    const token = await tokenResponse.json();
    if (!tokenResponse.ok || !token.access_token) throw new Error('Instagram authorization failed');
    const profileResponse = await fetch('https://graph.instagram.com/me?fields=user_id,username', {
      headers: { Authorization: `Bearer ${token.access_token}` }, cache: 'no-store',
    });
    const profile = await profileResponse.json();
    if (!profileResponse.ok || !profile.user_id || !profile.username) throw new Error('Instagram profile unavailable');
    await saveReward(address, { instagram_user_id: String(profile.user_id), instagram_username: profile.username, instagram_connected: true });
    destination.searchParams.set('rewardInstagramConnected', 'true');
  } catch (error) {
    destination.searchParams.set('rewardError', error instanceof RewardAccountAlreadyLinkedError ? 'instagram_account_already_linked' : 'instagram_connection_failed');
  }
  const response = NextResponse.redirect(destination);
  response.cookies.delete('cholo_instagram_oauth');
  return response;
}
