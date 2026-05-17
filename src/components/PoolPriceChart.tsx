import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, {Circle, Line, Path, Rect, Text as SvgText} from 'react-native-svg';
import {useTranslation} from 'react-i18next';

import {colors, space} from '../theme/tokens';
import {fontFamily} from '../theme/typography';
import type {PoolChartPoint} from '../types/pools';
import {
  buildChartPlot,
  chartContentWidthFromPoints,
  scaledSpotToDecimalString,
} from '../utils/poolChartMath';

/** Тёмная область графика в духе TradingView (линия без свечей). */
const PLOT_BG = '#0a0e14';
const GRID_MAJOR = 'rgba(71, 85, 105, 0.5)';
const GRID_MINOR = 'rgba(51, 65, 85, 0.28)';
const LINE_STROKE = '#38bdf8';
const LINE_WIDTH = 2;
const PAD_L = 6;
const PAD_T = 6;
const PAD_B = 18;
const PRICE_AXIS_W = 56;
const PLOT_H = 156;

type Props = {
  points?: PoolChartPoint[] | null;
  emptyLabel: string;
  hasMore?: boolean;
  loadingOlder?: boolean;
  onLoadOlder?: () => void | Promise<void>;
  swipeHint?: string;
  liveSpotFooter?: string;
  highlightLastPoint?: boolean;
};

function compactSpotRange(v: bigint): string {
  const s = scaledSpotToDecimalString(v);
  if (s.length <= 30) {
    return s;
  }
  return `${s.slice(0, 14)}…${s.slice(-12)}`;
}

