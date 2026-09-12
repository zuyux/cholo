import { getAddressFromPublicKey, validateStacksAddress } from '@stacks/transactions';
import { verifyMessageSignatureRsv } from '@stacks/encryption';
import { inferNetworkFromAddress } from './network';

// The address comes from the server-signed challenge, never from a client network override.
export function verifyStacksWalletProof(proof: { address: string; message: string; signature: string; publicKey: string }): boolean {
  const network = inferNetworkFromAddress(proof.address);
  if (!network || !validateStacksAddress(proof.address)) return false;
  try {
    return verifyMessageSignatureRsv(proof) && getAddressFromPublicKey(proof.publicKey, network) === proof.address;
  } catch { return false; }
}
