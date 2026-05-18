import type {ChartCandle} from '../api/chartGame';
import {
  CHART_GAME_CUTOFF_INDEX,
  CHART_GAME_TOTAL_SLOTS,
} from './chartGameLayout';

export type WagmiCandle = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  /** Слот без свечи (зона прогноза до reveal). */
  placeholder?: boolean;
};

export function chartCandleToWagmi(
  c: ChartCandle & {placeholder?: boolean},
): WagmiCandle {
  return {
    timestamp: c.time,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volume: c.volume ?? 0,
    placeholder: c.placeholder,
  };
}

export function chartCandlesToWagmi(candles: ChartCandle[]): WagmiCandle[] {
  return candles
    .filter(c => Number.isFinite(c.close) && c.close > 0)
    .map(chartCandleToWagmi)
    .sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * История + reveal + пустые слоты до 18 позиций (placeholder не рисуются).
 */
export function buildChartGameWagmiSeries(
  candles: ChartCandle[],
  revealCandles: ChartCandle[],
  totalSlots: number = CHART_GAME_TOTAL_SLOTS,
): {data: WagmiCandle[]; baseCount: number; revealCount: number} {
  const merged: ChartCandle[] = [...candles];
  for (const c of revealCandles) {
    if (merged.length < totalSlots) {
      merged.push(c);
    }
  }

  const baseCount = candles.length;
  const revealCount = revealCandles.length;
  const last = merged[merged.length - 1] ?? candles[candles.length - 1];
  const padPrice = last?.close ?? 0;
  let padTime = (last?.time ?? Date.now()) + 60_000;

  while (merged.length < totalSlots) {
    merged.push({
      time: padTime,
      open: padPrice,
      high: padPrice,
      low: padPrice,
      close: padPrice,
      volume: 0,
      placeholder: true,
    });
    padTime += 60_000;
  }

  return {
    data: chartCandlesToWagmi(merged.slice(0, totalSlots)),
    baseCount,
    revealCount,
  };
}

/** Совпадает с padding wagmi `getDomain` (2.5%). */
export function computeChartGameYDomain(
  data: WagmiCandle[],
): [min: number, max: number] {
  if (data.length === 0) {
    return [0, 0];
  }
  const values = data.flatMap(c => [c.high, c.low]);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const span = rawMax - rawMin || rawMax * 0.001;
  const pad = span * 0.025;
  return [rawMin - pad, rawMax + pad];
}

export function formatChartGameVolume(n: number): string {
  if (!Number.isFinite(n) || n <= 0) {
    return '0';
  }
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(2)}M`;
  }
  if (n >= 1000) {
    return `${(n / 1000).toFixed(1)}K`;
  }
  return Math.floor(n).toLocaleString(undefined, {maximumFractionDigits: 0});
}

export function formatChartGameAxisPrice(n: number): string {
  if (n >= 10_000) {
    return n.toLocaleString(undefined, {maximumFractionDigits: 0});
  }
  if (n >= 1000) {
    return n.toFixed(1);
  }
  if (n >= 1) {
    return n.toFixed(2);
  }
  if (n >= 0.01) {
    return n.toFixed(4);
  }
  return n.toFixed(6);
}

export function chartGamePriceToY(
  price: number,
  domain: [number, number],
  plotHeight: number,
): number {
  const [min, max] = domain;
  if (max === min) {
    return plotHeight / 2;
  }
  return ((max - price) / (max - min)) * plotHeight;
}

export {CHART_GAME_CUTOFF_INDEX};
