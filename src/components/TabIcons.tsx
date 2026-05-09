import React from 'react';
import Svg, {Path, Circle, Rect} from 'react-native-svg';

type IconProps = {
  color: string;
  size?: number;
};

/** Fluent CoinStack24Filled–style simplified stack */
export function TabIconHome({color, size = 24}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="5" fill={color} opacity={0.9} />
      <Circle cx="9" cy="12" r="4" fill={color} opacity={0.7} />
      <Circle cx="15" cy="12" r="4" fill={color} opacity={0.7} />
      <Circle cx="12" cy="16" r="5" fill={color} />
    </Svg>
  );
}

/** Flash24Filled-style bolt */
export function TabIconBoosts({color, size = 24}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        fill={color}
        d="M13 2L3 14h8v8l10-12h-8V2z"
      />
    </Svg>
  );
}

/** Graduation cap simplified */
export function TabIconAcademy({color, size = 24}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        fill={color}
        d="M12 3L2 8l10 5 10-5-10-5zm0 7.5L5 9v6c0 3 7 5 7 5s7-2 7-5V9l-7 3.5z"
      />
    </Svg>
  );
}

/** Table / checklist */
export function TabIconMissions({color, size = 24}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="4" y="5" width="16" height="3" rx="1" fill={color} />
      <Rect x="4" y="11" width="16" height="3" rx="1" fill={color} opacity={0.85} />
      <Rect x="4" y="17" width="10" height="3" rx="1" fill={color} opacity={0.7} />
    </Svg>
  );
}

/** Two people */
export function TabIconFriends({color, size = 24}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="9" cy="8" r="3" fill={color} />
      <Circle cx="17" cy="9" r="2.5" fill={color} opacity={0.9} />
      <Path
        fill={color}
        d="M4 20c0-3 3.5-5 8-5 4.5 0 8 2 8 5v1H4v-1z"
        opacity={0.85}
      />
      <Path
        fill={color}
        d="M14 18c1.5-1 3.5-1.5 6-1.5 3 0 4 .8 4 2v1.5h-6v-2z"
        opacity={0.7}
      />
    </Svg>
  );
}
