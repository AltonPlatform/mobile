import {useCallback, useEffect, useRef} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {API_BASE_URL} from '../config';
import type {TicketTier} from '../api/miningClick';

export type ClickResultMessage = {
  type: 'click_result';
  correct: boolean;
  nextBlock: number;
  livesRemaining: number;
  combo: number;
  clicks: number;
  hashrate: number;
};

export type MistakePendingMessage = {
  type: 'mistake_pending';
  livesRemaining: number;
};

export type MistakeResolvedMessage = {
  type: 'mistake_resolved';
  nextBlock: number;
  livesRemaining: number;
  combo: number;
  hashrate: number;
};

export type SessionStartedMessage = {
  type: 'session_started';
  sessionId: string;
  livesRemaining: number;
  startsAt: number;
  activeBlock: number;
  wsPath: string;
};

type ServerMessage = {
  type: string;
  code?: string;
  message?: string;
  sessionId?: string;
  startsAt?: number;
  activeBlock?: number;
  livesRemaining?: number;
  clicks?: number;
  combo?: number;
  hashrate?: number;
  timeLeft?: number;
  status?: string;
  wsPath?: string;
  nextBlock?: number;
  correct?: boolean;
};

type Pending = {
  resolve: (msg: ServerMessage) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

function httpBaseToWs(httpUrl: string): string {
  return httpUrl.replace(/^http/, 'ws').replace(/\/$/, '');
}

function buildWsUrl(wsPath: string, token: string, sessionId?: string): string {
  const base = `${httpBaseToWs(API_BASE_URL)}${wsPath}`;
  const params = new URLSearchParams({token});
  if (sessionId) {
    params.set('sessionId', sessionId);
  }
  return `${base}?${params.toString()}`;
}

export function useMiningSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const pendingRef = useRef<Map<string, Pending>>(new Map());
  const clickQueueRef = useRef<Promise<unknown>>(Promise.resolve());
  const sessionIdRef = useRef<string | null>(null);
  const openReadyRef = useRef<{
    resolve: (ws: WebSocket) => void;
    reject: (err: Error) => void;
  } | null>(null);

  const settlePending = useCallback(
    (key: string, msg?: ServerMessage, err?: Error) => {
      const p = pendingRef.current.get(key);
      if (!p) return;
      clearTimeout(p.timer);
      pendingRef.current.delete(key);
      if (err) {
        p.reject(err);
      } else if (msg) {
        p.resolve(msg);
      }
    },
    [],
  );

  const waitFor = useCallback(
    (key: string, timeoutMs: number): Promise<ServerMessage> => {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          settlePending(key, undefined, new Error('Request timeout'));
        }, timeoutMs);
        pendingRef.current.set(key, {resolve, reject, timer});
      });
    },
    [settlePending],
  );

  const handleServerMessage = useCallback(
    (msg: ServerMessage) => {
      if (msg.type === 'session_started' && msg.sessionId) {
        sessionIdRef.current = msg.sessionId;
        settlePending('start', msg);
        return;
      }

      if (msg.type === 'ready') {
        if (openReadyRef.current) {
          const {resolve} = openReadyRef.current;
          openReadyRef.current = null;
          if (wsRef.current) {
            resolve(wsRef.current);
          }
        }
        return;
      }

      if (msg.type === 'connected' || msg.type === 'snapshot') {
        if (msg.sessionId) {
          sessionIdRef.current = msg.sessionId;
        }
        settlePending('start', msg);
        if (openReadyRef.current && wsRef.current) {
          const {resolve} = openReadyRef.current;
          openReadyRef.current = null;
          resolve(wsRef.current);
        }
        return;
      }

      if (
        msg.type === 'click_result' ||
        msg.type === 'mistake_pending' ||
        msg.type === 'mistake_resolved'
      ) {
        settlePending('click', msg);
        return;
      }

      if (msg.type === 'error') {
        const err = new Error(msg.message || msg.code || 'error');
        if (pendingRef.current.has('start')) {
          settlePending('start', undefined, err);
        }
        if (pendingRef.current.has('click')) {
          settlePending('click', undefined, err);
        }
      }
    },
    [settlePending],
  );

  const disconnect = useCallback(() => {
    pendingRef.current.forEach((_, key) => {
      settlePending(key, undefined, new Error('WebSocket disconnected'));
    });
    openReadyRef.current?.reject(new Error('WebSocket disconnected'));
    openReadyRef.current = null;
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    sessionIdRef.current = null;
  }, [settlePending]);

  useEffect(() => () => disconnect(), [disconnect]);

  const openSocket = useCallback(
    async (wsPath: string, resumeSessionId?: string): Promise<WebSocket> => {
      disconnect();
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }
      const url = buildWsUrl(wsPath, token, resumeSessionId);

      return new Promise<WebSocket>((resolve, reject) => {
        const ws = new WebSocket(url);
        wsRef.current = ws;

        const connectTimer = setTimeout(() => {
          reject(new Error('WebSocket connect timeout'));
          ws.close();
        }, 15_000);

        openReadyRef.current = {
          resolve: opened => {
            clearTimeout(connectTimer);
            resolve(opened);
          },
          reject: err => {
            clearTimeout(connectTimer);
            reject(err);
          },
        };

        ws.onmessage = event => {
          try {
            const msg = JSON.parse(String(event.data)) as ServerMessage;
            handleServerMessage(msg);
          } catch {
            // ignore
          }
        };

        ws.onerror = () => {
          clearTimeout(connectTimer);
          openReadyRef.current?.reject(new Error('WebSocket error'));
          openReadyRef.current = null;
        };

        ws.onclose = () => {
          wsRef.current = null;
        };
      });
    },
    [disconnect, handleServerMessage],
  );

  const startSession = useCallback(
    async (opts: {
      stake: number;
      ticketTier: TicketTier;
      useTicket: boolean;
      wsPath: string;
    }): Promise<SessionStartedMessage> => {
      const ws = await openSocket(opts.wsPath);
      const startPromise = waitFor('start', 15_000);
      ws.send(
        JSON.stringify({
          type: 'start',
          stake: opts.stake,
          ticketTier: opts.ticketTier,
          useTicket: opts.useTicket,
        }),
      );
      const msg = await startPromise;
      if (msg.type !== 'session_started') {
        throw new Error('Unexpected start response');
      }
      return msg as SessionStartedMessage;
    },
    [openSocket, waitFor],
  );

  const sendClick = useCallback(
    (blockIndex: number): Promise<ClickResultMessage | MistakePendingMessage> => {
      const run = async () => {
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) {
          throw new Error('WebSocket not connected');
        }
        const responsePromise = waitFor('click', 10_000);
        ws.send(
          JSON.stringify({
            type: 'click',
            blockIndex,
            clientTimestamp: Date.now(),
          }),
        );
        const msg = await responsePromise;
        if (msg.type === 'click_result') {
          return msg as ClickResultMessage;
        }
        if (msg.type === 'mistake_pending') {
          return msg as MistakePendingMessage;
        }
        throw new Error('Unexpected click response');
      };
      clickQueueRef.current = clickQueueRef.current.then(run, run);
      return clickQueueRef.current as Promise<
        ClickResultMessage | MistakePendingMessage
      >;
    },
    [waitFor],
  );

  const resolveMistake = useCallback(
    (choice: 'use_life' | 'ad'): Promise<MistakeResolvedMessage> => {
      const run = async () => {
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) {
          throw new Error('WebSocket not connected');
        }
        const responsePromise = waitFor('click', 10_000);
        ws.send(JSON.stringify({type: 'mistake_resolve', choice}));
        const msg = await responsePromise;
        if (msg.type === 'mistake_resolved') {
          return msg as MistakeResolvedMessage;
        }
        throw new Error('Unexpected resolve response');
      };
      clickQueueRef.current = clickQueueRef.current.then(run, run);
      return clickQueueRef.current as Promise<MistakeResolvedMessage>;
    },
    [waitFor],
  );

  return {
    disconnect,
    startSession,
    sendClick,
    resolveMistake,
    getSessionId: () => sessionIdRef.current,
  };
}
