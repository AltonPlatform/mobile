import {useCallback, useEffect, useRef, useState} from 'react';
import {
  calcHashrate,
  currentReward,
  GAME_DURATION_MS,
} from '../utils/miningHashrate';
const SAMPLE_INTERVAL_MS = 100;

export type HashSample = {t: number; hashrate: number};

type Options = {
  running: boolean;
  /** Абсолютный дедлайн с бэкенда (startedAt + 30s), wall-clock */
  gameEndsAt: number | null;
  stake: number;
  clicks: number;
  /** После ошибки монеты не копятся (как на сервере) */
  accrueReward: boolean;
  onTimeout: () => void;
};

export function useGameLoop({
  running,
  gameEndsAt,
  stake,
  clicks,
  accrueReward,
  onTimeout,
}: Options) {
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION_MS / 1000);
  const [visualReward, setVisualReward] = useState(0);
  const [samples, setSamples] = useState<HashSample[]>([]);
  const [displayHashrate, setDisplayHashrate] = useState(0);

  const onTimeoutRef = useRef(onTimeout);
  const endedRef = useRef(false);
  const stakeRef = useRef(stake);
  const clicksRef = useRef(clicks);
  const gameEndsAtRef = useRef(gameEndsAt);
  const accrueRewardRef = useRef(accrueReward);
  const lastSampleAtRef = useRef(0);

  onTimeoutRef.current = onTimeout;
  stakeRef.current = stake;
  clicksRef.current = clicks;
  gameEndsAtRef.current = gameEndsAt;
  accrueRewardRef.current = accrueReward;

  useEffect(() => {
    if (!accrueReward) {
      setVisualReward(0);
    }
  }, [accrueReward]);

  useEffect(() => {
    setDisplayHashrate(calcHashrate(stake, clicks));
  }, [stake, clicks]);

  const msLeft = useCallback(() => {
    const ends = gameEndsAtRef.current;
    if (!ends) return GAME_DURATION_MS;
    return Math.max(0, ends - Date.now());
  }, []);

  const elapsedMs = useCallback(() => {
    const ends = gameEndsAtRef.current;
    if (!ends) return 0;
    return Math.min(GAME_DURATION_MS, Math.max(0, GAME_DURATION_MS - msLeft()));
  }, [msLeft]);

  useEffect(() => {
    if (!running || !gameEndsAt) {
      return;
    }
    endedRef.current = false;
    lastSampleAtRef.current = 0;

    let raf = 0;

    const tick = (now: number) => {
      const left = msLeft();
      setTimeLeft(left / 1000);

      if (stakeRef.current > 0) {
        const hr = calcHashrate(stakeRef.current, clicksRef.current);
        setDisplayHashrate(hr);
        if (accrueRewardRef.current) {
          const elapsedSec = elapsedMs() / 1000;
          setVisualReward(
            currentReward(
              stakeRef.current,
              clicksRef.current,
              elapsedSec,
            ),
          );
        }
        if (now - lastSampleAtRef.current >= SAMPLE_INTERVAL_MS) {
          lastSampleAtRef.current = now;
          const elapsed = elapsedMs();
          setSamples(s => {
            const next = [...s, {t: elapsed / 1000, hashrate: hr}];
            return next.length > 120 ? next.slice(-120) : next;
          });
        }
      }

      if (left <= 0 && !endedRef.current) {
        endedRef.current = true;
        onTimeoutRef.current();
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, gameEndsAt, msLeft, elapsedMs]);

  const reset = () => {
    setTimeLeft(GAME_DURATION_MS / 1000);
    setVisualReward(0);
    setSamples([]);
    setDisplayHashrate(0);
    endedRef.current = false;
    lastSampleAtRef.current = 0;
  };

  const syncTimeFromServer = useCallback(
    (serverEndsAt: number, timeLeftMs?: number) => {
      const synced =
        timeLeftMs != null
          ? Date.now() + timeLeftMs
          : serverEndsAt;
      gameEndsAtRef.current = synced;
    },
    [],
  );

  return {
    timeLeft,
    visualReward,
    samples,
    hashrate: displayHashrate,
    reset,
    syncTimeFromServer,
  };
}
