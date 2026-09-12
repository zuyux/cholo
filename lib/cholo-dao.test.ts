import { readFileSync } from 'node:fs';
import { describe, expect, it, afterEach, vi } from 'vitest';
import { getSDK } from '@hirosystems/clarinet-sdk';
import { cvToString, uintCV, noneCV, principalCV, someCV, tupleCV, stringAsciiCV, cvToHex, type ClarityAbi } from '@stacks/transactions';
import { executionBlockers, parseDaoTokenAmount, formatDaoTokenAmount, validateDaoTokenAbi, getDaoToken, loadDaoApprovals, restoreDaoTransactions, updateDaoTransaction, buildProposalArgs, parseDaoStx, mainnetPrincipal, proposalStatus, executionPostConditions, loadDaoState, DAO_ADDRESS, DAO_CONTRACT, type DaoState, type DaoProposal, type ProposalInput } from './cholo-dao';

const newSigner = 'SP2PABAF9FTAJYNFZH93XENAJ8FVY99RRM50D2JG9';
const state: DaoState = { height: '100', balance: '0', signerCount: '1', required: '1', delay: '10', nextId: '0', configuredRequired: '0', tokens: {}, tokenErrors: {}, signers: [DAO_ADDRESS], proposals: [] };
const input: ProposalInput = { type: 'replace-signer', recipient: '', amount: '', newSigner, oldSigner: DAO_ADDRESS, token: '', description: 'Replace signer zero', ttl: '100', setting: '' };
const proposal: DaoProposal = { id: '0', recipient: DAO_ADDRESS, amount: '1', approvals: '1', executed: false, 'proposal-type': 'replace-signer', 'new-signer': newSigner, 'old-signer': DAO_ADDRESS, token: null, description: input.description, expiration: '200', created: '100', 'new-required': null, 'new-delay': null, hasApproved: false };

afterEach(() => vi.unstubAllGlobals());

