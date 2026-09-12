import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync } from 'node:fs';
import { makeContractCall, broadcastTransaction, uintCV } from '@stacks/transactions';
import { loadDaoTestAccounts } from './dao-test-accounts.mjs';
import { DAO_ADDRESS, DAO_CONTRACT, daoFetch, loadDaoState } from '../lib/cholo-dao.ts';

// Explicit, bounded live smoke test: 1 micro-STX per account, 2000 micro-STX fee each.
// No live proposals or governance changes. Re-running resumes the existing journal.
const journalPath = '.dao-test-results/testnet-deposits.json';
const fee = 2000n;
const amount = 1n;
const broadcast = process.argv.includes('--broadcast');
const resume = process.argv.includes('--resume');
const accounts = loadDaoTestAccounts();
const state = await loadDaoState(null);
for (const account of accounts) {
  if (!state.signers.includes(account.address)) throw new Error(`Account ${account.index} is not a current DAO signer.`);
  const balance = await daoFetch(`/extended/v1/address/${account.address}/stx`);
  if (BigInt(balance.balance) - BigInt(balance.locked ?? '0') < fee + amount) throw new Error(`Account ${account.index} has insufficient testnet STX.`);
  console.log(`Account ${account.index}: key verified, current signer, funded.`);
}
if (!broadcast && !resume) {
  console.log('Preflight passed. Use --broadcast to send four 0.000001 STX deposits (total fee cap: 0.008 STX), or --resume to monitor an existing run.');
  process.exit(0);
}
const source = await daoFetch(`/v2/contracts/source/${DAO_ADDRESS}/cholo-dao?proof=0`);
if (source.source !== readFileSync('lib/fixtures/cholo-dao.clar', 'utf8')) throw new Error('Deployed source differs from the tested fixture.');
if (resume && !existsSync(journalPath)) throw new Error('No existing live test run to resume.');
const journal = existsSync(journalPath) ? JSON.parse(readFileSync(journalPath, 'utf8')) : {
  contract: DAO_CONTRACT, initialBalance: state.balance, startedAt: new Date().toISOString(), transactions: [],
};
if (journal.contract !== DAO_CONTRACT) throw new Error('Journal contract mismatch.');
function save() {
  mkdirSync('.dao-test-results', { recursive: true });
  writeFileSync(`${journalPath}.tmp`, JSON.stringify(journal, null, 2) + '\n', { mode: 0o600 });
  renameSync(`${journalPath}.tmp`, journalPath);
}
for (const account of accounts) {
  if (journal.transactions.some((tx) => tx.account === account.index)) continue;
  if (!broadcast) continue;
  const nonces = await daoFetch(`/extended/v1/address/${account.address}/nonces`);
  if (nonces.detected_mempool_nonces.length) throw new Error(`Account ${account.index} has other pending transactions; resume after they confirm.`);
  const transaction = await makeContractCall({
    contractAddress: DAO_ADDRESS, contractName: 'cholo-dao', functionName: 'deposit',
    functionArgs: [uintCV(amount)], senderKey: account.privateKey, network: 'testnet',
    nonce: BigInt(nonces.possible_next_nonce), fee, validateWithAbi: true,
    postConditionMode: 'deny', postConditions: [{ type: 'stx-postcondition', address: account.address, condition: 'eq', amount: amount.toString() }],
  });
  const txid = `0x${transaction.txid().replace(/^0x/, '')}`;
  const entry = { account: account.index, txid, status: 'prepared', fee: fee.toString(), amount: amount.toString() };
  journal.transactions.push(entry);
  save(); // Record the ID before broadcast so retries cannot duplicate a deposit.
  const result = await broadcastTransaction({ transaction, network: 'testnet' });
  if ('error' in result) {
    entry.status = 'broadcast-rejected'; save();
    throw new Error(`Account ${account.index}: broadcast rejected (${result.reason ?? result.error}). Inspect the journal before retrying.`);
  }
  entry.status = 'pending'; save();
  console.log(`Account ${account.index}: submitted ${txid}`);
}
const deadline = Date.now() + 15 * 60 * 1000;
while (journal.transactions.some((tx) => ['pending', 'prepared'].includes(tx.status)) && Date.now() < deadline) {
  for (const entry of journal.transactions.filter((tx) => ['pending', 'prepared'].includes(tx.status))) {
    let result;
    try { result = await daoFetch(`/extended/v1/tx/${entry.txid}`); }
    catch { continue; } // Indexing delays do not justify rebroadcasting.
    if (result.tx_status === 'pending') continue;
    entry.status = result.tx_status;
    entry.result = result.tx_result?.repr;
    entry.blockHeight = result.block_height;
    const account = accounts.find((candidate) => candidate.index === entry.account);
    entry.transferVerified = result.events?.some((event) => event.event_type === 'stx_asset' &&
      event.asset?.asset_event_type === 'transfer' && event.asset.sender === account.address &&
      event.asset.recipient === DAO_CONTRACT && event.asset.amount === amount.toString()) ?? false;
    save();
    console.log(`Account ${entry.account}: ${entry.status}, transfer verified: ${entry.transferVerified}`);
    if (entry.status !== 'success' || !entry.transferVerified || entry.result !== '(ok true)') throw new Error(`Account ${entry.account} did not pass the live deposit test. See ${journalPath}.`);
  }
  if (journal.transactions.some((tx) => ['pending', 'prepared'].includes(tx.status))) await new Promise((resolve) => setTimeout(resolve, 15000));
}
const final = await loadDaoState(null);
journal.finalBalance = final.balance;
journal.completed = journal.transactions.length === 4 && journal.transactions.every((tx) => tx.status === 'success' && tx.transferVerified);
save();
console.log(JSON.stringify({ completed: journal.completed, deposits: journal.transactions.length, initialBalance: journal.initialBalance, finalBalance: journal.finalBalance, journalPath }));
if (!journal.completed) { console.log('Use --resume to continue monitoring without sending new transactions.'); process.exitCode = 2; }
