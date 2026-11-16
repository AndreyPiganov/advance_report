const MONEY_PATTERN = /^(\d+)(?:\.(\d{1,2}))?$/;

export function parseMoney(value: string, label: string): bigint {
  const match = MONEY_PATTERN.exec(value.trim());
  if (!match) {
    throw new Error(`${label}: ожидается неотрицательная сумма с точностью до копеек`);
  }

  const rubles = BigInt(match[1]!);
  const kopecks = BigInt((match[2] ?? '').padEnd(2, '0') || '0');
  return rubles * 100n + kopecks;
}

export function formatMoney(cents: bigint): string {
  const rubles = cents / 100n;
  const kopecks = (cents % 100n).toString().padStart(2, '0');
  return `${rubles}.${kopecks}`;
}

export function sumMoney(values: Iterable<bigint>): bigint {
  let total = 0n;
  for (const value of values) total += value;
  return total;
}

export function remainingMoney(price: bigint, paid: bigint): bigint {
  return price > paid ? price - paid : 0n;
}
