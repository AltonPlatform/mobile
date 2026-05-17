import React, {useMemo, useState} from 'react';
import {LayoutChangeEvent, StyleSheet, Text, View} from 'react-native';
import Svg, {Line, Rect, Text as SvgText} from 'react-native-svg';

import type {ChartCandle} from '../api/chartGame';
import {
  CHART_GAME_CUTOFF_INDEX,
  CHART_GAME_TOTAL_SLOTS,
} from '../utils/chartGameLayout';
import {colors, space} from '../theme/tokens';
import {fontFamily} from '../theme/typography';

const PLOT_BG = '#161a1e';
const GRID = 'rgba(42, 46, 57, 0.9)';
const GRID_MINOR = 'rgba(42, 46, 57, 0.45)';
const CANDLE_UP = '#0ecb81';
const CANDLE_DOWN = '#f6465d';
const CUTOFF_LINE = 'rgba(246, 70, 93, 0.65)';
const REVEAL_ZONE = 'rgba(14, 203, 129, 0.06)';
const FUTURE_SLOTS_ZONE = 'rgba(42, 46, 57, 0.35)';
const PRICE_LABEL = '#848e9c';

const PAD_L = 2;
const PAD_T = 8;
const PAD_B = 22;
const PRICE_AXIS_W = 58;
const PLOT_H = 188;
const MIN_BODY_H = 1.5;
/** Тело свечи внутри слота 1/18; остальное — зазор слева/справа между свечами */
const CANDLE_BODY_RATIO = 0.72;

type Props = {
  candles: ChartCandle[];
  revealCandles?: ChartCandle[];
  emptyLabel: string;
  symbolLabel?: string;
  totalSlots?: number;
};

type SlotCandle = {
  candle: ChartCandle;
  slotIndex: number;
  isReveal: boolean;
};

type CandleDraw = {
  slotIndex: number;
  x: number;
  bodyW: number;
  centerX: number;
  openY: number;
  closeY: number;
  highY: number;
  lowY: number;
  bullish: boolean;
  isReveal: boolean;
};

function formatPrice(n: number): string {
  if (n >= 10_000) {
    return n.toLocaleString(undefined, {maximumFractionDigits: 0});
  }
  if (n >= 1000) {
    return n.toFixed(1);
  }
  if (n >= 1) {
    return n.toFixed(2);
  }
  if (n >= 0.01) {
    return n.toFixed(4);
  }
  return n.toFixed(6);
}

function slotCandles(
  candles: ChartCandle[],
  revealCandles: ChartCandle[],
  totalSlots: number,
): SlotCandle[] {
  const out: SlotCandle[] = [];
  candles.forEach((candle, i) => {
    if (i < totalSlots) {
      out.push({candle, slotIndex: i, isReveal: false});
    }
  });
  revealCandles.forEach((candle, j) => {
    const slotIndex = CHART_GAME_CUTOFF_INDEX + j;
    if (slotIndex < totalSlots) {
      out.push({candle, slotIndex, isReveal: true});
    }
  });
  return out;
}

/**
 * Слот = 1/totalSlots ширины; тело уже слота, с зазором между соседними свечами.
 * Первые 12 слотов = 12/18 ≈ 66% ширины.
 */
function buildCandleDraws(
  slots: SlotCandle[],
  chartW: number,
  plotH: number,
  min: number,
  max: number,
  totalSlots: number,
): CandleDraw[] {
  const innerH = plotH - PAD_T - PAD_B;
  const unitW = chartW / totalSlots;
  const bodyW = Math.max(unitW * CANDLE_BODY_RATIO, 1);
  const slotPad = (unitW - bodyW) / 2;
  const range = max - min || max * 0.001;

  const yAt = (price: number) =>
    PAD_T + innerH - ((price - min) / range) * innerH;

  return slots.map(({candle, slotIndex, isReveal}) => {
    const slotX = PAD_L + unitW * slotIndex;
    const x = slotX + slotPad;
    const centerX = slotX + unitW / 2;
    return {
      slotIndex,
      x,
      bodyW,
      centerX,
      openY: yAt(candle.open),
      closeY: yAt(candle.close),
      highY: yAt(candle.high),
      lowY: yAt(candle.low),
      bullish: candle.close >= candle.open,
      isReveal,
    };
  });
}

