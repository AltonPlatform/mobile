import type {PoolsSummaryResponse} from '../types/pools';

/** Farming pools: 6h claim cooldown (matches backend CLAIM_COOLDOWN_MS). */
export const FARMING_CLAIM_COOLDOWN_MS = 6 * 60 * 60 * 1000;
export const FARMING_CLAIM_COOLDOWN_SECONDS = FARMING_CLAIM_COOLDOWN_MS / 1000;

/** Max idle accrual between syncs (matches backend MAX_IDLE_MS). */
export const POOL_MAX_IDLE_MS = 6 * 60 * 60 * 1000;
const MS_PER_HOUR_BI = 3_600_000n;

export function nextClaimAtFromSummary(
  lastFarmingClaimAt: string | null,
): string | null {
  if (!lastFarmingClaimAt) {
    return null;
  }
  const t0 = new Date(lastFarmingClaimAt).getTime();
  if (!Number.isFinite(t0)) {
    return null;
  }
  return new Date(t0 + FARMING_CLAIM_COOLDOWN_MS).toISOString();
}

export function getFarmingCooldownRemainingMs(
  lastFarmingClaimAt: string | null | undefined,
  nowMs: number = Date.now(),
): number {
  const next = nextClaimAtFromSummary(lastFarmingClaimAt ?? null);
  if (!next) {
    return 0;
  }
  return Math.max(0, new Date(next).getTime() - nowMs);
}

export function isFarmingClaimOnCooldown(
  lastFarmingClaimAt: string | null | undefined,
  nowMs: number = Date.now(),
): boolean {
  return getFarmingCooldownRemainingMs(lastFarmingClaimAt, nowMs) > 0;
}

/** Claim доступен: есть unclaimed и прошёл 6ч cooldown (или claim ещё не было). */
export function isFarmingClaimReady(
  lastFarmingClaimAt: string | null | undefined,
  totalUnclaimedStoredRewards: string | undefined | null,
  nowMs: number = Date.now(),
): boolean {
  return (
    hasUnclaimedPoolRewards(totalUnclaimedStoredRewards) &&
    !isFarmingClaimOnCooldown(lastFarmingClaimAt, nowMs)
  );
}

/**
 * Заполнение bullcoin как TWA `calculatePercentage(claim)`:
 * растёт 0→100 за 6ч после claim; при готовности к claim — сразу 100%.
 */
export function getFarmingBullcoinFillPercent(
  lastFarmingClaimAt: string | null | undefined,
  totalUnclaimedStoredRewards: string | undefined | null,
  nowMs: number = Date.now(),
): number {
  if (
    isFarmingClaimReady(lastFarmingClaimAt, totalUnclaimedStoredRewards, nowMs)
  ) {
    return 100;
  }
  return getFarmingCycleFillPercent(lastFarmingClaimAt, nowMs);
}

/** 0–100: progress through 6h cooldown since last farming claim. */
export function getFarmingCycleFillPercent(
  lastFarmingClaimAt: string | null | undefined,
  nowMs: number = Date.now(),
): number {
  if (!lastFarmingClaimAt) {
    return 0;
  }
  const t0 = new Date(lastFarmingClaimAt).getTime();
  if (!Number.isFinite(t0)) {
    return 0;
  }
  const elapsed = nowMs - t0;
  if (elapsed <= 0) {
    return 0;
  }
  const pct = (elapsed / FARMING_CLAIM_COOLDOWN_MS) * 100;
  return Math.min(100, Math.max(0, pct));
}

export function getFarmingCooldownRemainingSeconds(
  lastFarmingClaimAt: string | null | undefined,
  nowMs: number = Date.now(),
): number {
  return Math.min(
    FARMING_CLAIM_COOLDOWN_SECONDS,
    getFarmingCooldownRemainingMs(lastFarmingClaimAt, nowMs) / 1000,
  );
}

