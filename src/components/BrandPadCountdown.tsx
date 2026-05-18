import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';

import {colors, radii, space} from '../theme/tokens';
import {fontFamily} from '../theme/typography';

type Props = {
  endsAt: string;
  participantCount: number;
  minParticipants: number;
};

function msUntilEnd(endsAt: string): number {
  const end = new Date(endsAt).getTime();
  if (!Number.isFinite(end)) {
    return 0;
  }
  return Math.max(0, end - Date.now());
}

function formatRemaining(ms: number): {days: number; hours: number; minutes: number} {
  const totalMin = Math.floor(ms / 60_000);
  const days = Math.floor(totalMin / (60 * 24));
  const hours = Math.floor((totalMin % (60 * 24)) / 60);
  const minutes = totalMin % 60;
  return {days, hours, minutes};
}

export function BrandPadCountdown({
  endsAt,
  participantCount,
  minParticipants,
}: Props) {
  const {t} = useTranslation();
  const [remaining, setRemaining] = useState(() => msUntilEnd(endsAt));

  useEffect(() => {
    const tick = () => setRemaining(msUntilEnd(endsAt));
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [endsAt]);

  const {days, hours, minutes} = formatRemaining(remaining);

  return (
    <View style={styles.row}>
      <View style={styles.card}>
        <Text style={styles.value}>{days}</Text>
        <Text style={styles.label}>{t('brandpad_days_to_go')}</Text>
        <Text style={styles.sub}>
          {hours > 0 || minutes > 0
            ? t('brandpad_countdown_detail', {hours, minutes})
            : ''}
        </Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.value}>
          {participantCount}
          <Text style={styles.valueMuted}> / {minParticipants}</Text>
        </Text>
        <Text style={styles.label}>{t('brandpad_participants')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: space.sm,
    marginBottom: space.md,
  },
  card: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    padding: space.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  value: {
    color: colors.textPrimary,
    fontSize: 24,
    fontFamily: fontFamily.bold,
    marginBottom: 4,
  },
  valueMuted: {
    fontSize: 16,
    color: colors.textMuted,
    fontFamily: fontFamily.medium,
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    fontFamily: fontFamily.regular,
  },
  sub: {
    color: colors.textSecondary,
    fontSize: 11,
    fontFamily: fontFamily.regular,
    marginTop: 4,
  },
});
