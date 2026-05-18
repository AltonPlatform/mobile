import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';

import {fetchPoolChart} from '../api/pools';
import {formatApiError} from '../api/errors';
import type {PoolChartPoint} from '../types/pools';
import {PoolPriceChart} from './PoolPriceChart';
import {colors, space} from '../theme/tokens';
import {formatPoolSpot} from '../utils/poolFormat';

/** Synthetic last point — not merged from API pagination keys. */
const LIVE_KEY_PREFIX = '__live__:';

function mergeByT(
  existing: PoolChartPoint[],
  older: PoolChartPoint[],
): PoolChartPoint[] {
  const m = new Map<string, PoolChartPoint>();
  for (const p of older) {
    m.set(p.t, p);
  }
  for (const p of existing) {
    m.set(p.t, p);
  }
  return [...m.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v);
}

type Props = {
  poolId: string;
  interval: '1h' | '1d';
  emptyLabel: string;
  swipeHint?: string;
  /** Текущий спот пула — всегда последняя точка на графике. */
  currentSpotApprox: string;
  /** Меняется при обновлении пула (для стабильного ключа «живой» точки). */
  spotAsOf?: string;
};

export function PoolChartSection({
  poolId,
  interval,
  emptyLabel,
  swipeHint,
  currentSpotApprox,
  spotAsOf,
}: Props) {
  const {t} = useTranslation();
  const [points, setPoints] = useState<PoolChartPoint[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const pointsRef = useRef(points);
  const hasMoreRef = useRef(hasMore);
  const loadingOlderRef = useRef(false);

  pointsRef.current = points;
  hasMoreRef.current = hasMore;

  const displayPoints = useMemo((): PoolChartPoint[] => {
    const snap = points;
    const spot = String(currentSpotApprox ?? '').trim();
    if (!spot) {
      return snap;
    }
    const liveKey = `${LIVE_KEY_PREFIX}${spotAsOf ?? spot}`;
    if (snap.length === 0) {
      return [{t: liveKey, spotPriceApprox: spot}];
    }
    return [...snap, {t: liveKey, spotPriceApprox: spot}];
  }, [points, currentSpotApprox, spotAsOf]);

  const liveSpotFooter = useMemo(() => {
    const spot = String(currentSpotApprox ?? '').trim();
    if (!spot) {
      return undefined;
    }
    return t('farming_chart_live_line', {value: formatPoolSpot(spot)});
  }, [currentSpotApprox, t]);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadInitial = useCallback(async () => {
    setLoadingInitial(true);
    setErr(null);
    try {
      const r = await fetchPoolChart(poolId, {
        interval,
        limit: interval === '1h' ? 48 : 30,
      });
      if (!mountedRef.current) {
        return;
      }
      setPoints(Array.isArray(r.points) ? r.points : []);
      setHasMore(r.hasMore ?? false);
    } catch (e: unknown) {
      if (!mountedRef.current) {
        return;
      }
      setErr(formatApiError(e));
    } finally {
      if (mountedRef.current) {
        setLoadingInitial(false);
      }
    }
  }, [poolId, interval]);

  useEffect(() => {
    loadInitial().catch(() => {});
  }, [loadInitial]);

  const loadOlder = useCallback(async () => {
    if (loadingOlderRef.current || !hasMoreRef.current) {
      return;
    }
    const list = pointsRef.current;
    if (!list.length) {
      return;
    }
    const oldest = list[0]!.t;
    loadingOlderRef.current = true;
    setLoadingOlder(true);
    try {
      const r = await fetchPoolChart(poolId, {
        interval,
        limit: interval === '1h' ? 48 : 30,
        before: oldest,
      });
      if (!mountedRef.current) {
        return;
      }
      setPoints(prev =>
        mergeByT(prev, Array.isArray(r.points) ? r.points : []),
      );
      setHasMore(r.hasMore ?? false);
    } catch {
      // ignore — user can scroll again
    } finally {
      loadingOlderRef.current = false;
      if (mountedRef.current) {
        setLoadingOlder(false);
      }
    }
  }, [poolId, interval]);

  if (loadingInitial) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (err) {
    return (
      <View style={styles.center}>
        <Text style={styles.err}>{err}</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {loadingOlder ? (
        <View style={styles.loadingOlder}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : null}
      <PoolPriceChart
        points={displayPoints}
        emptyLabel={emptyLabel}
        hasMore={hasMore}
        loadingOlder={loadingOlder}
        onLoadOlder={hasMore ? loadOlder : undefined}
        swipeHint={swipeHint}
        liveSpotFooter={liveSpotFooter}
        highlightLastPoint={Boolean(String(currentSpotApprox ?? '').trim())}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {position: 'relative'},
  loadingOlder: {
    position: 'absolute',
    left: 4,
    top: 4,
    zIndex: 4,
  },
  center: {paddingVertical: space.md, alignItems: 'center'},
  err: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
});
