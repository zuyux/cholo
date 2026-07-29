type AppNetwork = 'mainnet' | 'testnet' | 'devnet';

export type NativeBalance = {
  value: number | null;
  display: string;
};

const BTC_DECIMALS = 8;
const RBTC_DECIMALS = 18;
const LIQUID_MAINNET_API_URL = 'https://blockstream.info/liquid/api';
const LIQUID_MAINNET_ASSET_HASH = '6f0279e9ed041c3d710a9f57d0c02928416460c4b722ae3457a11eec381c526d';

type AddressStats = {
  funded_txo_sum?: number;
  spent_txo_sum?: number;
};

type AddressInfo = {
  chain_stats?: AddressStats;
  mempool_stats?: AddressStats;
};

type LiquidUtxo = {
  value?: number;
  asset?: string;
};

const ROOTSTOCK_RPC_URLS: Record<AppNetwork, string> = {
  mainnet: 'https://public-node.rsk.co',
  testnet: 'https://public-node.testnet.rsk.co',
  devnet: 'https://public-node.testnet.rsk.co',
};

const formatNativeAmount = (value: number, unit: string) => {
  if (!Number.isFinite(value)) return `-- ${unit}`;
  if (value === 0) return `0.00 ${unit}`;
  const formatted = value >= 1
    ? value.toLocaleString(undefined, { maximumFractionDigits: 8 })
    : value.toLocaleString(undefined, { maximumFractionDigits: 8, minimumFractionDigits: value > 0 ? 1 : 0 });
  return `${formatted} ${unit}`;
};

const baseUnitsToNumber = (baseUnits: bigint, decimals: number) => {
  const divisor = BigInt(10) ** BigInt(decimals);
  const whole = baseUnits / divisor;
  const fraction = baseUnits % divisor;
  const fractionText = fraction.toString().padStart(decimals, '0').replace(/0+$/, '');
  return Number(`${whole.toString()}${fractionText ? `.${fractionText}` : ''}`);
};

const getBitcoinApiBaseUrl = (network: AppNetwork) =>
  network === 'mainnet'
    ? 'https://mempool.space/api'
    : 'https://mempool.space/testnet/api';

const getConfirmedAndMempoolBalance = (info: AddressInfo) => {
  const chain = info.chain_stats ?? {};
  const mempool = info.mempool_stats ?? {};
  const funded = BigInt(chain.funded_txo_sum ?? 0) + BigInt(mempool.funded_txo_sum ?? 0);
  const spent = BigInt(chain.spent_txo_sum ?? 0) + BigInt(mempool.spent_txo_sum ?? 0);
  return funded - spent;
};

async function rpcCall<T>(rpcUrl: string, method: string, params: unknown[], signal?: AbortSignal): Promise<T> {
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params,
    }),
  });

  if (!response.ok) throw new Error(`Rootstock RPC ${method} failed with ${response.status}`);
  const payload = await response.json();
  if (payload?.error) {
    throw new Error(payload.error.message || `Rootstock RPC ${method} failed`);
  }
  return payload.result as T;
}

export async function fetchBitcoinBalance(address: string, network: AppNetwork, signal?: AbortSignal): Promise<NativeBalance> {
  const response = await fetch(`${getBitcoinApiBaseUrl(network)}/address/${address}`, { signal });
  if (response.status === 404) {
    return {
      value: 0,
      display: formatNativeAmount(0, 'BTC'),
    };
  }
  if (!response.ok) throw new Error(`Bitcoin balance request failed with ${response.status}`);

  const info = await response.json() as AddressInfo;
  const balanceSats = getConfirmedAndMempoolBalance(info);
  const value = baseUnitsToNumber(balanceSats, BTC_DECIMALS);
  return {
    value,
    display: formatNativeAmount(value, 'BTC'),
  };
}

export async function fetchRootstockBalance(address: string, network: AppNetwork, signal?: AbortSignal): Promise<NativeBalance> {
  const rpcUrl = ROOTSTOCK_RPC_URLS[network];
  const balanceHex = await rpcCall<string>(rpcUrl, 'eth_getBalance', [address, 'latest'], signal);
  const balanceWei = BigInt(balanceHex || '0x0');
  const value = baseUnitsToNumber(balanceWei, RBTC_DECIMALS);
  return {
    value,
    display: formatNativeAmount(value, 'RBTC'),
  };
}

export async function fetchLiquidBalance(address: string, network: AppNetwork, signal?: AbortSignal): Promise<NativeBalance> {
  if (network !== 'mainnet') {
    return {
      value: null,
      display: '--',
    };
  }

  const response = await fetch(`${LIQUID_MAINNET_API_URL}/address/${address}/utxo`, { signal });
  if (!response.ok) throw new Error(`Liquid balance request failed with ${response.status}`);

  const utxos = await response.json() as LiquidUtxo[];
  const balanceSats = utxos.reduce((total, utxo) => {
    const isLbtc = typeof utxo.asset === 'string' && utxo.asset.toLowerCase() === LIQUID_MAINNET_ASSET_HASH;
    if (!isLbtc || !Number.isSafeInteger(utxo.value) || Number(utxo.value) <= 0) return total;
    return total + BigInt(Number(utxo.value));
  }, BigInt(0));
  const value = baseUnitsToNumber(balanceSats, BTC_DECIMALS);
  return {
    value,
    display: formatNativeAmount(value, 'L-BTC'),
  };
}
