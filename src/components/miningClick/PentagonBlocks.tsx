import React, {useEffect, useRef} from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {colors, radii} from '../../theme/tokens';
import {fontFamily} from '../../theme/typography';

type Props = {
  size: number;
  activeBlock: number;
  disabled?: boolean;
  shake?: boolean;
  onPressBlock: (index: number) => void;
  flashBlock?: number | null;
};

export function PentagonBlocks({
  size,
  activeBlock,
  disabled,
  shake,
  onPressBlock,
  flashBlock,
}: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const R = size * 0.36;
  const blockR = size * 0.1;
  const shakeX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (shake) {
      Animated.sequence([
        Animated.timing(shakeX, {toValue: -8, duration: 40, useNativeDriver: true}),
        Animated.timing(shakeX, {toValue: 8, duration: 40, useNativeDriver: true}),
        Animated.timing(shakeX, {toValue: -6, duration: 40, useNativeDriver: true}),
        Animated.timing(shakeX, {toValue: 6, duration: 40, useNativeDriver: true}),
        Animated.timing(shakeX, {toValue: 0, duration: 40, useNativeDriver: true}),
      ]).start();
    }
  }, [shake, shakeX]);

  return (
    <Animated.View
      style={[
        {width: size, height: size},
        {transform: [{translateX: shakeX}]},
      ]}>
      {Array.from({length: 5}, (_, i) => {
        const angle = (2 * Math.PI / 5) * i - Math.PI / 2;
        const x = cx + R * Math.cos(angle) - blockR;
        const y = cy + R * Math.sin(angle) - blockR;
        const isActive = i === activeBlock;
        const isFlash = flashBlock === i;
        return (
          <Block
            key={i}
            index={i}
            left={x}
            top={y}
            size={blockR * 2}
            isActive={isActive}
            isFlash={isFlash}
            disabled={disabled}
            onPress={() => onPressBlock(i)}
          />
        );
      })}
    </Animated.View>
  );
}

function Block({
  index,
  left,
  top,
  size,
  isActive,
  isFlash,
  disabled,
  onPress,
}: {
  index: number;
  left: number;
  top: number;
  size: number;
  isActive: boolean;
  isFlash: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const pulse = useRef(new Animated.Value(1)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    loopRef.current?.stop();
    if (isActive) {
      loopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1.12,
            duration: 450,
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 1,
            duration: 450,
            useNativeDriver: true,
          }),
        ]),
      );
      loopRef.current.start();
    } else {
      pulse.setValue(1);
    }
    return () => loopRef.current?.stop();
  }, [isActive, pulse]);

  return (
    <Animated.View
      style={[
        styles.blockWrap,
        {left, top, width: size, height: size},
        {transform: [{scale: pulse}]},
      ]}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={[
          styles.block,
          isActive && styles.blockActive,
          isFlash && styles.blockFlash,
        ]}>
        <Text style={styles.blockLabel}>{index + 1}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  blockWrap: {
    position: 'absolute',
  },
  block: {
    flex: 1,
    borderRadius: radii.md,
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    borderWidth: 2,
    borderColor: 'rgba(71, 85, 105, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockActive: {
    borderColor: '#22c55e',
    backgroundColor: 'rgba(34, 197, 94, 0.25)',
    shadowColor: '#22c55e',
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 8,
  },
  blockFlash: {
    borderColor: '#86efac',
    backgroundColor: 'rgba(134, 239, 172, 0.45)',
  },
  blockLabel: {
    color: colors.textPrimary,
    fontFamily: fontFamily.semibold,
    fontSize: 12,
  },
});
