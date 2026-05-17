import React from 'react';
import {StyleSheet, View} from 'react-native';
import type {StyleProp, ViewStyle} from 'react-native';

type Props = {
  combo: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function StressFrame({combo, children, style}: Props) {
  const intensity =
    combo >= 30 ? 0.55 : combo >= 20 ? 0.28 : 0;
  const borderColor =
    combo >= 30 ? '#ef4444' : combo >= 20 ? '#eab308' : 'transparent';

  return (
    <View
      style={[
        styles.wrap,
        style,
        intensity > 0 && {
          borderColor,
          borderWidth: 2,
          shadowColor: borderColor,
          shadowOpacity: intensity,
          shadowRadius: 16,
        },
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 16,
    overflow: 'hidden',
  },
});
