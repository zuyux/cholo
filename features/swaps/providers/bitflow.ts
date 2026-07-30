import type { QuoteResult, SelectedSwapRoute, Token } from '@bitflowlabs/core-sdk';
import { postConditionToHex, serializeCV, type ClarityValue } from '@stacks/transactions';
import type { SwapProvider, SwapQuote, SwapRoute, SwapToken } from '../types';

export const BITFLOW_QUOTE_TTL_MS = 15_000;

let sdkPromise: Promise<InstanceType<typeof import('@bitflowlabs/core-sdk').BitflowSDK>> | null = null;

async function getSdk() {
  if (!sdkPromise) {
    sdkPromise = import('@bitflowlabs/core-sdk').then(({ BitflowSDK }) => {
      const origin = window.location.origin;
      return new BitflowSDK({
        BITFLOW_API_HOST: `${origin}/api/bitflow/core`,
        READONLY_CALL_API_HOST: `${origin}/api/bitflow/readonly`,
        KEEPER_API_HOST: `${origin}/api/bitflow/keeper`,
        BITFLOW_PROVIDER_ADDRESS: process.env.NEXT_PUBLIC_BITFLOW_PROVIDER_ADDRESS,
      });
    });
  }
  return sdkPromise;
}

const normalizeToken = (token: Token): SwapToken => ({
  id: token.tokenId,
  name: token.name || token.tokenName || token.symbol,
  symbol: token.symbol,
  decimals: token.tokenDecimals,
  contract: token.tokenContract,
  icon: token.icon || undefined,
});

const normalizeTokens = (tokens: Token[]) => {
  const unique = new Map<string, SwapToken>();
  for (const token of tokens) {
    const normalized = normalizeToken(token);
    if (normalized.id && !unique.has(normalized.id)) unique.set(normalized.id, normalized);
  }
  return [...unique.values()];
};

const clarityValueToHex = (value: ClarityValue) => {
  const serialized = serializeCV(value);
  if (typeof serialized === 'string') return serialized.startsWith('0x') ? serialized : `0x${serialized}`;
  return `0x${Array.from(serialized as Uint8Array, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
};

const normalizeRoute = (route: SelectedSwapRoute, index = 0): SwapRoute => ({
  id: `${route.token_path.join('>')}:${route.dex_path.join('>')}:${index}`,
  tokenPath: route.token_path,
  dexPath: route.dex_path,
  providerData: route,
});

const parsePositiveAmount = (amount: string) => {
  const parsed = Number(amount);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error('Enter a valid amount to swap.');
  return parsed;
};

const validateSlippage = (slippage: number) => {
  if (!Number.isFinite(slippage) || slippage < 0.001 || slippage > 0.05) {
    throw new Error('Slippage must be between 0.1% and 5%.');
  }
};

function assertQuoteMatchesSelection(result: QuoteResult, tokenIn: string, tokenOut: string, amount: number) {
  if (result.inputData.tokenX !== tokenIn || result.inputData.tokenY !== tokenOut || result.inputData.amountInput !== amount) {
    throw new Error('Bitflow returned a quote that does not match your selection.');
  }
  if (!result.bestRoute || result.bestRoute.quote === null || result.bestRoute.quote <= 0) {
    throw new Error('No Bitflow route is currently available.');
  }
}

async function getTokenPair(tokenIn: string, tokenOut: string) {
  const tokens = normalizeTokens(await (await getSdk()).getAvailableTokens());
  const input = tokens.find((token) => token.id === tokenIn);
  const output = tokens.find((token) => token.id === tokenOut);
  if (!input || !output) throw new Error('The selected token is not in Bitflow’s current token registry.');
  return { input, output };
}

export const bitflowProvider: SwapProvider = {
  async getTokens() {
    return normalizeTokens(
      (await (await getSdk()).getAvailableTokens())
        .filter((token) => token.status.toLowerCase() !== 'disabled'),
    );
  },

  async getRoutes({ tokenIn, tokenOut }) {
    return (await (await getSdk()).getAllPossibleTokenYRoutes(tokenIn, tokenOut)).map(normalizeRoute);
  },

  async getQuote({ tokenIn, tokenOut, amountIn, slippage }) {
    validateSlippage(slippage);
    const amount = parsePositiveAmount(amountIn);
    const [result, pair] = await Promise.all([
      (await getSdk()).getQuoteForRoute(tokenIn, tokenOut, amount),
      getTokenPair(tokenIn, tokenOut),
    ]);
    assertQuoteMatchesSelection(result, tokenIn, tokenOut, amount);

    const bestRoute = result.bestRoute!;
    const route = normalizeRoute(bestRoute.route);
    if (route.tokenPath[0] !== tokenIn || route.tokenPath.at(-1) !== tokenOut) {
      throw new Error('Bitflow returned an unexpected token route.');
    }

    const expectedOutput = bestRoute.quote!;
    const now = Date.now();
    return {
      tokenIn: pair.input,
      tokenOut: pair.output,
      amountIn,
      expectedOutput: String(expectedOutput),
      minimumOutput: String(expectedOutput * (1 - slippage)),
      route,
      quotedAt: now,
      expiresAt: now + BITFLOW_QUOTE_TTL_MS,
      providerData: bestRoute.route,
    } satisfies SwapQuote;
  },

  async executeSwap({ quote, senderAddress, slippage, stacksProvider }) {
    validateSlippage(slippage);
    if (!/^(SP|SM|SN|ST|SU|TP|TM|TN|TS)[A-Za-z0-9]{30,40}$/i.test(senderAddress)) {
      throw new Error('The connected wallet does not have a valid Stacks address.');
    }
    if (Date.now() >= quote.expiresAt) throw new Error('Quote expired. Refresh it before swapping.');

    const sdk = await getSdk();
    const route = quote.providerData as SelectedSwapRoute;
    const executionData = {
      route,
      amount: parsePositiveAmount(quote.amountIn),
      tokenXDecimals: route.tokenXDecimals,
      tokenYDecimals: route.tokenYDecimals,
    };

    // Build first so malformed routes/post-conditions fail before a wallet is opened.
    const prepared = await sdk.getSwapParams(executionData, senderAddress, slippage);
    if (!prepared.contractAddress || !prepared.contractName || !prepared.functionName || !prepared.postConditions?.length) {
      throw new Error('Bitflow returned incomplete or unrestricted swap parameters.');
    }

    const provider = stacksProvider as {
      request?: (method: string, params: Record<string, unknown>) => Promise<unknown>;
    } | undefined;
    if (typeof provider?.request !== 'function') {
      throw new Error('The connected wallet does not expose Stacks contract-call signing.');
    }

    // Bitflow's executeSwap currently invokes a legacy Stacks UserSession path.
    // The documented getSwapParams alternative lets CHOLO submit the exact same
    // restricted call through the wallet's current RPC provider instead.
    const response = await provider.request('stx_callContract', {
      contract: `${prepared.contractAddress}.${prepared.contractName}`,
      functionName: prepared.functionName,
      functionArgs: prepared.functionArgs.map(clarityValueToHex),
      postConditions: prepared.postConditions.map(postConditionToHex),
      postConditionMode: 'deny',
      anchorMode: 'any',
      network: /^(TP|TM|TN|TS)/i.test(senderAddress) ? 'testnet' : 'mainnet',
    });

    const result = response as {
      txid?: string;
      txId?: string;
      result?: { txid?: string; txId?: string };
    };
    const txId = result.result?.txid || result.result?.txId || result.txid || result.txId;
    if (!txId) throw new Error('The wallet closed without returning a transaction ID.');
    return { txId };
  },
};
