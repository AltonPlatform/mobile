import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useTranslation} from 'react-i18next';

import {colors, radii, space} from '../theme/tokens';
import {fontFamily} from '../theme/typography';
import {PrimaryButton, PanSlider} from './ui';
import {
  amountFromSliderRatio,
  bigIntToSafeNumber,
  buyOneTokenPriceDecimal,
  buyTokensOut,
  midSpotPriceDecimal,
  parsePoolBigInt,
  sellOneTokenPriceDecimal,
  sellPointsOut,
} from '../utils/poolAmm';

export type PoolTradeMode = 'buy' | 'sell';

type Props = {
  reservePoints: string;
  reserveTokens: string;
  spotPriceApprox: string;
  userPoints: number;
  positionTokens: string;
  busy: boolean;
  onBuy: (pointsAmount: number, minTokensOut: string) => void;
  onSell: (tokenAmount: string, minPointsOut: string) => void;
};

function formatBigIntPlain(n: bigint): string {
  return n.toString();
}

/** Средняя цена: points / token (строка). */
function avgPricePointsPerToken(points: bigint, tokens: bigint): string | null {
  if (tokens <= 0n) {
    return null;
  }
  const scaled = (points * 1_000_000n) / tokens;
  const whole = scaled / 1_000_000n;
  const frac = scaled % 1_000_000n;
  if (frac === 0n) {
    return whole.toString();
  }
  const fracStr = frac.toString().padStart(6, '0').replace(/0+$/, '');
  return `${whole.toString()}.${fracStr}`;
}

