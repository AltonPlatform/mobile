import React, {useMemo} from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import {LineChart} from 'react-native-wagmi-charts';
import {useTranslation} from 'react-i18next';

import {colors, space} from '../theme/tokens';
import {fontFamily} from '../theme/typography';
import type {PoolChartPoint} from '../types/pools';
import {
  formatChartDatetime,
  formatChartPrice,
} from '../utils/poolChartWorklets';
import {formatPoolSpot} from '../utils/poolFormat';
import {poolPointsToWagmiData} from '../utils/poolChartData';

const PLOT_BG = '#0a0e14';
const LINE_COLOR = '#38bdf8';
const CHART_HEIGHT = 200;

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

export function PoolPriceChart({
  points: pointsProp,
  emptyLabel,
  hasMore,
  loadingOlder,
  onLoadOlder,
  swipeHint,
  liveSpotFooter,
}: Props) {
  const {t} = useTranslation();
  const {width: screenW} = useWindowDimensions();
  const chartWidth = Math.max(280, screenW - space.md * 2);

  const chartData = useMemo(
    () => poolPointsToWagmiData(pointsProp),
    [pointsProp],
  );

  const minMax = useMemo(() => {
    if (chartData.length === 0) {
      return null;
    }
    let min = chartData[0]!.value;
    let max = chartData[0]!.value;
    for (const row of chartData) {
      min = Math.min(min, row.value);
      max = Math.max(max, row.value);
    }
    return {min, max};
  }, [chartData]);

  if (chartData.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.empty}>{emptyLabel}</Text>
      </View>
    );
  }

  const yPad = minMax
    ? Math.max((minMax.max - minMax.min) * 0.08, minMax.max * 0.002)
    : 0;
  const yRange = minMax
    ? {
        min: Math.max(0, minMax.min - yPad),
        max: minMax.max + yPad,
      }
    : undefined;

  return (
    <View style={styles.wrap}>
      {hasMore && onLoadOlder ? (
        <TouchableOpacity
          style={styles.loadOlderBtn}
          onPress={() => {
            void Promise.resolve(onLoadOlder()).catch(() => {});
          }}
          disabled={loadingOlder}
          activeOpacity={0.85}>
          <Text style={styles.loadOlderText}>
            {loadingOlder
              ? t('Loading...')
              : swipeHint ?? t('farming_chart_load_older')}
          </Text>
        </TouchableOpacity>
      ) : null}

      <View style={[styles.chartBox, {width: chartWidth}]}>
        <LineChart.Provider data={chartData} yRange={yRange}>
          <View style={styles.labelsRow}>
            <LineChart.PriceText
              style={styles.priceLabel}
              format={formatChartPrice}
            />
            <LineChart.DatetimeText
              style={styles.timeLabel}
              format={formatChartDatetime}
            />
          </View>
          <LineChart width={chartWidth} height={CHART_HEIGHT}>
            <LineChart.Path color={LINE_COLOR} width={2}>
              <LineChart.Gradient color={LINE_COLOR} />
            </LineChart.Path>
            <LineChart.CursorCrosshair color={LINE_COLOR}>
              <LineChart.Tooltip>
                <LineChart.PriceText
                  style={styles.tooltipPrice}
                  format={formatChartPrice}
                />
              </LineChart.Tooltip>
              <LineChart.Tooltip position="bottom">
                <LineChart.DatetimeText
                  style={styles.tooltipTime}
                  format={formatChartDatetime}
                />
              </LineChart.Tooltip>
            </LineChart.CursorCrosshair>
          </LineChart>
        </LineChart.Provider>
      </View>

      {minMax ? (
        <Text style={styles.range} numberOfLines={1}>
          {formatPoolSpot(String(minMax.min))} → {formatPoolSpot(String(minMax.max))}
        </Text>
      ) : null}
      {liveSpotFooter ? (
        <Text style={styles.liveFooter} numberOfLines={2}>
          {liveSpotFooter}
        </Text>
      ) : null}
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
  loadOlderBtn: {
    alignSelf: 'flex-start',
    marginBottom: space.sm,
    paddingVertical: 6,
    paddingHorizontal: space.sm,
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  loadOlderText: {
    color: colors.primary,
    fontSize: 12,
    fontFamily: fontFamily.semibold,
  },
  chartBox: {
    backgroundColor: PLOT_BG,
    borderRadius: 12,
    overflow: 'hidden',
    paddingTop: space.sm,
    paddingBottom: space.xs,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.sm,
    marginBottom: 4,
    minHeight: 22,
  },
  priceLabel: {
    color: colors.textPrimary,
    fontSize: 15,
    fontFamily: fontFamily.semibold,
  },
  timeLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontFamily: fontFamily.regular,
  },
  tooltipPrice: {
    color: colors.textPrimary,
    fontSize: 13,
    fontFamily: fontFamily.semibold,
  },
  tooltipTime: {
    color: colors.textSecondary,
    fontSize: 11,
    fontFamily: fontFamily.regular,
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
});
