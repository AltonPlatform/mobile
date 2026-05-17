import {useCallback, useRef, useState} from 'react';
import type {TicketTier, FinishReason} from '../api/miningClick';
import {continueMiningAfterAd, endMiningSession} from '../api/miningClick';
import {useMiningSocket, type SessionTimeMeta} from './useMiningSocket';
import {GAME_DURATION_MS} from '../utils/miningHashrate';

export type GamePhase = 'idle' | 'playing' | 'mistake' | 'results';

function syncGameEndsAt(meta: SessionTimeMeta): number {
  return meta.timeLeftMs != null
    ? Date.now() + meta.timeLeftMs
    : meta.gameEndsAt;
}

export function useGameSession() {
  const socket = useMiningSocket();
  const endingRef = useRef(false);
  const [phase, setPhase] = useState<GamePhase>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [startsAt, setStartsAt] = useState<number | null>(null);
  const [gameEndsAt, setGameEndsAt] = useState<number | null>(null);
  const [activeBlock, setActiveBlock] = useState(0);
  const [livesRemaining, setLivesRemaining] = useState(0);
  const [clicks, setClicks] = useState(0);
  const [combo, setCombo] = useState(0);
  const [hashrate, setHashrate] = useState(0);
  const [stake, setStake] = useState(0);
  const [hadMistake, setHadMistake] = useState(false);
  const [endResult, setEndResult] = useState<{
    verifiedReward: number;
    reason: FinishReason;
    totalClicks: number;
    maxCombo: number;
    balance?: number;
  } | null>(null);

  const startGame = useCallback(
    async (opts: {
      stake: number;
      ticketTier: TicketTier;
      useTicket: boolean;
      wsPath: string;
    }) => {
      const res = await socket.startSession(opts);
      setSessionId(res.sessionId);
      setStartsAt(res.startsAt);
      setGameEndsAt(
        res.gameEndsAt ?? res.startsAt + GAME_DURATION_MS,
      );
      setActiveBlock(res.activeBlock);
      setLivesRemaining(res.livesRemaining);
      setClicks(0);
      setCombo(0);
      setStake(opts.stake);
      setHashrate(0);
      setHadMistake(false);
      setEndResult(null);
      endingRef.current = false;
      setPhase('playing');
    },
    [socket],
  );

  const sendClick = useCallback(
    async (blockIndex: number) => {
      if (endingRef.current) {
        throw new Error('Game is ending');
      }
      const msg = await socket.sendClick(blockIndex);
      if (msg.type === 'mistake_pending') {
        setLivesRemaining(msg.livesRemaining);
        setHadMistake(true);
        if (msg.gameEndsAt != null) {
          setGameEndsAt(syncGameEndsAt(msg));
        }
        setPhase('mistake');
        return {mistake: true as const, timeMeta: msg};
      }
      if (msg.gameEndsAt != null) {
        setGameEndsAt(syncGameEndsAt(msg));
      }
      setActiveBlock(msg.nextBlock);
      setClicks(msg.clicks);
      setCombo(msg.combo);
      setLivesRemaining(msg.livesRemaining);
      setHashrate(msg.hashrate);
      return {mistake: false as const, timeMeta: msg};
    },
    [socket],
  );

  const resolveWithLife = useCallback(async () => {
    if (endingRef.current) return;
    const msg = await socket.resolveMistake('use_life');
    setActiveBlock(msg.nextBlock);
    setLivesRemaining(msg.livesRemaining);
    setCombo(msg.combo);
    setHashrate(msg.hashrate);
    if (msg.gameEndsAt != null) {
      setGameEndsAt(syncGameEndsAt(msg));
    }
    setPhase('playing');
  }, [socket]);

  const grantAdAndResolve = useCallback(async () => {
    if (endingRef.current) return;
    const sid = sessionId ?? socket.getSessionId();
    if (!sid) return;
    await continueMiningAfterAd(sid);
    const msg = await socket.resolveMistake('ad');
    setActiveBlock(msg.nextBlock);
    setLivesRemaining(msg.livesRemaining);
    setCombo(msg.combo);
    setHashrate(msg.hashrate);
    if (msg.gameEndsAt != null) {
      setGameEndsAt(syncGameEndsAt(msg));
    }
    setPhase('playing');
  }, [sessionId, socket]);

  const endGame = useCallback(
    async (reason: FinishReason, clientReward?: number) => {
      const sid = sessionId ?? socket.getSessionId();
      if (!sid) return null;

      endingRef.current = true;
      await socket.drainQueue();

      try {
        const res = await endMiningSession(sid, {
          reason,
          clientReward,
        });

        setEndResult({
          verifiedReward: res.verifiedReward,
          reason,
          totalClicks: res.totalClicks,
          maxCombo: res.maxCombo,
          balance: res.balance,
        });
        setPhase('results');
        setSessionId(null);
        socket.closeConnection();
        return res;
      } catch (e) {
        endingRef.current = false;
        throw e;
      }
    },
    [sessionId, socket],
  );

  const resetToIdle = useCallback(() => {
    endingRef.current = false;
    socket.disconnect();
    setPhase('idle');
    setSessionId(null);
    setStartsAt(null);
    setGameEndsAt(null);
    setHadMistake(false);
    setEndResult(null);
  }, [socket]);

  return {
    phase,
    sessionId,
    startsAt,
    gameEndsAt,
    hadMistake,
    activeBlock,
    livesRemaining,
    clicks,
    combo,
    hashrate,
    stake,
    endResult,
    startGame,
    sendClick,
    resolveWithLife,
    grantAdAndResolve,
    endGame,
    resetToIdle,
  };
}
