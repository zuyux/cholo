import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getSDK } from '@hirosystems/clarinet-sdk';
import { cvToString, uintCV, noneCV, someCV, principalCV } from '@stacks/transactions';
import { loadDaoTestAccounts } from '../scripts/dao-test-accounts.mjs';
import {
  DAO_ADDRESS, DAO_CONTRACT, buildProposalArgs, decodeDaoValue, proposalStatus,
  parseDaoTokenAmount, type DaoState, type DaoProposal, type ProposalInput,
} from './cholo-dao';

// Explicit opt-in: ordinary test runs must not load developer credentials.
describe.skipIf(process.env.RUN_DAO_ENV_TESTS !== '1')('DAO interactions with .env.local accounts', () => {
  it('exercises deposits, all seven proposal types, and approval permissions', async () => {
    const accounts = loadDaoTestAccounts();
    const [a, b, c, d] = accounts.map((account) => account.address);
    expect(a).toBe(DAO_ADDRESS);
    const simnet = await getSDK();
    await simnet.initEmptySession(null);
    simnet.setEpoch('2.5');
    expect(cvToString(simnet.deployContract('cholo-dao', readFileSync(new URL('./fixtures/cholo-dao.clar', import.meta.url), 'utf8'), { clarityVersion: 2 }, a).result)).toBe('true');
    for (const account of accounts) {
      simnet.mintSTX(account.address, BigInt(1000000));
      expect(cvToString(simnet.callPublicFn(DAO_CONTRACT, 'deposit', [uintCV(1000)], account.address).result)).toBe('(ok true)');
    }
    const read = (name: string, args: ReturnType<typeof uintCV>[] = []) => decodeDaoValue(simnet.callReadOnlyFn(DAO_CONTRACT, name, args, a).result);
    const variable = (name: string) => String(decodeDaoValue(simnet.getDataVar(DAO_CONTRACT, name)));
    function currentState(): DaoState {
      const signerCount = String(read('get-signer-count'));
      return {
        height: String(simnet.blockHeight), signerCount, required: String(read('get-required-sigs')),
        configuredRequired: variable('required-sigs'), delay: variable('execution-delay'), nextId: variable('next-id'),
        balance: String(simnet.getAssetsMap().get('STX')?.get(DAO_CONTRACT) ?? 0),
        signers: Array.from({ length: Number(signerCount) }, (_, index) => String(read('get-signer', [uintCV(index)]))),
        proposals: [], tokens: {}, tokenErrors: {},
      };
    }
    const defaults: ProposalInput = { type: 'add-signer', recipient: '', amount: '', newSigner: '', oldSigner: '', token: '', description: 'Environment account interaction test', ttl: '1000', setting: '' };
    function create(input: Partial<ProposalInput>) {
      const current = currentState();
      expect(cvToString(simnet.callPublicFn(DAO_CONTRACT, 'create-proposal', buildProposalArgs({ ...defaults, ...input }, current), a).result)).toBe(`(ok u${current.nextId})`);
      return current.nextId;
    }
    function approve(id: string, account: string) {
      return cvToString(simnet.callPublicFn(DAO_CONTRACT, 'approve-proposal', [uintCV(id)], account).result);
    }
    function execute(id: string, token?: string) {
      return cvToString(simnet.callPublicFn(DAO_CONTRACT, 'execute-proposal', [uintCV(id), token ? someCV(principalCV(token)) : noneCV()], d).result);
    }
    function pass(input: Partial<ProposalInput>) {
      const id = create(input);
      const current = currentState();
      for (const signer of current.signers.slice(0, Number(current.required))) expect(approve(id, signer)).toBe('(ok true)');
      simnet.mineEmptyBlocks(Number(current.delay));
      expect(execute(id, input.token)).toBe('(ok true)');
      return id;
    }

    expect(currentState().balance).toBe('4000');
    const bootstrap = create({ newSigner: b });
    expect(approve(bootstrap, b)).toBe('(err u100)');
    expect(approve(bootstrap, a)).toBe('(ok true)');
    expect(execute(bootstrap)).toBe('(ok true)');
    expect(currentState().signers).toEqual([a, b]);

    const third = create({ newSigner: c });
    expect(execute(third)).toBe('(err u102)');
    expect(approve(third, a)).toBe('(ok true)');
    expect(approve(third, a)).toBe('(err u103)');
    expect(approve(third, b)).toBe('(ok true)');
    expect(execute(third)).toBe('(err u107)');
    simnet.mineEmptyBlocks(10);
    expect(execute(third)).toBe('(ok true)');
    pass({ newSigner: d });
    expect(currentState().signers).toEqual([a, b, c, d]);
    expect(currentState().required).toBe('3');

    pass({ type: 'set-required-sigs', setting: '2' });
    expect(currentState().configuredRequired).toBe('2');
    const stxBefore = simnet.getAssetsMap().get('STX')!.get(d)!;
    pass({ type: 'transfer', recipient: d, amount: '0.000100' });
    expect(simnet.getAssetsMap().get('STX')!.get(d)! - stxBefore).toBe(BigInt(100));
    expect(currentState().balance).toBe('3900');

    simnet.deployContract('test-token', `
      (define-fungible-token coin)
      (define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
        (begin (asserts! (is-eq tx-sender sender) (err u100)) (ft-transfer? coin amount sender recipient)))
      (begin (try! (ft-mint? coin u2000000 '${DAO_CONTRACT})) (ok true))
    `, { clarityVersion: 2 }, a);
    pass({ type: 'token-transfer', token: `${a}.test-token`, recipient: d, amount: parseDaoTokenAmount('1.234567', 6) });
    expect(simnet.getAssetsMap().get('.test-token.coin')?.get(d)).toBe(BigInt(1234567));

    const obsoleteRemoval = create({ type: 'remove-signer', oldSigner: d });
    pass({ type: 'remove-signer', oldSigner: d });
    expect(currentState().signers).toEqual([a, b, c]);
    expect(approve(obsoleteRemoval, d)).toBe('(err u100)');
    const oldProposal = { ...read('get-proposal', [uintCV(obsoleteRemoval)]) as DaoProposal, id: obsoleteRemoval, hasApproved: false };
    expect(proposalStatus(oldProposal, currentState()).blockers[0]).toContain('ya no pertenece');
    pass({ type: 'replace-signer', oldSigner: c, newSigner: d });
    expect(currentState().signers).toEqual([a, b, d]);
    pass({ newSigner: c });
    expect(currentState().signers).toEqual([a, b, d, c]);
    pass({ type: 'set-exec-delay', setting: '0' });
    expect(currentState().delay).toBe('0');
  }, 30000);
});
