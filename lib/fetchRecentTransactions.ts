import { fetchJsonWithRetry } from './externalApi';

// Utility to fetch recent transactions for a Stacks address
export async function fetchRecentTransactions<T = unknown>(address: string, network: string = 'mainnet', limit: number = 10): Promise<T[]> {
  const apiBaseUrl = network === 'mainnet'
    ? 'https://api.mainnet.hiro.so'
    : 'https://api.testnet.hiro.so';
  const url = `${apiBaseUrl}/extended/v1/address/${address}/transactions?limit=${limit}`;

  const data = await fetchJsonWithRetry<{ results: T[] }>(
    url,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    },
    {
      attempts: 3,
      delayMs: 800,
      timeoutMs: 10000,
      cacheTtlSeconds: 60,
    }
  );

  return data.results || [];
}
