import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useTranslation} from 'react-i18next';

import type {BrandPadStatus} from '../types/brandpad';
import {colors, radii, space} from '../theme/tokens';
import {fontFamily} from '../theme/typography';

type Props = {
  status: BrandPadStatus;
  participantCount: number;
  minParticipants: number;
  totalContributed: string;
  minTotalContributed: string;
  onGoToPool?: () => void;
};

export function BrandPadStatusBanner({
  status,
  participantCount,
  minParticipants,
  totalContributed,
  minTotalContributed,
  onGoToPool,
}: Props) {
  const {t} = useTranslation();

  if (status === 'active') {
    return null;
  }

  const succeeded = status === 'succeeded';

  return (
    <View
      style={[
        styles.banner,
        succeeded ? styles.bannerSuccess : styles.bannerFailed,
      ]}>
      <Text style={styles.title}>
        {succeeded
          ? t('brandpad_status_succeeded')
          : t('brandpad_status_failed')}
      </Text>
      {!succeeded ? (
        <Text style={styles.sub}>
          {participantCount < minParticipants
            ? t('brandpad_fail_participants', {
                current: participantCount,
                min: minParticipants,
              })
            : t('brandpad_fail_balance', {
                current: totalContributed,
                min: minTotalContributed,
              })}
        </Text>
      ) : null}
      {succeeded && onGoToPool ? (
        <TouchableOpacity style={styles.btn} onPress={onGoToPool} activeOpacity={0.85}>
          <Text style={styles.btnText}>{t('brandpad_go_to_pool')}</Text>
        </TouchableOpacity>
      ) : null}
      {!succeeded ? (
        <Text style={styles.refund}>{t('brandpad_balance_refunded')}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: radii.md,
    padding: space.md,
    marginBottom: space.md,
  },
  bannerSuccess: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.35)',
  },
  bannerFailed: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.35)',
  },
  title: {
    color: colors.textPrimary,
    fontSize: 15,
    fontFamily: fontFamily.semibold,
    marginBottom: 6,
  },
  sub: {
    color: colors.textSecondary,
    fontSize: 13,
    fontFamily: fontFamily.regular,
    marginBottom: 8,
  },
  refund: {
    color: colors.textMuted,
    fontSize: 12,
    fontFamily: fontFamily.regular,
  },
  btn: {
    marginTop: space.sm,
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    paddingHorizontal: space.lg,
    paddingVertical: 10,
    borderRadius: radii.pill,
  },
  btnText: {
    color: colors.textPrimary,
    fontFamily: fontFamily.semibold,
    fontSize: 14,
  },
});