describe('DAO transaction arguments and eligibility', () => {
  it('preserves micro-STX and large integer precision', () => {
    expect(parseDaoStx('0.000001')).toBe(BigInt(1));
    expect(parseDaoStx('9007199254740993.123456').toString()).toBe('9007199254740993123456');
  });
  it.each(['0', '-1', '1e3', '0.0000001', 'NaN', ''])('rejects invalid deposit %s', (value) => expect(() => parseDaoStx(value)).toThrow());
  it('rejects testnet addresses instead of silently converting signer identity', () => {
    expect(() => mainnetPrincipal('ST1N4FTM6XK4FS4KQGZBTJY70F4CR36WQES9Y5D0T')).toThrow();
    expect(() => mainnetPrincipal(newSigner)).not.toThrow();
  });
  it('matches all ten create-proposal ABI arguments', () => {
    expect(buildProposalArgs(input, state).map((value) => cvToString(value))).toEqual([
      DAO_ADDRESS, 'u0', '"replace-signer"', `(some ${newSigner})`, `(some ${DAO_ADDRESS})`, 'none', 'u"Replace signer zero"', 'u200', 'none', 'none',
    ]);
  });
  it.each(['9', '10001'])('rejects invalid TTL %s', (ttl) => expect(() => buildProposalArgs({ ...input, ttl }, state)).toThrow());
  it('rejects nonexistent old signers, duplicates and impossible quorum', () => {
    expect(() => buildProposalArgs({ ...input, oldSigner: newSigner }, state)).toThrow();
    expect(() => buildProposalArgs({ ...input, newSigner: DAO_ADDRESS }, state)).toThrow();
    expect(() => buildProposalArgs({ ...input, type: 'set-required-sigs', setting: '2' }, state)).toThrow();
    expect(() => buildProposalArgs({ ...input, type: 'remove-signer' }, state)).toThrow();
  });
  it('allows zero execution delay but not zero quorum', () => {
    expect(cvToString(buildProposalArgs({ ...input, type: 'set-exec-delay', setting: '0' }, state)[9])).toBe('(some u0)');
    expect(() => buildProposalArgs({ ...input, type: 'set-required-sigs', setting: '0' }, state)).toThrow();
  });
  it('rejects proposals that expire before they can execute', () => {
    expect(() => buildProposalArgs({ ...input, ttl: '10' }, state)).toThrow();
    expect(() => buildProposalArgs({ ...input, type: 'add-signer', ttl: '10' }, state)).not.toThrow();
  });
  it('encodes STX amounts as micro-STX and token amounts as raw units', () => {
    const stx = buildProposalArgs({ ...input, type: 'transfer', recipient: newSigner, amount: '1.234567' }, state);
    expect(cvToString(stx[1])).toBe('u1234567');
    const token = buildProposalArgs({ ...input, type: 'token-transfer', recipient: newSigner, amount: '123456789', token: `${DAO_ADDRESS}.token` }, state);
    expect(cvToString(token[1])).toBe('u123456789');
    expect(cvToString(token[5])).toBe(`(some ${DAO_ADDRESS}.token)`);
    expect(() => buildProposalArgs({ ...input, type: 'token-transfer', recipient: newSigner, amount: '1', token: newSigner }, state)).toThrow();
  });
  it('uses creation height, current quorum, exact expiry and the bootstrap exception', () => {
    expect(proposalStatus(proposal, state).ready).toBe(false);
    expect(proposalStatus(proposal, { ...state, height: '110' }).ready).toBe(true);
    expect(proposalStatus(proposal, { ...state, height: '200' }).expired).toBe(true);
    expect(proposalStatus(proposal, { ...state, height: '110', required: '2' }).ready).toBe(false);
    expect(proposalStatus({ ...proposal, 'proposal-type': 'add-signer' }, state).ready).toBe(true);
    expect(proposalStatus({ ...proposal, executed: true }, { ...state, height: '110' }).ready).toBe(false);
  });
  it('restricts treasury outflows to the exact proposed asset and amount', () => {
    expect(executionPostConditions(proposal)).toEqual([]);
    expect(executionPostConditions({ ...proposal, 'proposal-type': 'transfer' })).toEqual([{ type: 'stx-postcondition', address: DAO_CONTRACT, condition: 'eq', amount: '1' }]);
    const tokenProposal = { ...proposal, 'proposal-type': 'token-transfer' as const, token: `${DAO_ADDRESS}.token` };
    expect(() => executionPostConditions(tokenProposal)).toThrow();
    expect(executionPostConditions(tokenProposal, 'test-token')[0]).toMatchObject({ amount: '1', asset: `${DAO_ADDRESS}.token::test-token`, address: DAO_CONTRACT });
  });
  it('fails closed on API failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 429 })));
    await expect(loadDaoState(null)).rejects.toThrow('429');
  });
});

it('executes the UI-generated signer replacement against the deployed Clarity source', async () => {
  const simnet = await getSDK();
  await simnet.initEmptySession(null);
  simnet.setEpoch('2.5');
  const source = readFileSync(new URL('./fixtures/cholo-dao.clar', import.meta.url), 'utf8');
  simnet.deployContract('cholo-dao', source, { clarityVersion: 2 }, DAO_ADDRESS);
  const contract = `${DAO_ADDRESS}.cholo-dao`;
  const result = simnet.callPublicFn(contract, 'create-proposal', buildProposalArgs({ ...input, ttl: '1000' }, { ...state, height: String(simnet.blockHeight) }), DAO_ADDRESS);
  expect(cvToString(result.result)).toBe('(ok u0)');
  expect(cvToString(simnet.callPublicFn(contract, 'approve-proposal', [uintCV(0)], newSigner).result)).toBe('(err u100)');
  expect(cvToString(simnet.callPublicFn(contract, 'approve-proposal', [uintCV(0)], DAO_ADDRESS).result)).toBe('(ok true)');
  expect(cvToString(simnet.callPublicFn(contract, 'execute-proposal', [uintCV(0), noneCV()], DAO_ADDRESS).result)).toBe('(err u107)');
  simnet.mineEmptyBlocks(10);
  expect(cvToString(simnet.callPublicFn(contract, 'execute-proposal', [uintCV(0), noneCV()], DAO_ADDRESS).result)).toBe('(ok true)');
  expect(cvToString(simnet.callReadOnlyFn(contract, 'get-signer', [uintCV(0)], DAO_ADDRESS).result)).toBe(`(some ${newSigner})`);
  expect(cvToString(simnet.callReadOnlyFn(contract, 'is-signer', [principalCV(DAO_ADDRESS)], DAO_ADDRESS).result)).toBe('false');
}, 30000);