export function formatFarmingCountdown(ms: number): string {
  if (ms <= 0) {
    return '0:00:00';
  }
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Parse backend bigint string for display (floored). */
export function parsePoolAmountString(value: string | undefined | null): bigint {
  if (value == null || value === '') {
    return 0n;
  }
  try {
    return BigInt(value);
  } catch {
    return 0n;
  }
}

export function formatPoolBigIntForDisplay(
  value: string | undefined | null,
): string {
  const n = parsePoolAmountString(value);
  if (n <= BigInt(Number.MAX_SAFE_INTEGER)) {
    return Math.floor(Number(n)).toLocaleString(undefined, {
      maximumFractionDigits: 0,
    });
  }
  return n.toString();
}

export function hasUnclaimedPoolRewards(
  totalUnclaimedStoredRewards: string | undefined | null,
): boolean {
  return parsePoolAmountString(totalUnclaimedStoredRewards) > 0n;
}

export function hasPoolPositions(byPoolLength: number): boolean {
  return byPoolLength > 0;
}

type SummaryRewardHourInput = {
  totalRewardPerHour?: string | null;
  byPool?: Array<{rewardPerHour?: string | null}>;
};

/** API total or sum of per-pool rates (fallback for older backend builds). */
/**
 * Оценка unclaimed между запросами summary: база с бэка (уже с idle на момент sync)
 * + rate * elapsed, с cap 6h как у `computeIdleEarned`.
 */
export function estimateTotalUnclaimedAt(
  summary: PoolsSummaryResponse | null | undefined,
  syncedAtMs: number,
  nowMs: number = Date.now(),
): string {
  if (!summary) {
    return '0';
  }
  const base = parsePoolAmountString(summary.totalUnclaimedStoredRewards);
  const rate = parsePoolAmountString(resolveTotalRewardPerHour(summary));
  if (rate === 0n) {
    return base.toString();
  }
  const elapsedMs = Math.max(0, nowMs - syncedAtMs);
  let elapsedBi = BigInt(elapsedMs);
  const maxIdleBi = BigInt(POOL_MAX_IDLE_MS);
  if (elapsedBi > maxIdleBi) {
    elapsedBi = maxIdleBi;
  }
  const earned = (rate * elapsedBi) / MS_PER_HOUR_BI;
  return (base + earned).toString();
}

/**
 * То же, что `estimateTotalUnclaimedAt`, но в Number для непрерывного UI (линейно по времени).
 */
export function estimateUnclaimedNumberAt(
  summary: PoolsSummaryResponse | null | undefined,
  syncedAtMs: number,
  nowMs: number = Date.now(),
): number {
  if (!summary) {
    return 0;
  }
  const base = Number(parsePoolAmountString(summary.totalUnclaimedStoredRewards));
  const rate = Number(parsePoolAmountString(resolveTotalRewardPerHour(summary)));
  if (!Number.isFinite(base)) {
    return 0;
  }
  if (!Number.isFinite(rate) || rate === 0) {
    return base;
  }
  const elapsedMs = Math.min(
    Math.max(0, nowMs - syncedAtMs),
    POOL_MAX_IDLE_MS,
  );
  return base + (rate * elapsedMs) / 3600000;
}

/** Формат награды в таймере: при малом приросте — дробная часть, иначе целое. */
export function formatLinearEarnedDisplay(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return '0';
  }
  if (value >= 1_000_000) {
    return Math.floor(value).toLocaleString(undefined, {
      maximumFractionDigits: 0,
    });
  }
  if (value >= 10_000) {
    return Math.floor(value).toLocaleString(undefined, {
      maximumFractionDigits: 0,
    });
  }
  if (value >= 100) {
    return value.toLocaleString(undefined, {maximumFractionDigits: 1});
  }
  return value.toLocaleString(undefined, {maximumFractionDigits: 2});
}

export function resolveTotalRewardPerHour(
  summary: SummaryRewardHourInput | null | undefined,
): string {
  if (!summary) {
    return '0';
  }
  if (
    summary.totalRewardPerHour != null &&
    summary.totalRewardPerHour !== ''
  ) {
    return summary.totalRewardPerHour;
  }
  if (!summary.byPool?.length) {
    return '0';
  }
  let sum = 0n;
  for (const row of summary.byPool) {
    sum += parsePoolAmountString(row.rewardPerHour);
  }
  return sum.toString();
}
