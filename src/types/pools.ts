/** DTO farming pools — большие целые как string (bigint с бэкенда). */

export type SerializedPool = {
  id: string;
  slug: string;
  name: string;
  category?: string | null;
  description?: string | null;
  icon?: string | null;
  reservePoints: string;
  reserveTokens: string;
  totalUserHeldTokens: string;
  emissionPerHour: number;
  maxSupply: string;
  spotPriceApprox: string;
  createdAt: string;
  updatedAt: string;
};

export type PoolsListSortBy =
  | 'newest'
  | 'oldest'
  | 'name_asc'
  | 'name_desc'
  | 'spot_high'
  | 'spot_low';

export type PoolsListResponse = {
  items: SerializedPool[];
  nextOffset: number | null;
};

export type PoolCategoriesResponse = {
  categories: string[];
};

export type PoolChartPoint = {
  t: string;
  /** Mid AMM: points per token (reservePoints / reserveTokens). */
  spotPriceApprox: string;
  /** Points per 1 token when buying 1 token via AMM (optional). */
  buyPriceApprox?: string;
  /** Points per 1 token when selling 1 token via AMM (optional). */
  sellPriceApprox?: string;
};

export type PoolChartResponse = {
  interval: '1h' | '1d';
  points: PoolChartPoint[];
  hasMore?: boolean;
};

export type PoolDetailResponse = SerializedPool & {
  volume24hPoints: string;
};

export type PoolMeResponse = {
  poolId: string;
  amount: string;
  storedRewards: string;
  lastRewardUpdate: string | null;
  totalPointsSpent: string;
  pool: SerializedPool;
};

export type PoolsByPoolRow = {
  poolId: string;
  amount: string;
  storedRewards: string;
  poolName?: string;
};

export type PoolsSummaryResponse = {
  totalUnclaimedStoredRewards: string;
  totalFarmingRewardsClaimed: string;
  totalFarmingProfitEstimate: string;
  lastFarmingClaimAt: string | null;
  byPool: PoolsByPoolRow[];
};

export type BuyPoolResponse = {
  tokensOut: string;
  reservePoints: string;
  reserveTokens: string;
  spotApprox: string;
};

export type SellPoolResponse = {
  pointsOut: string;
  reservePoints: string;
  reserveTokens: string;
};

export type ClaimPoolsResponse = {
  totalPayout: string;
  balance: number;
  nextClaimAt: string | null;
};

export type BuyPoolBody = {
  pointsAmount: number;
  minTokensOut?: string;
  idempotencyKey?: string;
};

export type SellPoolBody = {
  tokenAmount: string;
  minPointsOut?: string;
  idempotencyKey?: string;
};

export type ClaimPoolsBody = {
  idempotencyKey?: string;
};