export function PoolPriceChart({
  points: pointsProp,
  emptyLabel,
  hasMore,
  loadingOlder,
  onLoadOlder,
  swipeHint,
  liveSpotFooter,
  highlightLastPoint,
}: Props) {
  const {t} = useTranslation();
  const points = pointsProp ?? [];
  const [viewportW, setViewportW] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const scrollXRef = useRef(0);
  const lenBeforeLoadRef = useRef(0);
  const scrollBeforeLoadRef = useRef(0);
  const prevLoadingOlderRef = useRef(false);
  const initialScrollDoneRef = useRef(false);
  const lastEdgeLoadRef = useRef(0);
  const prevOldestTRef = useRef<string | null>(null);

  const nowTimeLabel = t('farming_chart_time_now');

  useEffect(() => {
    if (loadingOlder && !prevLoadingOlderRef.current) {
      lenBeforeLoadRef.current = points.length;
      scrollBeforeLoadRef.current = scrollXRef.current;
      prevOldestTRef.current = points[0]?.t ?? null;
    }
    prevLoadingOlderRef.current = !!loadingOlder;
  }, [loadingOlder, points.length, points]);

  const contentW =
    viewportW > 0
      ? chartContentWidthFromPoints(points, viewportW, PAD_L, PRICE_AXIS_W)
      : chartContentWidthFromPoints(points, 320, PAD_L, PRICE_AXIS_W);

  const plot = React.useMemo(
    () =>
      buildChartPlot({
        points,
        contentW,
        padL: PAD_L,
        padT: PAD_T,
        padB: PAD_B,
        priceAxisW: PRICE_AXIS_W,
        plotH: PLOT_H,
        nowTimeLabel,
      }),
    [points, contentW, nowTimeLabel],
  );

  useLayoutEffect(() => {
    if (!loadingOlder && lenBeforeLoadRef.current > 0 && prevOldestTRef.current) {
      const added = points.length - lenBeforeLoadRef.current;
      if (added > 0 && scrollRef.current && points[0]?.t !== prevOldestTRef.current) {
        const oldW = chartContentWidthFromPoints(
          points.slice(added),
          viewportW || 320,
          PAD_L,
          PRICE_AXIS_W,
        );
        const newW = chartContentWidthFromPoints(
          points,
          viewportW || 320,
          PAD_L,
          PRICE_AXIS_W,
        );
        const delta = Math.max(0, newW - oldW);
        const target = scrollBeforeLoadRef.current + delta;
        requestAnimationFrame(() => {
          scrollRef.current?.scrollTo({
            x: Math.max(0, target),
            animated: false,
          });
        });
      }
      lenBeforeLoadRef.current = 0;
      prevOldestTRef.current = null;
    }
  }, [loadingOlder, points, viewportW]);

  useLayoutEffect(() => {
    if (
      points.length === 0 ||
      viewportW <= 0 ||
      !scrollRef.current ||
      initialScrollDoneRef.current
    ) {
      return;
    }
    const cw = chartContentWidthFromPoints(points, viewportW, PAD_L, PRICE_AXIS_W);
    initialScrollDoneRef.current = true;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        x: Math.max(0, cw - viewportW),
        animated: false,
      });
    });
  }, [points.length, viewportW]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    scrollXRef.current = x;
    if (!onLoadOlder || !hasMore || loadingOlder) {
      return;
    }
    if (x > 80) {
      return;
    }
    const now = Date.now();
    if (now - lastEdgeLoadRef.current < 750) {
      return;
    }
    lastEdgeLoadRef.current = now;
    Promise.resolve(onLoadOlder()).catch(() => {});
  };

  if (points.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.empty}>{emptyLabel}</Text>
      </View>
    );
  }

  if (!plot) {
    return null;
  }

  const {pathD, lastX, lastY, minV, maxV, innerW, yTicks, vLines, timeLabels} =
    plot;

  const chartBody = (
    <View style={{width: contentW}}>
      <Svg width={contentW} height={PLOT_H}>
        <Rect
          x={0}
          y={0}
          width={contentW}
          height={PLOT_H}
          rx={8}
          ry={8}
          fill={PLOT_BG}
        />
        {vLines.map((vx, idx) => (
          <Line
            key={`v-${idx}`}
            x1={vx}
            y1={PAD_T}
            x2={vx}
            y2={PLOT_H - PAD_B}
            stroke={idx % 2 === 0 ? GRID_MAJOR : GRID_MINOR}
            strokeWidth={1}
          />
        ))}
        {yTicks.map((row, idx) => (
          <Line
            key={`h-${idx}`}
            x1={PAD_L}
            y1={row.y}
            x2={PAD_L + innerW}
            y2={row.y}
            stroke={GRID_MINOR}
            strokeWidth={1}
          />
        ))}
        {pathD ? (
          <Path
            d={pathD}
            stroke={LINE_STROKE}
            strokeWidth={LINE_WIDTH}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
        {highlightLastPoint && pathD ? (
          <Circle
            cx={lastX}
            cy={lastY}
            r={4}
            fill={LINE_STROKE}
            stroke={colors.textPrimary}
            strokeWidth={1.5}
          />
        ) : null}
        {yTicks.map((row, idx) => (
          <SvgText
            key={`py-${idx}`}
            x={PAD_L + innerW + 4}
            y={row.y + 4}
            fontSize={10}
            fill="#94a3b8"
            fontFamily={fontFamily.medium}>
            {row.label}
          </SvgText>
        ))}
        {timeLabels.map((row, idx) => (
          <SvgText
            key={`tx-${idx}`}
            x={row.x}
            y={PLOT_H - 4}
            fontSize={9}
            fill="#64748b"
            textAnchor="middle"
            fontFamily={fontFamily.regular}>
            {row.text}
          </SvgText>
        ))}
      </Svg>
      <Text style={styles.range} numberOfLines={2}>
        {compactSpotRange(minV)} → {compactSpotRange(maxV)}
      </Text>
      {liveSpotFooter ? (
        <Text style={styles.liveFooter} numberOfLines={2}>
          {liveSpotFooter}
        </Text>
      ) : null}
      {swipeHint && hasMore && onLoadOlder ? (
        <Text style={styles.hint}>{swipeHint}</Text>
      ) : null}
    </View>
  );

  return (
    <View
      style={styles.wrap}
      onLayout={(e: LayoutChangeEvent) => {
        const width = e.nativeEvent.layout.width;
        if (width > 0) {
          setViewportW(width);
        }
      }}>
      {viewportW <= 0 ? (
        <View style={{height: PLOT_H}} />
      ) : (
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator
          scrollEventThrottle={16}
          onScroll={onScroll}
          bounces>
          {chartBody}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {marginTop: space.sm},
  emptyWrap: {
    minHeight: 100,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: space.md,
  },
  empty: {
    color: colors.textMuted,
    fontFamily: fontFamily.regular,
    fontSize: 13,
    textAlign: 'center',
  },
  range: {
    marginTop: 6,
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: fontFamily.regular,
  },
  liveFooter: {
    marginTop: 4,
    color: colors.textSecondary,
    fontSize: 12,
    fontFamily: fontFamily.medium,
  },
  hint: {
    marginTop: 6,
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: fontFamily.regular,
  },
});
