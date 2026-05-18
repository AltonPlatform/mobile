import {useEffect, useState} from 'react';
import {useQuery} from '@tanstack/react-query';

import {fetchPoolsSummary} from '../api/pools';
import {estimateTotalUnclaimedAt} from '../utils/poolFarmingCycle';

/** Интервал опроса summary — редкий; UI крутится локально. */
export const POOLS_SUMMARY_REFETCH_MS = 60_000;
export const POOLS_SUMMARY_STALE_MS = 25_000;
/** Логика claim/cooldown — раз в секунду. */
export const POOLS_SUMMARY_TICK_MS = 1_000;

/**
 * Pools summary + live unclaimed (без лишних запросов на бэкенд).
 * `displayNowMs` обновляется каждый кадр — линейный прирост награды на UI.
 */
export function usePoolsSummaryLive(enabled: boolean) {
  const query = useQuery({
    queryKey: ['poolsSummary'],
    queryFn: fetchPoolsSummary,
    enabled,
    retry: false,
    staleTime: POOLS_SUMMARY_STALE_MS,
    refetchInterval: POOLS_SUMMARY_REFETCH_MS,
  });

  const [tickMs, setTickMs] = useState(() => Date.now());
  const [displayNowMs, setDisplayNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setTickMs(Date.now()), POOLS_SUMMARY_TICK_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      setDisplayNowMs(Date.now());
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const syncedAtMs =
    query.dataUpdatedAt > 0 ? query.dataUpdatedAt : tickMs;

  const estimatedUnclaimed = estimateTotalUnclaimedAt(
    query.data,
    syncedAtMs,
    tickMs,
  );

  return {
    ...query,
    /** Для claim / cooldown (1 Hz). */
    nowMs: tickMs,
    /** Для плавного линейного UI (кадры). */
    displayNowMs,
    syncedAtMs,
    estimatedUnclaimed,
  };
}