describe('governance execution safeguards', () => {
  const members = [DAO_ADDRESS, newSigner, 'ST36HHQ5RHSXDHZBWG3W1HWTEPCBZSCX6F12R994M'];
  const fixed = { ...state, height: '110', configuredRequired: '2', required: '2', signerCount: '3', signers: members };
  const removal = { ...proposal, 'proposal-type': 'remove-signer' as const, approvals: '2' };
  it('rechecks pending removals against the remaining signer count', () => {
    expect(executionBlockers(removal, fixed)).toEqual([]);
    const changed = { ...fixed, signerCount: '2', signers: members.slice(0, 2) };
    expect(proposalStatus(removal, changed).ready).toBe(false);
    expect(executionBlockers(removal, changed)[0]).toContain('insuficientes');
    expect(executionBlockers(removal, { ...changed, configuredRequired: '0' })).toEqual([]);
    expect(() => buildProposalArgs({ ...input, type: 'remove-signer' }, { ...changed, configuredRequired: '0' })).not.toThrow();
  });
  it('blocks obsolete membership and quorum proposals', () => {
    expect(executionBlockers(proposal, fixed)[0]).toContain('ya pertenece');
    expect(executionBlockers({ ...removal, 'old-signer': 'missing' }, fixed)[0]).toContain('ya no pertenece');
    expect(executionBlockers({ ...proposal, 'proposal-type': 'set-required-sigs', 'new-required': '4' }, fixed)).toHaveLength(1);
  });
  it.each(['10000', '10001', '340282366920938463463374607431768211455'])('rejects dangerous delay %s at creation and execution', (setting) => {
    expect(() => buildProposalArgs({ ...input, type: 'set-exec-delay', setting }, state)).toThrow('9999');
    expect(executionBlockers({ ...proposal, 'proposal-type': 'set-exec-delay', 'new-delay': setting }, state)).toHaveLength(1);
  });
  it('accepts a delay below maximum TTL and reports remaining tenures', () => {
    expect(() => buildProposalArgs({ ...input, type: 'set-exec-delay', setting: '9999' }, state)).not.toThrow();
    expect(proposalStatus(proposal, state).remaining).toBe('10');
  });
  it('blocks insufficient or unverified treasury assets', () => {
    expect(executionBlockers({ ...proposal, 'proposal-type': 'transfer' }, state)[0]).toContain('STX');
    const tokenProposal = { ...proposal, 'proposal-type': 'token-transfer' as const, token: `${DAO_ADDRESS}.token`, amount: '20' };
    expect(executionBlockers(tokenProposal, state)[0]).toContain('verificar');
    const funded = { ...state, tokens: { [tokenProposal.token]: { contract: tokenProposal.token, asset: 'coin', decimals: 6, symbol: 'COIN', balance: '20' } } };
    expect(executionBlockers(tokenProposal, funded)).toEqual([]);
    expect(executionBlockers({ ...tokenProposal, amount: '21' }, funded)[0]).toContain('COIN');
  });
});

