import React from 'react';
import {Text, type StyleProp, type TextStyle} from 'react-native';

import {useSmoothNumber} from '../../hooks/useSmoothNumber';

type Props = {
  value: number;
  format: (n: number) => string;
  style?: StyleProp<TextStyle>;
  durationMs?: number;
  numberOfLines?: number;
};

export function SmoothNumberText({
  value,
  format,
  style,
  durationMs,
  numberOfLines,
}: Props) {
  const smooth = useSmoothNumber(value, {durationMs});
  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {format(smooth)}
    </Text>
  );
}
