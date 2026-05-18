import type {PoolChartPoint} from '../types/pools';

export type WagmiLinePoint = {
  timestamp: number;
  value: number;
};

const LIVE_KEY_PREFIX = '__live__:';

export function chartPointTimestamp(t: string): number {
  if (t.startsWith(LIVE_KEY_PREFIX)) {
    return Date.now();
  }
  const ms = Date.parse(t);
  return Number.isFinite(ms) ? ms : Date.now();
}

export function chartPointValue(spotPriceApprox: string): number {
  const n = Number(String(spotPriceApprox ?? '').trim());
  if (!Number.isFinite(n) || n <= 0) {
    return 0;
  }
  return n;
}

export function poolPointsToWagmiData(
  points: PoolChartPoint[] | null | undefined,
): WagmiLinePoint[] {
  const rows: WagmiLinePoint[] = [];
  for (const p of points ?? []) {
    const value = chartPointValue(p.spotPriceApprox);
    if (value <= 0) {
      continue;
    }
    rows.push({
      timestamp: chartPointTimestamp(p.t),
      value,
    });
  }
  rows.sort((a, b) => a.timestamp - b.timestamp);
  return rows;
}
