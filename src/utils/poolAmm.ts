/**
 * Локальный constant-product AMM (как на бэкенде) для превью цены / объёма без лишних запросов.
 */

export function parsePoolBigInt(s: string | undefined | null, fallback = '0'): bigint {
  if (s == null || s === '') {
    return 0n;
  }
  try {
    return BigInt(s);
  } catch {
    return BigInt(fallback);
  }
}

function constantProductK(reservePoints: bigint, reserveTokens: bigint): bigint {
  return reservePoints * reserveTokens;
}

/** tokensOut = reserveTokens - floor(k / (reservePoints + pointsIn)) */
export function buyTokensOut(
  reservePoints: bigint,
  reserveTokens: bigint,
  pointsIn: bigint,
): {tokensOut: bigint; newReservePoints: bigint; newReserveTokens: bigint} {
  if (pointsIn <= 0n) {
    throw new Error('pointsIn must be positive');
  }
  if (reservePoints <= 0n || reserveTokens <= 0n) {
    throw new Error('reserves must be positive');
  }
  const k = constantProductK(reservePoints, reserveTokens);
  const newRp = reservePoints + pointsIn;
  const newRt = k / newRp;
  const tokensOut = reserveTokens - newRt;
  if (tokensOut <= 0n) {
    throw new Error('zero or negative tokensOut');
  }
  return {tokensOut, newReservePoints: newRp, newReserveTokens: newRt};
}

/** pointsOut = reservePoints - floor(k / (reserveTokens + tokensIn)) */
export function sellPointsOut(
  reservePoints: bigint,
  reserveTokens: bigint,
  tokensIn: bigint,
): {pointsOut: bigint; newReservePoints: bigint; newReserveTokens: bigint} {
  if (tokensIn <= 0n) {
    throw new Error('tokensIn must be positive');
  }
  if (reservePoints <= 0n || reserveTokens <= 0n) {
    throw new Error('reserves must be positive');
  }
  const k = constantProductK(reservePoints, reserveTokens);
  const newRt = reserveTokens + tokensIn;
  const newRp = k / newRt;
  const pointsOut = reservePoints - newRp;
  if (pointsOut <= 0n) {
    throw new Error('zero or negative pointsOut');
  }
  return {pointsOut, newReservePoints: newRp, newReserveTokens: newRt};
}

/** amount = floor(max * ratio), ratio in [0,1] */
export function amountFromSliderRatio(max: bigint, ratio01: number): bigint {
  if (max <= 0n || ratio01 <= 0) {
    return 0n;
  }
  if (ratio01 >= 1) {
    return max;
  }
  const scaled = Math.min(1_000_000, Math.max(0, Math.floor(ratio01 * 1_000_000)));
  return (max * BigInt(scaled)) / 1_000_000n;
}

export function bigIntToSafeNumber(n: bigint): number {
  const max = BigInt(Number.MAX_SAFE_INTEGER);
  if (n > max) {
    return Number.MAX_SAFE_INTEGER;
  }
  if (n < -max) {
    return Number.MIN_SAFE_INTEGER;
  }
  return Number(n);
}

/** Mid spot: points per 1 pool token. */
export function midSpotPriceDecimal(
  reservePoints: bigint,
  reserveTokens: bigint,
  fracDigits = 12,
): string {
  if (reserveTokens <= 0n) {
    return '0';
  }
  return formatRatioDecimal(reservePoints, reserveTokens, fracDigits);
}

/** AMM: points to buy exactly 1 pool token. */
export function buyOneTokenPointsCost(
  reservePoints: bigint,
  reserveTokens: bigint,
): bigint {
  if (reserveTokens <= 1n) {
    throw new Error('reserveTokens too small');
  }
  if (reservePoints <= 0n) {
    throw new Error('reserves must be positive');
  }
  const k = constantProductK(reservePoints, reserveTokens);
  const newRt = reserveTokens - 1n;
  const newRp = k / newRt;
  const cost = newRp - reservePoints;
  if (cost <= 0n) {
    throw new Error('zero buy cost');
  }
  return cost;
}

/** AMM: points for selling exactly 1 pool token. */
export function sellOneTokenPointsOut(
  reservePoints: bigint,
  reserveTokens: bigint,
): bigint {
  return sellPointsOut(reservePoints, reserveTokens, 1n).pointsOut;
}

export function buyOneTokenPriceDecimal(
  reservePoints: bigint,
  reserveTokens: bigint,
  fracDigits = 12,
): string | null {
  try {
    return formatRatioDecimal(
      buyOneTokenPointsCost(reservePoints, reserveTokens),
      1n,
      fracDigits,
    );
  } catch {
    return null;
  }
}

export function sellOneTokenPriceDecimal(
  reservePoints: bigint,
  reserveTokens: bigint,
  fracDigits = 12,
): string | null {
  try {
    return formatRatioDecimal(
      sellOneTokenPointsOut(reservePoints, reserveTokens),
      1n,
      fracDigits,
    );
  } catch {
    return null;
  }
}

export function formatRatioDecimal(
  numerator: bigint,
  denominator: bigint,
  fracDigits: number,
): string {
  if (denominator === 0n) {
    return '0';
  }
  const neg = (numerator < 0n) !== (denominator < 0n);
  const n = numerator < 0n ? -numerator : numerator;
  const d = denominator < 0n ? -denominator : denominator;
  const intPart = n / d;
  let rem = n % d;
  const fd = Math.min(Math.max(0, Math.floor(fracDigits)), 36);
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
