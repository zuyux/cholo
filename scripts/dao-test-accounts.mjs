import { loadEnvFile } from 'node:process';
import { getAddressFromPrivateKey } from '@stacks/transactions';

// Node-only test helper. Never import this module into application code.
export function loadDaoTestAccounts() {
  loadEnvFile('.env.local');
  const accounts = [1, 2, 3, 4].map((index) => {
    const address = process.env[`CHOLO_TESTNET_ADDRESS_${index}`];
    const privateKey = process.env[`CHOLO_TESTNET_PRIVATE_KEY_${index}`];
    if (!address || !privateKey || !address.startsWith('ST')) throw new Error(`Testnet account ${index} is missing or invalid.`);
    let valid = false;
    try { valid = getAddressFromPrivateKey(privateKey, 'testnet') === address; } catch { /* Do not expose key parsing errors. */ }
    if (!valid) throw new Error(`Testnet account ${index} does not match its configured key.`);
    return { index, address, privateKey };
  });
  if (new Set(accounts.map((account) => account.address)).size !== 4) throw new Error('Configure four distinct testnet accounts.');
  return accounts;
}
