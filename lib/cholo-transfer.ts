import { CHOLO_DECIMALS } from './contracts';

/** Convert token units without losing precision through floating-point arithmetic. */
export function parseCholoAmount(value: string): bigint | null {
  if (!/^\d+(?:\.\d{1,8})?$/.test(value)) return null;
  const [whole, fraction = ''] = value.split('.');
  const amount = BigInt(whole) * BigInt(10) ** BigInt(CHOLO_DECIMALS)
    + BigInt(fraction.padEnd(CHOLO_DECIMALS, '0'));
  return amount > BigInt(0) ? amount : null;
}