export function PoolTradePanel({
  reservePoints,
  reserveTokens,
  spotPriceApprox,
  userPoints,
  positionTokens,
  busy,
  onBuy,
  onSell,
}: Props) {
  const {t} = useTranslation();
  const [mode, setMode] = useState<PoolTradeMode>('buy');
  const [ratio, setRatio] = useState(0);

  useEffect(() => {
    setRatio(0);
  }, [mode, reservePoints, reserveTokens, positionTokens, userPoints]);

  const rp = useMemo(() => parsePoolBigInt(reservePoints), [reservePoints]);
  const rt = useMemo(() => parsePoolBigInt(reserveTokens), [reserveTokens]);

  const spotMid = useMemo(
    () => midSpotPriceDecimal(rp, rt, 12),
    [rp, rt],
  );
  const buyOnePrice = useMemo(
    () => buyOneTokenPriceDecimal(rp, rt, 12),
    [rp, rt],
  );
  const sellOnePrice = useMemo(
    () => sellOneTokenPriceDecimal(rp, rt, 12),
    [rp, rt],
  );
  const held = useMemo(() => parsePoolBigInt(positionTokens), [positionTokens]);
  const userPb = useMemo(
    () =>
      BigInt(
        Math.max(0, Math.floor(Number.isFinite(userPoints) ? userPoints : 0)),
      ),
    [userPoints],
  );

  const maxBuyPoints = useMemo(() => {
    if (userPb <= 0n || rp <= 0n || rt <= 0n) {
      return 0n;
    }
    return userPb;
  }, [userPb, rp, rt]);

  const maxSellTokens = useMemo(() => {
    if (held <= 0n || rp <= 0n || rt <= 0n) {
      return 0n;
    }
    return held;
  }, [held, rp, rt]);

  const preview = useMemo(() => {
    if (mode === 'buy') {
      const pts = amountFromSliderRatio(maxBuyPoints, ratio);
      if (pts <= 0n) {
        return {
          kind: 'buy' as const,
          points: 0n,
          tokens: null as bigint | null,
          err: null as string | null,
        };
      }
      try {
        const {tokensOut} = buyTokensOut(rp, rt, pts);
        return {
          kind: 'buy' as const,
          points: pts,
          tokens: tokensOut,
          err: null as string | null,
        };
      } catch {
        return {
          kind: 'buy' as const,
          points: pts,
          tokens: null as bigint | null,
          err: t('farming_trade_preview_error'),
        };
      }
    }
    const tok = amountFromSliderRatio(maxSellTokens, ratio);
    if (tok <= 0n) {
      return {
        kind: 'sell' as const,
        tokens: 0n,
        points: null as bigint | null,
        err: null as string | null,
      };
    }
    try {
      const {pointsOut} = sellPointsOut(rp, rt, tok);
      return {
        kind: 'sell' as const,
        tokens: tok,
        points: pointsOut,
        err: null as string | null,
      };
    } catch {
      return {
        kind: 'sell' as const,
        tokens: tok,
        points: null as bigint | null,
        err: t('farming_trade_preview_error'),
      };
    }
  }, [mode, maxBuyPoints, maxSellTokens, ratio, rp, rt, t]);

  const avgPrice = useMemo(() => {
    if (preview.kind === 'buy' && preview.tokens && preview.points > 0n) {
      return avgPricePointsPerToken(preview.points, preview.tokens);
    }
    if (preview.kind === 'sell' && preview.points && preview.tokens > 0n) {
      return avgPricePointsPerToken(preview.points, preview.tokens);
    }
    return null;
  }, [preview]);

  const canSubmit =
    !busy &&
    ratio > 0 &&
    (preview.kind === 'buy'
      ? preview.points > 0n &&
        preview.tokens != null &&
        preview.err == null
      : preview.tokens > 0n &&
        preview.points != null &&
        preview.err == null);

  const submit = useCallback(() => {
    if (!canSubmit) {
      return;
    }
    if (preview.kind === 'buy' && preview.tokens != null) {
      const minT = (preview.tokens * 995n) / 1000n;
      const ptsNum = bigIntToSafeNumber(preview.points);
      onBuy(ptsNum, minT > 0n ? minT.toString() : '0');
      return;
    }
    if (preview.kind === 'sell' && preview.points != null) {
      const minP = (preview.points * 995n) / 1000n;
      onSell(preview.tokens.toString(), minP > 0n ? minP.toString() : '0');
    }
  }, [canSubmit, onBuy, onSell, preview]);

  const disabledSlider = busy || (mode === 'buy' ? maxBuyPoints : maxSellTokens) <= 0n;

  return (
    <View style={styles.block}>
      <Text style={styles.sectionTitle}>{t('farming_trade_title')}</Text>

      <View style={styles.segment}>
        <SegmentTab
          label={t('farming_trade_tab_buy')}
          active={mode === 'buy'}
          onPress={() => setMode('buy')}
          disabled={busy}
        />
        <SegmentTab
          label={t('farming_trade_tab_sell')}
          active={mode === 'sell'}
          onPress={() => setMode('sell')}
          disabled={busy}
        />
      </View>

      <View style={styles.priceCard}>
        <Row label={t('farming_trade_price_spot')} value={spotMid || spotPriceApprox} />
        {buyOnePrice ? (
          <Row label={t('farming_trade_price_buy')} value={buyOnePrice} />
        ) : null}
        {sellOnePrice ? (
          <Row label={t('farming_trade_price_sell')} value={sellOnePrice} />
        ) : null}
        {avgPrice ? (
          <Row label={t('farming_trade_price_avg')} value={avgPrice} />
        ) : (
          <MutedRow text={t('farming_trade_price_avg_hint')} />
        )}
      </View>

      <Text style={styles.sliderLabel}>
        {mode === 'buy'
          ? t('farming_trade_slider_buy')
          : t('farming_trade_slider_sell')}
      </Text>
      <PanSlider
        style={styles.slider}
        step={0.001}
        value={ratio}
        onValueChange={setRatio}
        minimumTrackTintColor={colors.primary}
        maximumTrackTintColor={colors.border}
        thumbTintColor={colors.textPrimary}
        disabled={disabledSlider}
      />
      <Text style={styles.ratioHint}>
        {disabledSlider
          ? t('farming_trade_slider_disabled')
          : t('farming_trade_slider_pct', {
              pct: Math.round(ratio * 1000) / 10,
            })}
      </Text>

      {preview.err ? (
        <Text style={styles.previewErr}>{preview.err}</Text>
      ) : preview.kind === 'buy' ? (
        <View style={styles.preview}>
          <Text style={styles.previewMain}>
            {t('farming_trade_you_spend')}:{' '}
            <Text style={styles.previewAccent}>
              {preview.points > 0n ? formatBigIntPlain(preview.points) : '0'}{' '}
              {t('farming_points_symbol')}
            </Text>
          </Text>
          <Text style={styles.previewMain}>
            {t('farming_trade_you_get')}:{' '}
            <Text style={styles.previewAccent}>
              {preview.tokens != null
                ? formatBigIntPlain(preview.tokens)
                : '—'}{' '}
              {t('farming_tokens_symbol')}
            </Text>
          </Text>
        </View>
      ) : (
        <View style={styles.preview}>
          <Text style={styles.previewMain}>
            {t('farming_trade_you_sell')}:{' '}
            <Text style={styles.previewAccent}>
              {preview.tokens > 0n ? formatBigIntPlain(preview.tokens) : '0'}{' '}
              {t('farming_tokens_symbol')}
            </Text>
          </Text>
          <Text style={styles.previewMain}>
            {t('farming_trade_you_get_points')}:{' '}
            <Text style={styles.previewAccent}>
              {preview.points != null
                ? formatBigIntPlain(preview.points)
                : '—'}{' '}
              {t('farming_points_symbol')}
            </Text>
          </Text>
        </View>
      )}

      <MutedRow text={t('farming_trade_slippage_note')} />

      <PrimaryButton
        title={
          mode === 'buy'
            ? t('farming_trade_submit_buy')
            : t('farming_trade_submit_sell')
        }
        loading={busy}
        onPress={submit}
        disabled={!canSubmit}
        style={styles.submit}
      />
    </View>
  );
}

