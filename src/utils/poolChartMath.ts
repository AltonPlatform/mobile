/**
 * Спот и шкала графика: десятичные строки (ratio points/token), BigInt без Number по цене.
 */

import type {PoolChartPoint} from '../types/pools';

/** Должно совпадать с backend `formatBigIntRatioDecimal(..., 36)`. */
export const SPOT_CHART_SCALE = 36;

const MS_PER_HOUR = 3_600_000;

/** Пикселей на 1 час истории (ось X по времени, не по индексу). */
export const CHART_PX_PER_HOUR = 56;

/** Десятичная строка → целое value * 10^SCALE (усечение лишних дробных знаков). */
export function parseDecimalSpotToScaled(
  s: string | undefined | null,
  scale = SPOT_CHART_SCALE,
): bigint {
  if (s == null) {
    return 0n;
  }
  let t = String(s).trim();
  if (t === '' || t === '.') {
    return 0n;
  }
  const neg = t.startsWith('-');
  if (neg) {
    t = t.slice(1).trim();
  }
  const sc = Math.min(Math.max(0, Math.floor(scale)), 72);
  const scaleB = 10n ** BigInt(sc);
  const [intRaw, fracRaw = ''] = t.split('.');
  const intS = (intRaw || '0').replace(/^\+/, '').replace(/^0+(?=\d)/, '') || '0';
  let fracS = (fracRaw || '').replace(/\D/g, '');
  fracS = (fracS + '0'.repeat(sc)).slice(0, sc);
  let intB: bigint;
  try {
    intB = BigInt(intS);
  } catch {
    return 0n;
  }
  let fracB = 0n;
  if (fracS.length > 0) {
    try {
      fracB = BigInt(fracS);
    } catch {
      fracB = 0n;
    }
  }
  const v = intB * scaleB + fracB;
  return neg ? -v : v;
}

export function scaledSpotToDecimalString(
  v: bigint,
  scale = SPOT_CHART_SCALE,
): string {
  const sc = Math.min(Math.max(0, Math.floor(scale)), 72);
  if (v === 0n) {
    return '0';
  }
  const neg = v < 0n;
  const a = neg ? -v : v;
  const scaleB = 10n ** BigInt(sc);
  const ip = a / scaleB;
  const fp = a % scaleB;
  if (fp === 0n) {
    return (neg ? '-' : '') + ip.toString();
  }
  let fs = fp.toString().padStart(sc, '0').replace(/0+$/, '');
  return (neg ? '-' : '') + ip.toString() + '.' + fs;
}

export function formatSpotAxisLabel(v: bigint, scale = SPOT_CHART_SCALE): string {
  const d = scaledSpotToDecimalString(v, scale);
  if (d.length <= 22) {
    return d;
  }
  return `${d.slice(0, 8)}…${d.slice(-10)}`;
}

/** Десятичная строка num/den (усечение дробной части). */
export function formatBigIntRatioDecimal(
  numerator: bigint,
  denominator: bigint,
  fracDigits = SPOT_CHART_SCALE,
): string {
  if (denominator === 0n) {
    return '0';
  }
  const neg = (numerator < 0n) !== (denominator < 0n);
  const n = numerator < 0n ? -numerator : numerator;
  const d = denominator < 0n ? -denominator : denominator;
  const intPart = n / d;
  let rem = n % d;
  const fd = Math.min(Math.max(0, Math.floor(fracDigits)), 72);
  if (fd === 0 || rem === 0n) {
    return (neg ? '-' : '') + intPart.toString();
  }
  let frac = '';
  let r = rem;
  for (let i = 0; i < fd; i++) {
    r *= 10n;
    const q = r / d;
    frac += q.toString();
    r = r % d;
    if (r === 0n) {
      break;
    }
  }
  while (frac.endsWith('0')) {
    frac = frac.slice(0, -1);
  }
  if (frac.length === 0) {
    return (neg ? '-' : '') + intPart.toString();
  }
  return (neg ? '-' : '') + intPart.toString() + '.' + frac;
}

export function isLiveChartKey(t: string): boolean {
  return t.startsWith('__live__');
}

export function chartPointTimeMs(t: string, nowMs = Date.now()): number | null {
  if (isLiveChartKey(t)) {
    return nowMs;
  }
  const ms = Date.parse(t);
  return Number.isNaN(ms) ? null : ms;
}

/** y в пикселях (верх = pad, низ = pad + innerH). `v` — scaled int. */
export function yFromSpotValue(
  v: bigint,
  minV: bigint,
  maxV: bigint,
  innerH: number,
  pad: number,
): number {
  const range = maxV - minV || 1n;
  const rel = v - minV;
  const Y_SCALE = 1_000_000n;
  const hScaled = BigInt(Math.floor(Math.max(1, innerH) * Number(Y_SCALE)));
  const yScaled = (rel * hScaled) / range;
  const yFromBottom = Number(yScaled) / Number(Y_SCALE);
  return pad + innerH - yFromBottom;
}

export function tickBigintsInclusive(minV: bigint, maxV: bigint, steps: number): bigint[] {
  const n = Math.max(2, Math.floor(steps));
  const range = maxV - minV || 1n;
  const out: bigint[] = [];
  for (let i = 0; i < n; i++) {
    out.push(minV + (range * BigInt(i)) / BigInt(n - 1));
  }
  return out;
}

/** Паддинг по Y, чтобы плоская серия не лежала на нижней границе. */
export function expandSpotRangeForChart(minV: bigint, maxV: bigint): {
  minV: bigint;
  maxV: bigint;
} {
  if (minV !== maxV) {
    return {minV, maxV};
  }
  const pad = minV === 0n ? 1n : minV / 40n || 1n;
  return {minV: minV - pad, maxV: maxV + pad};
}

