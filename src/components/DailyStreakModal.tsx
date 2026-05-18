import React, {useMemo} from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import Svg, {Defs, LinearGradient, Rect, Stop} from 'react-native-svg';

import {
  claimDailyBonus,
  fetchStreakInfo,
  type StreakInfoResponse,
} from '../api/streak';
import {DismissIcon, BalanceCoinIcon} from './Icons';
import {StreakFlameIcon, StreakTrophyIcon} from './StreakFlameIcon';
import {sumFormat} from '../utils/fortune';
import {fontFamily} from '../theme/typography';

const WEEK_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

const palette = {
  bg: '#FFF8FA',
  card: '#FFFFFF',
  text: '#1A1A1A',
  textMuted: '#6B7280',
  accent: '#E62159',
  accentSoft: '#FFE4EC',
  border: '#F3F4F6',
  progressTrack: '#F3F4F6',
  progressFillStart: '#FF8A4C',
  progressFillEnd: '#FF6B9D',
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onClaimed?: () => void;
};

function formatStreakDate(iso: string | null, locale: string): string {
  if (!iso) return '—';
  try {
    const d = new Date(`${iso}T12:00:00Z`);
    return d.toLocaleDateString(locale, {day: 'numeric', month: 'short'});
  } catch {
    return iso;
  }
}

function filledWeekDays(info: StreakInfoResponse): number {
  const {streak, claimedToday, nextClaimDay} = info;
  if (streak <= 0 && !claimedToday) return 0;
  if (nextClaimDay > 7) return 7;
  if (claimedToday) return nextClaimDay >= 7 ? 7 : nextClaimDay;
  return Math.max(0, nextClaimDay - 1);
}

function milestoneProgress(info: StreakInfoResponse): number {
  const {streak, nextMilestone, claimedMilestones} = info;
  if (!nextMilestone) return 1;
  const prev =
    claimedMilestones.length > 0
      ? Math.max(...claimedMilestones)
      : 0;
  const span = nextMilestone - prev;
  if (span <= 0) return 1;
  return Math.min(1, Math.max(0, (streak - prev) / span));
}

