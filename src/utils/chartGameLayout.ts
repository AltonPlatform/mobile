/** Must match backend `domain/chartGame/types.ts`. */
export const CHART_GAME_VISIBLE = 12;
export const CHART_GAME_REVEAL = 6;
export const CHART_GAME_TOTAL_SLOTS = 18;
export const CHART_GAME_CUTOFF_INDEX = 12;
/** 12 / 18 — доля ширины блока под историю до отсечки */
export const CHART_GAME_VISIBLE_WIDTH_RATIO =
  CHART_GAME_VISIBLE / CHART_GAME_TOTAL_SLOTS;