const tokenAbi = {
  functions: [
    { name: 'transfer', access: 'public', args: ['uint128', 'principal', 'principal', { optional: { buffer: { length: 34 } } }].map((type, index) => ({ name: String(index), type })), outputs: { type: { response: { ok: 'bool', error: 'uint128' } } } },
    ...['get-symbol', 'get-decimals', 'get-balance'].map((name) => ({ name, access: 'read_only', args: [], outputs: { type: 'uint128' } })),
  ], fungible_tokens: [{ name: 'coin' }],
} as ClarityAbi;

describe('human-readable token transfers', () => {
  it('round-trips precise amounts without floating point', () => {
    const raw = parseDaoTokenAmount('9007199254740993.123456', 6);
    expect(raw).toBe('9007199254740993123456');
    expect(formatDaoTokenAmount(raw, 6)).toBe('9007199254740993.123456');
    expect(parseDaoTokenAmount('1', 0)).toBe('1');
    expect(parseDaoTokenAmount('0.000001', 6)).toBe('1');
    expect(formatDaoTokenAmount('1', 6)).toBe('0.000001');
  });
  it.each(['0', '-1', '1e6', '1.0000001', 'NaN'])('rejects invalid amount %s', (value) => {
    expect(() => parseDaoTokenAmount(value, 6)).toThrow();
  });
  it('rejects unsupported precision and incompatible contracts before proposal creation', () => {
    expect(() => parseDaoTokenAmount('1', 39)).toThrow();
    expect(validateDaoTokenAbi(tokenAbi)).toBe('coin');
    expect(() => validateDaoTokenAbi({ ...tokenAbi, functions: [] })).toThrow('transfer');
    expect(() => validateDaoTokenAbi({ ...tokenAbi, fungible_tokens: [{ name: 'a' }, { name: 'b' }] })).toThrow('único');
  });
  it('reads verified metadata and the treasury balance from the token contract', async () => {
    const fetchMock = vi.fn().mockImplementation(async (path: string, init?: RequestInit) => {
      if (path.includes('/interface/')) return Response.json(tokenAbi);
      const value = path.endsWith('get-symbol') ? '0x070d00000004434f494e' : path.endsWith('get-decimals') ? '0x070100000000000000000000000000000006' : '0x070100000000000000000000000000000014';
      if (path.endsWith('get-balance')) expect(JSON.parse(String(init?.body)).arguments).toEqual([cvToHex(principalCV(DAO_CONTRACT))]);
      return Response.json({ okay: true, result: value });
    });
    vi.stubGlobal('fetch', fetchMock);
    expect(await getDaoToken(`${DAO_ADDRESS}.token`)).toMatchObject({ symbol: 'COIN', decimals: 6, balance: '20', asset: 'coin' });
  });
});

describe('durable transaction tracking and approval history', () => {
  const tx = { txid: `0x${'a'.repeat(64)}`, action: 'create-proposal', status: 'pending', detail: 'Pending' };
  it('restores pending transactions and rejects malformed storage', () => {
    expect(restoreDaoTransactions(JSON.stringify([tx]))).toEqual([tx]);
    expect(restoreDaoTransactions('{')).toEqual([]);
    expect(restoreDaoTransactions(JSON.stringify([{ ...tx, txid: 'javascript:alert(1)' }, null, {}]))).toEqual([]);
  });
  it('extracts the created proposal ID from the confirmed result', () => {
    expect(updateDaoTransaction(tx, { tx_status: 'success', tx_result: { repr: '(ok u42)' } })).toMatchObject({ status: 'success', proposalId: '42' });
  });
  it('explains DAO errors and does not mislabel token errors', () => {
    expect(updateDaoTransaction(tx, { tx_status: 'abort_by_response', tx_result: { repr: '(err u105)' } }).detail).toContain('expiró');
    expect(updateDaoTransaction({ ...tx, action: 'execute-proposal' }, { tx_status: 'abort_by_response', tx_result: { repr: '(err u105)' }, contract_call: { function_name: 'execute-proposal', function_args: [{ repr: 'u0' }, { repr: '(some token)' }] } }).detail).toContain('(err u105)');
    expect(updateDaoTransaction(tx, { tx_status: 'abort_by_post_condition' }).detail).toContain('movimientos');
    expect(updateDaoTransaction(tx, { tx_status: 'dropped_replace_by_fee' }).status).not.toBe('pending');
  });
  it('reads former signers from paginated approval events, excluding other proposals', async () => {
    const event = (id: number) => ({ tx_id: tx.txid, contract_log: { contract_id: DAO_CONTRACT, value: { hex: cvToHex(tupleCV({ event: stringAsciiCV('proposal-approved'), id: uintCV(id), by: principalCV(newSigner) })) } } });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ results: [event(0), event(1)] })));
    expect(await loadDaoApprovals('0')).toEqual({ approvals: [{ address: newSigner, txid: tx.txid }], nextOffset: null });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ results: Array.from({ length: 50 }, () => event(1)) })));
    expect(await loadDaoApprovals('0')).toEqual({ approvals: [], nextOffset: 50 });
  });
});

