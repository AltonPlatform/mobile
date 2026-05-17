/** Must match backend GAME_DURATION_MS */
export const GAME_DURATION_MS = 30_000;

/** Must match backend REWARD_COEF */
export const REWARD_COEF = 0.01;

/**
 * Квадратичный множитель: x² / 270.
 * При 30 кликах mult ≈ 3.33 → stake × 3.33 × 30 × REWARD_COEF ≈ stake (100% от стейка).
 */
export function getMult(clicks: number): number {
  if (clicks < 1) return 0.3;
  return Math.max(0.3, Math.pow(clicks, 2) / 270);
}

/** Текущая награда за раунд (как на сервере при завершении) */
export function currentReward(
  stake: number,
  clicks: number,
  elapsedSec: number,
): number {
  if (clicks < 1 || elapsedSec <= 0) return 0;
  return Math.round(stake * getMult(clicks) * elapsedSec * REWARD_COEF);
}

/** Мощность «майнинга» (H/s): stake × mult. Монеты/с = hashrate × REWARD_COEF */
export function calcHashrate(stake: number, clicks: number): number {
  return Math.round(stake * getMult(clicks));
}

export function rewardPreview(
  stake: number,
  clicks: number,
  seconds = 30,
): number {
  return Math.round(stake * getMult(clicks) * seconds * REWARD_COEF);
}

/** Точка безубыточности: ~30 кликов за 30 с */
export function maxRewardPreview(stake: number): number {
  return rewardPreview(stake, 30);
}
