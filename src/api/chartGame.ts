import {api} from './client';

export type ChartCandle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type ChartGameConfig = {
  stakes: number[];
  allowedStakes: number[];
  maxStake: number;
  balance: number;
  chartTickets: number | null;
  symbolLabels: Record<string, string>;
};

export type StartRoundResponse = {
  roundId: string;
  symbol: string;
  candles: ChartCandle[];
  cutoffTime: number;
  stake: number;
  usedTicket: boolean;
};

export type RevealRoundResponse = {
  roundId: string;
  revealCandles: ChartCandle[];
  result: 'up' | 'down';
  priceAtCutoff: number;
  priceAfter6h: number;
  changePct: string;
  won: boolean;
  payout: number;
  stake: number;
  canRefundAd: boolean;
  canRetryAd: boolean;
  balance: number;
};

export async function fetchChartGameConfig(): Promise<ChartGameConfig> {
  const {data} = await api.get<ChartGameConfig>('/api/game/chart/config');
  return data;
}

export async function startChartRound(body: {
  stake?: number;
  useTicket?: boolean;
}): Promise<StartRoundResponse> {
  const {data} = await api.post<StartRoundResponse>('/api/game/chart/round', body);
  return data;
}

export async function revealChartRound(
  roundId: string,
  prediction: 'up' | 'down',
): Promise<RevealRoundResponse> {
  const {data} = await api.post<RevealRoundResponse>(
    `/api/game/chart/round/${roundId}/reveal`,
    {prediction},
  );
  return data;
}

export async function refundChartAfterAd(): Promise<{
  refunded: number;
  balance: number;
}> {
  const {data} = await api.post<{refunded: number; balance: number}>(
    '/api/game/chart/refund-ad',
  );
  return data;
}

export async function addChartTicketAfterAd(): Promise<{chartTickets: number | null}> {
  const {data} = await api.get<{chartTickets: number | null}>(
    '/api/game/chart/ticket/add',
  );
  return data;
}
