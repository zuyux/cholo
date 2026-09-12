# Leather network-aware sign-in

Leather connection now calls `getAddresses` without a network override and uses the active Stacks address returned by the wallet. `SP`/`SM` addresses select mainnet; `ST`/`SN` select testnet. Addresses must be valid, and ambiguous responses are rejected rather than choosing an arbitrary account. Only an unsupported-method response triggers the `stx_getAddresses` fallback; cancellation never opens another prompt.

Sign-in explicitly passes the inferred network and `messageType: utf8` to `stx_signMessage`. The server derives the verification address on the network of its signed challenge and still requires a valid signature from the matching public key. No client-provided network can override the challenge identity. Successful Leather sign-in also persists the detected network before opening the wallet page.

To test: choose testnet in Leather, reconnect through **ENTRAR → Leather**, and confirm the Stacks address begins with `ST`. Switch back to mainnet and reconnect to use the `SP` account. Network changes after connection require reconnecting; this does not subscribe to extension network-change events or distinguish a custom devnet from testnet addresses. Xverse's existing mainnet flow is unchanged, and `/dao` remains fixed to its supplied testnet deployment.

This change covers connection and authentication. The separate wallet CHOLO transfer form still has its existing mainnet-only restrictions.

Verification: `npx vitest run lib/stacksSignInMessage.test.ts`. Tests cover both networks, cancellation, unsupported methods, invalid/ambiguous accounts, explicit signing parameters, and real cryptographic proof verification. Local API tests exercised challenge/session creation on both networks. Browser verification used a mocked Leather provider and a public deterministic key against the real local authentication API; notification sending was intercepted. Confirm the extension prompt manually with the installed Leather wallet.

References:
- https://leather.gitbook.io/developers/methods/getaddresses
- https://leather.gitbook.io/developers/stacks-methods/stx_signmessage
- https://github.com/leather-io/extension/blob/dev/src/background/messaging/rpc-methods/get-addresses.ts