export function DailyStreakModal({visible, onClose, onClaimed}: Props) {
  const {t, i18n} = useTranslation();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const streakQuery = useQuery({
    queryKey: ['streak'],
    queryFn: fetchStreakInfo,
    enabled: visible,
  });

  const claimMut = useMutation({
    mutationFn: claimDailyBonus,
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: ['streak']});
      onClaimed?.();
      onClose();
    },
  });

  const info = streakQuery.data;
  const filledDays = info ? filledWeekDays(info) : 0;
  const progress = info ? milestoneProgress(info) : 0;
  const locale = i18n.language?.startsWith('uk')
    ? 'uk-UA'
    : i18n.language?.startsWith('ru')
      ? 'ru-RU'
      : 'en-US';

  const rewardPreview = useMemo(() => {
    if (!info) return null;
    return info.claimedToday ? info.currentDayReward : info.currentDayReward;
  }, [info]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}>
      <View style={[styles.root, {paddingTop: insets.top}]}>
        <View style={styles.headerGradient} pointerEvents="none">
          <Svg
            width="100%"
            height="100%"
            style={StyleSheet.absoluteFill}
            preserveAspectRatio="none">
            <Defs>
              <LinearGradient id="streakBg" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#FFE8F0" />
                <Stop offset="1" stopColor={palette.bg} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#streakBg)" />
          </Svg>
        </View>

        <Pressable
          style={[styles.closeBtn, {top: insets.top + 8}]}
          onPress={onClose}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('Close')}>
          <View style={styles.closeCircle}>
            <DismissIcon size={20} color="#6B7280" />
          </View>
        </Pressable>

        {streakQuery.isLoading || !info ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={palette.accent} />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={[
              styles.scroll,
              {paddingBottom: insets.bottom + 24},
            ]}
            showsVerticalScrollIndicator={false}>
            <View style={styles.hero}>
              <StreakFlameIcon size={72} />
              <Text style={styles.streakNumber}>{info.streak}</Text>
              <Text style={styles.streakLabel}>{t('streak_days_series')}</Text>
            </View>

            <View style={styles.weekRow}>
              {WEEK_KEYS.map((key, idx) => {
                const done = idx < filledDays;
                return (
                  <View key={key} style={styles.weekCell}>
                    <Text style={styles.weekLabel}>{t(`streak_week_${key}`)}</Text>
                    <View
                      style={[
                        styles.weekDot,
                        done ? styles.weekDotDone : styles.weekDotPending,
                      ]}>
                      {done ? (
                        <StreakFlameIcon size={22} filled />
                      ) : (
                        <View style={styles.weekDotEmpty} />
                      )}
                    </View>
                  </View>
                );
              })}
            </View>

            <View style={styles.statsRow}>
              <View style={[styles.card, styles.statCard]}>
                <Text style={styles.statValue}>
                  {formatStreakDate(info.streakStartDate, locale)}
                </Text>
                <Text style={styles.statLabel}>{t('streak_started')}</Text>
              </View>
              <View style={[styles.card, styles.statCard]}>
                <Text style={[styles.statValue, styles.statValueAccent]}>
                  {info.longestStreak}
                </Text>
                <Text style={styles.statLabel}>{t('streak_longest_record')}</Text>
              </View>
            </View>

            {info.nextMilestone != null ? (
              <View style={styles.card}>
                <View style={styles.milestoneRow}>
                  <View style={styles.milestoneSide}>
                    <StreakFlameIcon size={32} />
                    <Text style={styles.milestoneNum}>{info.streak}</Text>
                  </View>
                  <View style={styles.milestoneCenter}>
                    <Text style={styles.milestoneTitle}>
                      {t('streak_days_until_next', {
                        count: info.daysUntilNextMilestone ?? 0,
                      })}
                    </Text>
                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressFill,
                          {width: `${Math.round(progress * 100)}%`},
                        ]}
                      />
                    </View>
                    <Text style={styles.milestoneSub}>
                      {t('streak_until_next_stage')}
                    </Text>
                  </View>
                  <View style={styles.milestoneSide}>
                    <StreakTrophyIcon size={32} active={false} />
                    <Text style={styles.milestoneNumMuted}>
                      {info.nextMilestone}
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}

            {rewardPreview ? (
              <View style={styles.card}>
                <Text style={styles.rewardTitle}>
                  {info.claimedToday
                    ? t('streak_today_reward')
                    : t('streak_claim_reward_title')}
                </Text>
                <View style={styles.rewardRow}>
                  <View style={styles.rewardChip}>
                    <BalanceCoinIcon size={20} />
                    <Text style={styles.rewardChipText}>
                      {sumFormat(rewardPreview.balance)}
                    </Text>
                  </View>
                  <Text style={styles.rewardMeta}>
                    {t('streak_reward_tickets', {
                      chart: rewardPreview.chartTickets,
                      mining: rewardPreview.miningTickets,
                    })}
                  </Text>
                </View>
              </View>
            ) : null}

            <View style={styles.tipCard}>
              <View style={styles.tipAvatar}>
                <StreakFlameIcon size={36} />
              </View>
              <Text style={styles.tipText}>{t('streak_daily_tip')}</Text>
            </View>

            {!info.claimedToday ? (
              <Pressable
                style={[
                  styles.claimBtn,
                  claimMut.isPending && styles.claimBtnDisabled,
                ]}
                onPress={() => claimMut.mutate()}
                disabled={claimMut.isPending}>
                {claimMut.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.claimBtnText}>{t('Claim')}</Text>
                )}
              </Pressable>
            ) : (
              <Pressable style={styles.doneBtn} onPress={onClose}>
                <Text style={styles.doneBtnText}>{t('streak_done_today')}</Text>
              </Pressable>
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  headerGradient: {
    ...StyleSheet.absoluteFill,
    height: 280,
  },
  closeBtn: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
  },
  closeCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 2},
    elevation: 3,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 48,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 28,
  },
  streakNumber: {
    fontFamily: fontFamily.bold,
    fontSize: 56,
    fontWeight: '700',
    color: palette.text,
    marginTop: 8,
    lineHeight: 64,
  },
  streakLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 22,
    fontWeight: '700',
    color: palette.text,
    marginTop: 4,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  weekCell: {
    alignItems: 'center',
    gap: 8,
  },
  weekLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: palette.textMuted,
  },
  weekDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDotDone: {
    backgroundColor: palette.accentSoft,
  },
  weekDotPending: {
    backgroundColor: palette.border,
  },
  weekDotEmpty: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#D1D5DB',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  card: {
    backgroundColor: palette.card,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 2},
    elevation: 2,
  },
  statCard: {
    flex: 1,
    marginBottom: 0,
  },
  statValue: {
    fontFamily: fontFamily.bold,
    fontSize: 18,
    fontWeight: '700',
    color: palette.text,
    marginBottom: 4,
  },
  statValueAccent: {
    color: palette.accent,
  },
  statLabel: {
    fontSize: 13,
    color: palette.textMuted,
    lineHeight: 18,
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  milestoneSide: {
    alignItems: 'center',
    width: 48,
  },
  milestoneCenter: {
    flex: 1,
  },
  milestoneNum: {
    fontSize: 14,
    fontWeight: '700',
    color: palette.text,
    marginTop: 4,
  },
  milestoneNumMuted: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.textMuted,
    marginTop: 4,
  },
  milestoneTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: palette.text,
    textAlign: 'center',
    marginBottom: 10,
  },
  milestoneSub: {
    fontSize: 12,
    color: palette.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.progressTrack,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: palette.progressFillEnd,
  },
  rewardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: palette.text,
    marginBottom: 12,
  },
  rewardRow: {
    gap: 8,
  },
  rewardChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rewardChipText: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.text,
  },
  rewardMeta: {
    fontSize: 14,
    color: palette.textMuted,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: palette.card,
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    marginTop: 4,
  },
  tipAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: palette.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: palette.text,
  },
  claimBtn: {
    backgroundColor: palette.accent,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  claimBtnDisabled: {
    opacity: 0.7,
  },
  claimBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  doneBtn: {
    backgroundColor: palette.border,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  doneBtnText: {
    color: palette.textMuted,
    fontSize: 16,
    fontWeight: '600',
  },
});