function SegmentTab({
  label,
  active,
  onPress,
  disabled,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.segItem, active && styles.segItemActive]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}>
      <Text style={[styles.segText, active && styles.segTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Row({label, value}: {label: string; value: string}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} selectable>
        {value}
      </Text>
    </View>
  );
}

function MutedRow({text}: {text: string}) {
  return (
    <Text style={styles.mutedCenter} numberOfLines={2}>
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: space.md,
    marginBottom: space.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: fontFamily.semibold,
    color: colors.textPrimary,
    marginBottom: space.sm,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.pill,
    padding: 4,
    marginBottom: space.md,
  },
  segItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radii.pill,
    alignItems: 'center',
  },
  segItemActive: {
    backgroundColor: colors.primary,
  },
  segText: {
    fontSize: 14,
    fontFamily: fontFamily.semibold,
    color: colors.textMuted,
  },
  segTextActive: {
    color: colors.textPrimary,
  },
  priceCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.sm,
    padding: space.sm,
    marginBottom: space.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  rowLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontFamily: fontFamily.regular,
  },
  rowValue: {
    color: colors.textPrimary,
    fontSize: 14,
    fontFamily: fontFamily.medium,
    flex: 1,
    textAlign: 'right',
  },
  sliderLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontFamily: fontFamily.medium,
    marginBottom: 4,
  },
  slider: {
    width: '100%',
    height: 40,
    marginVertical: 4,
  },
  ratioHint: {
    color: colors.textMuted,
    fontSize: 12,
    fontFamily: fontFamily.regular,
    marginBottom: space.sm,
  },
  preview: {
    marginTop: space.sm,
    marginBottom: space.sm,
  },
  previewMain: {
    color: colors.textSecondary,
    fontSize: 14,
    fontFamily: fontFamily.regular,
    marginTop: 6,
  },
  previewAccent: {
    color: colors.textPrimary,
    fontFamily: fontFamily.semibold,
  },
  previewErr: {
    color: colors.error,
    fontSize: 13,
    marginVertical: space.sm,
    fontFamily: fontFamily.regular,
  },
  mutedCenter: {
    color: colors.textMuted,
    fontSize: 12,
    fontFamily: fontFamily.regular,
    textAlign: 'center',
    marginTop: space.xs,
  },
  submit: {marginTop: space.md},
});
