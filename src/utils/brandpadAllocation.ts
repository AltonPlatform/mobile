/**
 * Client-side preview of token allocation (backend is source of truth).
 * 90% of brandpad allocation — proportional; 10% — top-16 bonus (whitepaper %).
 */

export const DEFAULT_TOTAL_SUPPLY = 10_000_000n;
export const DEFAULT_BRANDPAD_ALLOCATION = 2_000_000n;

/** Bonus % of total brandpad allocation (2M), ranks 1–16. */
export const TOP_BACKER_BONUS_PCT: readonly number[] = [
  2.25, 1.75, 1.25, 1, 0.75, 0.6, 0.5, 0.4, 0.3, 0.25, 0.25, 0.2, 0.2,
  0.15, 0.1, 0.05,
];

const BASE_SHARE_NUM = 90n;
const BASE_SHARE_DEN = 100n;

export function parseBrandpadBigInt(
  s: string | undefined | null,
  fallback = '0',
): bigint {
  if (s == null || s === '') {
    return 0n;
  }
  try {
    return BigInt(s);
  } catch {
    return BigInt(fallback);
  }
}

export function bonusPercentForRank(rank: number): number | null {
  if (rank < 1 || rank > TOP_BACKER_BONUS_PCT.length) {
    return null;
  }
  return TOP_BACKER_BONUS_PCT[rank - 1];
}

export function bonusTokensForRank(
  allocation: bigint,
  rank: number,
): bigint {
  const pct = bonusPercentForRank(rank);
  if (pct == null || allocation <= 0n) {
    return 0n;
  }
  return (allocation * BigInt(Math.round(pct * 100))) / 10000n;
}

export type AllocationPreview = {
  baseTokens: bigint;
  bonusTokens: bigint;
  totalTokens: bigint;
  multiplier: number;
  sharePercent: number;
  bonusPercent: number | null;
};

export function previewAllocation(params: {
  userContributed: bigint;
  totalContributed: bigint;
  brandpadAllocation?: bigint;
  rank?: number;
}): AllocationPreview | null {
  const {userContributed, totalContributed} = params;
  const allocation = params.brandpadAllocation ?? DEFAULT_BRANDPAD_ALLOCATION;

  if (userContributed <= 0n || totalContributed <= 0n || allocation <= 0n) {
    return null;
  }

  const basePool = (allocation * BASE_SHARE_NUM) / BASE_SHARE_DEN;
  const baseTokens = (basePool * userContributed) / totalContributed;

  const rank = params.rank ?? 0;
  const bonusTokens =
    rank >= 1 && rank <= 16 ? bonusTokensForRank(allocation, rank) : 0n;

  const totalTokens = baseTokens + bonusTokens;

  const sharePercent =
    Number((userContributed * 10000n) / totalContributed) / 100;

  const multiplier =
    userContributed > 0n
      ? Number((totalTokens * 10000n) / userContributed) / 10000
      : 0;

  return {
    baseTokens,
    bonusTokens,
    totalTokens,
    multiplier,
    sharePercent,
    bonusPercent: bonusPercentForRank(rank),
  };
}

export function formatMultiplier(m: number): string {
  if (!Number.isFinite(m) || m <= 0) {
    return '—';
  }
  return `${m.toFixed(2)}x`;
}

/** Fixed split: backers get brandpadAllocation; rest goes to pool AMM on launch. */
export type BrandpadTokenomicsSplit = {
  totalSupply: bigint;
  brandpadTokens: bigint;
  poolTokens: bigint;
  brandpadPercent: number;
  poolPercent: number;
};

export function computeBrandpadTokenomicsSplit(
  totalSupply: string | bigint,
  brandpadAllocation: string | bigint,
): BrandpadTokenomicsSplit {
  const supply =
    typeof totalSupply === 'bigint'
      ? totalSupply
      : parseBrandpadBigInt(String(totalSupply), String(DEFAULT_TOTAL_SUPPLY));
  const brandpad =
    typeof brandpadAllocation === 'bigint'
      ? brandpadAllocation
      : parseBrandpadBigInt(
          String(brandpadAllocation),
          String(DEFAULT_BRANDPAD_ALLOCATION),
        );

  const pool =
    supply > brandpad ? supply - brandpad : 0n;
  const brandpadPercent =
    supply > 0n
      ? Number((brandpad * 10000n) / supply) / 100
      : 0;
  const poolPercent =
    supply > 0n ? Math.max(0, 100 - brandpadPercent) : 0;

  return {
    totalSupply: supply,
    brandpadTokens: brandpad,
    poolTokens: pool,
    brandpadPercent,
    poolPercent,
  };
}

export function formatSharePercent(p: number): string {
  if (!Number.isFinite(p)) {
    return '0%';
  }
  if (p >= 100) {
    return '100%';
  }
  if (p < 0.01 && p > 0) {
    return '<0.01%';
  }
  return `${p.toFixed(2)}%`;
}
