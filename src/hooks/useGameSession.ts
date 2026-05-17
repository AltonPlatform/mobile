import {useCallback, useState} from 'react';
import type {TicketTier, FinishReason} from '../api/miningClick';
import {continueMiningAfterAd, endMiningSession} from '../api/miningClick';
import {useMiningSocket} from './useMiningSocket';

export type GamePhase = 'idle' | 'playing' | 'mistake' | 'results';

export function useGameSession() {
  const socket = useMiningSocket();
  const [phase, setPhase] = useState<GamePhase>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [startsAt, setStartsAt] = useState<number | null>(null);
  const [activeBlock, setActiveBlock] = useState(0);
  const [livesRemaining, setLivesRemaining] = useState(0);
  const [clicks, setClicks] = useState(0);
  const [combo, setCombo] = useState(0);
  const [hashrate, setHashrate] = useState(0);
  const [stake, setStake] = useState(0);
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
      setActiveBlock(res.activeBlock);
      setLivesRemaining(res.livesRemaining);
      setClicks(0);
      setCombo(0);
      setStake(opts.stake);
      setHashrate(0);
      setEndResult(null);
      setPhase('playing');
    },
    [socket],
  );

  const sendClick = useCallback(
    async (blockIndex: number) => {
      const msg = await socket.sendClick(blockIndex);
      if (msg.type === 'mistake_pending') {
        setLivesRemaining(msg.livesRemaining);
        setPhase('mistake');
        return {mistake: true as const};
      }
      setActiveBlock(msg.nextBlock);
      setClicks(msg.clicks);
      setCombo(msg.combo);
      setLivesRemaining(msg.livesRemaining);
      setHashrate(msg.hashrate);
      return {mistake: false as const};
    },
    [socket],
  );

  const resolveWithLife = useCallback(async () => {
    const msg = await socket.resolveMistake('use_life');
    setActiveBlock(msg.nextBlock);
    setLivesRemaining(msg.livesRemaining);
    setCombo(msg.combo);
    setHashrate(msg.hashrate);
    setPhase('playing');
  }, [socket]);

  const grantAdAndResolve = useCallback(async () => {
    const sid = sessionId ?? socket.getSessionId();
    if (!sid) return;
    await continueMiningAfterAd(sid);
    const msg = await socket.resolveMistake('ad');
    setActiveBlock(msg.nextBlock);
    setLivesRemaining(msg.livesRemaining);
    setCombo(msg.combo);
    setHashrate(msg.hashrate);
    setPhase('playing');
  }, [sessionId, socket]);

  const endGame = useCallback(
    async (reason: FinishReason, clientReward?: number) => {
      const sid = sessionId ?? socket.getSessionId();
      if (!sid) return null;
      socket.disconnect();
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
      return res;
    },
    [sessionId, socket],
  );

  const resetToIdle = useCallback(() => {
    socket.disconnect();
    setPhase('idle');
    setSessionId(null);
    setStartsAt(null);
    setEndResult(null);
  }, [socket]);

  return {
    phase,
    sessionId,
    startsAt,
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
