export function normalizeAuthIdentifier(identifier: string): string {
  return identifier.trim().toLowerCase();
}

export interface ConnectedAccountPayload {
  email: string;
  address: string;
  passkey: string;
  encrypted_private_key?: string | null;
  encrypted_mnemonic?: string | null;
  encryption_salt?: string | null;
  encryption_iv?: string | null;
  encryption_version?: string | null;
  wallet_label?: string | null;
  bitcoin_address?: string | null;
  rootstock_address?: string | null;
  liquid_address?: string | null;
}

export interface ConnectedAccountPayloadInput {
  email: string;
  address: string;
  passkey: string;
  encryptedWallet?: {
    encryptedMnemonic?: string | null;
    encryptedPrivateKey?: string | null;
    salt?: string | null;
    iv?: string | null;
    version?: string | null;
  };
  walletLabel?: string | null;
  bitcoinAddress?: string | null;
  rootstockAddress?: string | null;
  liquidAddress?: string | null;
}

export function buildConnectedAccountPayload(input: ConnectedAccountPayloadInput): ConnectedAccountPayload {
  return {
    email: normalizeAuthIdentifier(input.email),
    address: input.address,
    passkey: input.passkey,
    encrypted_private_key: input.encryptedWallet?.encryptedPrivateKey ?? null,
    encrypted_mnemonic: input.encryptedWallet?.encryptedMnemonic ?? null,
    encryption_salt: input.encryptedWallet?.salt ?? null,
    encryption_iv: input.encryptedWallet?.iv ?? null,
    encryption_version: input.encryptedWallet?.version ?? null,
    wallet_label: input.walletLabel ?? null,
    bitcoin_address: input.bitcoinAddress ?? null,
    rootstock_address: input.rootstockAddress ?? null,
    liquid_address: input.liquidAddress ?? null,
  };
}
