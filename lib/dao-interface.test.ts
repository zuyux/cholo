import { afterEach, describe, expect, it, vi } from 'vitest';
import { DAO_CONTRACT, DAO_ADDRESS, type DaoProposal, type DaoState } from './cholo-dao';
import { loadTreasuryActivity, matchesProposal, proposalReview } from './dao-interface';

const state: DaoState = { height: '105', balance: '9000000', signerCount: '2', required: '2', configuredRequired: '0', delay: '10', nextId: '20', signers: [DAO_ADDRESS], proposals: [], tokens: {}, tokenErrors: {} };
const proposal: DaoProposal = { id: '0', recipient: DAO_ADDRESS, amount: '1000000', approvals: '1', executed: false, 'proposal-type': 'transfer', 'new-signer': null, 'old-signer': null, token: null, description: 'Pago', expiration: '300', created: '100', 'new-required': null, 'new-delay': null, hasApproved: false };
afterEach(() => vi.unstubAllGlobals());
describe('proposal views', () => {
  it('personalizes approval work and excludes already approved and terminal proposals', () => {
    expect(matchesProposal(proposal, state, DAO_ADDRESS, 'approval')).toBe(true);
    expect(matchesProposal(proposal, state, null, 'approval')).toBe(false);
    expect(matchesProposal({ ...proposal, hasApproved: true }, state, DAO_ADDRESS, 'approval')).toBe(false);
    expect(matchesProposal({ ...proposal, executed: true }, state, DAO_ADDRESS, 'attention')).toBe(false);
    expect(matchesProposal({ ...proposal, expiration: '100' }, state, DAO_ADDRESS, 'attention')).toBe(false);
  });
  it('requires both quorum and delay for ready and includes expiry at the boundary', () => {
    const approved = { ...proposal, approvals: '2' };
    expect(matchesProposal(approved, state, null, 'ready')).toBe(false);
    expect(matchesProposal(approved, { ...state, height: '110' }, null, 'ready')).toBe(true);
    expect(matchesProposal({ ...proposal, expiration: '249' }, state, null, 'expiring')).toBe(true);
    expect(matchesProposal({ ...proposal, expiration: '250' }, state, null, 'expiring')).toBe(false);
  });
  it('shows exact transfer details and current governance changes', () => {
    expect(proposalReview(proposal, state).join(' ')).toContain(`Enviar 1.000000 STX a ${DAO_ADDRESS}`);
    expect(proposalReview({ ...proposal, 'proposal-type': 'set-required-sigs', 'new-required': '1' }, state).join(' ')).toContain('2 (automático) → 1 (fijo)');
    expect(proposalReview({ ...proposal, 'proposal-type': 'replace-signer', 'old-signer': 'old', 'new-signer': 'new' }, state).join(' ')).toContain('old → new');
  });
});
describe('shared treasury history', () => {
  it('uses actual asset event payloads, excludes unrelated events, and paginates by raw events', async () => {
    const event = { event_index: 0, tx_id: '0xabc', event_type: 'stx_asset', asset: { asset_event_type: 'transfer', sender: DAO_ADDRESS, recipient: DAO_CONTRACT, amount: '1' } };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ total: 100, results: [event, { ...event, event_type: 'non_fungible_token_asset' }, { ...event, asset: { ...event.asset, recipient: DAO_ADDRESS } }] }) }));
    const data = await loadTreasuryActivity(50);
    expect(data.events).toEqual([event]);
    expect(data.nextOffset).toBe(53);
  });
  it('reports API failure instead of an empty history', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429 }));
    await expect(loadTreasuryActivity()).rejects.toThrow('429');
  });
});
