import React, {useMemo} from 'react';
import {StyleSheet, Text, useWindowDimensions, View} from 'react-native';
import Svg, {Line} from 'react-native-svg';
import {CandlestickChart} from 'react-native-wagmi-charts';

import type {ChartCandle} from '../api/chartGame';
import {
  buildChartGameWagmiSeries,
  chartGamePriceToY,
  CHART_GAME_CUTOFF_INDEX,
  computeChartGameYDomain,
  formatChartGameAxisPrice,
} from '../utils/chartGameChartData';
import {CHART_GAME_TOTAL_SLOTS} from '../utils/chartGameLayout';
import {
  ChartGameCandleTooltip,
  chartGameTooltipBoxStyle,
} from './ChartGameCandleTooltip';
import {
  renderChartGameCandleLine,
  renderChartGameCandleRect,
} from './chartGameCandleRender';
import {colors, space} from '../theme/tokens';
import {fontFamily} from '../theme/typography';

const PLOT_BG = '#161a1e';
const GRID = 'rgba(42, 46, 57, 0.9)';
const GRID_MINOR = 'rgba(42, 46, 57, 0.45)';
const CANDLE_UP = '#0ecb81';
const CANDLE_DOWN = '#f6465d';
const CUTOFF_LINE = 'rgba(132, 142, 156, 0.75)';
const CROSSHAIR_COLOR = '#848e9c';
const REVEAL_ZONE = 'rgba(14, 203, 129, 0.08)';
const FUTURE_ZONE = 'rgba(42, 46, 57, 0.35)';
const PRICE_AXIS_W = 58;
const CHART_HEIGHT = 200;
const Y_TICK_COUNT = 3;

type Props = {
  candles: ChartCandle[];
  revealCandles?: ChartCandle[];
  emptyLabel: string;
  symbolLabel?: string;
  totalSlots?: number;
  animateCandles?: boolean;
};

export function ChartGamePriceChart({
  candles,
  revealCandles = [],
  emptyLabel,
  symbolLabel,
  totalSlots = CHART_GAME_TOTAL_SLOTS,
  animateCandles = false,
}: Props) {
  const {width: screenW} = useWindowDimensions();
  const outerWidth = Math.max(280, screenW - space.md * 2 - space.sm * 2);
  const plotWidth = Math.max(160, outerWidth - PRICE_AXIS_W);

  const series = useMemo(
    () => buildChartGameWagmiSeries(candles, revealCandles, totalSlots),
    [candles, revealCandles, totalSlots],
  );

  const yDomain = useMemo(
    () => computeChartGameYDomain(series.data),
    [series.data],
  );

  const yTicks = useMemo(() => {
    const [min, max] = yDomain;
    if (max <= min) {
      return [{y: CHART_HEIGHT / 2, label: formatChartGameAxisPrice(min)}];
    }
    return Array.from({length: Y_TICK_COUNT}, (_, i) => {
      const t = i / (Y_TICK_COUNT - 1);
      const price = max - (max - min) * t;
      return {
        y: chartGamePriceToY(price, yDomain, CHART_HEIGHT),
        label: formatChartGameAxisPrice(price),
      };
    });
  }, [yDomain]);

  const cutoffLeft = (plotWidth * CHART_GAME_CUTOFF_INDEX) / totalSlots;
  const hasReveal = revealCandles.length > 0;

  if (candles.length === 0 || series.data.length === 0) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.empty}>{emptyLabel}</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {symbolLabel ? (
        <Text style={styles.symbol}>{symbolLabel}</Text>
      ) : null}

      <View style={[styles.chartRow, {width: outerWidth}]}>
        <View style={[styles.plotArea, {width: plotWidth, height: CHART_HEIGHT}]}>
          <View
            style={[
              styles.zoneReveal,
              {
                left: cutoffLeft,
                width: Math.max(0, plotWidth - cutoffLeft),
                backgroundColor: hasReveal ? REVEAL_ZONE : FUTURE_ZONE,
              },
            ]}
            pointerEvents="none"
          />

          <Svg
            width={plotWidth}
            height={CHART_HEIGHT}
            style={styles.gridSvg}
            pointerEvents="none">
            {yTicks.map((row, idx) => (
              <Line
                key={`grid-${idx}`}
                x1={0}
                y1={row.y}
                x2={plotWidth}
                y2={row.y}
                stroke={idx === 1 ? GRID : GRID_MINOR}
                strokeWidth={1}
              />
            ))}
          </Svg>

          <View
            style={[styles.cutoffLine, {left: cutoffLeft}]}
            pointerEvents="none"
          />

          <CandlestickChart.Provider data={series.data} valueRangeY={yDomain}>
            <CandlestickChart width={plotWidth} height={CHART_HEIGHT}>
              <CandlestickChart.Candles
                useAnimations={animateCandles}
                positiveColor={CANDLE_UP}
                negativeColor={CANDLE_DOWN}
                margin={1}
                renderLine={renderChartGameCandleLine}
                renderRect={renderChartGameCandleRect}
              />
              <CandlestickChart.Crosshair
                color={CROSSHAIR_COLOR}
                minDurationMs={180}>
                <CandlestickChart.Tooltip style={chartGameTooltipBoxStyle.box}>
                  <ChartGameCandleTooltip />
                </CandlestickChart.Tooltip>
              </CandlestickChart.Crosshair>
            </CandlestickChart>
          </CandlestickChart.Provider>
        </View>

        <View style={[styles.yAxis, {width: PRICE_AXIS_W, height: CHART_HEIGHT}]}>
          {yTicks.map((row, idx) => (
            <Text
              key={`y-${idx}`}
              style={[
                styles.yAxisLabel,
                {top: Math.max(0, Math.min(CHART_HEIGHT - 14, row.y - 7))},
              ]}
              numberOfLines={1}>
              {row.label}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: PLOT_BG,
    borderRadius: 12,
    padding: space.sm,
    overflow: 'hidden',
  },
  symbol: {
    color: '#848e9c',
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
  chartRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  plotArea: {
    position: 'relative',
    overflow: 'hidden',
  },
  gridSvg: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 0,
  },
  zoneReveal: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    zIndex: 0,
  },
  cutoffLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: CUTOFF_LINE,
    zIndex: 2,
  },
  yAxis: {
    position: 'relative',
    justifyContent: 'flex-start',
  },
  yAxisLabel: {
    position: 'absolute',
    right: 0,
    left: 2,
    fontSize: 10,
    color: '#848e9c',
    fontFamily: fontFamily.medium,
    textAlign: 'right',
  },
});
