import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { RewardAccountAlreadyLinkedError } from './rewardErrors';

const mocks = vi.hoisted(() => ({ saveReward: vi.fn(), requireAddress: vi.fn() }));
vi.mock('@/lib/rewardService', () => ({ saveReward: mocks.saveReward }));
vi.mock('@/lib/rewardAuth', () => ({ requireRewardAddress: mocks.requireAddress }));
vi.mock('@/lib/instagramAuth', () => ({ instagramClientConfig: () => ({ clientId: 'test', clientSecret: 'test', redirectUri: 'https://cholo.test/callback' }) }));
vi.mock('@/lib/rewardErrors', async () => await import('./rewardErrors'));
import { GET } from '../app/api/rewards/connect/instagram/callback/route';
import { POST as claim } from '../app/api/rewards/claim/route';
import { POST as follow } from '../app/api/rewards/follow/x/route';

function request(state = 'state', returnTo = 'https://cholo.test/welcome') {
  const session = Buffer.from(JSON.stringify({ address: 'ST123', state: 'state', returnTo })).toString('base64url');
  return new NextRequest(`https://cholo.test/api/rewards/connect/instagram/callback?code=test&state=${state}`, { headers: { cookie: `cholo_instagram_oauth=${session}` } });
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireAddress.mockReturnValue('ST123');
  vi.stubGlobal('fetch', vi.fn()
    .mockResolvedValueOnce(Response.json({ access_token: 'secret-token' }))
    .mockResolvedValueOnce(Response.json({ user_id: '12345', username: 'creator' })));
});

describe('Instagram reward authentication', () => {
  it('stores a verified identity without retaining tokens or approving rewards', async () => {
    const response = await GET(request());
    expect(mocks.saveReward).toHaveBeenCalledWith('ST123', { instagram_user_id: '12345', instagram_username: 'creator', instagram_connected: true });
    expect(response.headers.get('location')).toBe('https://cholo.test/welcome?rewardInstagramConnected=true');
    expect(response.cookies.get('cholo_instagram_oauth')?.value).toBe('');
  });
  it('rejects invalid OAuth state without contacting Instagram', async () => {
    await GET(request('wrong'));
    expect(fetch).not.toHaveBeenCalled();
    expect(mocks.saveReward).not.toHaveBeenCalled();
  });
  it('rejects a different wallet session', async () => {
    mocks.requireAddress.mockReturnValue('ST456');
    await GET(request());
    expect(fetch).not.toHaveBeenCalled();
    expect(mocks.saveReward).not.toHaveBeenCalled();
  });
  it('returns an account-link conflict to the modal', async () => {
    mocks.saveReward.mockRejectedValue(new RewardAccountAlreadyLinkedError('instagram'));
    const response = await GET(request());
    expect(response.headers.get('location')).toContain('rewardError=instagram_account_already_linked');
  });
  it('never redirects to an external return URL', async () => {
    const response = await GET(request('state', 'https://other.test/'));
    expect(new URL(response.headers.get('location')!).origin).toBe('https://cholo.test');
  });
  it('keeps the old automatic actions disabled', async () => {
    expect((await claim()).status).toBe(410);
    expect((await follow()).status).toBe(410);
    expect(mocks.saveReward).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
});