export function ChartGamePriceChart({
  candles,
  revealCandles = [],
  emptyLabel,
  symbolLabel,
  totalSlots = CHART_GAME_TOTAL_SLOTS,
}: Props) {
  const [width, setWidth] = useState(0);

  const slots = useMemo(
    () => slotCandles(candles, revealCandles, totalSlots),
    [candles, revealCandles, totalSlots],
  );

  const plot = useMemo(() => {
    if (slots.length === 0 || width <= 0) {
      return null;
    }

    const lows = slots.map(s => s.candle.low);
    const highs = slots.map(s => s.candle.high);
    let min = Math.min(...lows);
    let max = Math.max(...highs);
    const pad = (max - min) * 0.06 || max * 0.001;
    min -= pad;
    max += pad;

    const chartW = width - PAD_L - PRICE_AXIS_W;
    const unitW = chartW / totalSlots;

    const draws = buildCandleDraws(
      slots,
      chartW,
      PLOT_H,
      min,
      max,
      totalSlots,
    );

    const cutoffX = PAD_L + unitW * CHART_GAME_CUTOFF_INDEX;
    const candlesBlockRight = PAD_L + chartW;
    const revealZoneW = Math.max(0, candlesBlockRight - cutoffX);

    const yTicks = [0, 0.5, 1].map(t => {
      const v = min + (max - min) * (1 - t);
      const y = PAD_T + (PLOT_H - PAD_T - PAD_B) * t;
      return {y, label: formatPrice(v)};
    });

    const last = slots[slots.length - 1]?.candle;

    return {
      draws,
      cutoffX,
      revealZoneX: cutoffX,
      revealZoneW,
      candlesBlockRight,
      yTicks,
      last,
      plotInnerRight: candlesBlockRight,
      hasReveal: revealCandles.length > 0,
    };
  }, [slots, revealCandles.length, totalSlots, width]);

  const onLayout = (e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
  };

  if (candles.length === 0) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.empty}>{emptyLabel}</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap} onLayout={onLayout}>
      {symbolLabel ? (
        <Text style={styles.symbol}>{symbolLabel}</Text>
      ) : null}
      {width > 0 && plot ? (
        <Svg width={width} height={PLOT_H}>
          <Rect x={0} y={0} width={width} height={PLOT_H} fill={PLOT_BG} />

          {plot.yTicks.map((row, idx) => (
            <Line
              key={`grid-${idx}`}
              x1={PAD_L}
              y1={row.y}
              x2={plot.plotInnerRight}
              y2={row.y}
              stroke={idx === 1 ? GRID : GRID_MINOR}
              strokeWidth={1}
            />
          ))}

          {plot.revealZoneW > 0 ? (
            <Rect
              x={plot.revealZoneX}
              y={PAD_T}
              width={plot.revealZoneW}
              height={PLOT_H - PAD_T - PAD_B}
              fill={plot.hasReveal ? REVEAL_ZONE : FUTURE_SLOTS_ZONE}
            />
          ) : null}

          {plot.draws.map(d => {
            const color = d.bullish ? CANDLE_UP : CANDLE_DOWN;
            const opacity = d.isReveal ? 0.65 : 1;
            const bodyTop = Math.min(d.openY, d.closeY);
            const bodyH = Math.max(Math.abs(d.closeY - d.openY), MIN_BODY_H);

            return (
              <React.Fragment key={`c-${d.slotIndex}`}>
                <Line
                  x1={d.centerX}
                  y1={d.highY}
                  x2={d.centerX}
                  y2={d.lowY}
                  stroke={color}
                  strokeWidth={1}
                  opacity={opacity}
                />
                <Rect
                  x={d.x}
                  y={bodyTop}
                  width={d.bodyW}
                  height={bodyH}
                  fill={color}
                  opacity={opacity}
                />
              </React.Fragment>
            );
          })}

          <Line
            x1={plot.cutoffX}
            y1={PAD_T}
            x2={plot.cutoffX}
            y2={PLOT_H - PAD_B}
            stroke={CUTOFF_LINE}
            strokeWidth={1}
            strokeDasharray="4 3"
            opacity={plot.hasReveal ? 1 : 0.4}
          />

          {plot.yTicks.map((row, idx) => (
            <SvgText
              key={`pl-${idx}`}
              x={width - PRICE_AXIS_W + 4}
              y={row.y + 4}
              fontSize={10}
              fill={PRICE_LABEL}
              fontFamily={fontFamily.medium}>
              {row.label}
            </SvgText>
          ))}
        </Svg>
      ) : null}
      {plot?.last ? (
        <View style={styles.footerRow}>
          <Text
            style={[
              styles.footerPrice,
              {
                color:
                  plot.last.close >= plot.last.open ? CANDLE_UP : CANDLE_DOWN,
              },
            ]}>
            {formatPrice(plot.last.close)}
          </Text>
          <Text style={styles.footerMeta}>
            O {formatPrice(plot.last.open)} · H {formatPrice(plot.last.high)} · L{' '}
            {formatPrice(plot.last.low)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: PLOT_BG,
    borderRadius: 12,
    padding: space.sm,
    minHeight: PLOT_H + 40,
    overflow: 'hidden',
  },
  symbol: {
    color: PRICE_LABEL,
    fontSize: 12,
    marginBottom: 6,
    fontFamily: fontFamily.semibold,
    letterSpacing: 0.3,
  },
  empty: {
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: space.lg,
    fontFamily: fontFamily.regular,
  },
  footerRow: {
    marginTop: 8,
    gap: 2,
  },
  footerPrice: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: fontFamily.bold,
  },
  footerMeta: {
    fontSize: 10,
    color: PRICE_LABEL,
    fontFamily: fontFamily.regular,
  },
});
