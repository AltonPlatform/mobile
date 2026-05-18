import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {postPoolsClaim} from '../api/pools';
import {usePoolsSummaryLive} from '../hooks/usePoolsSummaryLive';
import {formatApiError, getApiErrorCode} from '../api/errors';
import {newIdempotencyKey} from '../utils/idempotencyKey';
import {useUserContext} from '../context/UserContext';
import {useCASRewarded} from '../hooks/useCASRewarded';
import {colors, radii} from '../theme/tokens';
import {fontFamily} from '../theme/typography';
import type {HomeStackParamList} from '../navigation/MainTabs';
import {BalanceCoinIcon} from './Icons';
import {FarmingClaimX2Modal} from './FarmingClaimX2Modal';
import {formatPoolBigInt} from '../utils/poolFormat';
import {
  estimateUnclaimedNumberAt,
  formatLinearEarnedDisplay,
  formatPoolBigIntForDisplay,
  getFarmingBullcoinFillPercent,
  resolveTotalRewardPerHour,
  getFarmingCooldownRemainingMs,
  hasPoolPositions,
  hasUnclaimedPoolRewards,
  isFarmingClaimOnCooldown,
  nextClaimAtFromSummary,
} from '../utils/poolFarmingCycle';

const WEB_TIMER_BORDER_RADIUS_PX = 100;

