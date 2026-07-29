'use client';

import { useQuery } from '@tanstack/react-query';
import { bitflowProvider } from '../providers/bitflow';

export function useBitflowQuote({ tokenIn, tokenOut, amount, slippage, walletAddress }: {
  tokenIn?: string;
  tokenOut?: string;
  amount?: string;
  slippage: number;
  walletAddress: string;
}) {
  return useQuery({
    queryKey: ['bitflow-quote', walletAddress, tokenIn, tokenOut, amount, slippage],
    queryFn: () => bitflowProvider.getQuote({ tokenIn: tokenIn!, tokenOut: tokenOut!, amountIn: amount!, slippage }),
    enabled: Boolean(walletAddress && tokenIn && tokenOut && tokenIn !== tokenOut && Number(amount) > 0),
    refetchInterval: 15_000,
    staleTime: 8_000,
    retry: 1,
  });
}
