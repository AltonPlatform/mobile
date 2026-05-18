import React, {useEffect, useRef} from 'react';
import {Animated, Easing, Platform, StyleSheet, View} from 'react-native';

type Props = {
  size: number;
  active: boolean;
  children: React.ReactNode;
};

/** Отступ под свечение (компактный пульс). */
const GLOW_PAD = 7;

/**
 * Пульс как `animation.css` → `.bullcoin.filled` + `@keyframes glowing`
 * (1s ease-in-out infinite alternate). Монета не масштабируется.
 */
export function BullcoinFilledGlow({size, active, children}: Props) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }

    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [active, pulse]);

  const shadowRadius = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 6],
  });
  const shadowOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.68, 0.88],
  });
  const elevation = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 6],
  });

  const outerOpacity1 = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.22, 0.3],
  });
  const outerScale1 = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1.02, 1.055],
  });
  const outerOpacity2 = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.25, 0.33],
  });
  const outerScale2 = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1.01, 1.035],
  });
  const outerOpacity3 = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.16, 0.22],
  });
  const outerScale3 = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.02],
  });

  const radius = size / 2;
  const outer = size + GLOW_PAD * 2;

  return (
    <View
      style={[styles.root, {width: outer, height: outer}]}
      pointerEvents="box-none">
      {active ? (
        <View style={styles.glowStack} pointerEvents="none">
          <Animated.View
            style={[
              styles.glowBlob,
              {
                width: size,
                height: size,
                borderRadius: radius,
                backgroundColor: '#e62159',
                opacity: outerOpacity1,
                transform: [{scale: outerScale1}],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.glowBlob,
              {
                width: size,
                height: size,
                borderRadius: radius,
                backgroundColor: '#EC0667',
                opacity: outerOpacity2,
                transform: [{scale: outerScale2}],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.glowBlob,
              {
                width: size,
                height: size,
                borderRadius: radius,
                backgroundColor: '#BE0F41',
                opacity: outerOpacity3,
                transform: [{scale: outerScale3}],
              },
            ]}
          />
        </View>
      ) : null}

      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.coinShadow,
          {
            width: size,
            height: size,
            borderRadius: radius,
            shadowOpacity: active ? shadowOpacity : 0,
            shadowRadius: active ? shadowRadius : 0,
            ...(Platform.OS === 'android' && active ? {elevation} : null),
          },
        ]}>
        <View
          style={[styles.coinClip, {width: size, height: size, borderRadius: radius}]}>
          {children}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  glowStack: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  glowBlob: {
    position: 'absolute',
  },
  coinShadow: {
    zIndex: 2,
    overflow: 'visible',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    shadowColor: '#e62159',
    shadowOffset: {width: 0, height: 0},
  },
  coinClip: {
    overflow: 'hidden',
  },
});