it('executes a human-readable token proposal against the deployed DAO source', async () => {
  const simnet = await getSDK();
  await simnet.initEmptySession(null);
  simnet.setEpoch('2.5');
  simnet.deployContract('cholo-dao', readFileSync(new URL('./fixtures/cholo-dao.clar', import.meta.url), 'utf8'), { clarityVersion: 2 }, DAO_ADDRESS);
  simnet.deployContract('test-token', `
    (define-fungible-token coin)
    (define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
      (begin (asserts! (is-eq tx-sender sender) (err u100)) (ft-transfer? coin amount sender recipient)))
    (begin (try! (ft-mint? coin u2000000 '${DAO_CONTRACT})) (ok true))
  `, { clarityVersion: 2 }, DAO_ADDRESS);
  const args = buildProposalArgs({ ...input, type: 'token-transfer', token: `${DAO_ADDRESS}.test-token`, recipient: newSigner, amount: parseDaoTokenAmount('1.234567', 6), ttl: '1000' }, { ...state, height: String(simnet.blockHeight) });
  expect(cvToString(simnet.callPublicFn(DAO_CONTRACT, 'create-proposal', args, DAO_ADDRESS).result)).toBe('(ok u0)');
  expect(cvToString(simnet.callPublicFn(DAO_CONTRACT, 'approve-proposal', [uintCV(0)], DAO_ADDRESS).result)).toBe('(ok true)');
  simnet.mineEmptyBlocks(10);
  expect(cvToString(simnet.callPublicFn(DAO_CONTRACT, 'execute-proposal', [uintCV(0), someCV(principalCV(`${DAO_ADDRESS}.test-token`))], newSigner).result)).toBe('(ok true)');
  expect(simnet.getAssetsMap().get(`.test-token.coin`)?.get(newSigner)).toBe(BigInt(1234567));
}, 30000);

it('reads per-signer approval flags directly and fails closed on invalid responses', async () => {
  const { loadDaoSignerApprovals } = await import('./cholo-dao');
  const fetchMock = vi.fn().mockImplementation(async (_url: string, init: RequestInit) => {
    const args = JSON.parse(String(init.body)).arguments;
    expect(args[0]).toBe(cvToHex(uintCV(4)));
    return Response.json({ okay: true, result: args[1] === cvToHex(principalCV(DAO_ADDRESS)) ? '0x03' : '0x04' });
  });
  vi.stubGlobal('fetch', fetchMock);
  expect(await loadDaoSignerApprovals('4', [DAO_ADDRESS, newSigner])).toEqual({ [DAO_ADDRESS]: true, [newSigner]: false });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ okay: true, result: cvToHex(uintCV(1)) })));
  await expect(loadDaoSignerApprovals('4', [DAO_ADDRESS])).rejects.toThrow('verificar');
});
