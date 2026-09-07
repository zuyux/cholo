import { describe, expect, it } from 'vitest';
import { getRewardCallbackMessage, X_ACCOUNT_ALREADY_LINKED } from './rewardErrors';

describe('reward callback messages', () => {
  it('explains when an X account belongs to another wallet', () => {
    expect(getRewardCallbackMessage(X_ACCOUNT_ALREADY_LINKED)).toContain('otra billetera CHOLO');
  });

  it('supports existing duplicate-account redirect URLs', () => {
    expect(getRewardCallbackMessage('Supabase rewards: duplicate key value violates unique constraint "reward_claims_x_user_id_key"'))
      .toBe(getRewardCallbackMessage(X_ACCOUNT_ALREADY_LINKED));
  });

  it('does not expose unexpected provider or database errors', () => {
    const message = getRewardCallbackMessage('Supabase rewards: private database details');
    expect(message).toContain('Vuelve a autenticar');
    expect(message).not.toContain('Supabase');
    expect(message).not.toContain('private database details');
  });
});
