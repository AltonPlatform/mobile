import React, {useCallback, useMemo, useRef, useState} from 'react';
import {
  LayoutChangeEvent,
  PanResponder,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';

import {colors, radii} from '../../theme/tokens';

const THUMB = 22;
const TRACK_H = 6;

type Props = {
  value: number;
  onValueChange: (v: number) => void;
  disabled?: boolean;
  minimumTrackTintColor?: string;
  maximumTrackTintColor?: string;
  thumbTintColor?: string;
  step?: number;
  style?: ViewStyle;
};

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function quantize(v: number, step: number): number {
  if (step <= 0 || !Number.isFinite(step)) {
    return clamp01(v);
  }
  const q = Math.round(v / step) * step;
  return clamp01(q);
}

/**
 * Слайдер 0..1 без нативных модулей (обход линковки Fabric / community-slider).
 */
export function PanSlider({
  value,
  onValueChange,
  disabled,
  minimumTrackTintColor = colors.primary,
  maximumTrackTintColor = colors.border,
  thumbTintColor = colors.textPrimary,
  step = 0.001,
  style,
}: Props) {
  const widthRef = useRef(0);
  const [trackWidth, setTrackWidth] = useState(0);

  const applyX = useCallback(
    (locationX: number) => {
      const w = widthRef.current;
      if (w <= 0 || disabled) {
        return;
      }
      const r = quantize(locationX / w, step);
      onValueChange(r);
    },
    [disabled, onValueChange, step],
  );

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled,
        onMoveShouldSetPanResponder: () => !disabled,
        onPanResponderGrant: e => applyX(e.nativeEvent.locationX),
        onPanResponderMove: e => applyX(e.nativeEvent.locationX),
      }),
    [applyX, disabled],
  );

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    widthRef.current = w;
    setTrackWidth(w);
  }, []);

  const thumbLeft =
    trackWidth > 0
      ? Math.max(
          0,
          Math.min(
            trackWidth - THUMB,
            value * trackWidth - THUMB / 2,
          ),
        )
      : 0;

  const fillPct = `${clamp01(value) * 100}%`;

  return (
    <View style={[styles.wrap, style]} onLayout={onLayout} {...pan.panHandlers}>
      <View
        style={[
          styles.track,
          {backgroundColor: maximumTrackTintColor},
        ]}
        pointerEvents="none">
        <View
          style={[
            styles.fill,
            {width: fillPct, backgroundColor: minimumTrackTintColor},
          ]}
        />
      </View>
      <View
        style={[
          styles.thumb,
          disabled && styles.thumbDisabled,
          {
            left: thumbLeft,
            backgroundColor: thumbTintColor,
          },
        ]}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 40,
    justifyContent: 'center',
    marginVertical: 4,
  },
  track: {
    height: TRACK_H,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radii.pill,
  },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    top: (40 - THUMB) / 2,
    borderWidth: 2,
    borderColor: colors.border,
  },
  thumbDisabled: {
    opacity: 0.4,
  },
});
