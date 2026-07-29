export type SwapToken = {
  id: string;
  name: string;
  symbol: string;
  decimals: number;
  contract: string | null;
  icon?: string;
};

export type SwapRoute = {
  id: string;
  tokenPath: string[];
  dexPath: string[];
  providerData: unknown;
};

export type SwapQuote = {
  tokenIn: SwapToken;
  tokenOut: SwapToken;
  amountIn: string;
  expectedOutput: string;
  minimumOutput: string;
  route: SwapRoute;
  quotedAt: number;
  expiresAt: number;
  providerData: unknown;
};

export type SwapSubmission = {
  txId?: string;
};

export interface SwapProvider {
  getTokens(): Promise<SwapToken[]>;
  getRoutes(params: { tokenIn: string; tokenOut: string }): Promise<SwapRoute[]>;
  getQuote(params: { tokenIn: string; tokenOut: string; amountIn: string; slippage: number }): Promise<SwapQuote>;
  executeSwap(params: {
    quote: SwapQuote;
    senderAddress: string;
    slippage: number;
    stacksProvider?: unknown;
  }): Promise<SwapSubmission>;
}
