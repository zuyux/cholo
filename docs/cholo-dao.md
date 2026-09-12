# CHOLO DAO (mainnet)

Open `/dao` from the DAO navigation link. No new environment variables are required.
The page reads and calls only `SP193GXQTNHVV9WSAPHAB89M6R9QSEXZKS3774CMD.cholo-dao` on Stacks mainnet. Connect a Stacks extension wallet in mainnet mode using the page's **Conectar** button. This connection is separate from the site's main wallet sign-in. Imported/encrypted app wallets are not connected to this DAO signing flow.

The page supports STX deposits, all seven proposal types, separate approvals, and permissionless execution after quorum and the delay. SIP-010 amounts are entered in human-readable token units with an exact smallest-unit preview. The page checks the transfer ABI, reads symbol/decimals and the DAO balance directly from the token, and requires a single fungible asset. Metadata and balances are verified again before signing. Every call uses deny-mode post-conditions, allowing only the exact deposit or proposed treasury outflow. Transactions are submitted through the wallet and shown as pending until Hiro reports confirmation.

## Operating on mainnet

Use only `SP` or `SM` principals for recipients, token contracts, and signers. The interface rejects testnet `ST`/`SN` principals, requests mainnet accounts from the extension, and sends every contract call to mainnet. Refresh `/dao` immediately before approving or executing because governance state can change between transactions.

The contract bootstraps index 0 from the deployment transaction's `tx-sender`; there is no public initialization or direct signer setter. Creating a signer proposal does **not** count as its approval. Verify the current signer set, quorum, delay, and proposal expiry in the interface before signing.

## Contract details that affect the interface

- Clarity 2 `block-height` means **tenure height** after epoch 3.0, not the fast Stacks block height. The page reads `tenure_height` from `/v2/info` for expiration and execution eligibility.
- Despite its comment referring to approval time, the deployed implementation measures the delay from proposal **creation**. Only `add-signer` with one existing signer bypasses the delay; `replace-signer` does not.
- Quorum and execution delay are evaluated using current values, including for older pending proposals.
- The contract stores approval counts and does not revoke old approvals when a signer is removed. Review pending proposals when changing membership. The UI checks fixed quorum against the remaining signer count both when proposing and immediately before executing a removal. Automatic 51% quorum adjusts with membership and is displayed separately from fixed quorum.
- Read failures disable submission. Wallet cancellation or transaction failure is displayed; submission alone is not treated as a successful state change.

## Verification

Run `npx vitest run lib/cholo-dao.test.ts`. The fixture `lib/fixtures/cholo-dao.clar` is the exact source returned by Hiro for the deployment transaction below, used to exercise the UI-generated replacement arguments in Clarinet simnet. These tests do not submit network transactions.

Sources:

