import React from 'react';
import Svg, {Defs, LinearGradient, Path, Stop} from 'react-native-svg';

type Props = {
  size?: number;
  filled?: boolean;
};

export function StreakFlameIcon({size = 28, filled = true}: Props) {
  const fill = filled ? 'url(#streakFlame)' : '#E5E7EB';
  return (
    <Svg width={size} height={size} viewBox="0 0 24 28" fill="none">
      <Path
        d="M12 0C8 6 4 8 4 14c0 4.4 3.6 8 8 8s8-3.6 8-8c0-6-4-8-8-14zm0 22c-2.2 0-4-1.8-4-4 0-2.8 2.4-5.2 4-8.2 1.6 3 4 5.4 4 8.2 0 2.2-1.8 4-4 4z"
        fill={fill}
      />
      <Defs>
        <LinearGradient id="streakFlame" x1="4" y1="0" x2="20" y2="28">
          <Stop offset="0" stopColor="#FF6B9D" />
          <Stop offset="0.5" stopColor="#FF8A4C" />
          <Stop offset="1" stopColor="#FFB347" />
        </LinearGradient>
      </Defs>
    </Svg>
  );
}

export function StreakTrophyIcon({
  size = 28,
  active = false,
}: {
  size?: number;
  active?: boolean;
}) {
  const stroke = active ? '#FF6B9D' : '#D1D5DB';
  const fill = active ? '#FFF0F5' : '#F3F4F6';
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 4h12v3a6 6 0 01-12 0V4zM8 20h8M10 17h4M9 13h6"
        stroke={stroke}
        strokeWidth={1.8}
        strokeLinecap="round"
        fill={fill}
      />
    </Svg>
  );
}
