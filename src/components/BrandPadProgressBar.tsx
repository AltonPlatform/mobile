import React, {useMemo} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';

import {colors, radii, space} from '../theme/tokens';
import {fontFamily} from '../theme/typography';
import {localeFormat} from '../utils/formatNumbers';
import {parseBrandpadBigInt} from '../utils/brandpadAllocation';

type Props = {
  totalContributed: string;
  goalContributed: string;
};

export function BrandPadProgressBar({
  totalContributed,
  goalContributed,
}: Props) {
  const {t} = useTranslation();

  const {current, goal, ratio} = useMemo(() => {
    const cur = parseBrandpadBigInt(totalContributed);
    const g = parseBrandpadBigInt(goalContributed, '100000');
    const r =
      g > 0n ? Math.min(1, Number((cur * 10000n) / g) / 10000) : 0;
    return {current: cur, goal: g, ratio: r};
  }, [totalContributed, goalContributed]);

  const currentNum = Number(current > BigInt(Number.MAX_SAFE_INTEGER)
    ? Number.MAX_SAFE_INTEGER
    : current);
  const goalNum = Number(goal > BigInt(Number.MAX_SAFE_INTEGER)
    ? Number.MAX_SAFE_INTEGER
    : goal);

  return (
    <View style={styles.wrap}>
      <View style={styles.labels}>
        <Text style={styles.currentLabel}>
          {t('brandpad_coins')} {localeFormat(currentNum)}
        </Text>
        <Text style={styles.goalLabel}>
          {t('brandpad_coins')} {localeFormat(goalNum)}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, {width: `${Math.round(ratio * 100)}%`}]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: space.md,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: space.sm,
  },
  currentLabel: {
    color: colors.textPrimary,
    fontSize: 22,
    fontFamily: fontFamily.bold,
  },
  goalLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontFamily: fontFamily.regular,
  },
  track: {
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radii.pill,
    backgroundColor: '#A855F7',
    minWidth: 4,
  },
});
