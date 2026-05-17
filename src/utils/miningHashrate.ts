export function getMult(clicks: number): number {
  if (clicks < 10) return Math.max(0.3, clicks * 0.07);
  if (clicks < 20) return 1 + (clicks - 10) * 0.1;
  if (clicks < 30) return 2 + (clicks - 20) * 0.1;
  if (clicks < 40) return 3 + (clicks - 30) * 0.1;
  return 4 + (clicks - 40) * 0.08;
}

export function calcHashrate(stake: number, clicks: number): number {
  return Math.round(stake * getMult(clicks));
}

/** Must match backend REWARD_COEF */
export const REWARD_COEF = 0.01;

export function maxRewardPreview(stake: number): number {
  return Math.round(calcHashrate(stake, 40) * 30 * REWARD_COEF);
}
