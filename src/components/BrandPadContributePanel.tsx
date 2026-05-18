import React, {useMemo, useState} from 'react';
import {StyleSheet, Text, TextInput, View} from 'react-native';
import {useTranslation} from 'react-i18next';

import {BalanceCoinIcon} from './Icons';
import {colors, radii, space} from '../theme/tokens';
import {fontFamily} from '../theme/typography';
import {AppModal, AppModalClose, PanSlider, PrimaryButton} from './ui';
import {localeFormat} from '../utils/formatNumbers';
import {
  formatMultiplier,
  previewAllocation,
  parseBrandpadBigInt,
} from '../utils/brandpadAllocation';

type Props = {
  visible: boolean;
  onClose: () => void;
  userBalance: number;
  totalContributed: string;
  brandpadAllocation: string;
  currentRank?: number;
  busy: boolean;
  onContribute: (amount: number) => void;
};

export function BrandPadContributePanel({
  visible,
  onClose,
  userBalance,
  totalContributed,
  brandpadAllocation,
  currentRank,
  busy,
  onContribute,
}: Props) {
  const {t} = useTranslation();
  const [ratio, setRatio] = useState(0);
  const [textAmount, setTextAmount] = useState('');

  const maxBalance = Math.max(0, Math.floor(userBalance));

  const amountFromSlider = useMemo(() => {
    if (maxBalance <= 0) {
      return 0;
    }
    if (ratio >= 1) {
      return maxBalance;
    }
    return Math.floor(maxBalance * ratio);
  }, [maxBalance, ratio]);

  const amount = useMemo(() => {
    const parsed = parseInt(textAmount.replace(/\D/g, ''), 10);
    if (textAmount.trim() !== '' && Number.isFinite(parsed) && parsed > 0) {
      return Math.min(maxBalance, parsed);
    }
    return amountFromSlider;
  }, [textAmount, amountFromSlider, maxBalance]);

  const preview = useMemo(() => {
    const total = parseBrandpadBigInt(totalContributed);
    const alloc = parseBrandpadBigInt(brandpadAllocation, '2000000');
    const hypotheticalTotal = total + BigInt(amount);
    if (amount <= 0 || hypotheticalTotal <= 0n) {
      return null;
    }
    return previewAllocation({
      userContributed: BigInt(amount),
      totalContributed: hypotheticalTotal,
      brandpadAllocation: alloc,
      rank: currentRank && currentRank <= 16 ? currentRank : undefined,
    });
  }, [
    amount,
    totalContributed,
    brandpadAllocation,
    currentRank,
  ]);

  const handleSubmit = () => {
    if (amount > 0) {
      onContribute(amount);
    }
  };

  return (
    <AppModal visible={visible} onClose={onClose} variant="bottomSheet">
      <AppModalClose onPress={onClose} />
      <Text style={styles.title}>{t('brandpad_contribute_title')}</Text>

      <View style={styles.balanceRow}>
        <BalanceCoinIcon size={16} />
        <Text style={styles.balanceLabel}>{t('brandpad_your_balance')}</Text>
        <Text style={styles.balanceValue}>{localeFormat(userBalance)}</Text>
      </View>

      <Text style={styles.fieldLabel}>{t('brandpad_amount')}</Text>
      <TextInput
        value={textAmount}
        onChangeText={setTextAmount}
        keyboardType="number-pad"
        placeholder="0"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
      />

      <Text style={styles.sliderLabel}>
        {t('farming_trade_slider_pct', {
          pct: Math.round(ratio * 100),
        })}
      </Text>
      <PanSlider
        value={ratio}
        onValueChange={v => {
          setRatio(v);
          if (maxBalance > 0) {
            setTextAmount(String(Math.floor(maxBalance * v) || ''));
          }
        }}
        disabled={maxBalance <= 0}
      />

      {preview ? (
        <View style={styles.preview}>
          <Text style={styles.previewLine}>
            {t('brandpad_est_tokens')}:{' '}
            {preview.totalTokens.toString()}
          </Text>
          <Text style={styles.previewSub}>
            {t('brandpad_est_multiplier')}: {formatMultiplier(preview.multiplier)}
          </Text>
        </View>
      ) : null}

      <PrimaryButton
        title={t('brandpad_contribute_btn')}
        onPress={handleSubmit}
        disabled={busy || amount <= 0}
        loading={busy}
        style={styles.submit}
      />
    </AppModal>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.textPrimary,
    fontSize: 18,
    fontFamily: fontFamily.bold,
    textAlign: 'center',
    marginBottom: space.md,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: space.md,
  },
  balanceLabel: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 14,
    fontFamily: fontFamily.regular,
  },
  balanceValue: {
    color: colors.textPrimary,
    fontSize: 14,
    fontFamily: fontFamily.semibold,
  },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontFamily: fontFamily.regular,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.md,
    paddingVertical: 12,
    color: colors.textPrimary,
    fontFamily: fontFamily.medium,
    fontSize: 18,
    marginBottom: space.md,
  },
  sliderLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontFamily: fontFamily.regular,
    marginBottom: space.sm,
  },
  preview: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: space.md,
    marginTop: space.md,
    marginBottom: space.sm,
  },
  previewLine: {
    color: colors.textPrimary,
    fontSize: 14,
    fontFamily: fontFamily.semibold,
  },
  previewSub: {
    color: colors.textMuted,
    fontSize: 12,
    fontFamily: fontFamily.regular,
    marginTop: 4,
  },
  submit: {
    marginTop: space.md,
  },
});
