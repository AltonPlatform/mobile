import React from 'react';
import Animated from 'react-native-reanimated';
import {Line, Rect} from 'react-native-svg';
import type {ColorValue, NumberProp} from 'react-native-svg';

import type {WagmiCandle} from '../utils/chartGameChartData';

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedLine = Animated.createAnimatedComponent(Line);

function isPlaceholderCandle(candle: WagmiCandle | undefined): boolean {
  return Boolean(candle?.placeholder);
}

/** Минимальная высота тела свечи в px (doji / open ≈ close). */
export const CHART_GAME_MIN_CANDLE_BODY_PX = 2;

type CandleRectRenderOptions = {
  x: NumberProp;
  y: NumberProp;
  width: NumberProp;
  height: NumberProp;
  fill: ColorValue;
  useAnimations: boolean;
  animatedProps?: object;
  candle?: WagmiCandle;
};

type CandleLineRenderOptions = {
  x1: NumberProp;
  y1: NumberProp;
  x2: NumberProp;
  y2: NumberProp;
  stroke: ColorValue;
  strokeWidth: NumberProp;
  useAnimations: boolean;
  animatedProps?: object;
  candle?: WagmiCandle;
};

function toPx(v: NumberProp | undefined): number {
  if (v == null) {
    return 0;
  }
  return typeof v === 'number' ? v : Number(v) || 0;
}

function withMinBodyHeight(y: number, height: number): {y: number; height: number} {
  const minH = CHART_GAME_MIN_CANDLE_BODY_PX;
  if (height >= minH) {
    return {y, height};
  }
  return {
    y: y - (minH - height) / 2,
    height: minH,
  };
}

/** Фитиль скрыт для пустых слотов (зона прогноза). */
export function renderChartGameCandleLine(props: CandleLineRenderOptions) {
  if (isPlaceholderCandle(props.candle)) {
    return null;
  }
  const {useAnimations, animatedProps, candle: _c, ...rest} = props;
  if (useAnimations) {
    return <AnimatedLine {...rest} animatedProps={animatedProps} />;
  }
  return <Line {...rest} />;
}

/** Тонкое тело при open === close; пустые слоты не рисуем. */
export function renderChartGameCandleRect(props: CandleRectRenderOptions) {
  if (isPlaceholderCandle(props.candle)) {
    return null;
  }
  const {useAnimations, animatedProps, ...rest} = props;
  const rawY = toPx(rest.y);
  const rawH = toPx(rest.height);
  const {y: bodyY, height: bodyH} = withMinBodyHeight(rawY, rawH);
  const needsMinBody = rawH < CHART_GAME_MIN_CANDLE_BODY_PX;

  if (useAnimations && !needsMinBody) {
    return <AnimatedRect {...rest} animatedProps={animatedProps} />;
  }

  return (
    <Rect
      x={rest.x}
      y={bodyY}
      width={rest.width}
      height={bodyH}
      fill={rest.fill}
    />
  );
}
