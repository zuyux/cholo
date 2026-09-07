import { describe, expect, it } from 'vitest';
import { parseCholoAmount } from './cholo-transfer';

describe('CHOLO amount conversion', () => {
  it('preserves eight decimals and amounts beyond Number precision', () => {
    expect(parseCholoAmount('0.00000001')).toBe(BigInt(1));
    expect(parseCholoAmount('12.34567890')).toBe(BigInt(1234567890));
    expect(parseCholoAmount('9007199254740993.00000001')).toBe(BigInt("900719925474099300000001"));
  });
  it('rejects zero, negative, scientific notation and excess precision', () => {
    for (const value of ['', '0', '-1', '1e8', 'NaN', '0.000000001', '1.2.3']) {
      expect(parseCholoAmount(value)).toBeNull();
    }
  });
});
