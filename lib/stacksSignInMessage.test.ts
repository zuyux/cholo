import { describe, expect, it, vi } from 'vitest';
import { getAddressFromPrivateKey, privateKeyToPublic, publicKeyToHex, signMessageHashRsv } from '@stacks/transactions';
import { hashMessage } from '@stacks/encryption';
import { buildCholoStacksSignInMessage, requestLeatherStacksAddress, requestLeatherStacksSignIn } from './stacksSignInMessage';
import { verifyStacksWalletProof } from './stacksWalletProof';

// Public deterministic fixture only; no local account keys loaded by these tests.
const privateKey = '1'.repeat(64) + '01';
const publicKey = publicKeyToHex(privateKeyToPublic(privateKey));
const mainnet = getAddressFromPrivateKey(privateKey, 'mainnet');
const testnet = getAddressFromPrivateKey(privateKey, 'testnet');

describe('Leather active-network connection', () => {
  it.each([mainnet, testnet])('keeps the returned account %s without forcing a network', async (address) => {
    const request = vi.fn().mockResolvedValue({ result: { addresses: [{ symbol: 'BTC', address: 'bc1qexample' }, { symbol: 'STX', address }] } });
    expect(await requestLeatherStacksAddress({ request })).toBe(address);
    expect(request).toHaveBeenCalledExactlyOnceWith('getAddresses');
  });
  it('supports flat responses and only falls back for unsupported methods', async () => {
    const request = vi.fn().mockRejectedValueOnce({ code: -32601 }).mockResolvedValueOnce({ addresses: [{ address: testnet }] });
    expect(await requestLeatherStacksAddress({ request })).toBe(testnet);
    expect(request).toHaveBeenNthCalledWith(2, 'stx_getAddresses');
  });
  it('does not reopen connection after cancellation', async () => {
    const request = vi.fn().mockRejectedValue({ code: 4001, message: 'User rejected request' });
    await expect(requestLeatherStacksAddress({ request })).rejects.toThrow('cancelled');
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('handles JSON-RPC errors without interpreting them as accounts', async () => {
    const request = vi.fn().mockResolvedValue({ error: { code: 4001, message: 'User rejected request' } });
    await expect(requestLeatherStacksAddress({ request })).rejects.toThrow('cancelled');
    expect(request).toHaveBeenCalledTimes(1);
  });
  it.each([[], [{ address: 'STinvalid' }], [{ address: mainnet }, { address: testnet }]].map((addresses) => ({ addresses })))('rejects missing, invalid, or ambiguous accounts', async ({ addresses }) => {
    await expect(requestLeatherStacksAddress({ request: vi.fn().mockResolvedValue({ result: { addresses } }) })).rejects.toThrow('single active');
  });
  it.each([[mainnet, 'mainnet'], [testnet, 'testnet']])('signs on the network of %s', async (address, network) => {
    const request = vi.fn().mockResolvedValue({ result: { signature: 'signature', publicKey } });
    await requestLeatherStacksSignIn({ request }, address, 'server challenge');
    expect(request).toHaveBeenCalledExactlyOnceWith('stx_signMessage', { message: 'server challenge', messageType: 'utf8', network });
  });
  it('labels fallback sign-in messages with the correct Stacks chain ID', () => {
    expect(buildCholoStacksSignInMessage(mainnet)).toContain('Chain ID: 1\n');
    expect(buildCholoStacksSignInMessage(testnet)).toContain('Chain ID: 2147483648\n');
  });
});

describe('server sign-in proof verification', () => {
  it.each([mainnet, testnet])('accepts a real signature bound to the challenge address %s', (address) => {
    const message = `cholo.meme reward authentication\nAddress: ${address}\nNonce: fixture`;
    const signature = signMessageHashRsv({ privateKey, messageHash: Buffer.from(hashMessage(message)).toString('hex') });
    expect(verifyStacksWalletProof({ address, message, signature, publicKey })).toBe(true);
    expect(verifyStacksWalletProof({ address, message: message + 'modified', signature, publicKey })).toBe(false);
    const anotherKey = publicKeyToHex(privateKeyToPublic('2'.repeat(64) + '01'));
    expect(verifyStacksWalletProof({ address, message, signature, publicKey: anotherKey })).toBe(false);
  });
  it('rejects malformed addresses and proofs', () => {
    expect(verifyStacksWalletProof({ address: 'STinvalid', message: 'test', signature: 'bad', publicKey })).toBe(false);
    expect(verifyStacksWalletProof({ address: testnet, message: 'test', signature: 'bad', publicKey })).toBe(false);
  });
});