- [Deployment transaction and source](https://explorer.hiro.so/txid/0x22dca76c930a5051ecf93ccd70dbaace16db07074d071ec4c7355e55c71b9202?chain=testnet&tab=sourceCode)
- [Deployment API response](https://api.testnet.hiro.so/extended/v1/tx/0x22dca76c930a5051ecf93ccd70dbaace16db07074d071ec4c7355e55c71b9202)
- [Clarity block-height semantics](https://docs.stacks.co/reference/clarity/keywords)
- [Stacks post-condition examples](https://docs.stacks.co/post-conditions/examples)

## Interface safeguards and activity

- Proposal cards show missing approvals, remaining tenures, expiry, treasury shortfalls, obsolete signer changes, invalid quorum changes, and unsupported tokens. Readiness is advisory; other transactions can change state before mining.
- Execution-delay proposals are limited to 0–9999 tenures at creation and execution. A delay at or above the 10000-tenure maximum proposal lifetime would prevent future proposals from executing in a multi-signer DAO. These are interface safeguards; the deployed contract still permits unsafe governance through other clients. Enforcing them on-chain requires a new deployment.
- The page reads the raw `required-sigs` configuration to distinguish automatic 51% quorum (rounded up) from fixed quorum. The deployed contract cannot switch back to automatic quorum once a fixed value is set.
- Treasury tokens show symbol, decimals, readable balance and raw balance. Unsupported or unreadable tokens show an explicit error. Token metadata is provided by the token contract, not an endorsement of the asset.
- “Ver aprobaciones” scans contract events in pages of 50, with a visible continuation button and found/recorded approval counts. This includes former signers and explorer links. Missing or incomplete API history is never represented as a complete approval list.
- The latest 20 transactions are stored under a contract- and network-specific browser key. Pending IDs resume polling on reload; confirmed creations show their proposal ID. DAO errors and post-condition failures are explained, while dynamic token errors retain their raw result to avoid confusing error namespaces. If browser storage is unavailable, the page asks users to retain the explorer link.
- State refreshes every minute while the page is visible and again before each wallet request. The DAO wallet connection remains extension-only and mainnet-only.

Validation covers governance state changes, token precision and ABI checks, persisted transaction decoding, approval event pagination, and simnet executions of both signer replacement and token transfer. Browser checks use read-only mainnet data; no governance transactions are broadcast as part of verification.

## Testing with the local testnet accounts

The Node-only test helper reads `CHOLO_TESTNET_ADDRESS_1` through `_4` and their matching `CHOLO_TESTNET_PRIVATE_KEY_1` through `_4` from `.env.local`. It verifies each key derives the configured testnet address without logging keys. These variables are never imported by the application or exposed as `NEXT_PUBLIC` values.

- `npm run test:dao:accounts` runs the regression suite and a complete simulated governance workflow using the four configured accounts: deposits, all seven proposal types, exact STX/token amounts, approval permissions, duplicate approvals, timelock enforcement, and obsolete proposals. It changes no live governance. Ordinary test runs skip the environment-account test.
- `npm run test:dao:testnet` performs a read-only live preflight: key/address matches, signer membership, and funding.
- `npm run test:dao:testnet -- --broadcast` verifies the deployed source against the fixture and submits one 0.000001 STX deposit per account. Each call uses testnet, deny-mode exact-amount post-conditions, and a fixed 0.002 STX fee (0.008 STX total fee cap). It does not create proposals or change governance. Requires Node with native TypeScript stripping (Node 22.18+; verified with Node 26).
- `npm run test:dao:testnet -- --resume` continues monitoring an existing run without submitting transactions. The runner waits up to 15 minutes per invocation and checks each confirmed transaction's result and exact transfer event.

The ignored `.dao-test-results/testnet-deposits.json` journal contains public transaction IDs, amounts, confirmation results, and initial/final treasury balances. It records each transaction ID before broadcast; repeating `--broadcast` resumes the same run without duplicating recorded deposits. Archive the journal manually only when intentionally starting a new funded test run. Interrupted prepared or rejected entries require inspecting the explorer before starting another run.

Live verification on 2026-09-11: all four deposits succeeded and their transfer events matched. Treasury balance increased from 2000 to 2004 micro-STX. The environment-account simulation also passed all seven proposal types; no live signer, quorum, or delay changes were made.

## Approving a new signer in the interface

Adding or replacing a signer changes who can authorize DAO decisions, so the current signer set must approve it. Signer proposal cards now show a four-step workflow: creation, distinct signer approvals, the creation-based waiting period, and permissionless execution. The waiting period runs alongside approval collection; a completed approval step does not automatically execute the proposal.

The workflow lists current signer addresses and reads each `has-approved` flag directly from the contract. It explains the connected account's role and provides contextual connect/switch-account, approve, and execute buttons. An incoming signer cannot approve before membership is added. Once quorum is met, no additional approval is requested; after the delay, any connected mainnet account can execute. Historical approvals from removed signers are distinguished from the current signer list through the separate event history. Expired and executed proposals have no action controls.

Validation: `npx vitest run lib/cholo-dao.test.ts components/DaoSignerWorkflow.test.tsx` covers direct approval reads, incoming/current signer roles, duplicate-approval guidance, quorum plus timelock gating, and terminal proposal states.
