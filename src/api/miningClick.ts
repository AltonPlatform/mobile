import {api} from './client';

export type TicketTier = 'none' | 'bronze' | 'silver' | 'gold' | 'diamond';

export type FinishReason = 'timeout' | 'overheat' | 'cashout';

export type MiningGameConfig = {
  stakes: number[];
  allowedStakes: number[];
  maxStake: number;
  balance: number;
  miningTickets: number | null;
  ticketTiers: Record<TicketTier, {lives: number; label: string}>;
  ticketTierList: TicketTier[];
  wsPath: string;
  wsUrl: string;
};

export type StartMiningSessionResponse = {
  sessionId: string;
  livesRemaining: number;
  startsAt: number;
  activeBlock: number;
  wsUrl: string;
  wsPath: string;
};

export type EndMiningSessionResponse = {
  verifiedReward: number;
  finalHashrate: number;
  totalClicks: number;
  maxCombo: number;
  balance: number;
};

export type MiningLeaderboardEntry = {
  rank: number;
  userId: number;
  firstName: string;
  lastName: string;
  maxCombo: number;
  totalClicks: number;
  reward: number;
  finishedAt: string;
};

export async function fetchMiningLeaderboard(
  limit = 20,
): Promise<{entries: MiningLeaderboardEntry[]}> {
  const {data} = await api.get<{entries: MiningLeaderboardEntry[]}>(
    '/api/game/mining/leaderboard',
    {params: {limit}},
  );
  return data;
}

export async function fetchMiningGameConfig(): Promise<MiningGameConfig> {
  const {data} = await api.get<MiningGameConfig>('/api/game/mining/config');
  return data;
}

/** @deprecated Session starts via WebSocket `{ type: 'start' }` */
export async function startMiningSession(body: {
  stake: number;
  ticketTier: TicketTier;
  useTicket?: boolean;
}): Promise<StartMiningSessionResponse> {
  const {data} = await api.post<StartMiningSessionResponse>(
    '/api/game/mining/session',
    body,
  );
  return data;
}

export async function continueMiningAfterAd(
  sessionId: string,
): Promise<{ok: boolean}> {
  const {data} = await api.post<{ok: boolean}>(
    `/api/game/mining/session/${sessionId}/continue-ad`,
  );
  return data;
}

export async function endMiningSession(
  sessionId: string,
  body: {reason: FinishReason; clientReward?: number},
): Promise<EndMiningSessionResponse> {
  const {data} = await api.post<EndMiningSessionResponse>(
    `/api/game/mining/session/${sessionId}/end`,
    body,
  );
  return data;
}
