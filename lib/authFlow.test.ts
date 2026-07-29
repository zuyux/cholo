import { describe, expect, it } from 'vitest';
import { normalizeAuthIdentifier, buildConnectedAccountPayload } from './authFlow';

describe('authFlow helpers', () => {
  it('normalizes identifiers for auth lookups', () => {
    expect(normalizeAuthIdentifier('  User@Example.COM  ')).toBe('user@example.com');
    expect(normalizeAuthIdentifier('my-user')).toBe('my-user');
  });

  it('builds the connected account payload expected by Supabase', () => {
    const payload = buildConnectedAccountPayload({
      email: 'user@example.com',
      address: 'ST123',
      passkey: 'hash',
      encryptedWallet: {
        encryptedMnemonic: 'mnemonic',
        encryptedPrivateKey: 'private',
        salt: 'salt',
        iv: 'iv',
        version: '1.0.0',
      },
      walletLabel: 'My Wallet',
      bitcoinAddress: 'bc1q',
      rootstockAddress: '0xabc',
      liquidAddress: 'Liquid',
    });

    expect(payload.email).toBe('user@example.com');
    expect(payload.address).toBe('ST123');
    expect(payload.passkey).toBe('hash');
    expect(payload.encrypted_private_key).toBe('private');
    expect(payload.encrypted_mnemonic).toBe('mnemonic');
    expect(payload.encryption_salt).toBe('salt');
    expect(payload.encryption_iv).toBe('iv');
    expect(payload.encryption_version).toBe('1.0.0');
    expect(payload.wallet_label).toBe('My Wallet');
  });
});
