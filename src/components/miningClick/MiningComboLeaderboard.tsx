import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useQuery} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';

import {fetchMiningLeaderboard} from '../../api/miningClick';
import {useUserContext} from '../../context/UserContext';
import {colors, radii, space} from '../../theme/tokens';
import {fontFamily} from '../../theme/typography';
import {MutedText, SectionTitle} from '../ui';

export function MiningComboLeaderboard() {
  const {t} = useTranslation();
  const {userData} = useUserContext();
  const myId =
    typeof userData?.user_id === 'number' ? userData.user_id : null;

  const q = useQuery({
    queryKey: ['miningComboLeaderboard'],
    queryFn: () => fetchMiningLeaderboard(15),
  });

  if (q.isLoading) {
    return <ActivityIndicator color={colors.primary} style={styles.loader} />;
  }

  if (q.isError || !q.data?.entries?.length) {
    return (
      <View style={styles.box}>
        <SectionTitle>{t('mining_click_leaderboard_title')}</SectionTitle>
        <MutedText>{t('mining_click_leaderboard_empty')}</MutedText>
      </View>
    );
  }

  return (
    <View style={styles.box}>
      <SectionTitle>{t('mining_click_leaderboard_title')}</SectionTitle>
      <MutedText style={styles.hint}>
        {t('mining_click_leaderboard_hint')}
      </MutedText>
      {q.data.entries.map(entry => {
        const isMe = myId != null && entry.userId === myId;
        const name =
          entry.firstName +
          (entry.lastName ? ` ${entry.lastName.charAt(0)}.` : '');
        return (
          <View
            key={`${entry.userId}-${entry.rank}`}
            style={[styles.row, isMe && styles.rowMe]}>
            <Text style={styles.rank}>#{entry.rank}</Text>
            <View style={styles.nameCol}>
              <Text style={styles.name} numberOfLines={1}>
                {name}
                {isMe ? ` (${t('mining_click_leaderboard_you')})` : ''}
              </Text>
              <Text style={styles.sub}>
                {t('mining_click_leaderboard_clicks', {
                  count: entry.totalClicks,
                })}
              </Text>
            </View>
            <Text style={styles.combo}>{entry.maxCombo} COMBO</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    marginTop: space.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: space.md,
  },
  hint: {
    marginBottom: space.sm,
  },
  loader: {
    marginVertical: space.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowMe: {
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    marginHorizontal: -space.sm,
    paddingHorizontal: space.sm,
    borderRadius: radii.sm,
  },
  rank: {
    width: 36,
    color: colors.textMuted,
    fontFamily: fontFamily.bold,
    fontSize: 14,
  },
  nameCol: {
    flex: 1,
    marginRight: 8,
  },
  name: {
    color: colors.textPrimary,
    fontFamily: fontFamily.semibold,
    fontSize: 14,
  },
  sub: {
    color: colors.textMuted,
    fontFamily: fontFamily.regular,
    fontSize: 11,
    marginTop: 2,
  },
  combo: {
    color: '#22c55e',
    fontFamily: fontFamily.bold,
    fontSize: 13,
  },
});
