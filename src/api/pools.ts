import {api} from './client';
import type {
  BuyPoolBody,
  BuyPoolResponse,
  ClaimPoolsBody,
  ClaimPoolsResponse,
  PoolCategoriesResponse,
  PoolChartResponse,
  PoolDetailResponse,
  PoolMeResponse,
  PoolsListResponse,
  PoolsListSortBy,
  PoolsSummaryResponse,
  SellPoolBody,
  SellPoolResponse,
} from '../types/pools';

export async function fetchPoolsPage(params: {
  limit?: number;
  offset?: number;
  sortBy?: PoolsListSortBy;
  category?: string;
  search?: string;
}): Promise<PoolsListResponse> {
  const limit = Math.min(50, Math.max(1, params.limit ?? 20));
  const offset = Math.max(0, Math.floor(params.offset ?? 0));
  const {data} = await api.get<PoolsListResponse>('/api/pools', {
    params: {
      limit,
      offset,
      ...(params.sortBy ? {sortBy: params.sortBy} : {}),
      ...(params.category?.trim() ? {category: params.category.trim()} : {}),
      ...(params.search?.trim() ? {search: params.search.trim()} : {}),
    },
  });
  return data;
}

export async function fetchPoolCategories(): Promise<PoolCategoriesResponse> {
  const {data} = await api.get<PoolCategoriesResponse>('/api/pools/categories');
  return data;
}

export async function fetchPoolChart(
  poolId: string,
  params: {interval: '1h' | '1d'; limit?: number; before?: string},
): Promise<PoolChartResponse> {
  const {data} = await api.get<PoolChartResponse>(
    `/api/pools/${poolId}/chart`,
    {
      params: {
        interval: params.interval,
        ...(params.limit != null ? {limit: params.limit} : {}),
        ...(params.before ? {before: params.before} : {}),
      },
    },
  );
  return data;
}

export async function fetchPoolDetail(poolId: string): Promise<PoolDetailResponse> {
  const {data} = await api.get<PoolDetailResponse>(`/api/pools/${poolId}`);
  return data;
}

export async function fetchPoolMe(poolId: string): Promise<PoolMeResponse> {
  const {data} = await api.get<PoolMeResponse>(`/api/pools/${poolId}/me`);
  return data;
}

export async function fetchPoolsSummary(): Promise<PoolsSummaryResponse> {
  const {data} = await api.get<PoolsSummaryResponse>('/api/pools/me/summary');
  return data;
}

export async function postPoolBuy(
  poolId: string,
  body: BuyPoolBody,
): Promise<BuyPoolResponse> {
  const {data} = await api.post<BuyPoolResponse>(`/api/pools/${poolId}/buy`, body);
  return data;
}

export async function postPoolSell(
  poolId: string,
  body: SellPoolBody,
): Promise<SellPoolResponse> {
  const {data} = await api.post<SellPoolResponse>(`/api/pools/${poolId}/sell`, body);
  return data;
}

export async function postPoolsClaim(
  body: ClaimPoolsBody,
): Promise<ClaimPoolsResponse> {
  const {data} = await api.post<ClaimPoolsResponse>('/api/pools/claim', body ?? {});
  return data;
}