export type ChartPlotInput = {
  points: PoolChartPoint[];
  contentW: number;
  padL?: number;
  padT?: number;
  padB?: number;
  priceAxisW?: number;
  plotH?: number;
  nowTimeLabel: string;
};

export type ChartPlotResult = {
  pathD: string;
  lastX: number;
  lastY: number;
  minV: bigint;
  maxV: bigint;
  innerW: number;
  yTicks: {v: bigint; y: number; label: string}[];
  vLines: number[];
  timeLabels: {x: number; text: string}[];
};

/**
 * Строит path и подписи: ось X по времени (`t` / ISO), ось Y по spot (десятичная строка).
 */
export function buildChartPlot(input: ChartPlotInput): ChartPlotResult | null {
  const {
    points,
    contentW,
    padL = 6,
    padT = 6,
    padB = 18,
    priceAxisW = 56,
    plotH = 156,
    nowTimeLabel,
  } = input;

  if (points.length === 0) {
    return null;
  }

  const nowMs = Date.now();
  const series: {tMs: number; v: bigint; tLabel: string}[] = [];
  for (const p of points) {
    const tMs = chartPointTimeMs(p.t, nowMs);
    if (tMs == null) {
      continue;
    }
    series.push({
      tMs,
      v: parseDecimalSpotToScaled(p.spotPriceApprox),
      tLabel: p.t,
    });
  }
  if (series.length === 0) {
    return null;
  }

  let minV = series[0]!.v;
  let maxV = series[0]!.v;
  for (const {v} of series) {
    if (v < minV) {
      minV = v;
    }
    if (v > maxV) {
      maxV = v;
    }
  }
  ({minV, maxV} = expandSpotRangeForChart(minV, maxV));

  const innerW = Math.max(1, contentW - padL - priceAxisW - 4);
  const innerH = plotH - padT - padB;

  let tMin = series[0]!.tMs;
  let tMax = series[0]!.tMs;
  for (const {tMs} of series) {
    if (tMs < tMin) {
      tMin = tMs;
    }
    if (tMs > tMax) {
      tMax = tMs;
    }
  }
  const tSpan = Math.max(tMax - tMin, MS_PER_HOUR / 4);

  const xAt = (tMs: number) =>
    padL + (innerW * (tMs - tMin)) / tSpan;

  let pathD = '';
  let lastX = padL;
  let lastY = padT + innerH / 2;

  if (series.length === 1) {
    const y = yFromSpotValue(series[0]!.v, minV, maxV, innerH, padT);
    lastX = padL + innerW;
    lastY = y;
    pathD = `M${padL},${y} L${lastX},${y}`;
  } else {
    const segs: string[] = [];
    for (let i = 0; i < series.length; i++) {
      const {tMs, v} = series[i]!;
      const vx = xAt(tMs);
      const vy = yFromSpotValue(v, minV, maxV, innerH, padT);
      if (i === series.length - 1) {
        lastX = vx;
        lastY = vy;
      }
      segs.push(`${i === 0 ? 'M' : 'L'}${vx},${vy}`);
    }
    pathD = segs.join(' ');
  }

  const yTicks = tickBigintsInclusive(minV, maxV, 5).map(tv => ({
    v: tv,
    y: yFromSpotValue(tv, minV, maxV, innerH, padT),
    label: formatSpotAxisLabel(tv),
  }));

  const vLines: number[] = [];
  const VERT_GRID_COUNT = 8;
  for (let k = 0; k <= VERT_GRID_COUNT; k++) {
    vLines.push(padL + (innerW * k) / VERT_GRID_COUNT);
  }

  const labelSlots = Math.min(7, Math.max(2, series.length));
  const timeLabels: {x: number; text: string}[] = [];
  for (let j = 0; j < labelSlots; j++) {
    const idx =
      series.length === 1
        ? 0
        : Math.round((j / (labelSlots - 1)) * (series.length - 1));
    const row = series[idx]!;
    let text = '';
    if (isLiveChartKey(row.tLabel)) {
      text = nowTimeLabel;
    } else {
      try {
        const d = new Date(row.tMs);
        if (!Number.isNaN(d.getTime())) {
          text = d.toISOString().slice(5, 16).replace('T', ' ');
        }
      } catch {
        text = '';
      }
    }
    timeLabels.push({x: xAt(row.tMs), text});
  }

  return {
    pathD,
    lastX,
    lastY,
    minV,
    maxV,
    innerW,
    yTicks,
    vLines,
    timeLabels,
  };
}

/** Ширина контента графика по временному диапазону точек. */
export function chartContentWidthFromPoints(
  points: PoolChartPoint[],
  viewportW: number,
  padL = 6,
  priceAxisW = 56,
): number {
  const nowMs = Date.now();
  let tMin: number | null = null;
  let tMax: number | null = null;
  for (const p of points) {
    const ms = chartPointTimeMs(p.t, nowMs);
    if (ms == null) {
      continue;
    }
    if (tMin == null || ms < tMin) {
      tMin = ms;
    }
    if (tMax == null || ms > tMax) {
      tMax = ms;
    }
  }
  if (tMin == null || tMax == null) {
    return Math.max(viewportW + 1, 200);
  }
  const spanMs = Math.max(tMax - tMin, MS_PER_HOUR);
  const hours = spanMs / MS_PER_HOUR;
  const naturalW = padL + priceAxisW + 8 + Math.ceil(hours * CHART_PX_PER_HOUR);
  return Math.max(viewportW + 1, naturalW);
}
