import React, {useMemo} from 'react';
import {StyleSheet, View} from 'react-native';
import Svg, {Polyline} from 'react-native-svg';
import type {HashSample} from '../../hooks/useGameLoop';
import {colors} from '../../theme/tokens';

type Props = {
  width: number;
  height: number;
  samples: HashSample[];
};

export function HashGraph({width, height, samples}: Props) {
  const points = useMemo(() => {
    if (samples.length < 2) {
      return '';
    }
    const maxT = Math.max(30, samples[samples.length - 1]?.t ?? 30);
    const maxHr = Math.max(1, ...samples.map(s => s.hashrate));
    return samples
      .map(s => {
        const x = (s.t / maxT) * width;
        const y = height - (s.hashrate / maxHr) * (height - 8) - 4;
        return `${x},${y}`;
      })
      .join(' ');
  }, [samples, width, height]);

  return (
    <View style={[styles.wrap, {width, height}]}>
      <Svg width={width} height={height}>
        {points ? (
          <Polyline
            points={points}
            fill="none"
            stroke={colors.primary}
            strokeWidth={2}
          />
        ) : null}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 12,
    overflow: 'hidden',
  },
});