export function MiningBlock() {
  const {t} = useTranslation();
  const nav = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const {token, refetchUser} = useUserContext();
  const queryClient = useQueryClient();
  const [cooldownUntilIso, setCooldownUntilIso] = useState<string | null>(null);
  const [claimHint, setClaimHint] = useState<string | null>(null);
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [adLoading, setAdLoading] = useState(false);
  const [resumeClaimTimer, setResumeClaimTimer] = useState(0);
  const [showButton, setShowButton] = useState(false);
  const buttonOpacity = useRef(new Animated.Value(0)).current;

  const summaryQuery = usePoolsSummaryLive(!!token);
  const summary = summaryQuery.data;
  const estimatedUnclaimed = summaryQuery.estimatedUnclaimed;
  const now = summaryQuery.nowMs;
  const displayNow = summaryQuery.displayNowMs;
  const syncedAtMs = summaryQuery.syncedAtMs;

  useEffect(() => {
    if (!summary?.lastFarmingClaimAt || !cooldownUntilIso) {
      return;
    }
    const fromSummary = nextClaimAtFromSummary(summary.lastFarmingClaimAt);
    if (
      fromSummary &&
      Math.abs(
        new Date(fromSummary).getTime() - new Date(cooldownUntilIso).getTime(),
      ) < 5000
    ) {
      setCooldownUntilIso(null);
    }
  }, [summary?.lastFarmingClaimAt, cooldownUntilIso]);

  useEffect(() => {
    if (summaryQuery.isSuccess || summaryQuery.isError || !token) {
      const delayId = setTimeout(() => setShowButton(true), 100);
      return () => clearTimeout(delayId);
    }
  }, [summaryQuery.isSuccess, summaryQuery.isError, token]);

  const lastClaimAt = summary?.lastFarmingClaimAt ?? null;
  const onCooldown = useMemo(() => {
    if (cooldownUntilIso) {
      return new Date(cooldownUntilIso).getTime() > now;
    }
    return isFarmingClaimOnCooldown(lastClaimAt, now);
  }, [cooldownUntilIso, lastClaimAt, now]);

  const earnedLinear = useMemo(() => {
    if (!summary) {
      return null;
    }
    const n = estimateUnclaimedNumberAt(summary, syncedAtMs, displayNow);
    if (!Number.isFinite(n) || n > Number.MAX_SAFE_INTEGER) {
      return null;
    }
    return n;
  }, [summary, syncedAtMs, displayNow]);

  const profitPerHourDisplay = formatPoolBigInt(
    resolveTotalRewardPerHour(summary),
  );
  const canClaim =
    !!summary && hasUnclaimedPoolRewards(estimatedUnclaimed) && !onCooldown;

  const showTimer = onCooldown;

  useEffect(() => {
    if (showButton && !showTimer) {
      Animated.timing(buttonOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [showButton, showTimer, buttonOpacity]);

  const claimMut = useMutation({
    mutationFn: async (rewardedAd?: boolean) => {
      const idempotencyKey = newIdempotencyKey();
      return postPoolsClaim({idempotencyKey, rewardedAd: !!rewardedAd});
    },
    onSuccess: async data => {
      setClaimHint(null);
      setAdLoading(false);
      setClaimModalOpen(false);
      if (data.nextClaimAt) {
        setCooldownUntilIso(data.nextClaimAt);
      }
      await queryClient.invalidateQueries({queryKey: ['poolsSummary']});
      await queryClient.invalidateQueries({queryKey: ['poolMe']});
      await refetchUser();
    },
    onError: (e: unknown) => {
      setAdLoading(false);
      const code = getApiErrorCode(e);
      setClaimHint(formatApiError(e));
      if (code === 'ClaimCooldown' && summary?.lastFarmingClaimAt) {
        setCooldownUntilIso(nextClaimAtFromSummary(summary.lastFarmingClaimAt));
      }
    },
  });

  const {showRewarded} = useCASRewarded({
    onReward: () => {
      setAdLoading(false);
      if (!claimMut.isPending) {
        claimMut.mutate(true);
      }
    },
    onFail: () => {
      setAdLoading(false);
      setResumeClaimTimer(n => n + 1);
      setClaimHint(t('chart_game_ad_unavailable'));
    },
  });

  const goPools = () => {
    nav.getParent()?.navigate('Pools', {screen: 'PoolsList'});
  };

  const handlePress = () => {
    if (claimMut.isPending) {
      return;
    }
    setClaimHint(null);
    if (canClaim) {
      setClaimModalOpen(true);
      return;
    }
    goPools();
  };

  const handleClaimRegular = () => {
    if (claimMut.isPending) {
      return;
    }
    claimMut.mutate(false);
  };

  const handleGetX2 = () => {
    if (claimMut.isPending || adLoading) {
      return;
    }
    setAdLoading(true);
    showRewarded();
    setTimeout(() => setAdLoading(false), 5000);
  };

  const msUntilClaim = cooldownUntilIso
    ? Math.max(0, new Date(cooldownUntilIso).getTime() - displayNow)
    : getFarmingCooldownRemainingMs(lastClaimAt, displayNow);

  const percentagePassed = getFarmingBullcoinFillPercent(
    lastClaimAt,
    estimatedUnclaimed,
    displayNow,
  );

  const timerHours = Math.floor(msUntilClaim / 3600000);
  const timerMinutes = Math.floor((msUntilClaim % 3600000) / 60000);

  const buttonLabel = useMemo(() => {
    if (claimMut.isPending) {
      return t('Claiming...');
    }
    if (canClaim) {
      return t('Claim');
    }
    if (summary && hasPoolPositions(summary.byPool.length)) {
      return t('farming_go_pools');
    }
    return t('Start');
  }, [canClaim, claimMut.isPending, summary, t]);

  if (!token) {
    return (
      <View style={styles.miningRoot}>
        <TouchableOpacity style={styles.startBtn} onPress={goPools}>
          <Text style={styles.startBtnText}>{t('Start')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (summaryQuery.isPending) {
    return (
      <View style={styles.miningRoot}>
        <View style={styles.startBtnPlaceholder}>
          <ActivityIndicator color={colors.textPrimary} />
        </View>
      </View>
    );
  }

  if (summaryQuery.isError) {
    return (
      <View style={styles.miningRoot}>
        <Text style={styles.hintErr}>{formatApiError(summaryQuery.error)}</Text>
        <TouchableOpacity
          style={styles.startBtn}
          onPress={() => summaryQuery.refetch()}>
          <Text style={styles.startBtnText}>{t('Retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.miningRoot}>
      <View style={styles.profitRow}>
        <Text style={styles.profitLabel}>{t('Profit Per Hour')}:</Text>
        <View style={styles.profitValueRow}>
          <BalanceCoinIcon size={12} />
          <Text style={styles.profitValue}>{profitPerHourDisplay}</Text>
        </View>
      </View>
      {showTimer ? (
        <View style={styles.timerBox}>
          <View style={styles.timerProgressBar} pointerEvents="none">
            <View
              style={[
                styles.timerProgressBarFill,
                {
                  width: `${Math.min(100, Math.max(0, percentagePassed))}%`,
                },
              ]}
            />
          </View>
          <View style={styles.timerCol}>
            <View style={styles.timerProfitRow}>
              <BalanceCoinIcon size={12} />
              <Text style={styles.timerProfit} numberOfLines={1}>
                {earnedLinear != null
                  ? formatLinearEarnedDisplay(earnedLinear)
                  : formatPoolBigIntForDisplay(estimatedUnclaimed)}
              </Text>
            </View>
          </View>
          <View style={[styles.timerCol, styles.timerColCenter]}>
            <Text style={styles.timerText} numberOfLines={1}>
              {percentagePassed.toFixed(2)}%
            </Text>
          </View>
          <View style={[styles.timerCol, styles.timerColLast]}>
            <Text style={styles.timerTime} numberOfLines={1}>
              {timerHours}
              {t('h')} {timerMinutes}
              {t('m')}
            </Text>
          </View>
        </View>
      ) : (
        <Animated.View style={[styles.startBtnWrap, {opacity: buttonOpacity}]}>
          <TouchableOpacity
            style={styles.startBtn}
            onPress={handlePress}
            disabled={claimMut.isPending || !showButton}
            activeOpacity={0.5}>
            {claimMut.isPending ? (
              <ActivityIndicator color={colors.textPrimary} />
            ) : (
              <Text style={styles.startBtnText}>{buttonLabel}</Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      )}
      {claimHint ? <Text style={styles.hintErr}>{claimHint}</Text> : null}
      <FarmingClaimX2Modal
        visible={claimModalOpen}
        onClose={() => setClaimModalOpen(false)}
        baseReward={estimatedUnclaimed}
        onClaimRegular={handleClaimRegular}
        onGetX2={handleGetX2}
        claimPending={claimMut.isPending}
        adLoading={adLoading}
        resumeTimerSignal={resumeClaimTimer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  miningRoot: {
    width: '100%',
    alignSelf: 'stretch',
  },
  profitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  profitLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    fontFamily: fontFamily.semibold,
    textTransform: 'capitalize',
    fontStyle: 'italic',
  },
  profitValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  profitValue: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: fontFamily.semibold,
    textTransform: 'capitalize',
  },
  timerBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: WEB_TIMER_BORDER_RADIUS_PX,
    backgroundColor: 'rgba(230, 33, 89, 0.16)',
    overflow: 'hidden',
  },
  timerProgressBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(230, 33, 89, 0.2)',
    borderRadius: WEB_TIMER_BORDER_RADIUS_PX,
    overflow: 'hidden',
    zIndex: 0,
  },
  timerProgressBarFill: {
    height: '100%',
    borderRadius: WEB_TIMER_BORDER_RADIUS_PX,
    backgroundColor: 'rgba(230, 33, 89, 0.08)',
  },
  timerCol: {
    flex: 1,
    zIndex: 2,
    alignItems: 'flex-start',
    justifyContent: 'center',
    minWidth: 0,
  },
  timerColCenter: {
    alignItems: 'center',
  },
  timerColLast: {
    alignItems: 'flex-end',
  },
  timerProfitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '100%',
  },
  timerProfit: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(126, 50, 71, 1)',
    fontFamily: fontFamily.semibold,
    textAlign: 'left',
    flexShrink: 1,
  },
  timerText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(230, 33, 89, 1)',
    fontFamily: fontFamily.semibold,
    textAlign: 'center',
  },
  timerTime: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(126, 50, 71, 1)',
    fontFamily: fontFamily.semibold,
    textAlign: 'right',
    width: '100%',
  },
  startBtnWrap: {
    width: '100%',
  },
  startBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  startBtnPlaceholder: {
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.7,
  },
  startBtnText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
    fontFamily: fontFamily.semibold,
  },
  hintErr: {
    marginTop: 8,
    color: colors.error,
    fontSize: 13,
    textAlign: 'center',
    fontFamily: fontFamily.regular,
  },
});
