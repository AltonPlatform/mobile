import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {colors, radii, space} from '../../theme/tokens';
import {fontFamily} from '../../theme/typography';

type Props = {
  combo: number;
  maxCombo?: number;
};

function barColor(combo: number): string {
  if (combo >= 30) return '#ef4444';
  if (combo >= 20) return '#eab308';
  return '#22c55e';
}

export function ComboBar({combo, maxCombo = 40}: Props) {
  const pct = Math.min(100, (combo / maxCombo) * 100);
  const fill = barColor(combo);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>COMBO {combo}</Text>
      <View style={styles.track}>
        <View style={[styles.fill, {width: `${pct}%`, backgroundColor: fill}]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: space.sm,
  },
  label: {
    color: colors.textSecondary,
    fontFamily: fontFamily.semibold,
    fontSize: 11,
    marginBottom: 4,
  },
  track: {
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(51, 65, 85, 0.8)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radii.pill,
  },
});
