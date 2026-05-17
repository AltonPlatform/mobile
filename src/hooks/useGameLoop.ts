import {useCallback, useEffect, useRef, useState} from 'react';
import {calcHashrate} from '../utils/miningHashrate';

const GAME_MS = 30_000;
import {REWARD_COEF} from '../utils/miningHashrate';

const REWARD_RATE = REWARD_COEF;
const SAMPLE_INTERVAL_MS = 100;

export type HashSample = {t: number; hashrate: number};

type Options = {
  running: boolean;
  paused: boolean;
  startsAt: number | null;
  stake: number;
  clicks: number;
  onTimeout: () => void;
};

export function useGameLoop({
  running,
  paused,
  startsAt,
  stake,
  clicks,
  onTimeout,
}: Options) {
  const [timeLeft, setTimeLeft] = useState(GAME_MS / 1000);
  const [visualReward, setVisualReward] = useState(0);
  const [samples, setSamples] = useState<HashSample[]>([]);
  const [displayHashrate, setDisplayHashrate] = useState(0);

  const onTimeoutRef = useRef(onTimeout);
  const endedRef = useRef(false);
  const stakeRef = useRef(stake);
  const clicksRef = useRef(clicks);
  const pausedRef = useRef(paused);
  const pausedMsRef = useRef(0);
  const pauseStartedAtRef = useRef<number | null>(null);
  const lastSampleAtRef = useRef(0);

  onTimeoutRef.current = onTimeout;
  stakeRef.current = stake;
  clicksRef.current = clicks;
  pausedRef.current = paused;

  useEffect(() => {
    if (paused && pauseStartedAtRef.current == null) {
      pauseStartedAtRef.current = Date.now();
    }
    if (!paused && pauseStartedAtRef.current != null) {
      pausedMsRef.current += Date.now() - pauseStartedAtRef.current;
      pauseStartedAtRef.current = null;
    }
  }, [paused]);

  useEffect(() => {
    setDisplayHashrate(calcHashrate(stake, clicks));
  }, [stake, clicks]);

  const effectiveElapsed = useCallback(() => {
    if (!startsAt) return 0;
    let extra = pausedMsRef.current;
    if (pauseStartedAtRef.current != null) {
      extra += Date.now() - pauseStartedAtRef.current;
    }
    return Math.max(0, Date.now() - startsAt - extra);
  }, [startsAt]);

  useEffect(() => {
    if (!running || !startsAt) {
      return;
    }
    endedRef.current = false;
    lastSampleAtRef.current = 0;

    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(now - last, 100);
      last = now;
      const elapsed = effectiveElapsed();
      const left = Math.max(0, GAME_MS - elapsed);
      setTimeLeft(left / 1000);

      if (!pausedRef.current && stakeRef.current > 0) {
        const hr = calcHashrate(stakeRef.current, clicksRef.current);
        setDisplayHashrate(hr);
        setVisualReward(r => r + hr * REWARD_RATE * (dt / 1000));
        if (now - lastSampleAtRef.current >= SAMPLE_INTERVAL_MS) {
          lastSampleAtRef.current = now;
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
  }, [running, startsAt, effectiveElapsed]);

  const reset = () => {
    setTimeLeft(GAME_MS / 1000);
    setVisualReward(0);
    setSamples([]);
    setDisplayHashrate(0);
    endedRef.current = false;
    lastSampleAtRef.current = 0;
    pausedMsRef.current = 0;
    pauseStartedAtRef.current = null;
  };

  return {
    timeLeft,
    visualReward,
    samples,
    hashrate: displayHashrate,
    reset,
  };
}
