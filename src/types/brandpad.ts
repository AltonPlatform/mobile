/** BrandPad launchpad DTO — amounts as strings (bigint on backend). */

export type BrandPadStatus = 'active' | 'succeeded' | 'failed';

export type BrandPad = {
  id: string;
  name: string;
  icon: string;
  description?: string | null;
  totalSupply: string;
  brandpadAllocation: string;
  totalContributed: string;
  participantCount: number;
  minParticipants: number;
  minTotalContributed: string;
  status: BrandPadStatus;
  startsAt: string;
  endsAt: string;
  poolId: string | null;
  createdAt: string;
};

export type BrandPadBacker = {
  rank: number;
  userId: number;
  username: string | null;
  firstName: string | null;
  contributed: string;
  share: string;
  tokensAllocated: string;
  bonusTokens: string;
  multiplier: string;
  bonusPercent: string | null;
  isCurrentUser: boolean;
};

export type BrandPadMeResponse = {
  contributed: string;
  rank: number;
  tokensAllocated: string;
  bonusTokens: string;
  multiplier: string;
};

export type BrandPadContributeBody = {
  amount: number;
  idempotencyKey?: string;
};

export type BrandPadContributeResponse = {
  contributed: string;
  totalContributed: string;
  participantCount: number;
  balance: number;
};

export type BrandPadLeaderboardResponse = {
  items: BrandPadBacker[];
  total: number;
};

export type BrandPadHistoryResponse = {
  items: BrandPad[];
  nextOffset: number | null;
};
