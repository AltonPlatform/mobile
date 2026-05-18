import React, {useCallback, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {CandlestickChart} from 'react-native-wagmi-charts';
import {runOnJS, useAnimatedReaction} from 'react-native-reanimated';

import {
  formatChartGameAxisPrice,
  formatChartGameVolume,
  type WagmiCandle,
} from '../utils/chartGameChartData';
import {fontFamily} from '../theme/typography';

function isActiveCandle(c: WagmiCandle | undefined): c is WagmiCandle {
  return !!c && !c.placeholder && c.timestamp > 0 && c.close > 0;
}

/** Содержимое тултипа OHLCV (без даты) — внутри CandlestickChart.Tooltip. */
export function ChartGameCandleTooltip() {
  const {data, currentIndex} = CandlestickChart.useChart();
  const [candle, setCandle] = useState<WagmiCandle | null>(null);

  const syncCandleFromIndex = useCallback(
    (idx: number) => {
      if (idx < 0) {
        setCandle(null);
        return;
      }
      const row = data[idx];
      setCandle(isActiveCandle(row) ? row : null);
    },
    [data],
  );

  useAnimatedReaction(
    () => currentIndex.value,
    idx => {
      runOnJS(syncCandleFromIndex)(idx);
    },
    [syncCandleFromIndex],
  );

  if (!candle) {
    return null;
  }

  const fmt = formatChartGameAxisPrice;

  return (
    <View style={styles.rows}>
      <Text style={styles.row}>
        <Text style={styles.key}>O </Text>
        <Text style={styles.val}>{fmt(candle.open)}</Text>
      </Text>
      <Text style={styles.row}>
        <Text style={styles.key}>H </Text>
        <Text style={styles.val}>{fmt(candle.high)}</Text>
      </Text>
      <Text style={styles.row}>
        <Text style={styles.key}>L </Text>
        <Text style={styles.val}>{fmt(candle.low)}</Text>
      </Text>
      <Text style={styles.row}>
        <Text style={styles.key}>C </Text>
        <Text style={styles.val}>{fmt(candle.close)}</Text>
      </Text>
      <Text style={styles.row}>
        <Text style={styles.key}>V </Text>
        <Text style={styles.val}>{formatChartGameVolume(candle.volume)}</Text>
      </Text>
    </View>
  );
}

export const chartGameTooltipBoxStyle = StyleSheet.create({
  box: {
    backgroundColor: 'rgba(22, 26, 30, 0.96)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(132, 142, 156, 0.35)',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
});

const styles = StyleSheet.create({
  rows: {
    gap: 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  key: {
    color: '#848e9c',
    fontSize: 11,
    fontFamily: fontFamily.semibold,
    width: 14,
  },
  val: {
    color: '#e6e8ea',
    fontSize: 11,
    fontFamily: fontFamily.medium,
  },
});
