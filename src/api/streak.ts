import {api} from './client';

export type StreakReward = {
  balance: number;
  chartTickets: number;
  miningTickets: number;
};

export type MilestoneReached = {
  day: number;
  reward: StreakReward;
};

export type ClaimDailyBonusResponse = {
  message: string;
  streak: number;
  reward: StreakReward;
  milestoneReached: MilestoneReached | null;
  nextMilestone: number | null;
  daysUntilNextMilestone: number | null;
  streakStartDate: string | null;
};

export type StreakInfoResponse = {
  streak: number;
  longestStreak: number;
  claimedToday: boolean;
  effectiveStreak: number;
  nextClaimDay: number;
  currentDayReward: StreakReward;
  dailyRewards: Array<StreakReward & {day: number}>;
  dailyRewardAfter7: StreakReward;
  claimedMilestones: number[];
  nextMilestone: number | null;
  daysUntilNextMilestone: number | null;
  streakStartDate: string | null;
};

export async function fetchStreakInfo(): Promise<StreakInfoResponse> {
  const {data} = await api.get<StreakInfoResponse>('/api/users/streak');
  return data;
}

export async function claimDailyBonus(): Promise<ClaimDailyBonusResponse> {
  const {data} = await api.post<ClaimDailyBonusResponse>('/api/users/daily');
  return data;
}
