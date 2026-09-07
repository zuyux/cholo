import { describe, expect, it } from 'vitest';
import { isRewardEligible, REWARD_TERMS_VERSION } from './rewardEligibility';

const accepted = { terms_accepted_at: '2026-09-05T00:00:00Z', terms_version: REWARD_TERMS_VERSION };
describe('manual reward eligibility', () => {
  it('accepts either authenticated provider independently', () => {
    expect(isRewardEligible({ ...accepted, x_connected: true })).toBe(true);
    expect(isRewardEligible({ ...accepted, instagram_connected: true })).toBe(true);
  });
  it('requires authentication even after accepting terms', () => {
    expect(isRewardEligible(accepted)).toBe(false);
    expect(isRewardEligible(null)).toBe(false);
  });
  it('requires explicit acceptance of the current program', () => {
    expect(isRewardEligible({ x_connected: true })).toBe(false);
    expect(isRewardEligible({ ...accepted, x_connected: true, terms_version: '2026-07-30' })).toBe(false);
  });
});
