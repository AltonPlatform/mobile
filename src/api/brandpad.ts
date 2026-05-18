import {api} from './client';
import type {
  BrandPad,
  BrandPadContributeBody,
  BrandPadContributeResponse,
  BrandPadHistoryResponse,
  BrandPadLeaderboardResponse,
  BrandPadMeResponse,
} from '../types/brandpad';

export async function fetchActiveBrandPad(): Promise<BrandPad | null> {
  const {data} = await api.get<BrandPad | null>('/api/brandpad/active');
  return data;
}

export async function fetchBrandPad(id: string): Promise<BrandPad> {
  const {data} = await api.get<BrandPad>(`/api/brandpad/${id}`);
  return data;
}

export async function fetchBrandPadMe(id: string): Promise<BrandPadMeResponse> {
  const {data} = await api.get<BrandPadMeResponse>(`/api/brandpad/${id}/me`);
  return data;
}

export async function fetchBrandPadLeaderboard(
  id: string,
  params?: {limit?: number; offset?: number},
): Promise<BrandPadLeaderboardResponse> {
  const limit = Math.min(50, Math.max(1, params?.limit ?? 20));
  const offset = Math.max(0, Math.floor(params?.offset ?? 0));
  const {data} = await api.get<BrandPadLeaderboardResponse>(
    `/api/brandpad/${id}/leaderboard`,
    {params: {limit, offset}},
  );
  return data;
}

export async function postBrandPadContribute(
  id: string,
  body: BrandPadContributeBody,
): Promise<BrandPadContributeResponse> {
  const {data} = await api.post<BrandPadContributeResponse>(
    `/api/brandpad/${id}/contribute`,
    body,
  );
  return data;
}

export async function fetchBrandPadHistory(params?: {
  limit?: number;
  offset?: number;
}): Promise<BrandPadHistoryResponse> {
  const limit = Math.min(50, Math.max(1, params?.limit ?? 20));
  const offset = Math.max(0, Math.floor(params?.offset ?? 0));
  const {data} = await api.get<BrandPadHistoryResponse>('/api/brandpad/history', {
    params: {limit, offset},
  });
  return data;
}
