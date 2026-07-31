import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { decryptRewardToken, encryptRewardToken } from './rewardTokenEncryption';

describe('reward token encryption', () => {
  const previousKey = process.env.REWARD_TOKEN_ENCRYPTION_KEY;

  beforeEach(() => { process.env.REWARD_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64'); });
  afterEach(() => {
    if (previousKey === undefined) delete process.env.REWARD_TOKEN_ENCRYPTION_KEY;
    else process.env.REWARD_TOKEN_ENCRYPTION_KEY = previousKey;
  });

  it('round-trips without storing plaintext', () => {
    const encrypted = encryptRewardToken('secret-access-token');
    expect(encrypted).toMatch(/^enc:v1:/);
    expect(encrypted).not.toContain('secret-access-token');
    expect(decryptRewardToken(encrypted)).toBe('secret-access-token');
  });

  it('temporarily reads legacy plaintext tokens', () => {
    expect(decryptRewardToken('legacy-token')).toBe('legacy-token');
  });
});
