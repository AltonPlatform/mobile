import {sumFormat} from './formatNumbers';
import {parsePoolBigInt} from './poolAmm';

const BIGINT_SUFFIXES = ['', 'K', 'M', 'B', 'T'];
const THOUSAND = 1000n;

/** Компактное отображение больших целых (резервы, объёмы, позиции). */
export function formatPoolBigInt(value: string | null | undefined): string {
  let v = parsePoolBigInt(value ?? '0');
  if (v < 0n) {
    v = -v;
  }
  if (v === 0n) {
    return '0';
  }

  const maxSafe = BigInt(Number.MAX_SAFE_INTEGER);
  if (v <= maxSafe) {
    return sumFormat(Number(v));
  }

  let tier = 0;
  let scaled = v;
  while (scaled >= THOUSAND && tier < BIGINT_SUFFIXES.length - 1) {
    scaled /= THOUSAND;
    tier++;
  }

  const num = Number(scaled);
  if (!Number.isFinite(num)) {
    return v.toString();
  }
  const precision = num < 100 ? 2 : 1;
  return parseFloat(num.toFixed(precision)).toString() + BIGINT_SUFFIXES[tier];
}

/** Спот и прочие десятичные ratio (points per token). */
export function formatPoolSpot(spot: string | null | undefined): string {
  const s = String(spot ?? '').trim();
  if (!s) {
    return '—';
  }

  const n = Number(s);
  if (Number.isFinite(n)) {
    if (n === 0) {
      return '0';
    }
    const abs = Math.abs(n);
    if (abs >= 1000) {
      return sumFormat(n);
    }
    if (abs >= 1) {
      return parseFloat(n.toFixed(4)).toString();
    }
    if (abs >= 0.0001) {
      return parseFloat(n.toFixed(6)).toString();
    }
    return n.toExponential(3);
  }

  if (s.length <= 14) {
    return s;
  }
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
}

export function formatPoolReservesLine(
  reservePoints: string,
  reserveTokens: string,
): string {
  return `${formatPoolBigInt(reservePoints)} / ${formatPoolBigInt(reserveTokens)}`;
}

/** Удвоение награды для x2 claim (строковый bigint с бэкенда). */
export function doublePoolBigIntString(
  value: string | null | undefined,
): string {
  try {
    return (parsePoolBigInt(value ?? '0') * 2n).toString();
  } catch {
    return '0';
  }
}
